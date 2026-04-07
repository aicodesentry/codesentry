/**
 * Profile Worker — background job processor for repo profiling.
 *
 * Picks the highest-priority queued repo, builds its profile, and stores it.
 * If the repo was urgent (PR waiting), re-triggers Tier 3 triage with the new profile.
 *
 * Designed to run as:
 *   - A Cloud Run Job on a 60s schedule, OR
 *   - A setInterval loop inside the API service
 */

const logger = require('../utils/logger');
const repositoriesDb = require('../db/repositories');
const { getInstallationToken } = require('./githubApp');
const { buildProfile } = require('./repoProfiler');

const PROFILE_TRIGGER_PATTERNS = [
  /package\.json$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /requirements\.txt$/,
  /Pipfile$/,
  /Pipfile\.lock$/,
  /go\.mod$/,
  /go\.sum$/,
  /pom\.xml$/,
  /build\.gradle$/,
  /Gemfile$/,
  /Gemfile\.lock$/,
  /Cargo\.toml$/,
  /Cargo\.lock$/,
  /\.env\.example$/,
  /Dockerfile/,
  /docker-compose/,
  /middleware\//i,
  /auth\//i,
  /config\//i,
];

function shouldRetriggerProfile(changedFilePaths) {
  return changedFilePaths.some((filePath) =>
    PROFILE_TRIGGER_PATTERNS.some((pattern) => pattern.test(filePath))
  );
}

async function processNextProfileJob() {
  const repo = await repositoriesDb.claimNextProfileJob();
  if (!repo) return { processed: false };

  const [owner, repoName] = repo.full_name.split('/');
  logger.info('Starting repo profiling', { repoId: repo.id, fullName: repo.full_name });

  try {
    const installationToken = await getInstallationToken(repo.installation_id);

    const { profile, confidence } = await buildProfile({
      owner,
      repo: repoName,
      branch: repo.default_branch || 'main',
      installationToken,
    });

    await repositoriesDb.saveProfile(repo.id, profile, confidence);

    logger.info('Repo profiling completed', {
      repoId: repo.id,
      fullName: repo.full_name,
      confidence,
      languages: profile.deterministic?.languages,
      framework: profile.deterministic?.framework,
    });

    // If this was an urgent profile (PR was waiting), the pending_retriage
    // info was cleared by saveProfile. The next PR analysis on this repo
    // will automatically use the profile.
    const pendingRetriage = repo.settings?.pending_retriage;
    if (pendingRetriage) {
      logger.info('Urgent profile built — next Tier 3 run will use it', {
        repoId: repo.id,
        runId: pendingRetriage.run_id,
        prNumber: pendingRetriage.pr_number,
      });
    }

    return { processed: true, repoId: repo.id, confidence };
  } catch (err) {
    logger.error('Repo profiling failed', {
      repoId: repo.id,
      fullName: repo.full_name,
      error: err.message,
    });
    await repositoriesDb.markProfileFailed(repo.id, err.message);
    return { processed: true, repoId: repo.id, error: err.message };
  }
}

/**
 * Start the worker as an interval loop inside the API service.
 * Processes one repo per tick. Safe to call multiple times (idempotent via SKIP LOCKED).
 */
function startWorkerLoop(intervalMs = 60000) {
  logger.info('Profile worker started', { intervalMs });

  async function tick() {
    try {
      const result = await processNextProfileJob();
      if (result.processed) {
        logger.info('Profile worker tick', result);
      }
    } catch (err) {
      logger.error('Profile worker tick failed', { error: err.message });
    }
  }

  // Run immediately on start, then on interval
  tick();
  return setInterval(tick, intervalMs);
}

module.exports = {
  processNextProfileJob,
  startWorkerLoop,
  shouldRetriggerProfile,
  PROFILE_TRIGGER_PATTERNS,
};

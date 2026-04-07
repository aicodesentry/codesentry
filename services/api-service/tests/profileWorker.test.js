const { shouldRetriggerProfile, PROFILE_TRIGGER_PATTERNS } = require('../src/services/profileWorker');

describe('profileWorker — shouldRetriggerProfile', () => {
  test('triggers on package.json change', () => {
    expect(shouldRetriggerProfile(['package.json'])).toBe(true);
  });

  test('triggers on package-lock.json change', () => {
    expect(shouldRetriggerProfile(['package-lock.json'])).toBe(true);
  });

  test('triggers on requirements.txt change', () => {
    expect(shouldRetriggerProfile(['requirements.txt'])).toBe(true);
  });

  test('triggers on go.mod change', () => {
    expect(shouldRetriggerProfile(['go.mod'])).toBe(true);
  });

  test('triggers on Dockerfile change', () => {
    expect(shouldRetriggerProfile(['Dockerfile'])).toBe(true);
  });

  test('triggers on middleware file change', () => {
    expect(shouldRetriggerProfile(['src/middleware/auth.js'])).toBe(true);
  });

  test('triggers on auth directory file change', () => {
    expect(shouldRetriggerProfile(['lib/auth/jwt.py'])).toBe(true);
  });

  test('triggers on config directory file change', () => {
    expect(shouldRetriggerProfile(['config/security.json'])).toBe(true);
  });

  test('triggers on .env.example change', () => {
    expect(shouldRetriggerProfile(['.env.example'])).toBe(true);
  });

  test('triggers on docker-compose.yml change', () => {
    expect(shouldRetriggerProfile(['docker-compose.yml'])).toBe(true);
  });

  test('does not trigger on regular source file change', () => {
    expect(shouldRetriggerProfile(['src/utils/helpers.js'])).toBe(false);
  });

  test('does not trigger on test file change', () => {
    expect(shouldRetriggerProfile(['tests/unit/app.test.js'])).toBe(false);
  });

  test('does not trigger on README change', () => {
    expect(shouldRetriggerProfile(['README.md'])).toBe(false);
  });

  test('does not trigger on empty list', () => {
    expect(shouldRetriggerProfile([])).toBe(false);
  });

  test('triggers if any file in list matches', () => {
    expect(shouldRetriggerProfile([
      'src/utils/helpers.js',
      'README.md',
      'package.json',
    ])).toBe(true);
  });
});

describe('profileWorker — PROFILE_TRIGGER_PATTERNS', () => {
  test('has patterns defined', () => {
    expect(PROFILE_TRIGGER_PATTERNS.length).toBeGreaterThan(0);
  });

  test('all patterns are RegExp', () => {
    for (const pattern of PROFILE_TRIGGER_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});

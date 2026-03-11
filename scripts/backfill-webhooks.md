# Backfill webhooks for repositories with NULL webhook_id

Purpose: For repos missing `webhook_id` in the `repositories` table, re-register the webhook via the GitHub service so the ID gets persisted.

## Prereqs
- GitHub service deployed and reachable (e.g., `${GITHUB_SERVICE_URL}/webhooks/register`).
- Access to `users.github_token` for the repo owners.
- A list of repos with `webhook_id IS NULL` (queried from Neon).

SQL to list missing:
```sql
SELECT id, full_name, user_id FROM repositories WHERE webhook_id IS NULL ORDER BY created_at DESC;
```

## Manual backfill (per repo)
For each row (full_name, user_id):
1) Look up the user’s GitHub token:
   ```sql
   SELECT github_token FROM users WHERE id = <user_id>;
   ```
2) Call the GitHub service register endpoint:
   ```bash
   curl -X POST ${GITHUB_SERVICE_URL}/webhooks/register \
     -H "Content-Type: application/json" \
     -d '{"repository_full_name":"<owner/repo>","github_token":"<token>"}'
   ```
   - The updated endpoint will find/create the webhook and write `webhook_id`/`webhook_url` into the `repositories` row.

## Notes
- The new code in `services/github-service/src/routes/webhooks.js` persists webhook_id/webhook_url when `/webhooks/register` is called.
- You don’t need direct DB updates; re-registration is enough.
- If you want to automate, create a small script that:
  1) SELECTs repos with NULL webhook_id,
  2) Joins users to get github_token,
  3) Calls `/webhooks/register` per repo,
  4) Logs successes/failures.

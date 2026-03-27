# Backfill webhooks for repositories with NULL webhook_id

Purpose: For repos missing `webhook_id` in the `repositories` table, re-register the webhook via the GitHub service so the ID gets persisted.

## Status

This procedure is deprecated.

Do not follow the older token-based flow below in production. It requires reading `users.github_token` and sending credentials through shell commands, which is not an acceptable operational pattern for a public repo or a production runbook.

Use GitHub App installation-based registration instead, or add a server-side admin endpoint that derives installation auth internally without exposing user tokens.

## Prereqs
- GitHub service deployed and reachable (e.g., `${GITHUB_SERVICE_URL}/webhooks/register`).
- A list of repos with `webhook_id IS NULL` (queried from Neon).

SQL to list missing:
```sql
SELECT id, full_name, user_id FROM repositories WHERE webhook_id IS NULL ORDER BY created_at DESC;
```

## Safe replacement

Implement or use an internal-only registration path that takes:

- `repository_full_name`
- `installation_id`
- `x-internal-secret`

and obtains the GitHub App installation token server-side.

That keeps credentials out of SQL output, shell history, and terminal logs.

## Notes
- The new code in `services/github-service/src/routes/webhooks.js` persists webhook_id/webhook_url when `/webhooks/register` is called.
- You don’t need direct DB updates; re-registration is enough.
- Do not automate this by joining `users.github_token` out of the database.

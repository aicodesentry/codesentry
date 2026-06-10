# Grafana Agent Scrape Config

Set these environment variables on the Grafana Agent service when remote-writing service metrics to Grafana Cloud:

- `API_TARGET_HOST`: Host and optional port for API service metrics. Use the host only, without scheme or path.
- `GITHUB_TARGET_HOST`: Host and optional port for GitHub service metrics. Use the host only, without scheme or path.
- `ANALYSIS_TARGET_HOST`: Host and optional port for analysis service metrics. Use the host only, without scheme or path.
- `PROM_REMOTE_WRITE_URL`, `PROM_REMOTE_WRITE_USER`, `PROM_REMOTE_WRITE_PASS`: Your Prometheus/Grafana Cloud remote write endpoint and credentials.

Notes:
- Targets must be host (and port) only—no scheme or path. Paths are controlled by the `*_METRICS_PATH` envs.
- Keep `/metrics` reachable to the agent. If you restrict it, use a shared token and add it in the agent scrape config’s `authorization` block.
- If services use HTTP instead of HTTPS, set `scheme: http` in the scrape config for that target.

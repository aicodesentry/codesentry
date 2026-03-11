# Grafana Agent Scrape Config

Set these environment variables on the Grafana Agent service (Render or local):

- `API_TARGET_HOST`: Host (and optional port) for the API service metrics. Example: `api-service-m1g4.onrender.com` (host only; add `:port` if non-443). Default metrics path is `/metrics` unless you override with `API_METRICS_PATH`.
- `GITHUB_TARGET_HOST`: Host (and optional port) for the GitHub service metrics. Example: `github-service-xxxx.onrender.com`. Default path `/metrics`; override with `GITHUB_METRICS_PATH` if different.
- `ANALYSIS_TARGET_HOST`: Host (and optional port) for the Analysis service metrics. Example: `analysis-service-xxxx.onrender.com`. Default path `/metrics`; override with `ANALYSIS_METRICS_PATH` if different.
- `PROM_REMOTE_WRITE_URL`, `PROM_REMOTE_WRITE_USER`, `PROM_REMOTE_WRITE_PASS`: Your Prometheus/Grafana Cloud remote write endpoint and credentials.

Notes:
- Targets must be host (and port) only—no scheme or path. Paths are controlled by the `*_METRICS_PATH` envs.
- Keep `/metrics` reachable to the agent. If you restrict it, use a shared token and add it in the agent scrape config’s `authorization` block.
- If services use HTTP instead of HTTPS, set `scheme: http` in the scrape config for that target.

# Mitig8it Frontend

React/Vite dashboard for the Mitig8it GitHub security reviewer.

## Stack

- React 18
- Vite
- React Router
- Tailwind CSS
- Axios
- Lucide icons
- Vitest and Testing Library

## Local Development

From the repository root, Docker Compose starts the frontend at `http://localhost:5173`.

For standalone frontend work:

```bash
cd frontend
npm install
npm run dev
```

The frontend reads `VITE_API_URL` at build time. Local default behavior falls back to `http://localhost:3000` when running on `localhost` or `127.0.0.1`.

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm test          # Vitest once
npm run test:watch
```

## Routes

Public routes:

- `/`
- `/auth/callback`
- `/examples`
- `/benchmarks`
- `/customers`
- `/security`
- `/about`
- `/privacy`
- `/terms`

Protected dashboard routes:

- `/dashboard/home`
- `/dashboard/analysis`
- `/dashboard/onboarding`
- `/dashboard/repositories`
- `/dashboard/repositories/:repositoryId`
- `/dashboard/pull-requests/:pullRequestId/findings`
- `/dashboard/findings/:findingId`
- `/dashboard/suppressions`
- `/dashboard/reports`
- `/dashboard/subscription`
- `/dashboard/support`
- `/dashboard/profile`
- `/dashboard/settings`

`/app/*` redirects to `/dashboard`.

## API Integration

API helpers live in `src/services/api.js`.

Main API groups:

- `authAPI`
- `installationAPI`
- `repositoryAPI`
- `findingAPI`
- `suppressionAPI`
- `reportsAPI`
- `analysisAPI`
- `webhookAPI`

The Axios client:

- Uses `withCredentials: true` for the API session cookie.
- Adds `X-CSRF-Protection: 1` to requests.
- Redirects protected routes to `/` on most `401` responses.
- Clears legacy localStorage token state because auth is cookie-based.

## Project Structure

```text
src/
  components/      Shared layout, marketing, UI, status, modal, and shell components
  components/ui/   Small reusable primitives
  contexts/        Auth, onboarding, and theme providers
  hooks/           Shared React hooks
  pages/           Route-level pages
  services/        API client wrappers
  test/            Test setup
```

## Environment

| Variable | Description |
|---|---|
| `VITE_API_URL` | API service URL. Local default: `http://localhost:3000`. |
| `VITE_ANALYSIS_SERVICE_URL` | Optional override for direct analysis-service experiments; defaults to `VITE_API_URL`. |

The production Firebase build uses GitHub Actions in `.github/workflows/deploy-frontend-firebase.yml`.

# GCP Frontend Setup (Firebase Hosting)

This setup keeps CodeSentry frontend on Firebase Hosting and backend services on Cloud Run.

## Hosting Choice
- Use **Firebase Hosting** for the React/Vite frontend.
- Keep backend services on Cloud Run.

## Steps
1. Ensure `firebase.json` is present at repo root.
2. In GitHub repo settings, add:
   - Secret: `FIREBASE_TOKEN`
   - Variables: `FIREBASE_PROJECT_ID`, `VITE_API_URL`
3. Trigger deployment:
   - Push to `main` with frontend changes, or
   - Manually run `Deploy Frontend (Firebase Hosting)` workflow.

## GitHub Actions Auto-Deploy
Workflow:
- `.github/workflows/deploy-frontend-firebase.yml`

Configure GitHub repository settings:
1. **Secret**
- `FIREBASE_TOKEN` (from `firebase login:ci`)

2. **Variables**
- `FIREBASE_PROJECT_ID`
- `VITE_API_URL`

Behavior:
- Push to `main` with frontend-related changes triggers build + Firebase deploy automatically.
- You can also trigger manually via `workflow_dispatch`.

## Files
- `firebase.json`: Hosting config with SPA rewrites
- `.github/workflows/deploy-frontend-firebase.yml`: build + deploy workflow

## Analytics
- Enable Google Analytics in Firebase project settings.
- Use Firebase Analytics + Google Cloud Monitoring dashboards for operational visibility.

## Validate
- Open frontend and confirm API calls to Cloud Run API URL.
- Open `/app/analytics` and verify links to:
  - Firebase/Google Analytics
  - Cloud Monitoring dashboards

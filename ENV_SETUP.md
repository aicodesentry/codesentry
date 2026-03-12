# Environment Variables Setup Guide

This document describes all environment variables used across CodeSentry.

## Quick Start

Each service has an `.env.example` file. Copy it to `.env` and fill in the actual values:

```bash
# API Service
cp services/api-service/.env.example services/api-service/.env

# GitHub Service
cp services/github-service/.env.example services/github-service/.env

# Frontend
cp frontend/.env.example frontend/.env
```

## Service Configuration

### API Service (`services/api-service/.env`)

#### Server Configuration
- `PORT` - Port for the API service (default: 3000)

#### GitHub OAuth
- `GITHUB_CLIENT_ID` - Your GitHub OAuth App Client ID
  - Get from: https://github.com/settings/developers
  - Create a new OAuth App if you don't have one
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth App Client Secret
  - Get from: https://github.com/settings/developers
- `GITHUB_CALLBACK_URL` - OAuth callback URL (default: http://localhost:3000/auth/github/callback)
  - Must match the callback URL configured in your GitHub OAuth App

#### JWT Authentication
- `JWT_SECRET` - Secret key for signing JWT tokens
  - Generate a secure random string (32+ characters)
  - Example: `openssl rand -hex 32`
  - **IMPORTANT**: Keep this secret and never commit to version control

#### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Development: `postgresql://dev:devpass123@postgres:5432/codesentry`
  - Production: Use secure credentials and consider using connection pooling

#### Services
- `GITHUB_SERVICE_URL` - URL of the GitHub service
  - Development: `http://github-service:3002`
  - Production: Use actual service URL
- `ANALYSIS_SERVICE_URL` - URL of analysis service
  - Development: `http://analysis-service:8001`
- `GITHUB_SERVICE_INTERNAL_SECRET` - shared internal auth secret for API -> GitHub service calls

### GitHub Service (`services/github-service/.env`)

#### Server Configuration
- `PORT` - Port for the GitHub service (default: 3002)

#### Webhook Configuration
- `WEBHOOK_SECRET` - HMAC secret to validate inbound GitHub webhooks
- `GITHUB_APP_ID` - GitHub App ID
- `GITHUB_APP_PRIVATE_KEY` - GitHub App private key PEM

### Frontend (`frontend/.env`)

#### API Configuration
- `VITE_API_URL` - URL of the API service
  - Development: `http://localhost:3000`
  - Production: Use your actual API URL
  - **Note**: Vite only exposes variables prefixed with `VITE_` to the client

## Security Best Practices

1. **Never commit .env files**
   - All `.env` files are already in `.gitignore`
   - Only commit `.env.example` files with placeholder values

2. **Use strong secrets**
   - Generate cryptographically secure random strings for `JWT_SECRET`
   - Rotate secrets regularly in production

3. **Environment-specific configurations**
   - Use different values for development, staging, and production
   - Never use development credentials in production

4. **GitHub OAuth Setup**
   - Create separate OAuth Apps for development and production
   - Use appropriate callback URLs for each environment

5. **Database Security**
   - Use strong passwords for database connections
   - In production, use environment-specific credentials
   - Consider using managed database services with built-in security

## Generating Secure Secrets

### JWT Secret
```bash
# Generate a secure random hex string (64 characters)
openssl rand -hex 32
```

### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: "AI Code Review Assistant (Dev/Prod)"
   - Homepage URL: Your app's URL
   - Authorization callback URL: `http://localhost:3000/auth/github/callback` (dev) or your production URL
4. Copy the Client ID and generate a Client Secret

## Docker Compose

When using Docker Compose, environment variables are automatically loaded from `.env` files in each service directory. The `docker-compose.yml` is configured to use these files.

## Troubleshooting

### "Missing environment variable" errors
- Ensure you've copied `.env.example` to `.env` in the relevant service
- Check that all required variables are set in your `.env` file

### GitHub OAuth not working
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Ensure `GITHUB_CALLBACK_URL` matches your GitHub OAuth App settings
- Check that the callback URL is accessible

### Webhook events not received
- Ensure `WEBHOOK_URL` in github-service is publicly accessible
- For local development, use ngrok: `ngrok http 3002`
- Update the webhook URL in your GitHub repository settings

### Frontend can't connect to API
- Verify `VITE_API_URL` is set correctly in `frontend/.env`
- Ensure the API service is running
- Check CORS settings in the API service

## Production Deployment

For production deployments:

1. Use environment-specific `.env` files (never commit these)
2. Consider using secrets management services (AWS Secrets Manager, HashiCorp Vault, etc.)
3. Set environment variables through your deployment platform (Heroku, Vercel, AWS, etc.)
4. Enable HTTPS for all services
5. Use production-grade database instances
6. Implement proper monitoring and logging
7. Rotate secrets regularly

## Support

If you encounter issues with environment configuration:
1. Check this documentation
2. Verify all `.env.example` files are up to date
3. Review the service-specific README files
4. Check application logs for specific error messages

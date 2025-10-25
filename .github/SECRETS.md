# GitHub Secrets Configuration

This document lists the required secrets for the GitHub Actions CI/CD pipeline.

## Required Secrets

### Database

- `DATABASE_URL`: Production database connection string
  - Format: `mysql://username:password@host:port/database`
  - Example: `mysql://user:pass@db.example.com:3306/online_chat`

### Docker Hub (if using Docker deployment)

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token

### Deployment (if using cloud services)

- `DEPLOY_HOST`: Deployment server hostname or IP
- `DEPLOY_USER`: SSH username for deployment
- `DEPLOY_KEY`: SSH private key for deployment
- `DEPLOY_PATH`: Path on server where app should be deployed

### Environment Variables

- `NODE_ENV`: Environment (production, staging, development)
- `NEXTAUTH_SECRET`: Secret for NextAuth.js (if using authentication)
- `NEXTAUTH_URL`: Base URL for NextAuth.js

## How to Add Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" in the left sidebar
4. Click on "Actions"
5. Click "New repository secret"
6. Add each secret with the exact name listed above

## Security Notes

- Never commit secrets to your repository
- Use environment-specific secrets for different deployment stages
- Rotate secrets regularly
- Use least-privilege access for deployment credentials

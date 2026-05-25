# Security Policy

Trend Finder is intended to be safe to inspect and run locally, but production deployments must use private environment variables.

## Sensitive data

Never commit:

- `.env`, `.env.local` or production environment files
- database URLs
- API keys
- GitHub tokens
- YouTube API keys
- cron secrets
- demo/admin access passwords

Use `.env.local.example` as a template only. Replace every placeholder with your own local or production values.

## Public deployment

For a public deployment, configure all of these values in the hosting provider environment:

- `DATABASE_URL`
- `APP_ACCESS_SECRET`
- `DEMO_ACCESS_CODE`
- `ADMIN_ACCESS_PASSWORD`
- `CRON_SECRET`

The public landing page and product explainer are intentionally open. The live radar, reports, dashboard data, manual scan and admin pages are protected by the app access gate.

## Reporting issues

Do not open public issues containing secrets, database URLs or exploit details. Contact the maintainer privately if you discover a security problem.

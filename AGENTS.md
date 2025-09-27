# Agent Summary

- Initialized fresh git history to remove sensitive commits.
- Updated `docker-compose.yml` to pull from Docker Hub instead of building locally.
- Added `.env.example` configuration template for compose overrides.
- Wrote bundled README (English/中文) with Docker usage, reverse proxy notes, and controls overview.
- Implemented frontend automatic language & theme detection, plus toggles for English/Chinese and light/dark.
- Backend now accepts auth via `Authorization`, `X-Auth-Token`, or `lw_token` cookie to support reverse proxies.
- Docker Hub image `freefrank/lw-wol:latest` published and linked to compose.
- Current repo state reflects single commit “Initial release”.

# Mirage Email Service (`email`)

Hono + Cloudflare Workers API for waitlist email capture.

## Prerequisites

- Node.js 20+ (Wrangler v4 requirement)
- Cloudflare account

## Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `POST /api/waitlist`
  - Request JSON: `{ "email": "name@example.com", "source": "marketing-site" }`
  - Response JSON: `{ "ok": true, "status": "joined" | "already_joined" }`

## Storage (D1)

Waitlist records are stored in Cloudflare D1 table `waitlist_emails`.

Schema source: `email/schema.sql`.

## Local Development

```bash
cd email
npm install
npm run dev
```

## Cloudflare Setup And Deploy

1. Authenticate Wrangler:

```bash
cd email
npx wrangler login
```

2. Add this D1 binding in `wrangler.jsonc` (already configured in this repo):

```json
{
  "d1_databases": [
    {
      "binding": "mirage_emails",
      "database_name": "mirage-emails",
      "database_id": "6e96a994-d20b-4bf0-8bd0-f84a2755c573"
    }
  ]
}
```

3. Apply schema:

```bash
npx wrangler d1 execute mirage-emails --local --file ./schema.sql
npx wrangler d1 execute mirage-emails --remote --file ./schema.sql
```

4. Deploy:

```bash
npm run deploy
```

5. Configure marketing app endpoint in `marketing/src/config/site.ts`:

```ts
export const waitlistApiUrl = "https://<your-worker-domain>/api/waitlist";
```

## CORS

CORS is hardcoded in `src/index.ts` to allow only:

- `http://localhost:4321`
- `https://mirage.lukaszgut.com`

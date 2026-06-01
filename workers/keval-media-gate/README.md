# Keval Media Gate Worker

This Worker is the private WAV access gate for Keval Sound.

The public CDN intentionally blocks `https://cdn.kevalsound.com/private/*` with a Cloudflare security rule. Paid WAV access must go through this Worker instead.

## Endpoints

- `GET /health`
- `GET /v1/wav/stream/:trackId?token=...`
- `HEAD /v1/wav/stream/:trackId?token=...`
- `GET /v1/wav/download/:trackId?token=...`
- `HEAD /v1/wav/download/:trackId?token=...`

`Authorization: Bearer <token>` is also accepted. Query tokens are supported so browser `<audio src="...">` can stream WAVs after the app receives a short-lived entitlement token.

## Token Payload

Tokens are HMAC-SHA256 signed:

```json
{
  "sub": "user-id",
  "trackId": "external-middle-east-arabian-skyfire",
  "access": "wav-stream",
  "iat": 1770000000,
  "exp": 1770014400,
  "jti": "uuid"
}
```

Allowed access values:

- `wav-stream`: max TTL 4 hours.
- `wav-download`: max TTL 15 minutes.

The future purchase/subscription backend should issue these tokens only after checking:

- purchased song or pack for WAV downloads
- active INR 49 Player subscription for WAV streaming

## Generate Manifest

From the repo root:

```powershell
npm run media:manifest
```

This generates `src/catalog.manifest.js` from `src/lib/production-catalog.generated.ts`.

## Deploy

From the Worker folder:

```powershell
cd workers/keval-media-gate
npx wrangler secret put MEDIA_GATE_SIGNING_SECRET
npx wrangler deploy
```

Use a long random secret and keep the same value in the future backend token issuer.
The Worker is attached as a Cloudflare Worker Custom Domain at `media.kevalsound.com`.

## Local Token Test

From the repo root:

```powershell
$env:MEDIA_GATE_SIGNING_SECRET="same-secret-used-by-worker"
npm run media:token -- --track-id external-middle-east-arabian-skyfire --grant wav-stream --minutes 10
```

Open the printed URL after the Worker is deployed. Direct CDN private URLs should continue returning `403`.

# ⏰ Cron Builder

Visual cron expression builder with live preview.

**Live:** https://cron.jdms.nl

## Features

- 🎛️ Visual editor for all 5 cron fields
- 📋 10 common presets (every minute, hourly, daily, weekly, etc.)
- 📖 Human-readable description of your schedule
- ⏱️ Next 5 run times with relative timestamps
- 📱 Mobile-friendly design
- 🔗 Copy to clipboard

## API

```bash
curl -X POST https://cron.jdms.nl/api/parse \
  -H "Content-Type: application/json" \
  -d '{"expression":"0 9 * * 1-5"}'
```

Response:
```json
{
  "valid": true,
  "expression": "0 9 * * 1-5",
  "description": "at 09:00",
  "nextRuns": ["2026-02-02T09:00:00.000Z", ...]
}
```

## Tech Stack

- Node.js + Express
- cron-parser for validation
- Vanilla JS + CSS (no framework bloat)

## Deploy

```bash
docker compose up -d --build
```

## License

MIT

# Vinted Tracker 2.0

Personal Vinted deal tracker + Telegram bot + Warsaw thrift-store map.

Optimized for **GCP Free Tier `e2-micro` (~1 GB RAM)** — no headless Chrome, no Redis/Celery.

## Stack

- **API / Worker:** Python, FastAPI, SQLAlchemy, `curl_cffi`, httpx
- **DB:** PostgreSQL 16 (memory-tuned)
- **Web:** React + Vite + TypeScript + Tailwind + Leaflet
- **Infra:** Docker Compose

## Quick start

```bash
cp .env.example .env
# edit TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS, API_KEY

docker compose up --build -d
```

- Web UI: http://localhost:8080
- API docs: http://localhost:8001/docs
- Health: http://localhost:8001/api/health

All mutating/list API routes (except `/api/health`) require header:

```
X-Api-Key: <API_KEY from .env>
```

The frontend bakes `VITE_API_KEY` at build time from the same `API_KEY`.
After changing `API_KEY`, rebuild the web image: `docker compose up --build -d web`.

## Telegram notifications

Caption format:

```
Title: *...*
Brand: *...*
Size: *...*
Price: *X PLN* (Y PLN)
HH:MM
```

Inline button: **Buy Now ↗** → item URL.

Photo uses the lowest-resolution thumbnail from the Vinted JSON payload.

## Filters

Add a filter in the UI with a full Vinted catalog API URL, e.g.:

```
https://www.vinted.pl/api/v2/catalog/items?catalog_ids[]=79&price_to=80&currency=PLN&order=newest_first&page=1
```

You can reuse URLs from the old .NET `TrackerConfig.json`.

Worker behaviour:

1. First fetch per filter = **seed** (stored, no Telegram)
2. Later polls every **7–15 s** (random jitter)
3. New `vinted_id` → DB insert + Telegram
4. Hourly cleanup deletes items older than `OFFER_RETENTION_DAYS` (default 10)

## Thrift map

- FAB (+) opens modal with backdrop blur
- Fields: name, lat/lng, next delivery, frequency, hotness (1–10)
- Click card/marker → Apple Maps on Apple devices, otherwise Google Maps

## GCP e2-micro notes

Compose already sets `mem_limit` on services and tunes Postgres:

- `shared_buffers=64MB`, `work_mem=4MB`, `max_connections=20`

Suggested VM:

- `e2-micro`, Ubuntu, Docker + Compose
- Open ports 80/8080 (or put nginx/Caddy in front)
- Persist `/var/lib/docker/volumes` backups if needed

```bash
# on the VM
git clone <repo> && cd vinted-tracker-2.0
cp .env.example .env && nano .env
docker compose up --build -d
```

## Local backend (without Docker web)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Postgres must be reachable via DATABASE_URL
uvicorn app.main:app --reload
python -m app.worker
```

```bash
cd frontend
npm install
VITE_API_KEY=change-me npm run dev
```

## Services

| Service | Role |
|---------|------|
| `db` | PostgreSQL |
| `api` | FastAPI REST |
| `worker` | Vinted polling + Telegram + retention |
| `web` | Static SPA + `/api` reverse proxy |

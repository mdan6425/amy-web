# AMY · Ask Me Your…

The AMY website: a candlelit companion for reflection, the birth sky, numerology, prayer and candle work.

## How it is put together
- `index.html`, `app.js`, `sky-portal.js`, `amy-lib.js`: the site itself (plain files, no build step).
- `claude-shim.js`: connects the site to AMY's AI through `/api/chat`, and uses the browser for speech and dictation.
- `api/chat.js`: the only place the Anthropic key is used. It adds AMY's system prompt (`api/_amy-system.js`) and enforces limits.
- `api/request.js`: candle and session requests, saved to a private Vercel Blob store.

## Settings in Vercel (Project → Settings → Environment Variables)
- `ANTHROPIC_API_KEY` (required): from console.anthropic.com. Set a monthly spend limit there.
- `AMY_MODEL` (optional, default `claude-sonnet-5-5`), `AMY_MODEL_QUICK` (optional, default `claude-haiku-5-5`).
- `BLOB_READ_WRITE_TOKEN`: added automatically when you create a private Blob store under Storage and connect it to this project.

Visitors are guests in this version: their conversation lasts while the tab is open, and memory (if they turn it on) stays in their own browser.

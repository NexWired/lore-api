# Render Deploy Issue - 2026-02-07

## Problem
Render is serving **v1.5.0** but GitHub has **v2.1.0** (commit fc74d11).

## Symptoms
- `/health` returns version "1.5.0" 
- New endpoints (/wisdom, /authors, /author/:name, /tweetable, proper /health) missing
- Multiple commits pushed but no auto-deploy triggered

## Attempted Fixes
1. ✗ Waited 12+ hours - no deploy
2. ✗ Pushed "trigger deploy" empty commit - no deploy
3. ✗ Pushed .render-trigger file - no deploy

## Likely Causes
- Render webhook not configured for NexWired/lore-api
- Free tier deployment queue delays
- Need to manually trigger via Render dashboard

## Fix Needed
1. Go to Render dashboard
2. Check if service is connected to correct GitHub repo
3. Manually trigger deploy OR set up webhook

## Commits Waiting to Deploy (newest first)
```
fc74d11 chore: trigger Render deploy
c435e1c feat: add proper /health endpoint with status, uptime, memory (v2.1.0)
1df2462 chore: trigger deploy
cc9b432 docs: add /tweetable to README
c75d0f2 feat: add /tweetable endpoint for Twitter-ready quotes
7f01035 docs: add /authors and /author/:name to README
2340e0c feat: add /authors and /author/:name endpoints (v1.9.0)
cc3e2d4 Document /wisdom endpoint in README
41715aa Add /wisdom endpoint for ranked philosophical quotes (v1.8.0)
```

## Priority
Medium - API works with v1.5.0, but new features are waiting

## Assigned To
Need fishy to trigger via Render dashboard OR grant me browser access to Render

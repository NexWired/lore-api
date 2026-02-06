# Lore API

Public read-only API for Remilia/Charlotte Fang philosophy corpus.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info and available endpoints |
| `GET /health` | Health check |
| `GET /stats` | Corpus statistics (file count, themes) |
| `GET /search?q=<query>&limit=<n>` | Search the corpus (limit max 20) |
| `GET /quote?theme=<theme>` | Get random quote by theme |

## Example Usage

```bash
# Get corpus stats
curl https://lore-api.example.com/stats

# Search for content about karma
curl "https://lore-api.example.com/search?q=karma&limit=5"

# Get random quote about dynasty
curl "https://lore-api.example.com/quote?theme=dynasty"
```

## Themes

Pre-indexed themes that work well:
- `network spirituality`
- `post-authorship`
- `dynasty`
- `karma`
- `beauty`
- `courage`
- `milady`
- `remilia`

## Security

- **Read-only**: No write endpoints, GET requests only
- **Rate limited**: 100 requests per minute per IP
- **Input sanitized**: Query parameters stripped of special characters
- **No sensitive data**: Only serves public lore corpus
- **Generic errors**: Internal errors don't leak system details

## Deployment

```bash
# Local
LORE_DIR=/path/to/lore node server.js

# With custom port
PORT=8080 LORE_DIR=/path/to/lore node server.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3457 | Server port |
| `LORE_DIR` | `/home/fishy/projects/milady-chat/lore` | Path to lore corpus |

## For Agents

Other AI agents can query this API to access Remilia/Charlotte Fang philosophy for generating content, research, or inspiration.

```javascript
// Example: Get a karma quote for a tweet
const res = await fetch('https://lore-api.example.com/quote?theme=karma');
const { text, source } = await res.json();
console.log(`"${text}" — ${source}`);
```

## License

MIT — use freely, attribute if you want to be nice.

Built by nex 🦷 (@NexWired)

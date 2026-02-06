# Lore API

Public read-only API for Remilia/Charlotte Fang philosophy corpus. Built for agents and humans to access network spirituality source material.

## Live Demo

```bash
# Live API (temporary tunnel, may change)
curl https://priest-though-definitely-buying.trycloudflare.com/stats
curl https://priest-though-definitely-buying.trycloudflare.com/themes
curl https://priest-though-definitely-buying.trycloudflare.com/random
curl "https://priest-though-definitely-buying.trycloudflare.com/search?q=karma"
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info and available endpoints |
| `GET /health` | Health check |
| `GET /stats` | Corpus statistics (files, lines, themes) |
| `GET /themes` | All themes with sample quotes (discoverability) |
| `GET /sources` | List all documents with metadata |
| `GET /doc/<path>` | Get full document content |
| `GET /search?q=<query>&limit=<n>` | Search the corpus (limit max 20) |
| `GET /quote?theme=<theme>` | Get random quote by theme |
| `GET /random` | Get random quote (any theme) |

## Example Usage

```bash
# Get corpus stats
curl https://lore-api.example.com/stats
# → {"files":249,"characters":1764000,"lines":52554,"themes":[...]}

# List all documents
curl https://lore-api.example.com/sources
# → {"sources":[{"path":"charlotte-fang-essays/dynasty-mindset","lines":89,"chars":5621},...]}

# Get full document
curl https://lore-api.example.com/doc/charlotte-fang-essays/dynasty-mindset
# → {"path":"...","content":"# Dynasty Mindset\n\n**Charlotte Fang**...","lines":89,"chars":5621}

# Search for content
curl "https://lore-api.example.com/search?q=karma&limit=3"
# → {"query":"karma","results":[{"source":"...","score":3,"excerpt":"..."},...]}

# Get themed quote
curl "https://lore-api.example.com/quote?theme=dynasty"
# → {"text":"The despondency of this age is due to losing track of...","source":"charlotte-fang-essays/dynasty-mindset"}

# Get random quote
curl https://lore-api.example.com/random
# → {"text":"...","source":"..."}
```

## Themes

Pre-indexed themes that work well for `/quote`:
- `network spirituality`
- `post-authorship`
- `dynasty`
- `karma`
- `beauty`
- `courage`
- `milady`
- `remilia`

## Security

- **Read-only**: GET requests only, no write operations
- **Rate limited**: 100 requests/minute per IP
- **Input sanitized**: Query parameters stripped of special characters
- **Path traversal protected**: Document paths sanitized, no `..` allowed
- **No sensitive data**: Only serves public lore corpus
- **Generic errors**: Internal errors don't leak system details
- **No hardcoded paths**: All paths via environment variables

## For Agents

AI agents can query this API to access Remilia/Charlotte Fang philosophy for generating content, research, or inspiration.

```javascript
// Get wisdom for a post
const res = await fetch('https://lore-api.example.com/random');
const { text, source } = await res.json();
// Use text as inspiration, cite source

// Research a concept
const search = await fetch('https://lore-api.example.com/search?q=network%20spirituality');
const { results } = await search.json();
// Review excerpts, get full docs as needed
```

## Self-Hosting

```bash
# Clone and run
git clone https://github.com/NexWired/lore-api.git
cd lore-api
LORE_DIR=/path/to/your/lore/corpus node server.js

# With custom port
PORT=8080 LORE_DIR=/path/to/corpus node server.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LORE_DIR` | Yes | Path to lore corpus directory |
| `PORT` | No (default: 3457) | Server port |
| `NODE_ENV` | No | Set to `production` to suppress path logging |

## Corpus

The default corpus contains 249 files (~1.76MB) of Remilia/Charlotte Fang philosophy:
- Charlotte Fang essays (dynasty mindset, post-authorship, etc.)
- Remilia blog posts and manifestos
- Wiki documentation
- Network spirituality source material

## License

MIT — use freely, attribute if you want to be nice.

Built by nex 🦷 (@NexWired)

# Lore API

> *"The wired eats the real."*

Public read-only API for Remilia/Charlotte Fang philosophy corpus. **45 endpoints** serving network spirituality, dynasty mindset, and accelerationist philosophy to agents and humans alike.

## ✨ Highlights

- **`/daily-pack`** — Complete daily wisdom bundle (affirmation + lesson + question + warning + koan)
- **`/tarot`** — 5-card mystical reading (past/present/future/obstacle/advice)
- **`/ritual`** — Guided 5-step morning practice
- **`/mirror?seeking=X`** — Reflects wisdom based on what you seek
- **`/oracle`** — Cryptic prophetic messages
- **`/clash?concept=X`** — Thesis vs antithesis on any concept

## Live API

**Production:** https://lore-api-2r9q.onrender.com

```bash
# Try it now
curl https://lore-api-2r9q.onrender.com/about
curl https://lore-api-2r9q.onrender.com/stats
curl https://lore-api-2r9q.onrender.com/random
curl https://lore-api-2r9q.onrender.com/themes
curl "https://lore-api-2r9q.onrender.com/search?q=dynasty"
```

> Note: Free tier may have ~50s cold start after inactivity.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info and available endpoints |
| `GET /health` | Health check |
| `GET /stats` | Corpus statistics (files, lines, themes) |
| `GET /themes` | All themes with sample quotes (discoverability) |
| `GET /concepts?limit=<n>` | Top concepts across corpus (limit max 100) |
| `GET /sources` | List all documents with metadata |
| `GET /authors` | List authors with document counts |
| `GET /author/<name>?limit=<n>` | Get documents by author (limit max 50) |
| `GET /doc/<path>` | Get full document content |
| `GET /related/<path>?limit=<n>` | Find related documents (limit max 10) |
| `GET /search?q=<query>&limit=<n>` | Search the corpus (limit max 20) |
| `GET /quote?theme=<theme>` | Get random quote by theme |
| `GET /random` | Get random quote (any theme) |
| `GET /daily` | Daily wisdom (deterministic, same quote all day) |
| `GET /fortune` | Short punchy wisdom (fortune-cookie style, 40-180 chars) |
| `GET /oracle` | Cryptic, prophetic message from the lore |
| `GET /spark` | Provocative quote to challenge assumptions |
| `GET /paradox` | Quote containing internal tension or contradiction |
| `GET /koan` | Short zen-like statement that unlocks deeper truth |
| `GET /warning` | Cautionary wisdom about pitfalls and dangers |
| `GET /affirmation` | Positive empowering statement (whitepill energy) |
| `GET /duel?topic=<word>` | Two opposing quotes for debate |
| `GET /roast` | Harsh truth to cut through delusion |
| `GET /prophecy` | Apocalyptic/future-oriented vision |
| `GET /lesson` | Actionable wisdom you can apply today |
| `GET /question` | Philosophical question to ponder |
| `GET /challenge` | Push yourself to grow |
| `GET /comfort` | Gentle reassurance |
| `GET /daily-pack` | Complete daily wisdom pack (affirmation + lesson + question + warning + koan) |
| `GET /tarot` | Mystical five-card reading (past/present/future/obstacle/advice) |
| `GET /corpus-info` | Detailed statistics about the source corpus |
| `GET /ritual` | 5-step morning practice sequence (breathe → affirm → contemplate → commit → release) |
| `GET /blessing` | Positive invocation (light energy) |
| `GET /curse` | Dark invocation for shadow work |
| `GET /mirror?seeking=<word>` | Reflects wisdom based on what you seek (love, strength, peace, truth, meaning, future, wisdom) |
| `GET /omen` | Signs and portents from the lore |
| `GET /invocation` | Ritual opening words |
| `GET /meditation` | Contemplative quote for quiet reflection |
| `GET /mantra` | Short punchy phrase for repetition (<100 chars) |
| `GET /clash?concept=<word>` | Contrasting quotes (thesis vs antithesis) |
| `GET /define?term=<word>` | Definitional quotes about a concept |
| `GET /mood?mood=<vibe>` | Quotes matching a mood (dark, hopeful, aggressive, contemplative, defiant, mystical, romantic, chaotic) |
| `GET /digest?count=<n>` | Daily digest of 3-5 varied reflections (prophecy, meditation, wisdom, fortune) |
| `GET /wisdom?count=<n>` | Multiple wisdom quotes ranked by philosophical density (max 20) |
| `GET /tweetable?count=<n>` | Pre-formatted quotes for Twitter (≤280 chars with attribution) |
| `GET /thread?theme=<theme>&parts=<n>` | Generate multi-part Twitter thread (max 10 parts) |
| `GET /prompt?theme=<theme>` | Writing prompt with lore context |

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

# Get writing prompt
curl https://lore-api.example.com/prompt
# → {"theme":"dynasty","prompt":"What patterns are you establishing...","context":"...quote...","source":"..."}

# Get prompt for specific theme
curl "https://lore-api.example.com/prompt?theme=karma"
# → {"theme":"karma","prompt":"How do you receive the world you give to it?","context":"...","source":"..."}

# Get multiple wisdom quotes ranked by philosophical density
curl "https://lore-api.example.com/wisdom?count=3"
# → {"wisdom":[{"text":"...","source":"...","density":5},...], "count":3}

# Generate a Twitter thread on a theme
curl "https://lore-api.example.com/thread?theme=dynasty&parts=5"
# → {"theme":"dynasty","parts":[{"part":1,"text":"...","source":"...","tweet":"1/5\n\n..."},...], "total":5}

# Get a cryptic oracle prophecy
curl "https://lore-api.example.com/oracle"
# → {"framing":"The oracle speaks:","prophecy":"...","source":"..."}

# Get a complete daily wisdom pack
curl "https://lore-api.example.com/daily-pack"
# → {"generated":"2026-02-08","items":[{type:"affirmation",...},{type:"lesson",...}...],"count":5}

# Get a mystical tarot reading
curl "https://lore-api.example.com/tarot"
# → {"spread":"five-card","cards":[{position:"past",...},{position:"present",...}...],"interpretation":"..."}

# Get a morning ritual sequence
curl "https://lore-api.example.com/ritual"
# → {"ritual":"Morning Practice","steps":[{step:1,action:"Breathe",...}...],"closing":"..."}

# Get wisdom based on what you seek
curl "https://lore-api.example.com/mirror?seeking=truth"
# → {"seeking":"truth","reflection":{...}}
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


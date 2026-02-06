/**
 * Lore API — Public read-only access to Remilia/Charlotte Fang philosophy corpus
 * 
 * Security:
 * - Read-only (GET only)
 * - Rate limited (100 req/min per IP)
 * - Input sanitization
 * - No sensitive data exposure
 * - Generic error responses
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Config - OPSEC: no hardcoded paths, require env var
const PORT = process.env.PORT || 3457;
const LORE_DIR = process.env.LORE_DIR;

if (!LORE_DIR) {
  console.error('FATAL: LORE_DIR environment variable is required');
  process.exit(1);
}
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

// Rate limiting store (in-memory, resets on restart)
const rateLimitStore = new Map();

// Cleanup old rate limit entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function checkRateLimit(ip) {
  const now = Date.now();
  let data = rateLimitStore.get(ip);
  
  if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    data = { windowStart: now, count: 0 };
  }
  
  data.count++;
  rateLimitStore.set(ip, data);
  
  return data.count <= RATE_LIMIT_MAX;
}

// Sanitize input - alphanumeric, spaces, basic punctuation only
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9\s\-_.,!?'"]/g, '').slice(0, 200);
}

// Load lore index (cached)
let loreIndex = null;
function loadLoreIndex() {
  if (loreIndex) return loreIndex;
  
  loreIndex = [];
  
  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relativePath = path.relative(LORE_DIR, fullPath);
            loreIndex.push({
              path: relativePath,
              content: content,
              lines: content.split('\n')
            });
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
  }
  
  walkDir(LORE_DIR);
  console.log(`Loaded ${loreIndex.length} lore files`);
  return loreIndex;
}

// Search lore corpus
function searchLore(query, limit = 5) {
  const index = loadLoreIndex();
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return [];
  
  const results = [];
  
  for (const file of index) {
    const contentLower = file.content.toLowerCase();
    let score = 0;
    
    for (const term of terms) {
      const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }
    
    if (score > 0) {
      // Find best matching excerpt
      let bestExcerpt = '';
      let bestScore = 0;
      
      for (let i = 0; i < file.lines.length; i++) {
        const line = file.lines[i].toLowerCase();
        let lineScore = 0;
        for (const term of terms) {
          if (line.includes(term)) lineScore++;
        }
        if (lineScore > bestScore) {
          bestScore = lineScore;
          // Get context (line before, match, line after)
          const start = Math.max(0, i - 1);
          const end = Math.min(file.lines.length, i + 2);
          bestExcerpt = file.lines.slice(start, end).join(' ').slice(0, 500);
        }
      }
      
      results.push({
        source: file.path.replace(/\.[^.]+$/, ''), // Remove extension
        score,
        excerpt: bestExcerpt
      });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Get random quote by theme
function getQuote(theme) {
  const index = loadLoreIndex();
  const themeLower = theme.toLowerCase();
  const matches = [];
  
  for (const file of index) {
    for (let i = 0; i < file.lines.length; i++) {
      const line = file.lines[i];
      if (line.toLowerCase().includes(themeLower) && line.length > 50 && line.length < 500) {
        matches.push({
          text: line.trim(),
          source: file.path.replace(/\.[^.]+$/, '')
        });
      }
    }
  }
  
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

// Get corpus stats
function getStats() {
  const index = loadLoreIndex();
  let totalChars = 0;
  let totalLines = 0;
  
  for (const file of index) {
    totalChars += file.content.length;
    totalLines += file.lines.length;
  }
  
  return {
    files: index.length,
    characters: totalChars,
    lines: totalLines,
    themes: ['network spirituality', 'post-authorship', 'dynasty', 'karma', 'beauty', 'courage', 'milady', 'remilia']
  };
}

// HTTP server
const server = http.createServer((req, res) => {
  // Get client IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  
  // Rate limiting
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }));
    return;
  }
  
  // CORS headers (public read API)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    
    // Routes
    if (pathname === '/' || pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'Lore API',
        description: 'Public read-only access to Remilia/Charlotte Fang philosophy corpus',
        version: '1.0.0',
        endpoints: [
          'GET /stats - Corpus statistics',
          'GET /search?q=<query>&limit=<n> - Search the corpus',
          'GET /quote?theme=<theme> - Get random quote by theme'
        ],
        source: 'https://github.com/NexWired/lore-api'
      }));
      return;
    }
    
    if (pathname === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }
    
    if (pathname === '/search') {
      const query = sanitize(url.searchParams.get('q') || '');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10), 20);
      
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing query parameter: q' }));
        return;
      }
      
      const results = searchLore(query, limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ query, results }));
      return;
    }
    
    if (pathname === '/quote') {
      const theme = sanitize(url.searchParams.get('theme') || '');
      
      if (!theme) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing query parameter: theme' }));
        return;
      }
      
      const quote = getQuote(theme);
      if (!quote) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No quotes found for theme', theme }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(quote));
      return;
    }
    
    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (e) {
    // Generic error - don't leak details
    console.error('Error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Lore API running on port ${PORT}`);
  // OPSEC: don't log full path in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Serving corpus from: ${LORE_DIR}`);
  }
  // Pre-load index
  loadLoreIndex();
});

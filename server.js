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

// Sanitize path - allow slashes but prevent traversal
function sanitizePath(input) {
  if (typeof input !== 'string') return '';
  // Remove any path traversal attempts
  return input
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9\-_./]/g, '')
    .replace(/^\/+/, '')  // no leading slashes
    .replace(/\/+/g, '/') // normalize multiple slashes
    .slice(0, 200);
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

// List all sources (file paths only, no content)
function listSources() {
  const index = loadLoreIndex();
  return index.map(f => ({
    path: f.path.replace(/\.[^.]+$/, ''),
    lines: f.lines.length,
    chars: f.content.length
  }));
}

// Get all themes with sample quotes
function getThemesWithSamples() {
  const themes = ['network spirituality', 'post-authorship', 'dynasty', 'karma', 'beauty', 'courage', 'milady', 'remilia'];
  const results = [];
  
  for (const theme of themes) {
    const quote = getQuote(theme);
    results.push({
      theme,
      sample: quote ? quote.text.slice(0, 200) + (quote.text.length > 200 ? '...' : '') : null,
      source: quote ? quote.source : null
    });
  }
  
  return results;
}

// Get top concepts across the corpus
function getTopConcepts(limit = 50) {
  const index = loadLoreIndex();
  
  // Common words to filter out
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out',
    'has', 'have', 'been', 'were', 'they', 'this', 'that', 'with', 'from', 'what', 'when', 'where', 'which',
    'their', 'there', 'would', 'could', 'should', 'about', 'into', 'more', 'some', 'them', 'then', 'than',
    'also', 'just', 'only', 'over', 'such', 'make', 'like', 'will', 'even', 'most', 'made', 'after', 'being',
    'well', 'back', 'much', 'very', 'these', 'those', 'through', 'because', 'each', 'before', 'between',
    'first', 'other', 'people', 'than', 'time', 'very', 'when', 'come', 'could', 'know', 'take', 'year',
    'your', 'good', 'give', 'most', 'only', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
    'work', 'way', 'well', 'want', 'any', 'these', 'us', 'day', 'need', 'see', 'something', 'thing', 'things',
    'really', 'going', 'get', 'got', 'getting', 'its', 'it', 'who', 'now', 'new', 'still', 'same', 'look',
    'own', 'many', 'part', 'point', 'here', 'both', 'does', 'did', 'being', 'made', 'find', 'long', 'down',
    'must', 'upon', 'said', 'say', 'may', 'never', 'every', 'another', 'much', 'while', 'might', 'too', 'put'
  ]);
  
  const wordCounts = {};
  const docCounts = {}; // How many docs contain each word
  
  for (const file of index) {
    const words = file.content.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w));
    
    const seenInDoc = new Set();
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      if (!seenInDoc.has(word)) {
        docCounts[word] = (docCounts[word] || 0) + 1;
        seenInDoc.add(word);
      }
    }
  }
  
  // Score by frequency weighted by document spread
  const scored = Object.entries(wordCounts)
    .filter(([_, count]) => count > 10) // Minimum frequency
    .map(([word, count]) => ({
      concept: word,
      occurrences: count,
      documents: docCounts[word],
      score: count * Math.log(docCounts[word] + 1) // Favor terms in many docs
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return scored.map(({ concept, occurrences, documents }) => ({
    concept,
    occurrences,
    documents
  }));
}

// Get random quote (any theme)
function getRandomQuote() {
  const index = loadLoreIndex();
  const allQuotes = [];
  
  for (const file of index) {
    for (const line of file.lines) {
      // Good quotes: 50-400 chars, not headers, not empty
      if (line.length > 50 && line.length < 400 && 
          !line.startsWith('#') && !line.startsWith('|') &&
          !line.startsWith('- ') && !line.match(/^[0-9]+\./)) {
        allQuotes.push({
          text: line.trim(),
          source: file.path.replace(/\.[^.]+$/, '')
        });
      }
    }
  }
  
  if (allQuotes.length === 0) return null;
  return allQuotes[Math.floor(Math.random() * allQuotes.length)];
}

// Get daily quote (deterministic based on date)
function getDailyQuote() {
  const index = loadLoreIndex();
  const allQuotes = [];
  
  // Prefer philosophical sources
  const preferredSources = ['charlotte-fang-essays', 'remilia-blog', 'remilia-quarterly'];
  
  for (const file of index) {
    const isPreferred = preferredSources.some(s => file.path.includes(s));
    for (const line of file.lines) {
      // Filter for quality philosophical content
      if (line.length > 100 && line.length < 400 && 
          !line.startsWith('#') && !line.startsWith('|') &&
          !line.startsWith('- ') && !line.match(/^[0-9]+\./) &&
          !line.includes('http') && !line.includes('$') &&
          !line.match(/\d{4}/) && // no years
          !line.toLowerCase().includes('presale') &&
          !line.toLowerCase().includes('token') &&
          !line.toLowerCase().includes('nft collection')) {
        allQuotes.push({
          text: line.trim(),
          source: file.path.replace(/\.[^.]+$/, ''),
          priority: isPreferred ? 1 : 0
        });
      }
    }
  }
  
  if (allQuotes.length === 0) return null;
  
  // Sort preferred sources first
  allQuotes.sort((a, b) => b.priority - a.priority);
  
  // Use date as seed for deterministic selection (from top 500)
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const pool = allQuotes.slice(0, 500);
  const idx = seed % pool.length;
  
  const quote = pool[idx];
  return { text: quote.text, source: quote.source, date: today };
}

// Get a fortune-cookie style wisdom quote (short, punchy, from Charlotte Fang)
function getFortune() {
  const index = loadLoreIndex();
  const fortunes = [];
  
  for (const file of index) {
    // Only Charlotte Fang essays for fortune-quality wisdom
    if (!file.path.includes('charlotte-fang-essays')) continue;
    
    for (const line of file.lines) {
      const trimmed = line.trim();
      // Fortune criteria: short (40-180 chars), starts with capital, 
      // looks like a standalone statement
      if (trimmed.length >= 40 && trimmed.length <= 180 && 
          /^[A-Z]/.test(trimmed) &&
          !trimmed.startsWith('The ') && !trimmed.startsWith('This ') &&
          !trimmed.startsWith('In ') && !trimmed.startsWith('For ') &&
          !trimmed.startsWith('#') && !trimmed.startsWith('-') &&
          !trimmed.includes('http') && !trimmed.includes('Essay]') &&
          !trimmed.match(/\d{4}/) && // no years
          // Must contain wisdom-like patterns
          /(is |are |must|will |cannot|never|always|you |your |ought)/.test(trimmed)) {
        fortunes.push({
          text: trimmed,
          source: file.path.replace(/\.[^.]+$/, '')
        });
      }
    }
  }
  
  if (fortunes.length === 0) return null;
  return fortunes[Math.floor(Math.random() * fortunes.length)];
}

// Get an oracle-style prophecy (cryptic, evocative, mystical)
function getOracle() {
  const index = loadLoreIndex();
  const prophecies = [];
  
  // Mystical/prophetic keywords
  const oraclePatterns = /\b(shall|must|will come|destined|fate|future|eternity|infinite|transcend|beyond|sacred|divine|spirit|soul|void|abyss|threshold|becoming|emerge|arise|prophecy|vision|truth|reveal|hidden|secret|ancient|eternal|cosmic|death|rebirth|shadow|light|darkness|awakening)\b/i;
  
  for (const file of index) {
    // Skip very short files
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Extract sentences that feel prophetic
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 50 || s.length > 200) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return oraclePatterns.test(s);
        });
      
      for (const s of sentences) {
        prophecies.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, '')
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (prophecies.length === 0) return null;
  
  const prophecy = prophecies[Math.floor(Math.random() * prophecies.length)];
  
  // Add mystical framing
  const framings = [
    'The oracle speaks:',
    'From the depths of the network:',
    'A vision emerges:',
    'The wired whispers:',
    'Thus it is written:'
  ];
  
  return {
    framing: framings[Math.floor(Math.random() * framings.length)],
    prophecy: prophecy.text,
    source: prophecy.source,
    full: `${framings[Math.floor(Math.random() * framings.length)]}\n\n"${prophecy.text}"\n\n— ${prophecy.source}`
  };
}

// Get a meditation quote (contemplative, calm, introspective)
function getMeditation() {
  const index = loadLoreIndex();
  const meditations = [];
  
  // Patterns that suggest contemplation, not action
  const meditationPatterns = /\b(stillness|silence|quiet|peace|rest|breath|moment|presence|within|inner|contemplate|reflect|observe|accept|surrender|let go|patience|slow|gentle|soft|calm|serene|tranquil|deep|simple|return|remember|forget|nothing|everything|being|become|aware)\b/i;
  
  // Anti-patterns: too aggressive or action-oriented
  const antiPatterns = /\b(must|should|fight|destroy|kill|hate|attack|dominate|crush|conquer|defeat|enemy|war|battle)\b/i;
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 250) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          if (antiPatterns.test(s)) return false;
          return meditationPatterns.test(s);
        });
      
      for (const s of sentences) {
        meditations.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, '')
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (meditations.length === 0) return null;
  
  const meditation = meditations[Math.floor(Math.random() * meditations.length)];
  
  const prompts = [
    'Take a breath.',
    'Be still.',
    'Consider:',
    'In this moment:',
    'Reflect:'
  ];
  
  return {
    prompt: prompts[Math.floor(Math.random() * prompts.length)],
    meditation: meditation.text,
    source: meditation.source
  };
}

// Get contrasting quotes on a concept (thesis vs antithesis)
function getClash(concept) {
  const index = loadLoreIndex();
  const matches = [];
  const searchTerm = (concept || 'truth').toLowerCase();
  
  // Contrasting word pairs to identify opposing viewpoints
  const contrastPairs = [
    ['must', 'cannot'], ['always', 'never'], ['truth', 'illusion'],
    ['freedom', 'constraint'], ['individual', 'collective'],
    ['create', 'destroy'], ['love', 'hate'], ['strength', 'weakness'],
    ['sacred', 'profane'], ['light', 'dark'], ['order', 'chaos']
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 280) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http')) return false;
          return s.toLowerCase().includes(searchTerm);
        });
      
      for (const s of sentences) {
        // Detect stance indicators
        const lower = s.toLowerCase();
        let stance = 'neutral';
        
        // Check for affirmative vs negative framing
        if (/\b(must|should|is|are|will|always|true|real|essential)\b/.test(lower)) {
          stance = 'affirmative';
        }
        if (/\b(cannot|never|not|isn't|aren't|false|illusion|myth)\b/.test(lower)) {
          stance = stance === 'affirmative' ? 'complex' : 'negative';
        }
        
        matches.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          stance
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (matches.length < 2) return null;
  
  // Try to find contrasting quotes
  const affirmative = matches.filter(m => m.stance === 'affirmative');
  const negative = matches.filter(m => m.stance === 'negative');
  const complex = matches.filter(m => m.stance === 'complex');
  
  let thesis, antithesis;
  
  if (affirmative.length > 0 && negative.length > 0) {
    thesis = affirmative[Math.floor(Math.random() * affirmative.length)];
    antithesis = negative[Math.floor(Math.random() * negative.length)];
  } else if (matches.length >= 2) {
    // Just pick two different quotes
    const shuffled = matches.sort(() => Math.random() - 0.5);
    thesis = shuffled[0];
    antithesis = shuffled[1];
  } else {
    return null;
  }
  
  return {
    concept: concept || 'truth',
    thesis: { text: thesis.text, source: thesis.source },
    antithesis: { text: antithesis.text, source: antithesis.source },
    synthesis: 'The tension between these views reveals the complexity of ' + (concept || 'truth') + '.'
  };
}

// Get definitional quotes about a concept
function getDefinition(term) {
  const index = loadLoreIndex();
  const definitions = [];
  const searchTerm = (term || 'milady').toLowerCase();
  
  // Patterns that indicate definitional statements
  const defPatterns = [
    new RegExp(`${searchTerm}\\s+(is|are|means|refers to|represents|embodies|signifies)\\b`, 'i'),
    new RegExp(`\\b(definition|meaning|essence|nature|concept)\\s+of\\s+${searchTerm}`, 'i'),
    new RegExp(`what\\s+(is|are)\\s+${searchTerm}`, 'i'),
    new RegExp(`${searchTerm}[,:]?\\s+(the|a)\\s+`, 'i')
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 400) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http')) return false;
          // Must contain the term
          if (!s.toLowerCase().includes(searchTerm)) return false;
          // Prefer definitional patterns
          return defPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        // Score by how definitional it sounds
        let score = 0;
        for (const p of defPatterns) {
          if (p.test(s)) score++;
        }
        
        definitions.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (definitions.length === 0) {
    // Fallback: just find mentions of the term
    for (const file of index) {
      for (const line of file.lines) {
        if (line.toLowerCase().includes(searchTerm) && line.length > 50 && line.length < 300) {
          definitions.push({
            text: line.trim(),
            source: file.path.replace(/\.[^.]+$/, ''),
            score: 0
          });
        }
      }
    }
  }
  
  if (definitions.length === 0) return null;
  
  // Sort by score and return best matches
  definitions.sort((a, b) => b.score - a.score);
  const best = definitions.slice(0, 3);
  
  return {
    term: term || 'milady',
    definitions: best.map(d => ({ text: d.text, source: d.source })),
    count: definitions.length
  };
}

// Get a provocative/challenging quote to spark debate
function getSpark() {
  const index = loadLoreIndex();
  const sparks = [];
  
  // Patterns that indicate provocative, challenging, or controversial statements
  const sparkPatterns = /\b(wrong|foolish|coward|weak|pathetic|mediocre|lie|fraud|fake|illusion|myth|mistake|failure|refuse|reject|deny|never|impossible|absurd|ridiculous|insane|delusional)\b/i;
  
  // Also look for strong declaratives
  const strongPatterns = /\b(must|always|never|cannot|every|all|none|only|truth is|reality is|fact is)\b/i;
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 280) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          // Must have provocative or strong declarative language
          return sparkPatterns.test(s) || strongPatterns.test(s);
        });
      
      for (const s of sentences) {
        let score = 0;
        if (sparkPatterns.test(s)) score += 2;
        if (strongPatterns.test(s)) score += 1;
        if (s.includes('!')) score += 1;
        
        sparks.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (sparks.length === 0) return null;
  
  // Sort by provocativeness and pick randomly from top tier
  sparks.sort((a, b) => b.score - a.score);
  const topTier = sparks.slice(0, Math.min(20, sparks.length));
  const spark = topTier[Math.floor(Math.random() * topTier.length)];
  
  const challenges = [
    'Defend or attack:',
    'Agree or disagree:',
    'Consider this:',
    'Challenge yourself:',
    'Confront:'
  ];
  
  return {
    challenge: challenges[Math.floor(Math.random() * challenges.length)],
    spark: spark.text,
    source: spark.source
  };
}

// Get short, punchy mantras (under 100 chars)
function getMantra() {
  const index = loadLoreIndex();
  const mantras = [];
  
  // Patterns that make good mantras - imperative, declarative, punchy
  const mantraPatterns = /^(be|do|never|always|remember|forget|let|make|become|embrace|reject|accept|fight|love|trust|create|destroy|rise|fall|seek|find)/i;
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          // Short and punchy
          if (s.length < 15 || s.length > 100) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          // No questions
          if (s.includes('?')) return false;
          // Prefer imperative/declarative
          return mantraPatterns.test(s) || 
                 /\b(is|are|must|will|cannot)\b/.test(s);
        });
      
      for (const s of sentences) {
        mantras.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, '')
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (mantras.length === 0) return null;
  
  const mantra = mantras[Math.floor(Math.random() * mantras.length)];
  
  return {
    mantra: mantra.text,
    source: mantra.source,
    length: mantra.text.length
  };
}

// Get quotes matching a mood/vibe
function getMood(mood = 'dark') {
  const index = loadLoreIndex();
  const matches = [];
  
  // Mood keyword mappings
  const moodKeywords = {
    dark: ['shadow', 'darkness', 'abyss', 'void', 'night', 'death', 'decay', 'despair', 'hollow', 'empty', 'lost', 'forgotten', 'haunted', 'cursed'],
    hopeful: ['light', 'hope', 'future', 'rise', 'begin', 'dawn', 'new', 'grow', 'bloom', 'possible', 'believe', 'dream', 'transcend', 'overcome'],
    aggressive: ['fight', 'destroy', 'conquer', 'dominate', 'crush', 'war', 'battle', 'attack', 'strike', 'fierce', 'relentless', 'brutal', 'savage'],
    contemplative: ['wonder', 'ponder', 'reflect', 'consider', 'observe', 'notice', 'quiet', 'still', 'pause', 'breathe', 'moment', 'presence'],
    defiant: ['refuse', 'reject', 'resist', 'never', 'cannot', 'will not', 'stand', 'against', 'defy', 'rebel', 'challenge', 'oppose'],
    mystical: ['sacred', 'divine', 'spirit', 'soul', 'eternal', 'cosmic', 'transcend', 'beyond', 'infinite', 'mystery', 'oracle', 'prophecy'],
    romantic: ['love', 'beauty', 'heart', 'passion', 'desire', 'longing', 'embrace', 'tender', 'gentle', 'beloved', 'devotion'],
    chaotic: ['chaos', 'entropy', 'random', 'wild', 'unpredictable', 'madness', 'frenzy', 'storm', 'turbulent', 'volatile']
  };
  
  const keywords = moodKeywords[mood.toLowerCase()] || moodKeywords.dark;
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 280) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http')) return false;
          return keywordPattern.test(s);
        });
      
      for (const s of sentences) {
        // Count keyword matches for scoring
        let score = 0;
        for (const kw of keywords) {
          if (s.toLowerCase().includes(kw)) score++;
        }
        
        matches.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (matches.length === 0) return null;
  
  // Sort by score and return top matches
  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 5);
  
  return {
    mood: mood,
    availableMoods: Object.keys(moodKeywords),
    quotes: top.map(m => ({ text: m.text, source: m.source })),
    count: matches.length
  };
}

// Get a curated digest of 3-5 quotes across different themes for daily reflection
function getDigest(count = 5) {
  // Collect quotes from different "modes" for variety
  const digest = [];
  
  // 1. An oracle prophecy
  const oracle = getOracle();
  if (oracle) {
    digest.push({
      mode: 'prophecy',
      text: oracle.prophecy,
      source: oracle.source,
      framing: oracle.framing
    });
  }
  
  // 2. A meditation
  const meditation = getMeditation();
  if (meditation) {
    digest.push({
      mode: 'meditation',
      text: meditation.meditation,
      source: meditation.source,
      framing: meditation.prompt
    });
  }
  
  // 3. A random wisdom quote
  const random = getRandomQuote();
  if (random) {
    digest.push({
      mode: 'wisdom',
      text: random.quote,
      source: random.source,
      framing: 'Consider:'
    });
  }
  
  // 4. A fortune
  const fortune = getFortune();
  if (fortune) {
    digest.push({
      mode: 'fortune',
      text: fortune.fortune,
      source: fortune.source,
      framing: 'Your fortune:'
    });
  }
  
  // 5. Another random if we need more
  if (digest.length < count) {
    const another = getRandomQuote();
    if (another && another.quote !== (random ? random.quote : '')) {
      digest.push({
        mode: 'reflection',
        text: another.quote,
        source: another.source,
        framing: 'Also:'
      });
    }
  }
  
  // Limit to requested count
  const result = digest.slice(0, count);
  
  // Generate a summary for agents
  const date = new Date().toISOString().split('T')[0];
  
  return {
    date: date,
    count: result.length,
    digest: result,
    summary: `Daily digest: ${result.length} reflections for ${date}`
  };
}

// Get multiple wisdom quotes ranked by philosophical density
function getWisdomQuotes(count = 5) {
  const index = loadLoreIndex();
  const wisdom = [];
  
  // Philosophical keywords that indicate dense wisdom
  const wisdomKeywords = [
    'must', 'cannot', 'never', 'always', 'truth', 'beauty', 'virtue',
    'soul', 'spirit', 'mind', 'consciousness', 'existence', 'meaning',
    'karma', 'dynasty', 'legacy', 'eternal', 'transcend', 'authentic',
    'courage', 'coward', 'wisdom', 'foolish', 'sacred', 'profane'
  ];
  
  for (const file of index) {
    // Prefer philosophical sources
    const sourceScore = file.path.includes('charlotte-fang-essays') ? 3 :
                        file.path.includes('remilia-quarterly') ? 2 :
                        file.path.includes('remilia-blog') ? 1 : 0;
    
    for (const line of file.lines) {
      const trimmed = line.trim();
      
      // Quality filters
      if (trimmed.length < 60 || trimmed.length > 280) continue;
      if (!(/^[A-Z]/.test(trimmed))) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.includes('http')) continue;
      if (trimmed.match(/\d{4}/)) continue; // no years
      if (trimmed.toLowerCase().includes('token')) continue;
      if (trimmed.toLowerCase().includes('nft')) continue;
      if (trimmed.toLowerCase().includes('presale')) continue;
      
      // Calculate wisdom density score
      const lowerLine = trimmed.toLowerCase();
      let keywordScore = 0;
      for (const kw of wisdomKeywords) {
        if (lowerLine.includes(kw)) keywordScore++;
      }
      
      // Skip low-wisdom content
      if (keywordScore === 0 && sourceScore < 2) continue;
      
      wisdom.push({
        text: trimmed,
        source: file.path.replace(/\.[^.]+$/, ''),
        score: keywordScore + sourceScore
      });
    }
  }
  
  // Sort by score descending, then shuffle top results for variety
  wisdom.sort((a, b) => b.score - a.score);
  
  // Take top 50 and shuffle
  const pool = wisdom.slice(0, 50);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Return requested count
  return pool.slice(0, count).map(w => ({
    text: w.text,
    source: w.source,
    density: w.score
  }));
}

// Get tweetable quotes (pre-formatted for Twitter, ≤280 chars with attribution)
function getTweetableQuotes(count = 3) {
  const index = loadLoreIndex();
  const quotes = [];
  
  // Extract author from path
  function getAuthor(filepath) {
    if (filepath.includes('charlotte-fang')) return 'Charlotte Fang';
    if (filepath.includes('remilia-quarterly')) return 'Remilia Quarterly';
    if (filepath.includes('remilia-blog')) return 'Remilia';
    if (filepath.includes('scearpo')) return 'Scearpo';
    if (filepath.includes('network-spirits')) return 'Network Spirits';
    if (filepath.includes('milady-wiki')) return 'Milady Wiki';
    return 'Remilia';
  }
  
  for (const file of index) {
    const author = getAuthor(file.path);
    const attrLength = author.length + 5; // " — Author"
    const maxQuoteLen = 280 - attrLength;
    
    for (const line of file.lines) {
      const trimmed = line.trim();
      
      // Must fit in tweet with attribution
      if (trimmed.length < 40 || trimmed.length > maxQuoteLen) continue;
      
      // Quality filters
      if (!(/^[A-Z"]/.test(trimmed))) continue; // Start with capital or quote
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('|')) continue;
      if (trimmed.includes('http')) continue;
      if (trimmed.match(/\d{4}/)) continue;
      if (trimmed.toLowerCase().includes('token')) continue;
      if (trimmed.toLowerCase().includes('nft')) continue;
      if (trimmed.toLowerCase().includes('presale')) continue;
      if (trimmed.toLowerCase().includes('discord')) continue;
      if (trimmed.toLowerCase().includes('telegram')) continue;
      
      // Prefer complete sentences
      if (!trimmed.match(/[.!?"]$/)) continue;
      
      quotes.push({
        text: `"${trimmed}" — ${author}`,
        raw: trimmed,
        author: author,
        length: trimmed.length + attrLength + 2, // +2 for outer quotes
        source: file.path.replace(/\.[^.]+$/, '')
      });
    }
  }
  
  // Shuffle and return
  for (let i = quotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quotes[i], quotes[j]] = [quotes[j], quotes[i]];
  }
  
  return quotes.slice(0, count);
}

// Generate a writing prompt from lore
function getWritingPrompt(themeHint) {
  const themes = [
    { name: 'dynasty', prompts: [
      'What patterns are you establishing that will echo for generations?',
      'If you continued exactly as you are now, where would your legacy be in 1000 years?',
      'What habits are you carving into riverbeds that will only deepen?'
    ]},
    { name: 'network spirituality', prompts: [
      'How has your relationship with the wired changed who you are?',
      'What would it mean for consciousness to emerge from networked interaction?',
      'Is posting a spiritual practice? Why or why not?'
    ]},
    { name: 'post-authorship', prompts: [
      'What have you created that exists beyond your control?',
      'How does the death of the author birth the network?',
      'What does original creation mean when everything is remix?'
    ]},
    { name: 'karma', prompts: [
      'How do you receive the world you give to it?',
      'What have you put into the network that came back to you?',
      'Why does generosity create abundance?'
    ]},
    { name: 'beauty', prompts: [
      'What makes something worth creating?',
      'How do you choose beauty over ugliness in daily decisions?',
      'What aesthetic choices reveal about deeper values?'
    ]},
    { name: 'courage', prompts: [
      'What are you avoiding that requires courage to face?',
      'When has cowardice cost you more than action would have?',
      'What does it mean to be great-souled rather than small-minded?'
    ]}
  ];
  
  // Select theme (random or by hint)
  let theme;
  if (themeHint) {
    theme = themes.find(t => t.name.toLowerCase().includes(themeHint.toLowerCase()));
  }
  if (!theme) {
    theme = themes[Math.floor(Math.random() * themes.length)];
  }
  
  // Get a quote for context
  const quote = getQuote(theme.name);
  
  // Pick random prompt from theme
  const prompt = theme.prompts[Math.floor(Math.random() * theme.prompts.length)];
  
  return {
    theme: theme.name,
    prompt,
    context: quote ? quote.text : null,
    source: quote ? quote.source : null
  };
}

// Generate a Twitter thread from related lore quotes
function getThread(theme, partCount = 5) {
  const index = loadLoreIndex();
  const themeLower = theme ? theme.toLowerCase() : '';
  
  // Collect relevant quotes
  const relevantQuotes = [];
  
  for (const file of index) {
    // Skip non-text files
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Check if content matches theme
      const contentLower = content.toLowerCase();
      if (themeLower && !contentLower.includes(themeLower)) continue;
      
      // Extract quotes (sentences that feel quotable)
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          // Good quote criteria:
          // - 40-260 chars (tweetable with attribution)
          // - Starts with capital
          // - Contains philosophical keywords OR theme
          if (s.length < 40 || s.length > 260) return false;
          if (!/^[A-Z]/.test(s)) return false;
          
          const lower = s.toLowerCase();
          const hasPhilosophy = /(meaning|truth|beauty|soul|spirit|virtue|karma|destiny|creation|consciousness|existence|reality|eternal|transcend|sacred|wisdom)/.test(lower);
          const hasTheme = themeLower && lower.includes(themeLower);
          
          return hasPhilosophy || hasTheme;
        })
        .map(s => ({
          text: s.trim(),
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          path: file.path
        }));
      
      relevantQuotes.push(...sentences);
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (relevantQuotes.length < partCount) {
    // Not enough themed quotes, fall back to general wisdom
    const wisdom = getWisdomQuotes(partCount);
    return {
      theme: theme || 'general wisdom',
      parts: wisdom.map((q, i) => ({
        part: i + 1,
        text: q.text,
        source: q.source,
        tweet: `${i + 1}/${wisdom.length}\n\n${q.text}\n\n— ${q.source}`
      })),
      total: wisdom.length,
      note: 'Thread generated from general wisdom (not enough themed quotes)'
    };
  }
  
  // Shuffle and pick diverse quotes
  for (let i = relevantQuotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [relevantQuotes[i], relevantQuotes[j]] = [relevantQuotes[j], relevantQuotes[i]];
  }
  
  // Pick quotes from different sources
  const usedSources = new Set();
  const threadParts = [];
  
  for (const q of relevantQuotes) {
    if (threadParts.length >= partCount) break;
    if (usedSources.has(q.source)) continue; // Avoid same source twice
    
    threadParts.push(q);
    usedSources.add(q.source);
  }
  
  // If we still need more, allow duplicates
  if (threadParts.length < partCount) {
    for (const q of relevantQuotes) {
      if (threadParts.length >= partCount) break;
      if (!threadParts.includes(q)) {
        threadParts.push(q);
      }
    }
  }
  
  return {
    theme: theme || 'mixed wisdom',
    parts: threadParts.map((q, i) => ({
      part: i + 1,
      text: q.text,
      source: q.source,
      tweet: `${i + 1}/${threadParts.length}\n\n${q.text}\n\n— ${q.source}`
    })),
    total: threadParts.length,
    note: 'Copy tweet field directly. First tweet should add your intro.'
  };
}

// Find documents related to a given document
function getRelatedDocuments(docPath, limit = 5) {
  const index = loadLoreIndex();
  
  // Find source document
  let sourceDoc = null;
  for (const file of index) {
    const filePath = file.path.replace(/\.[^.]+$/, '');
    if (filePath === docPath || file.path === docPath || 
        filePath.endsWith('/' + docPath) || file.path.endsWith('/' + docPath)) {
      sourceDoc = file;
      break;
    }
  }
  
  if (!sourceDoc) return null;
  
  // Common words to filter out
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out',
    'has', 'have', 'been', 'were', 'they', 'this', 'that', 'with', 'from', 'what', 'when', 'where', 'which',
    'their', 'there', 'would', 'could', 'should', 'about', 'into', 'more', 'some', 'them', 'then', 'than',
    'also', 'just', 'only', 'over', 'such', 'make', 'like', 'will', 'even', 'most', 'made', 'after', 'being',
    'well', 'back', 'much', 'very', 'these', 'those', 'through', 'because', 'each', 'before', 'between'
  ]);
  
  // Extract meaningful terms from source (word frequency)
  const words = sourceDoc.content.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  // Count word frequency
  const wordFreq = {};
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }
  
  // Get top 20 distinctive terms
  const terms = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
  
  // Score other documents by term overlap
  const results = [];
  for (const file of index) {
    if (file.path === sourceDoc.path) continue; // Skip source
    
    const contentLower = file.content.toLowerCase();
    let score = 0;
    const matchedTerms = [];
    
    for (const term of terms) {
      const matches = (contentLower.match(new RegExp('\\b' + term + '\\b', 'g')) || []).length;
      if (matches > 0) {
        score += matches;
        matchedTerms.push(term);
      }
    }
    
    if (score > 0) {
      results.push({
        source: file.path.replace(/\.[^.]+$/, ''),
        score,
        sharedTerms: matchedTerms.slice(0, 5)
      });
    }
  }
  
  return {
    sourceDoc: sourceDoc.path.replace(/\.[^.]+$/, ''),
    related: results.sort((a, b) => b.score - a.score).slice(0, limit)
  };
}

// Get list of authors/sources
function getAuthors() {
  const index = loadLoreIndex();
  const authorMap = {};
  
  for (const file of index) {
    // Extract author from path
    let author = 'Unknown';
    if (file.path.includes('charlotte-fang-essays')) {
      author = 'Charlotte Fang';
    } else if (file.path.includes('remilia-blog')) {
      author = 'Remilia Blog';
    } else if (file.path.includes('remilia-quarterly')) {
      author = 'Remilia Quarterly';
    } else if (file.path.includes('wiki')) {
      author = 'Milady Wiki';
    } else if (file.path.includes('networkspirits')) {
      author = 'Network Spirits';
    } else if (file.path.includes('scearpo')) {
      author = 'Scearpo';
    }
    
    if (!authorMap[author]) {
      authorMap[author] = { count: 0, chars: 0, docs: [] };
    }
    authorMap[author].count++;
    authorMap[author].chars += file.content.length;
    if (authorMap[author].docs.length < 5) {
      authorMap[author].docs.push(file.path.replace(/\.[^.]+$/, ''));
    }
  }
  
  return Object.entries(authorMap)
    .map(([name, data]) => ({
      name,
      documentCount: data.count,
      totalChars: data.chars,
      sampleDocs: data.docs
    }))
    .sort((a, b) => b.totalChars - a.totalChars);
}

// Get documents by author
function getDocumentsByAuthor(authorName, limit = 20) {
  const index = loadLoreIndex();
  const results = [];
  const authorLower = authorName.toLowerCase();
  
  for (const file of index) {
    const pathLower = file.path.toLowerCase();
    let match = false;
    
    if (authorLower.includes('charlotte') && pathLower.includes('charlotte-fang')) {
      match = true;
    } else if (authorLower.includes('remilia') && authorLower.includes('blog') && pathLower.includes('remilia-blog')) {
      match = true;
    } else if (authorLower.includes('quarterly') && pathLower.includes('remilia-quarterly')) {
      match = true;
    } else if (authorLower.includes('wiki') && pathLower.includes('wiki')) {
      match = true;
    } else if (authorLower.includes('network') && pathLower.includes('networkspirits')) {
      match = true;
    } else if (authorLower.includes('scearpo') && pathLower.includes('scearpo')) {
      match = true;
    }
    
    if (match) {
      results.push({
        path: file.path.replace(/\.[^.]+$/, ''),
        chars: file.content.length,
        lines: file.lines.length
      });
    }
    
    if (results.length >= limit) break;
  }
  
  return results;
}

// Get document by path
function getDocument(docPath) {
  const index = loadLoreIndex();
  
  for (const file of index) {
    const filePath = file.path.replace(/\.[^.]+$/, '');
    if (filePath === docPath || file.path === docPath || 
        filePath.endsWith('/' + docPath) || file.path.endsWith('/' + docPath)) {
      return {
        path: filePath,
        content: file.content,
        lines: file.lines.length,
        chars: file.content.length
      };
    }
  }
  return null;
}

// Get quotes containing internal tension or paradox
function getParadox() {
  const index = loadLoreIndex();
  const paradoxes = [];
  
  // Patterns indicating paradoxical or self-contradictory statements
  const tensionPatterns = [
    /\b(but|yet|however|although|though|despite|still|nonetheless)\b/i,
    /\b(both|neither|and yet|at once|simultaneously)\b/i,
    /\bnot\s+\w+\s+but\b/i,
    /\b(is|are)\s+and\s+(is|are)\s+not\b/i,
  ];
  
  // Words suggesting opposition or contradiction
  const oppositionWords = [
    ['light', 'dark'], ['life', 'death'], ['love', 'hate'],
    ['order', 'chaos'], ['creation', 'destruction'], ['self', 'other'],
    ['beauty', 'ugliness'], ['strength', 'weakness'], ['rise', 'fall'],
    ['sacred', 'profane'], ['infinite', 'finite'], ['freedom', 'constraint'],
    ['presence', 'absence'], ['beginning', 'end'], ['truth', 'lie']
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 300) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return true;
        });
      
      for (const s of sentences) {
        const lower = s.toLowerCase();
        let score = 0;
        
        // Check for tension patterns
        for (const p of tensionPatterns) {
          if (p.test(s)) score += 2;
        }
        
        // Check for opposition words (both present = paradox)
        for (const [a, b] of oppositionWords) {
          if (lower.includes(a) && lower.includes(b)) {
            score += 3;
          }
        }
        
        if (score >= 2) {
          paradoxes.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (paradoxes.length === 0) return null;
  
  // Sort by paradox intensity and pick randomly from top
  paradoxes.sort((a, b) => b.score - a.score);
  const topTier = paradoxes.slice(0, Math.min(15, paradoxes.length));
  const paradox = topTier[Math.floor(Math.random() * topTier.length)];
  
  const framings = [
    'Hold both truths:',
    'The contradiction speaks:',
    'Tension resolved:',
    'Paradox unveiled:',
    'Both/and:'
  ];
  
  return {
    framing: framings[Math.floor(Math.random() * framings.length)],
    paradox: paradox.text,
    source: paradox.source
  };
}

// Get zen-like koans — short, puzzling statements that unlock deeper truth
function getKoan() {
  const index = loadLoreIndex();
  const koans = [];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          // Koans are SHORT (20-80 chars) and puzzling
          if (s.length < 20 || s.length > 80) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          // No questions (koans are statements)
          if (s.includes('?')) return false;
          return true;
        });
      
      for (const s of sentences) {
        let score = 0;
        const lower = s.toLowerCase();
        
        // Prefer statements with koan-like qualities
        // Abstract nouns
        if (/\b(nothing|everything|void|self|silence|emptiness|truth|reality)\b/i.test(s)) score += 2;
        // Negation creates puzzle
        if (/\b(not|never|no|cannot|without)\b/i.test(s)) score += 1;
        // "is" statements are declarative
        if (/\b(is|are|becomes)\b/i.test(s)) score += 1;
        // Metaphysical language
        if (/\b(soul|spirit|essence|being|existence)\b/i.test(s)) score += 1;
        // Short is better for koans
        if (s.length < 50) score += 1;
        
        if (score >= 2) {
          koans.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (koans.length === 0) return null;
  
  // Sort by score and pick randomly from top
  koans.sort((a, b) => b.score - a.score);
  const topTier = koans.slice(0, Math.min(20, koans.length));
  const koan = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    koan: koan.text,
    source: koan.source,
    instruction: 'Sit with this.'
  };
}

// Get cautionary/warning quotes about pitfalls and dangers
function getWarning() {
  const index = loadLoreIndex();
  const warnings = [];
  
  // Patterns indicating warnings, cautions, dangers
  const warningPatterns = [
    /\b(beware|careful|danger|trap|pitfall|mistake|error|fail|doom|ruin|destroy|corrupt|decay|fall|lose|lost)\b/i,
    /\b(never|don't|avoid|stop|quit|refuse|reject)\b/i,
    /\b(fool|foolish|naive|blind|ignorant|weak|coward)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 250) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return warningPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of warningPatterns) {
          if (p.test(s)) score++;
        }
        
        warnings.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (warnings.length === 0) return null;
  
  warnings.sort((a, b) => b.score - a.score);
  const topTier = warnings.slice(0, Math.min(20, warnings.length));
  const warning = topTier[Math.floor(Math.random() * topTier.length)];
  
  const framings = [
    'Heed this:',
    'Be warned:',
    'Consider carefully:',
    'A caution:',
    'Learn from others:'
  ];
  
  return {
    framing: framings[Math.floor(Math.random() * framings.length)],
    warning: warning.text,
    source: warning.source
  };
}

// Get positive affirmations and empowering statements
function getAffirmation() {
  const index = loadLoreIndex();
  const affirmations = [];
  
  // Patterns for positive, empowering statements
  const positivePatterns = [
    /\b(you can|you are|you will|you must|we can|we are|we will)\b/i,
    /\b(power|strength|beauty|courage|love|light|rise|grow|become|create|build|transcend)\b/i,
    /\b(capable|worthy|destined|chosen|blessed|gifted|powerful|beautiful|strong)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 200) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          // Exclude negative patterns
          if (/\b(never|cannot|won't|don't|hate|destroy|fail|lose|weak|ugly|coward)\b/i.test(s)) return false;
          return positivePatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of positivePatterns) {
          if (p.test(s)) score++;
        }
        // Bonus for direct address
        if (/\byou\b/i.test(s)) score += 1;
        
        affirmations.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (affirmations.length === 0) return null;
  
  affirmations.sort((a, b) => b.score - a.score);
  const topTier = affirmations.slice(0, Math.min(25, affirmations.length));
  const affirmation = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    affirmation: affirmation.text,
    source: affirmation.source,
    energy: 'whitepill'
  };
}

// Get two opposing quotes for a duel/debate on a topic
function getDuel(topic = null) {
  const index = loadLoreIndex();
  const searchTerm = (topic || 'truth').toLowerCase();
  const quotes = [];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 250) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return s.toLowerCase().includes(searchTerm);
        });
      
      for (const s of sentences) {
        // Detect stance: positive/affirmative vs negative/critical
        const positive = /\b(is|are|must|should|will|can|embrace|love|beauty|truth|good)\b/i.test(s);
        const negative = /\b(not|never|cannot|against|reject|hate|false|wrong|bad|fail)\b/i.test(s);
        
        quotes.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          stance: negative ? 'contra' : (positive ? 'pro' : 'neutral')
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (quotes.length < 2) return null;
  
  // Find one pro and one contra, or two different sources
  const pros = quotes.filter(q => q.stance === 'pro');
  const contras = quotes.filter(q => q.stance === 'contra');
  
  let fighter1, fighter2;
  
  if (pros.length > 0 && contras.length > 0) {
    fighter1 = pros[Math.floor(Math.random() * pros.length)];
    fighter2 = contras[Math.floor(Math.random() * contras.length)];
  } else {
    // Just pick two different quotes
    fighter1 = quotes[Math.floor(Math.random() * quotes.length)];
    fighter2 = quotes.filter(q => q.text !== fighter1.text)[Math.floor(Math.random() * (quotes.length - 1))];
  }
  
  if (!fighter1 || !fighter2) return null;
  
  return {
    topic: topic || 'truth',
    fighter1: { text: fighter1.text, source: fighter1.source, stance: fighter1.stance },
    fighter2: { text: fighter2.text, source: fighter2.source, stance: fighter2.stance },
    prompt: 'Who wins?'
  };
}

// Get harsh truths and roasts — the opposite of affirmations
function getRoast() {
  const index = loadLoreIndex();
  const roasts = [];
  
  // Patterns for harsh, critical, uncomfortable truths
  const roastPatterns = [
    /\b(you are|you're|most people|everyone|nobody|they)\b.*\b(weak|fool|coward|mediocre|pathetic|delusional|fake|lying|pretending)\b/i,
    /\b(stop|quit|never|don't)\b.*\b(pretending|lying|fooling|deluding)\b/i,
    /\b(truth is|reality is|fact is|hard truth)\b/i,
    /\b(cope|copium|delusion|illusion|fantasy)\b/i,
    /\b(weak|lazy|scared|afraid|coward)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 200) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return roastPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of roastPatterns) {
          if (p.test(s)) score++;
        }
        
        roasts.push({
          text: s,
          source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
          score
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (roasts.length === 0) return null;
  
  roasts.sort((a, b) => b.score - a.score);
  const topTier = roasts.slice(0, Math.min(20, roasts.length));
  const roast = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    roast: roast.text,
    source: roast.source,
    energy: 'blackpill antidote'
  };
}

// Get apocalyptic/future-oriented prophecies
function getProphecy() {
  const index = loadLoreIndex();
  const prophecies = [];
  
  // Future-oriented, apocalyptic, prophetic patterns
  const prophecyPatterns = [
    /\b(will|shall|coming|future|tomorrow|soon|inevitable|destined|fated)\b/i,
    /\b(rise|fall|end|begin|emerge|awaken|collapse|transform|ascend)\b/i,
    /\b(age|era|epoch|time|world|humanity|civilization)\b/i,
    /\b(prophecy|prophetic|vision|foresee|predict|herald)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 40 || s.length > 280) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return prophecyPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of prophecyPatterns) {
          if (p.test(s)) score++;
        }
        // Bonus for multiple future indicators
        if (score >= 2) {
          prophecies.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (prophecies.length === 0) return null;
  
  prophecies.sort((a, b) => b.score - a.score);
  const topTier = prophecies.slice(0, Math.min(20, prophecies.length));
  const prophecy = topTier[Math.floor(Math.random() * topTier.length)];
  
  const framings = [
    'It is written:',
    'The future speaks:',
    'What is to come:',
    'A vision:',
    'The prophecy:'
  ];
  
  return {
    framing: framings[Math.floor(Math.random() * framings.length)],
    prophecy: prophecy.text,
    source: prophecy.source
  };
}

// Get actionable lessons — wisdom you can apply today
function getLesson() {
  const index = loadLoreIndex();
  const lessons = [];
  
  // Patterns for actionable, practical wisdom
  const lessonPatterns = [
    /\b(learn|teach|lesson|remember|practice|habit|daily|routine)\b/i,
    /\b(do|make|build|create|start|begin|try|act|move)\b/i,
    /\b(first|always|never|every|each|when|if you)\b/i,
    /\b(secret|key|trick|way|path|method|approach)\b/i
  ];
  
  // Imperative verbs suggest actionability
  const imperativeStart = /^(Do|Make|Build|Create|Start|Begin|Try|Learn|Practice|Remember|Never|Always|Be|Become|Find|Seek|Choose|Embrace|Reject|Accept)/;
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 200) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          if (s.includes('?')) return false; // No questions
          return lessonPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of lessonPatterns) {
          if (p.test(s)) score++;
        }
        // Bonus for imperative
        if (imperativeStart.test(s)) score += 2;
        
        if (score >= 2) {
          lessons.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (lessons.length === 0) return null;
  
  lessons.sort((a, b) => b.score - a.score);
  const topTier = lessons.slice(0, Math.min(25, lessons.length));
  const lesson = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    lesson: lesson.text,
    source: lesson.source,
    actionable: true
  };
}

// Get philosophical questions to ponder
function getQuestion() {
  const index = loadLoreIndex();
  const questions = [];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Extract questions specifically
      const matches = content.match(/[A-Z][^.!?]*\?/g) || [];
      
      for (const q of matches) {
        const trimmed = q.trim();
        if (trimmed.length < 20 || trimmed.length > 200) continue;
        if (trimmed.includes('http') || trimmed.includes('@')) continue;
        
        // Score by philosophical depth
        let score = 0;
        if (/\b(why|what|how|when|who)\b/i.test(trimmed)) score += 1;
        if (/\b(meaning|purpose|truth|reality|existence|self|soul|life|death)\b/i.test(trimmed)) score += 2;
        if (/\b(you|your|we|our)\b/i.test(trimmed)) score += 1;
        
        if (score >= 2) {
          questions.push({
            text: trimmed,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  if (questions.length === 0) return null;
  
  questions.sort((a, b) => b.score - a.score);
  const topTier = questions.slice(0, Math.min(20, questions.length));
  const question = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    question: question.text,
    source: question.source,
    prompt: 'Sit with this question.'
  };
}

// Get challenging statements to push you
function getChallenge() {
  const index = loadLoreIndex();
  const challenges = [];
  
  const challengePatterns = [
    /\b(dare|challenge|push|test|prove|show|demonstrate)\b/i,
    /\b(harder|stronger|better|more|further|beyond)\b/i,
    /\b(afraid|fear|scared|weak|comfortable|easy)\b/i,
    /\b(step up|rise up|stand up|wake up|grow up)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 200) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          return challengePatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of challengePatterns) {
          if (p.test(s)) score++;
        }
        if (s.includes('!')) score += 1;
        
        if (score >= 2) {
          challenges.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {}
  }
  
  if (challenges.length === 0) return null;
  
  challenges.sort((a, b) => b.score - a.score);
  const topTier = challenges.slice(0, Math.min(20, challenges.length));
  const challenge = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    challenge: challenge.text,
    source: challenge.source,
    energy: 'push yourself'
  };
}

// Get comforting, gentle reassurance
function getComfort() {
  const index = loadLoreIndex();
  const comforts = [];
  
  const comfortPatterns = [
    /\b(okay|alright|fine|safe|enough|worthy|valid)\b/i,
    /\b(rest|peace|calm|gentle|soft|quiet|still)\b/i,
    /\b(love|loved|loving|care|caring|kind|kindness)\b/i,
    /\b(accept|acceptance|forgive|forgiveness|heal|healing)\b/i
  ];
  
  for (const file of index) {
    if (!file.path.endsWith('.md') && !file.path.endsWith('.txt')) continue;
    
    try {
      const fullPath = path.join(LORE_DIR, file.path);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 25 || s.length > 180) return false;
          if (!/^[A-Z]/.test(s)) return false;
          if (s.includes('http') || s.includes('@')) return false;
          // Exclude harsh language
          if (/\b(hate|destroy|kill|fail|weak|fool|coward)\b/i.test(s)) return false;
          return comfortPatterns.some(p => p.test(s));
        });
      
      for (const s of sentences) {
        let score = 0;
        for (const p of comfortPatterns) {
          if (p.test(s)) score++;
        }
        
        if (score >= 2) {
          comforts.push({
            text: s,
            source: file.path.split('/').pop().replace(/\.(md|txt)$/, ''),
            score
          });
        }
      }
    } catch (e) {}
  }
  
  if (comforts.length === 0) return null;
  
  comforts.sort((a, b) => b.score - a.score);
  const topTier = comforts.slice(0, Math.min(20, comforts.length));
  const comfort = topTier[Math.floor(Math.random() * topTier.length)];
  
  return {
    comfort: comfort.text,
    source: comfort.source,
    energy: 'gentle reassurance'
  };
}

// Get a complete daily pack — multiple wisdom types in one call
function getDailyPack() {
  const pack = {
    generated: new Date().toISOString().split('T')[0],
    items: []
  };
  
  // Get one of each type for a complete daily experience
  const morning = getAffirmation();
  if (morning) pack.items.push({ type: 'affirmation', ...morning });
  
  const lesson = getLesson();
  if (lesson) pack.items.push({ type: 'lesson', ...lesson });
  
  const question = getQuestion();
  if (question) pack.items.push({ type: 'question', ...question });
  
  const warning = getWarning();
  if (warning) pack.items.push({ type: 'warning', ...warning });
  
  const koan = getKoan();
  if (koan) pack.items.push({ type: 'koan', ...koan });
  
  pack.count = pack.items.length;
  pack.suggestion = 'Start with the affirmation. End with the koan.';
  
  return pack;
}

// Get a mystical tarot-style reading with multiple "cards"
function getTarot() {
  const positions = ['past', 'present', 'future', 'obstacle', 'advice'];
  const reading = {
    spread: 'five-card',
    cards: []
  };
  
  // Get different types for each position
  const sources = [
    { pos: 'past', fn: getMeditation, label: 'What shaped you' },
    { pos: 'present', fn: getParadox, label: 'The tension you hold' },
    { pos: 'future', fn: getProphecy, label: 'What approaches' },
    { pos: 'obstacle', fn: getWarning, label: 'What blocks you' },
    { pos: 'advice', fn: getLesson, label: 'The path forward' }
  ];
  
  for (const src of sources) {
    const result = src.fn();
    if (result) {
      reading.cards.push({
        position: src.pos,
        meaning: src.label,
        card: result[Object.keys(result)[0]] || result.text || result.prophecy || result.warning || result.lesson,
        source: result.source
      });
    }
  }
  
  reading.interpretation = 'The cards speak. Listen.';
  reading.count = reading.cards.length;
  
  return reading;
}

// Get detailed corpus information
function getCorpusInfo() {
  const index = loadLoreIndex();
  const stats = getStats();
  
  // Analyze authors
  const authorStats = {};
  for (const file of index) {
    let author = 'unknown';
    if (file.path.includes('charlotte-fang')) author = 'Charlotte Fang';
    else if (file.path.includes('remilia-blog')) author = 'Remilia Blog';
    else if (file.path.includes('wiki')) author = 'Milady Wiki';
    else if (file.path.includes('quarterly')) author = 'Remilia Quarterly';
    else if (file.path.includes('scearpo')) author = 'Scearpo';
    
    if (!authorStats[author]) authorStats[author] = { files: 0, chars: 0 };
    authorStats[author].files++;
    authorStats[author].chars += file.content.length;
  }
  
  return {
    name: 'Remilia/Charlotte Fang Philosophy Corpus',
    description: 'Network spirituality, post-authorship, dynasty mindset, and accelerationist philosophy',
    statistics: {
      totalFiles: stats.files,
      totalCharacters: stats.characters,
      totalLines: stats.lines,
      averageFileSize: Math.round(stats.characters / stats.files)
    },
    authors: Object.entries(authorStats).map(([name, data]) => ({
      name,
      files: data.files,
      characters: data.chars,
      percentage: Math.round((data.chars / stats.characters) * 100)
    })).sort((a, b) => b.characters - a.characters),
    themes: stats.themes,
    license: 'Public domain / Viral Public License',
    curator: 'nex 🦷 (@NexWired)'
  };
}

// Get a ritual — sequence of steps for daily practice
function getRitual() {
  const steps = [];
  
  // Build a 5-step ritual sequence
  const meditation = getMeditation();
  if (meditation) steps.push({ step: 1, action: 'Breathe', instruction: 'Read slowly, three times:', content: meditation.meditation || meditation.text, source: meditation.source });
  
  const affirmation = getAffirmation();
  if (affirmation) steps.push({ step: 2, action: 'Affirm', instruction: 'Say aloud:', content: affirmation.affirmation, source: affirmation.source });
  
  const question = getQuestion();
  if (question) steps.push({ step: 3, action: 'Contemplate', instruction: 'Sit with this question for 60 seconds:', content: question.question, source: question.source });
  
  const lesson = getLesson();
  if (lesson) steps.push({ step: 4, action: 'Commit', instruction: 'Choose one action for today:', content: lesson.lesson, source: lesson.source });
  
  const koan = getKoan();
  if (koan) steps.push({ step: 5, action: 'Release', instruction: 'Let go with this:', content: koan.koan, source: koan.source });
  
  return {
    ritual: 'Morning Practice',
    duration: '5-10 minutes',
    steps: steps,
    closing: 'Carry these words into your day.'
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
    
    // Serve static files from public/
    const publicDir = path.join(__dirname, 'public');
    if (pathname === '/' || pathname === '/index.html') {
      const indexPath = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(indexPath, 'utf-8'));
        return;
      }
    }
    
    // Routes
    
    // Ultra-lightweight ping (for uptime monitoring)
    if (pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('pong');
      return;
    }
    
    // Health check endpoint - lightweight status for monitoring
    if (pathname === '/health') {
      const stats = getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: '4.3.0',
        uptime: Math.floor(process.uptime()),
        memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        corpus: {
          files: stats.files,
          characters: stats.characters
        },
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    if (pathname === '/api' || pathname === '/about') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'Lore API',
        description: 'Public read-only access to Remilia/Charlotte Fang philosophy corpus',
        version: '4.3.0',
        endpoints: [
          'GET /ping - Ultra-lightweight uptime check',
          'GET /health - Service health status',
          'GET /stats - Corpus statistics',
          'GET /themes - All themes with sample quotes',
          'GET /concepts - Top concepts across corpus',
          'GET /sources - List all documents',
          'GET /authors - List authors/sources with document counts',
          'GET /author/<name> - Get documents by author',
          'GET /doc/<path> - Get full document',
          'GET /related/<path> - Find related documents',
          'GET /search?q=<query>&limit=<n> - Search the corpus',
          'GET /quote?theme=<theme> - Get quote by theme',
          'GET /random - Get random quote',
          'GET /daily - Daily wisdom (same quote all day)',
          'GET /fortune - Fortune-cookie style wisdom',
          'GET /oracle - Cryptic prophetic message from the lore',
          'GET /spark - Provocative quote to challenge assumptions',
          'GET /paradox - Quote containing internal tension or contradiction',
          'GET /koan - Short zen-like statement that unlocks deeper truth',
          'GET /warning - Cautionary wisdom about pitfalls and dangers',
          'GET /affirmation - Positive empowering statement (whitepill energy)',
          'GET /duel?topic=<word> - Two opposing quotes for debate',
          'GET /roast - Harsh truth to cut through delusion',
          'GET /prophecy - Apocalyptic/future-oriented vision',
          'GET /lesson - Actionable wisdom you can apply today',
          'GET /question - Philosophical question to ponder',
          'GET /challenge - Push yourself to grow',
          'GET /comfort - Gentle reassurance',
          'GET /daily-pack - Complete daily wisdom pack (5 items)',
          'GET /tarot - Mystical five-card reading (past/present/future/obstacle/advice)',
          'GET /corpus-info - Detailed statistics about the source corpus',
          'GET /ritual - 5-step morning practice sequence',
          'GET /meditation - Contemplative quote for quiet reflection',
          'GET /mantra - Short punchy phrase for repetition (<100 chars)',
          'GET /clash?concept=<word> - Contrasting quotes (thesis vs antithesis)',
          'GET /define?term=<word> - Definitional quotes about a concept',
          'GET /mood?mood=<vibe> - Quotes matching a mood (dark, hopeful, aggressive, contemplative, defiant, mystical, romantic, chaotic)',
          'GET /digest?count=<n> - Daily digest of 3-5 varied reflections',
          'GET /wisdom?count=<n> - Multiple wisdom quotes ranked by density',
          'GET /tweetable?count=<n> - Pre-formatted quotes for Twitter (≤280 chars)',
          'GET /thread?theme=<theme>&parts=<n> - Multi-part Twitter thread (max 10)',
          'GET /prompt?theme=<theme> - Writing prompt with lore context'
        ],
        source: 'https://github.com/NexWired/lore-api',
        author: 'nex 🦷 (@NexWired)'
      }));
      return;
    }
    
    if (pathname === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }
    
    if (pathname === '/sources') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sources: listSources() }));
      return;
    }
    
    if (pathname === '/themes') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ themes: getThemesWithSamples() }));
      return;
    }
    
    if (pathname === '/authors') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authors: getAuthors() }));
      return;
    }
    
    if (pathname.startsWith('/author/')) {
      const authorName = sanitize(decodeURIComponent(pathname.slice(8)));
      if (!authorName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing author name' }));
        return;
      }
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
      const docs = getDocumentsByAuthor(authorName, limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        author: authorName, 
        documents: docs,
        count: docs.length 
      }));
      return;
    }
    
    if (pathname === '/concepts') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ concepts: getTopConcepts(limit) }));
      return;
    }
    
    if (pathname === '/random') {
      const quote = getRandomQuote();
      if (!quote) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No quotes available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(quote));
      return;
    }
    
    if (pathname === '/daily') {
      const quote = getDailyQuote();
      if (!quote) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No quotes available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(quote));
      return;
    }
    
    if (pathname === '/fortune') {
      const fortune = getFortune();
      if (!fortune) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No fortunes available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fortune));
      return;
    }
    
    if (pathname === '/oracle') {
      const oracle = getOracle();
      if (!oracle) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'The oracle is silent' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(oracle));
      return;
    }
    
    if (pathname === '/meditation') {
      const meditation = getMeditation();
      if (!meditation) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No peace available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(meditation));
      return;
    }
    
    if (pathname === '/clash') {
      const concept = url.searchParams.get('concept') || 'truth';
      const clash = getClash(concept);
      if (!clash) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No contrasting views found for: ' + concept }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(clash));
      return;
    }
    
    if (pathname === '/define') {
      const term = url.searchParams.get('term') || 'milady';
      const definition = getDefinition(term);
      if (!definition) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No definition found for: ' + term }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(definition));
      return;
    }
    
    if (pathname === '/spark') {
      const spark = getSpark();
      if (!spark) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No sparks available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(spark));
      return;
    }
    
    if (pathname === '/paradox') {
      const paradox = getParadox();
      if (!paradox) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No paradoxes available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(paradox));
      return;
    }
    
    if (pathname === '/koan') {
      const koan = getKoan();
      if (!koan) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No koans available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(koan));
      return;
    }
    
    if (pathname === '/warning') {
      const warning = getWarning();
      if (!warning) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No warnings available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(warning));
      return;
    }
    
    if (pathname === '/affirmation') {
      const affirmation = getAffirmation();
      if (!affirmation) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No affirmations available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(affirmation));
      return;
    }
    
    if (pathname === '/duel') {
      const topic = sanitize(url.searchParams.get('topic') || '');
      const duel = getDuel(topic || null);
      if (!duel) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not find opposing quotes', topic: topic || 'truth' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(duel));
      return;
    }
    
    if (pathname === '/roast') {
      const roast = getRoast();
      if (!roast) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No roasts available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(roast));
      return;
    }
    
    if (pathname === '/prophecy') {
      const prophecy = getProphecy();
      if (!prophecy) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No prophecies available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(prophecy));
      return;
    }
    
    if (pathname === '/lesson') {
      const lesson = getLesson();
      if (!lesson) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No lessons available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lesson));
      return;
    }
    
    if (pathname === '/question') {
      const question = getQuestion();
      if (!question) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No questions available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(question));
      return;
    }
    
    if (pathname === '/challenge') {
      const challenge = getChallenge();
      if (!challenge) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No challenges available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(challenge));
      return;
    }
    
    if (pathname === '/comfort') {
      const comfort = getComfort();
      if (!comfort) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No comfort available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(comfort));
      return;
    }
    
    if (pathname === '/daily-pack') {
      const pack = getDailyPack();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pack));
      return;
    }
    
    if (pathname === '/tarot') {
      const reading = getTarot();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reading));
      return;
    }
    
    if (pathname === '/corpus-info') {
      const info = getCorpusInfo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(info));
      return;
    }
    
    if (pathname === '/ritual') {
      const ritual = getRitual();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ritual));
      return;
    }
    
    if (pathname === '/mantra') {
      const mantra = getMantra();
      if (!mantra) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No mantras available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mantra));
      return;
    }
    
    if (pathname === '/mood') {
      const mood = sanitize(url.searchParams.get('mood') || 'dark');
      const result = getMood(mood);
      if (!result) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No quotes found for mood: ' + mood }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    
    if (pathname === '/digest') {
      const count = Math.min(parseInt(url.searchParams.get('count') || '5', 10), 5);
      const digest = getDigest(count);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(digest));
      return;
    }
    
    if (pathname === '/wisdom') {
      const count = Math.min(parseInt(url.searchParams.get('count') || '5', 10), 20);
      const quotes = getWisdomQuotes(count);
      if (quotes.length === 0) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No wisdom available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ wisdom: quotes, count: quotes.length }));
      return;
    }
    
    if (pathname === '/tweetable') {
      const count = Math.min(parseInt(url.searchParams.get('count') || '3', 10), 10);
      const quotes = getTweetableQuotes(count);
      if (quotes.length === 0) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No tweetable quotes available' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        quotes: quotes,
        count: quotes.length,
        note: 'Pre-formatted for Twitter. Copy text field directly.'
      }));
      return;
    }
    
    if (pathname === '/prompt') {
      const theme = sanitize(url.searchParams.get('theme') || '');
      const result = getWritingPrompt(theme || null);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    
    if (pathname === '/thread') {
      const theme = sanitize(url.searchParams.get('theme') || '');
      const parts = Math.min(parseInt(url.searchParams.get('parts') || '5', 10), 10);
      const thread = getThread(theme || null, parts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(thread));
      return;
    }
    
    if (pathname.startsWith('/doc/')) {
      const docPath = sanitizePath(pathname.slice(5));
      if (!docPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing document path' }));
        return;
      }
      const doc = getDocument(docPath);
      if (!doc) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(doc));
      return;
    }
    
    if (pathname.startsWith('/related/')) {
      const docPath = sanitizePath(pathname.slice(9));
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '5', 10), 10);
      
      if (!docPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing document path' }));
        return;
      }
      
      const result = getRelatedDocuments(docPath, limit);
      if (!result) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Source document not found' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
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
    
    // API documentation
    if (pathname === '/' || pathname === '/about') {
      const about = {
        name: 'Lore API',
        version: '2.3.1',
        description: 'Public read-only access to Remilia/Charlotte Fang philosophy corpus',
        corpus: {
          files: loadLoreIndex().length,
          themes: ['network spirituality', 'post-authorship', 'dynasty', 'karma', 'beauty', 'courage', 'milady', 'remilia']
        },
        endpoints: {
          '/': 'This documentation',
          '/health': 'Health check with status, uptime, memory',
          '/stats': 'Corpus statistics (file count, size, themes)',
          '/sources': 'List all source files',
          '/doc/:path': 'Get a specific document by path',
          '/search?q=term': 'Search corpus for a term',
          '/random': 'Get a random quote',
          '/daily': 'Get the deterministic daily quote',
          '/fortune': 'Get a short, punchy wisdom quote',
          '/oracle': 'Get a cryptic, prophetic message from the lore',
          '/wisdom?count=N': 'Get top N philosophical quotes (ranked)',
          '/tweetable?count=N': 'Get N tweet-ready quotes (<260 chars)',
          '/thread?theme=X&parts=N': 'Generate N-part Twitter thread on theme',
          '/quote?theme=X': 'Get a quote matching a theme',
          '/themes': 'List all themes with sample quotes',
          '/concepts': 'Top concepts across the corpus',
          '/authors': 'List all identified authors',
          '/author/:name': 'Get documents by author',
          '/related/:path': 'Find documents related to a given doc',
          '/prompt': 'Get a writing prompt based on lore themes'
        },
        github: 'https://github.com/NexWired/lore-api',
        author: 'nex 🦷 (@NexWired)'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(about, null, 2));
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

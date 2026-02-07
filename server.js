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
    
    // Health check endpoint - lightweight status for monitoring
    if (pathname === '/health') {
      const stats = getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: '2.3.0',
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
        version: '2.3.0',
        endpoints: [
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
          'GET /wisdom?count=<n> - Multiple wisdom quotes ranked by density',
          'GET /tweetable?count=<n> - Pre-formatted quotes for Twitter (≤280 chars)',
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
        version: '2.3.0',
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

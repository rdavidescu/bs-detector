/**
 * BS Detector — Content Script
 *
 * Injected into web pages. Extracts visible article text content
 * and sends it to the background service worker for analysis.
 *
 * STRATEGY (article-first, then cascade):
 *   1. Try known article-body selectors used by major news sites
 *   2. Fall back to <article> tag with noise stripping
 *   3. Fall back to <main> tag
 *   4. Fall back to <body>
 *   5. Special handling for YouTube (description + transcript)
 *
 * NOTE: Content scripts run as classic scripts (not ES modules).
 * Cannot use import/export — constants inlined here.
 */

// Inlined from shared/constants.js (content scripts can't import)
const MESSAGE_TYPES = {
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',
  ANALYZE_REQUEST: 'ANALYZE_REQUEST'
};

const CONTENT_LIMITS = {
  MAX_CHARS: 12000,
  MIN_CHARS: 100,
  TRUNCATION_MARKER: '[content truncated...]'
};

// Tags that are never useful for article content
const BOILERPLATE_TAGS = ['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript', 'iframe', 'svg'];

// Elements inside an article that are noise (related stories, share buttons, etc.)
const NOISE_SELECTORS = [
  // ── Generic noise ──────────────────────────────────────────────────────
  '[class*="related"]',
  '[class*="share"]',
  '[class*="social"]',
  '[class*="sidebar"]',
  '[class*="newsletter"]',
  '[class*="subscribe"]',
  '[class*="promo"]',
  '[class*="advertisement"]',
  '[class*="ad-"]',
  '[class*="comment"]',
  '[class*="more-on"]',
  '[class*="also-read"]',
  '[class*="recommended"]',
  '[class*="trending"]',
  '[class*="read-more"]',
  '[class*="read-next"]',
  '[class*="popular"]',
  '[class*="latest-news"]',
  '[class*="most-read"]',
  '[class*="top-stories"]',
  '[data-testid*="share"]',
  '[role="complementary"]',
  'figure figcaption',

  // ── Third-party recommendation widgets ─────────────────────────────────
  '[class*="outbrain"]',
  '[class*="taboola"]',
  '[class*="recirculation"]',
  '[class*="sponsored"]',
  '[id*="outbrain"]',
  '[id*="taboola"]',
  '[data-widget*="outbrain"]',
  '[data-widget*="taboola"]',

  // ── Romanian news sites (Antena3, ProTV, Digi24, etc.) ─────────────────
  '[class*="citeste"]',           // "citește și" = "also read"
  '[class*="vezi-si"]',           // "vezi și" = "see also"
  '[class*="alte-articole"]',     // "alte articole" = "other articles"
  '[class*="articole-"]',         // article previews/lists
  '[class*="stiri-"]',            // "știri" = "news" sidebar blocks
  '[class*="articol-related"]',
  '[class*="media-body"]',        // often used for article preview cards
  '[class*="article-preview"]',
  '[class*="article-listing"]',
  '[class*="news-list"]',
  '[class*="story-list"]',
  '[class*="article-card"]',
];

// Known article body selectors for major news sites (most specific first)
const ARTICLE_BODY_SELECTORS = [
  '[data-testid="article-body"]',        // Reuters, some modern sites
  '.article-body',                         // Many news sites
  '.article__body',                        // BEM-style news sites
  '.story-body',                           // BBC-style
  '.post-content',                         // Blogs, WordPress
  '.entry-content',                        // WordPress standard
  '.article-content',                      // Generic news
  '.wysiwyg',                              // CMS WYSIWYG content
  '[itemprop="articleBody"]',              // Schema.org markup
  '.field--name-body',                     // Drupal sites
];

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function stripBoilerplate(root) {
  for (const tag of BOILERPLATE_TAGS) {
    for (const el of root.querySelectorAll(tag)) {
      el.remove();
    }
  }
  return root;
}

function stripNoise(root) {
  for (const sel of NOISE_SELECTORS) {
    try {
      for (const el of root.querySelectorAll(sel)) {
        el.remove();
      }
    } catch {
      // Invalid selector on this page — skip it
    }
  }
  return root;
}

function cleanText(el) {
  const clone = el.cloneNode(true);
  stripBoilerplate(clone);
  stripNoise(clone);
  return (clone.innerText || clone.textContent || '').trim();
}

function extractMetadata() {
  const meta = {};

  // Author
  const authorMeta = document.querySelector(
    'meta[name="author"], meta[property="article:author"], [rel="author"], .author-name, [itemprop="author"]'
  );
  if (authorMeta) {
    meta.author = authorMeta.content || authorMeta.textContent || '';
  }

  // Published date
  const dateMeta = document.querySelector(
    'meta[property="article:published_time"], time[datetime], [itemprop="datePublished"]'
  );
  if (dateMeta) {
    meta.publishedDate = dateMeta.content || dateMeta.getAttribute('datetime') || dateMeta.textContent || '';
  }

  // Description
  const descMeta = document.querySelector(
    'meta[name="description"], meta[property="og:description"]'
  );
  if (descMeta) {
    meta.description = descMeta.content || '';
  }

  return meta;
}

// ---------------------------------------------------------------------------
// YouTube-specific extraction
// ---------------------------------------------------------------------------

function isYouTube() {
  return window.location.hostname.includes('youtube.com');
}

function extractYouTube() {
  const parts = [];

  // Video title
  const titleEl = document.querySelector(
    'h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string, #title h1'
  );
  if (titleEl) {
    parts.push('VIDEO TITLE: ' + titleEl.textContent.trim());
  }

  // Channel name
  const channelEl = document.querySelector(
    '#channel-name yt-formatted-string a, ytd-channel-name yt-formatted-string a'
  );
  if (channelEl) {
    parts.push('CHANNEL: ' + channelEl.textContent.trim());
  }

  // Description (expand button might need clicking, but we grab what's visible)
  const descEl = document.querySelector(
    'ytd-text-inline-expander .content, #description-inline-expander yt-formatted-string, ytd-expander #content'
  );
  if (descEl) {
    parts.push('DESCRIPTION:\n' + descEl.textContent.trim());
  }

  // Transcript — YouTube renders it in a panel when opened
  const transcriptSegments = document.querySelectorAll(
    'ytd-transcript-segment-renderer .segment-text, [class*="transcript"] .segment-text'
  );
  if (transcriptSegments.length > 0) {
    const transcript = Array.from(transcriptSegments)
      .map((seg) => seg.textContent.trim())
      .join(' ');
    parts.push('TRANSCRIPT:\n' + transcript);
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

function getBestContent() {
  // YouTube special case
  if (isYouTube()) {
    const ytContent = extractYouTube();
    if (ytContent.length >= CONTENT_LIMITS.MIN_CHARS) {
      return ytContent;
    }
    // Fall through to generic extraction if YT-specific didn't get enough
  }

  // Strategy 1: Known article-body selectors (most precise)
  for (const selector of ARTICLE_BODY_SELECTORS) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el);
        if (text.length >= CONTENT_LIMITS.MIN_CHARS) {
          return text;
        }
      }
    } catch {
      // Invalid selector on this page
    }
  }

  // Strategy 2: <article> tag with aggressive noise stripping
  const article = document.querySelector('article');
  if (article) {
    const text = cleanText(article);
    if (text.length >= CONTENT_LIMITS.MIN_CHARS) {
      return text;
    }
  }

  // Strategy 3: <main> tag
  const main = document.querySelector('main');
  if (main) {
    const text = cleanText(main);
    if (text.length >= CONTENT_LIMITS.MIN_CHARS) {
      return text;
    }
  }

  // Strategy 4: full body (last resort)
  const bodyClone = document.body.cloneNode(true);
  stripBoilerplate(bodyClone);
  stripNoise(bodyClone);
  return (bodyClone.innerText || bodyClone.textContent || '').trim();
}

function trimContent(text) {
  if (!text || text.length <= CONTENT_LIMITS.MAX_CHARS) {
    return { content: text || '', wasTrimmed: false };
  }
  const budget = CONTENT_LIMITS.MAX_CHARS - CONTENT_LIMITS.TRUNCATION_MARKER.length - 1;
  let cutPoint = budget;
  while (cutPoint > 0 && text[cutPoint] !== ' ') {
    cutPoint--;
  }
  if (cutPoint < budget * 0.8) cutPoint = budget;
  return {
    content: text.slice(0, cutPoint) + ' ' + CONTENT_LIMITS.TRUNCATION_MARKER,
    wasTrimmed: true
  };
}

function detectContentType() {
  const url = window.location.href;
  if (isYouTube()) return 'video_page';
  if (url.includes('/forum') || url.includes('/discussion')) return 'forum';
  if (document.querySelector('article, [itemprop="articleBody"]')) return 'article';
  return 'unknown';
}

function extractContent(selectedText) {
  const title = document.title || '';
  const url = window.location.href || '';
  const metadata = extractMetadata();
  const contentType = detectContentType();

  let rawContent;
  if (selectedText && selectedText.trim().length > 0) {
    rawContent = selectedText.trim();
  } else {
    rawContent = getBestContent();
  }

  if (rawContent.length < CONTENT_LIMITS.MIN_CHARS) {
    return { title, url, content: rawContent, contentType, error: 'Content insufficient' };
  }

  // Prepend metadata context for the model
  let enrichedContent = rawContent;
  const metaParts = [];
  if (metadata.author) metaParts.push('Author: ' + metadata.author);
  if (metadata.publishedDate) metaParts.push('Published: ' + metadata.publishedDate);
  if (metaParts.length > 0) {
    enrichedContent = metaParts.join(' | ') + '\n\n' + rawContent;
  }

  const trimmed = trimContent(enrichedContent);
  return {
    title,
    url,
    content: trimmed.content,
    contentType,
    wasTrimmed: trimmed.wasTrimmed,
    originalLength: rawContent.length
  };
}

// Listen for extraction requests from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.EXTRACT_CONTENT) {
    const result = extractContent();
    sendResponse(result);
  }
  return true;
});

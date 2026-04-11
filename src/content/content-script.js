/**
 * BS Detector — Content Script
 *
 * Injected into web pages. Extracts visible text content
 * and sends it to the background service worker for analysis.
 *
 * NOTE: Content scripts run as classic scripts (not ES modules).
 * Cannot use import/export — constants inlined here.
 * The extractor.js module is used in tests but the content script
 * will use its own extraction logic or we'll add a bundler later.
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

const BOILERPLATE_TAGS = ['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript'];

function stripBoilerplate(root) {
  for (const tag of BOILERPLATE_TAGS) {
    const elements = root.querySelectorAll(tag);
    for (const el of elements) {
      el.remove();
    }
  }
  return root;
}

function getBestContent() {
  const article = document.querySelector('article');
  if (article) {
    const clone = article.cloneNode(true);
    stripBoilerplate(clone);
    return clone.innerText || clone.textContent || '';
  }

  const main = document.querySelector('main');
  if (main) {
    const clone = main.cloneNode(true);
    stripBoilerplate(clone);
    return clone.innerText || clone.textContent || '';
  }

  const bodyClone = document.body.cloneNode(true);
  stripBoilerplate(bodyClone);
  return bodyClone.innerText || bodyClone.textContent || '';
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

function extractContent(selectedText) {
  const title = document.title || '';
  const url = window.location.href || '';

  let rawContent;
  if (selectedText && selectedText.trim().length > 0) {
    rawContent = selectedText.trim();
  } else {
    rawContent = getBestContent().trim();
  }

  if (rawContent.length < CONTENT_LIMITS.MIN_CHARS) {
    return { title, url, content: rawContent, contentType: 'unknown', error: 'Content insufficient' };
  }

  const trimmed = trimContent(rawContent);
  return {
    title,
    url,
    content: trimmed.content,
    contentType: 'unknown',
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

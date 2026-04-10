/**
 * BS Detector — Content Extractor
 *
 * Extracts analyzable text from web pages.
 * Strips boilerplate (nav, footer, sidebar), prefers <article> content,
 * respects user text selection, and enforces content limits.
 */
import { CONTENT_LIMITS, CONTENT_TYPES } from '../shared/constants.js';
import { trimContent } from '../shared/content-trimmer.js';

/** Tags to strip from extraction (boilerplate) */
const BOILERPLATE_TAGS = ['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript'];

/**
 * Remove boilerplate elements from a cloned DOM node.
 *
 * @param {Element} root - DOM element to clean (will be mutated)
 * @returns {Element} The cleaned element
 */
function stripBoilerplate(root) {
  for (const tag of BOILERPLATE_TAGS) {
    const elements = root.querySelectorAll(tag);
    for (const el of elements) {
      el.remove();
    }
  }
  return root;
}

/**
 * Get the best content source from the page.
 * Priority: <article> > <main> > <body>
 *
 * @returns {string} Extracted text content
 */
function getBestContent() {
  // Try <article> first
  const article = document.querySelector('article');
  if (article) {
    const clone = article.cloneNode(true);
    stripBoilerplate(clone);
    return clone.innerText || clone.textContent || '';
  }

  // Try <main>
  const main = document.querySelector('main');
  if (main) {
    const clone = main.cloneNode(true);
    stripBoilerplate(clone);
    return clone.innerText || clone.textContent || '';
  }

  // Fall back to body with boilerplate stripped
  const bodyClone = document.body.cloneNode(true);
  stripBoilerplate(bodyClone);
  return bodyClone.innerText || bodyClone.textContent || '';
}

/**
 * Extract content from the current page.
 *
 * @param {string} [selectedText] - User-selected text (takes priority)
 * @returns {{
 *   title: string,
 *   url: string,
 *   content: string,
 *   contentType: string,
 *   wasTrimmed: boolean,
 *   originalLength: number,
 *   error?: string
 * }}
 */
export function extractContent(selectedText) {
  const title = document.title || '';
  const url = window.location.href || '';

  // Use selected text if provided, otherwise extract from DOM
  let rawContent;
  if (selectedText && selectedText.trim().length > 0) {
    rawContent = selectedText.trim();
  } else {
    rawContent = getBestContent().trim();
  }

  // Check minimum content threshold
  if (rawContent.length < CONTENT_LIMITS.MIN_CHARS) {
    return {
      title,
      url,
      content: rawContent,
      contentType: CONTENT_TYPES.UNKNOWN,
      wasTrimmed: false,
      originalLength: rawContent.length,
      error: 'Content insufficient — page has too little text to analyze'
    };
  }

  // Trim to budget
  const trimmed = trimContent(rawContent);

  return {
    title,
    url,
    content: trimmed.content,
    contentType: CONTENT_TYPES.UNKNOWN,
    wasTrimmed: trimmed.wasTrimmed,
    originalLength: trimmed.originalLength
  };
}

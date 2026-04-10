/**
 * WS-02 — Content Extractor Unit Tests (RED phase — written before implementation)
 *
 * Tests the content extraction logic that pulls text from web pages.
 * The extractor grabs visible text, title, URL, and metadata.
 */
import { extractContent } from '../../src/content/extractor.js';
import { CONTENT_LIMITS, CONTENT_TYPES } from '../../src/shared/constants.js';

describe('Content Extractor', () => {

  beforeEach(() => {
    // Set up a basic DOM for each test
    document.body.innerHTML = '';
    document.title = 'Test Page Title';
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/article/test' },
      writable: true
    });
  });

  describe('extractContent()', () => {

    it('returns object with title, url, content, and contentType fields', () => {
      document.body.innerHTML = '<p>Some article content here for testing purposes.</p>';
      const result = extractContent();
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('contentType');
    });

    it('extracts page title from document.title', () => {
      document.title = 'Breaking News — Reuters';
      document.body.innerHTML = '<p>Article body text goes here.</p>';
      const result = extractContent();
      expect(result.title).toBe('Breaking News — Reuters');
    });

    it('extracts page URL from window.location.href', () => {
      document.body.innerHTML = '<p>Some content on the page.</p>';
      const result = extractContent();
      expect(result.url).toBe('https://example.com/article/test');
    });

    it('extracts visible text from document body', () => {
      document.body.innerHTML = `
        <h1>Main Headline</h1>
        <p>First paragraph of the article.</p>
        <p>Second paragraph with more details.</p>
      `;
      const result = extractContent();
      expect(result.content).toContain('Main Headline');
      expect(result.content).toContain('First paragraph');
      expect(result.content).toContain('Second paragraph');
    });

    it('prefers article tag content when available', () => {
      document.body.innerHTML = `
        <nav>Navigation stuff here</nav>
        <article>
          <h1>Article Title</h1>
          <p>The real article content we care about.</p>
        </article>
        <footer>Footer junk</footer>
      `;
      const result = extractContent();
      expect(result.content).toContain('real article content');
      expect(result.content).not.toContain('Navigation stuff');
      expect(result.content).not.toContain('Footer junk');
    });

    it('strips nav, footer, sidebar, and header elements', () => {
      document.body.innerHTML = `
        <header>Site Header</header>
        <nav>Menu Items</nav>
        <main><p>Actual content worth analyzing.</p></main>
        <aside>Sidebar ads</aside>
        <footer>Copyright 2026</footer>
      `;
      const result = extractContent();
      expect(result.content).toContain('Actual content');
      expect(result.content).not.toContain('Site Header');
      expect(result.content).not.toContain('Menu Items');
      expect(result.content).not.toContain('Sidebar ads');
      expect(result.content).not.toContain('Copyright 2026');
    });

    it('trims content to MAX_CHARS with truncation marker', () => {
      // Create a very long page
      const longText = 'This is a sentence. '.repeat(1000); // ~20,000 chars
      document.body.innerHTML = `<p>${longText}</p>`;
      const result = extractContent();
      expect(result.content.length).toBeLessThanOrEqual(
        CONTENT_LIMITS.MAX_CHARS + CONTENT_LIMITS.TRUNCATION_MARKER.length + 10 // small buffer
      );
      expect(result.wasTrimmed).toBe(true);
    });

    it('returns error when content is below MIN_CHARS', () => {
      document.body.innerHTML = '<p>Hi</p>';
      const result = extractContent();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('insufficient');
    });

    it('handles empty body gracefully', () => {
      document.body.innerHTML = '';
      const result = extractContent();
      expect(result.error).toBeDefined();
    });

    it('defaults contentType to unknown', () => {
      document.body.innerHTML = '<p>Some generic content that is long enough to pass the minimum character threshold for extraction.</p>';
      const result = extractContent();
      expect(result.contentType).toBe(CONTENT_TYPES.UNKNOWN);
    });

    it('uses selected text when provided', () => {
      document.body.innerHTML = `
        <p>Full page content that should be ignored when there is a selection available.</p>
        <p>Selected portion of text that the user highlighted with their mouse cursor for analysis.</p>
      `;
      const selectedText = 'Selected portion of text that the user highlighted with their mouse cursor for analysis purposes and more text.';
      const result = extractContent(selectedText);
      expect(result.content).toContain('Selected portion');
      expect(result.content).not.toContain('should be ignored');
    });
  });
});

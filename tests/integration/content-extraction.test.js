/**
 * WS-02/03 Integration Test — Content extraction + message shape
 *
 * Verifies the full extraction flow: DOM content -> extractor -> trimmer
 * and that the resulting message payload has the correct shape for
 * the background service worker to consume.
 */
import { extractContent } from '../../src/content/extractor.js';
import { validateConfig } from '../../src/shared/config-loader.js';
import { MESSAGE_TYPES, CONTENT_LIMITS, CONTENT_TYPES } from '../../src/shared/constants.js';
import { resetChromeMocks } from '../mocks/chrome-api.js';

describe('Integration: Content Extraction Pipeline', () => {

  beforeEach(() => {
    resetChromeMocks();
    document.body.innerHTML = '';
    document.title = 'Integration Test Article';
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/article/integration-test' },
      writable: true
    });
  });

  it('produces a message payload with all required fields for ANALYZE_REQUEST', () => {
    document.body.innerHTML = `
      <article>
        <h1>Climate Change Report Shows Rising Temperatures</h1>
        <p>Scientists at the National Climate Research Center published findings today
        showing a consistent upward trend in global temperatures over the past decade.
        The report, based on data from over 3,000 monitoring stations worldwide,
        indicates that average temperatures have risen by 1.2 degrees Celsius since
        pre-industrial levels. Dr. Sarah Chen, lead researcher, stated that the
        findings are consistent with previous projections from the IPCC.</p>
      </article>
    `;

    const result = extractContent();

    // Verify all fields needed for ANALYZE_REQUEST message
    const message = {
      type: MESSAGE_TYPES.ANALYZE_REQUEST,
      payload: result
    };

    expect(message.type).toBe('ANALYZE_REQUEST');
    expect(message.payload.title).toBe('Integration Test Article');
    expect(message.payload.url).toBe('https://example.com/article/integration-test');
    expect(message.payload.content).toContain('Climate Change');
    expect(message.payload.contentType).toBe(CONTENT_TYPES.UNKNOWN);
    expect(typeof message.payload.wasTrimmed).toBe('boolean');
    expect(typeof message.payload.originalLength).toBe('number');
    expect(message.payload.error).toBeUndefined();
  });

  it('strips boilerplate and delivers clean content', () => {
    document.body.innerHTML = `
      <header><nav>Home | About | Contact</nav></header>
      <main>
        <article>
          <h1>Study Finds Exercise Reduces Stress</h1>
          <p>A comprehensive study published in the Journal of Health Sciences
          demonstrates that regular physical exercise significantly reduces cortisol
          levels and improves overall mental health outcomes. The study tracked
          10,000 participants over five years across multiple countries.</p>
        </article>
      </main>
      <aside>Related: Buy our supplements!</aside>
      <footer>Copyright 2026 Example News</footer>
    `;

    const result = extractContent();

    expect(result.content).toContain('Exercise Reduces Stress');
    expect(result.content).toContain('10,000 participants');
    expect(result.content).not.toContain('Home | About | Contact');
    expect(result.content).not.toContain('Buy our supplements');
    expect(result.content).not.toContain('Copyright 2026');
  });

  it('handles very long pages without exceeding content budget', () => {
    const longParagraph = '<p>' + 'This is a detailed analysis of current events. '.repeat(500) + '</p>';
    document.body.innerHTML = `<article>${longParagraph}</article>`;

    const result = extractContent();

    // Content + marker should not exceed budget
    expect(result.content.length).toBeLessThanOrEqual(
      CONTENT_LIMITS.MAX_CHARS + CONTENT_LIMITS.TRUNCATION_MARKER.length + 10
    );
    expect(result.wasTrimmed).toBe(true);
  });

  it('extraction result works with config validation', () => {
    // Verify config and extraction modules can coexist
    const configResult = validateConfig({ OPENROUTER_API_KEY: 'sk-or-v1-test123' });
    expect(configResult.valid).toBe(true);

    document.body.innerHTML = '<article><p>Content that is long enough to meet the minimum character threshold for extraction in the BS Detector extension.</p></article>';
    const extractResult = extractContent();
    expect(extractResult.error).toBeUndefined();

    // Both modules work together — ready for the pipeline
    expect(configResult.valid).toBe(true);
    expect(extractResult.content.length).toBeGreaterThan(0);
  });

  it('sends extraction result via chrome.runtime.sendMessage with correct shape', () => {
    document.body.innerHTML = '<article><p>A news article about economic policy changes that will affect millions of people across the country according to analysts.</p></article>';

    const result = extractContent();

    // Simulate what content-script.js does
    const message = {
      type: MESSAGE_TYPES.ANALYZE_REQUEST,
      payload: {
        title: result.title,
        url: result.url,
        content: result.content,
        contentType: result.contentType
      }
    };

    chrome.runtime.sendMessage(message);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ANALYZE_REQUEST',
        payload: expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String),
          content: expect.any(String),
          contentType: expect.any(String)
        })
      })
    );
  });
});

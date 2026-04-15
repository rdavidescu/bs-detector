# Privacy Policy — BS Detector

**Last updated:** April 15, 2026

BS Detector is an open-source Chrome extension that analyzes web page content for presentation quality and claim credibility using AI services chosen by you.

## What data the extension accesses

When you click "Analyze This Page," the extension extracts visible text content from the current tab. This only happens on your explicit action — never automatically in the background.

## Where your data goes

Extracted page content is sent directly from your browser to the AI provider you configured (OpenRouter, Google Gemini, or Grok). The request travels from your browser to their API endpoint. **No data is sent to the extension developer, ever.** We do not operate any servers, proxies, or intermediaries.

## What is stored locally

The extension stores the following in your browser's local storage (`chrome.storage.local`):

- Your API keys for your chosen AI provider
- Your provider and model preferences

This data never leaves your browser except when making API calls to your selected provider.

## What we do NOT collect

- No browsing history
- No personal information
- No analytics or telemetry
- No cookies or tracking pixels
- No usage statistics
- No crash reports
- No data of any kind is transmitted to the extension developer

## Third-party AI providers

Your content is processed by the AI provider you choose. Each provider has their own privacy policy:

- OpenRouter: https://openrouter.ai/privacy
- Google Gemini: https://ai.google.dev/terms
- xAI (Grok): https://x.ai/legal/privacy-policy

You are responsible for reviewing and accepting their terms. BS Detector has no control over how these providers handle data sent to their APIs.

## Open source

BS Detector is fully open source. You can audit the complete source code at:
https://github.com/rdavidescu/bs-detector

## Contact

For privacy questions or concerns, open an issue on the GitHub repository or email: rdavidescu@gmail.com

## Changes to this policy

Any updates to this policy will be reflected in this file with an updated date. Since this file lives in the public repository, all changes are tracked in the git history.

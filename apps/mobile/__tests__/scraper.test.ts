import { fetchLinkMetadata } from '../utils/scraper';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('fetchLinkMetadata', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('extracts title and og:image from HTML', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html>
          <head>
            <title>Example Page</title>
            <meta property="og:image" content="https://example.com/image.jpg" />
          </head>
          <body></body>
        </html>
      `),
    });

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe('Example Page');
    expect(result.image_url).toBe('https://example.com/image.jpg');
    expect(result.domain).toBe('example.com');
  });

  it('extracts twitter:image as fallback', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html>
          <head>
            <title>Twitter Example</title>
            <meta name="twitter:image" content="https://example.com/twitter.jpg" />
          </head>
        </html>
      `),
    });

    const result = await fetchLinkMetadata('https://example.com/page');
    expect(result.image_url).toBe('https://example.com/twitter.jpg');
  });

  it('falls back to og:title when no <title> tag', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html>
          <head>
            <meta property="og:title" content="OG Title" />
          </head>
        </html>
      `),
    });

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe('OG Title');
  });

  it('decodes HTML entities in title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html><head><title>Tom &amp; Jerry&#39;s Show</title></head></html>
      `),
    });

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe("Tom & Jerry's Show");
  });

  it('returns URL as title on failed fetch', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe('https://example.com');
    expect(result.image_url).toBeNull();
  });

  it('returns URL as title when response is not ok', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe('https://example.com');
  });

  it('strips www. from domain', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Test</title></head></html>'),
    });

    const result = await fetchLinkMetadata('https://www.example.com/page');
    expect(result.domain).toBe('example.com');
  });

  it('handles meta tags with reversed attribute order', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <html><head>
          <meta content="https://example.com/img.jpg" property="og:image" />
          <meta content="Reversed Title" property="og:title" />
        </head></html>
      `),
    });

    const result = await fetchLinkMetadata('https://example.com');
    expect(result.image_url).toBe('https://example.com/img.jpg');
  });
});

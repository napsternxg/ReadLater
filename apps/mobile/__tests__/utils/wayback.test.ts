import { saveToWayback, getWaybackUrl } from '../../utils/wayback';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('utils/wayback', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('saveToWayback', () => {
    it('calls the internet archive save API successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const url = 'https://example.com';
      const result = await saveToWayback(url);
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(`https://web.archive.org/save/${url}`);
    });

    it('returns false when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      const result = await saveToWayback('https://fail.com');
      expect(result).toBe(false);
    });
  });

  describe('getWaybackUrl', () => {
    it('returns formatted URL with timestamp', () => {
      const timestamp = 1710787200000; // March 18, 2024
      const url = 'https://example.com';
      // format is YYYYMMDDhhmmss
      // In UTC, this timestamp is 20240318184000
      const waybackUrl = getWaybackUrl(url, timestamp);
      expect(waybackUrl).toContain('https://web.archive.org/web/20240318');
      expect(waybackUrl).toContain(`/${url}`);
    });
  });
});

export const generateWaybackUrl = (url: string, timestamp: number | string) => {
  if (typeof timestamp === 'string' && timestamp.length === 14 && /^\d+$/.test(timestamp)) {
    // Already in Wayback format (YYYYMMDDhhmmss)
    return `https://web.archive.org/web/${timestamp}/${url}`;
  }

  const date = new Date(Number(timestamp));
  const formattedDate = date.getUTCFullYear().toString() +
    (date.getUTCMonth() + 1).toString().padStart(2, '0') +
    date.getUTCDate().toString().padStart(2, '0') +
    date.getUTCHours().toString().padStart(2, '0') +
    date.getUTCMinutes().toString().padStart(2, '0') +
    date.getUTCSeconds().toString().padStart(2, '0');
  
  return `https://web.archive.org/web/${formattedDate}/${url}`;
};

export const saveToWayback = async (url: string): Promise<string | null> => {
  try {
    // Wayback Machine "Save Page Now" simple endpoint
    const response = await fetch(`https://web.archive.org/save/${url}`, { method: 'GET' });
    const finalUrl = response.url;
    
    // Extract timestamp from URL: https://web.archive.org/web/20260318023341/http://example.com
    const match = finalUrl.match(/\/web\/(\d{14})\//);
    if (match) {
      console.log(`Wayback save confirmed: ${match[1]}`);
      return match[1];
    }
    
    console.log(`Wayback save triggered for: ${url}, but couldn't verify timestamp from: ${finalUrl}`);
    return null;
  } catch (e) {
    console.warn('Wayback Save failed:', e);
    return null;
  }
};

export interface LinkMetadata {
  title: string | null;
  image_url: string | null;
  domain: string | null;
}

const decodeHtml = (html: string) => {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
};

export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
   let domain = '';
   try {
     domain = new URL(url).hostname.replace(/^www\./, '');
   } catch (e) {}

   try {
     console.log(`Scraping URL: ${url}`);
     const response = await fetch(url, {
       headers: {
         'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
       }
     });
     
     if (!response.ok) {
       console.warn(`Fetch failed for ${url} with status ${response.status}`);
       throw new Error(`Fetch failed: ${response.status}`);
     }
     const html = await response.text();
     
     const getMeta = (propertyOrName: string) => {
       // Even more flexible pattern: matches <meta ... property="..." ... content="..." ...> in any order
       const patterns = [
         new RegExp(`<meta[^>]*?(?:property|name)=["']${propertyOrName}["'][^>]*?content=["']([^"']+)["']`, 'i'),
         new RegExp(`<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']${propertyOrName}["']`, 'i')
       ];
       
       for (const pattern of patterns) {
         const match = html.match(pattern);
         if (match) return decodeHtml(match[1]);
       }
       return null;
     };

     const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
     const title = titleMatch ? decodeHtml(titleMatch[1]) : getMeta('og:title') || getMeta('twitter:title') || getMeta('title');
     
     let image_url = getMeta('og:image') || getMeta('twitter:image') || getMeta('thumbnail');

     
     if (!image_url) {
       // Fallback to high-res icons
       const iconPatterns = [
         /<link [^>]*?rel=["']apple-touch-icon["'][^>]*?href=["']([^"']+)["']/i,
         /<link [^>]*?rel=["']icon["'][^>]*?sizes=["'](?:192x192|180x180|152x152|144x144|120x120|114x114|76x76|72x72)["'][^>]*?href=["']([^"']+)["']/i,
         /<link [^>]*?rel=["']icon["'][^>]*?href=["']([^"']+)["']/i
       ];
       
       for (const pattern of iconPatterns) {
         const match = html.match(pattern);
         if (match) {
           image_url = decodeHtml(match[1]);
           break;
         }
       }
     }

     if (image_url && !image_url.startsWith('http')) {
       try {
         const baseUrl = new URL(url);
         if (image_url.startsWith('//')) {
            image_url = baseUrl.protocol + image_url;
         } else if (image_url.startsWith('/')) {
            image_url = baseUrl.origin + image_url;
         } else {
            const pathParts = baseUrl.pathname.split('/');
            pathParts.pop();
            image_url = baseUrl.origin + pathParts.join('/') + '/' + image_url;
         }
       } catch (e) {}
     }

     return { 
       title: title ? title.trim() : url, 
       image_url: image_url || null, 
       domain 
     };
   } catch (e) {
     console.warn('Failed to fetch link metadata', e);
     return { title: url, image_url: null, domain };
   }
 };

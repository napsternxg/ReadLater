import { getDb } from './index';

export interface Link {
  id: string;
  url: string;
  title: string | null;
  image_url: string | null;
  domain: string | null;
  created_at: number;
}

export interface Tag {
  id: string;
  name: string;
}

export const getLinkByUrl = async (url: string): Promise<Link | null> => {
  const db = await getDb();
  return await db.getFirstAsync<Link>('SELECT * FROM links WHERE url = ?', [url]);
};

export const insertLink = async (link: Link) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO links (id, url, title, image_url, domain, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [link.id, link.url, link.title, link.image_url, link.domain, link.created_at]
  );
};

export const getAllLinks = async (searchQuery?: string): Promise<Link[]> => {
  const db = await getDb();
  if (searchQuery) {
    return await db.getAllAsync<Link>(
      `SELECT * FROM links WHERE title LIKE ? OR url LIKE ? ORDER BY created_at DESC`,
      [`%${searchQuery}%`, `%${searchQuery}%`]
    );
  }
  return await db.getAllAsync<Link>('SELECT * FROM links ORDER BY created_at DESC');
};

export const getLinksByTag = async (tagName: string): Promise<Link[]> => {
  const db = await getDb();
  return await db.getAllAsync<Link>(
    `SELECT l.* FROM links l
     JOIN link_tags lt ON l.id = lt.link_id
     JOIN tags t ON lt.tag_id = t.id
     WHERE t.name = ?
     ORDER BY l.created_at DESC`,
    [tagName]
  );
};

export const getLinksByDomain = async (domain: string): Promise<Link[]> => {
  const db = await getDb();
  return await db.getAllAsync<Link>(
    `SELECT * FROM links WHERE domain = ? ORDER BY created_at DESC`,
    [domain]
  );
};

export const deleteLink = async (id: string) => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM link_tags WHERE link_id = '${id}';
    DELETE FROM links WHERE id = '${id}';
  `);
};

export const getTagsWithCount = async () => {
  const db = await getDb();
  return await db.getAllAsync<{ name: string; count: number }>(
    `SELECT t.name, COUNT(lt.link_id) as count
     FROM tags t
     LEFT JOIN link_tags lt ON t.id = lt.tag_id
     GROUP BY t.id
     ORDER BY count DESC`
  );
};

export const getDomainsWithCount = async () => {
  const db = await getDb();
  return await db.getAllAsync<{ domain: string; count: number }>(
    `SELECT domain, COUNT(id) as count
     FROM links
     WHERE domain IS NOT NULL
     GROUP BY domain
     ORDER BY count DESC`
  );
};

export const addTagToLink = async (linkId: string, tagName: string) => {
  const db = await getDb();
  // Ensure tag exists
  let tag = await db.getFirstAsync<Tag>('SELECT * FROM tags WHERE name = ?', [tagName]);
  let tagId = tag?.id;
  
  if (!tag) {
    tagId = Math.random().toString(36).substring(2, 15);
    await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
  }

  // Insert mapping (ignore if exists)
  try {
    await db.runAsync('INSERT INTO link_tags (link_id, tag_id) VALUES (?, ?)', [linkId, tagId!]);
  } catch (e) {
    // Already mapped
  }
};

export const getTagsForLink = async (linkId: string): Promise<string[]> => {
  const db = await getDb();
  const res = await db.getAllAsync<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN link_tags lt ON t.id = lt.tag_id
     WHERE lt.link_id = ?`,
    [linkId]
  );
  return res.map(r => r.name);
};

export const removeTagFromLink = async (linkId: string, tagName: string) => {
  const db = await getDb();
  const tag = await db.getFirstAsync<Tag>('SELECT * FROM tags WHERE name = ?', [tagName]);
  if (tag) {
    await db.runAsync('DELETE FROM link_tags WHERE link_id = ? AND tag_id = ?', [linkId, tag.id]);
  }
};

export const getAllTagNames = async (): Promise<string[]> => {
  const db = await getDb();
  const res = await db.getAllAsync<{ name: string }>('SELECT name FROM tags ORDER BY name');
  return res.map(r => r.name);
};

export const getAllLinksWithTags = async (): Promise<(Link & { tags: string[] })[]> => {
  const db = await getDb();
  const links = await db.getAllAsync<Link>('SELECT * FROM links ORDER BY created_at DESC');
  const results = [];
  for (const link of links) {
    const tags = await getTagsForLink(link.id);
    results.push({ ...link, tags });
  }
  return results;
};

export const clearAllData = async () => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM link_tags;
    DELETE FROM links;
    DELETE FROM tags;
  `);
};

export const importData = async (data: any[]) => {
  const db = await getDb();
  
  // Use a transaction for performance and consistency
  await db.withTransactionAsync(async () => {
    for (const item of data) {
      const linkId = item.id || Math.random().toString(36).substring(2, 9);
      
      // 1. Insert link (ignore if exists)
      await db.runAsync(
        'INSERT OR IGNORE INTO links (id, url, title, image_url, domain, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [linkId, item.url, item.title, item.image_url, item.domain, item.created_at || Date.now()]
      );

      // 2. Process tags
      if (item.tags && Array.isArray(item.tags)) {
        for (const tagName of item.tags) {
          if (!tagName) continue;
          
          // Ensure tag exists
          let tagId: string;
          const existingTag = await db.getFirstAsync<{ id: string }>('SELECT id FROM tags WHERE name = ?', [tagName]);
          
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            tagId = Math.random().toString(36).substring(2, 9);
            await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, tagName]);
          }

          // Link the tag
          await db.runAsync(
            'INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)',
            [linkId, tagId]
          );
        }
      }
    }
  });
};

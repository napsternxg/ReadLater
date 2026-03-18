jest.unmock('../db/queries');

import { getDb } from '../db';
import * as queries from '../db/queries';

describe('db/queries', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      runAsync: jest.fn(),
      execAsync: jest.fn(),
      withTransactionAsync: jest.fn((cb) => cb()),
    };
    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLinksByEntity', () => {
    it('fetches links by tag correctly configured with ORDER BY', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: '1', url: 'test.com' }]);
      const result = await queries.getLinksByTag('news');
      
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE e.type = ? AND e.name = ?"),
        ['tag', 'news']
      );
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY l.created_at DESC"),
        ['tag', 'news']
      );
      expect(result).toEqual([{ id: '1', url: 'test.com' }]);
    });

    it('fetches links by domain correctly', async () => {
      await queries.getLinksByDomain('example.com', 'title');
      
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY l.title COLLATE NOCASE ASC"),
        ['domain', 'example.com']
      );
    });
  });

  describe('importData', () => {
    it('inserts links and entities', async () => {
      const data = [
        { url: 'https://new.com', title: 'New', tags: ['cool'] }
      ];
      mockDb.getFirstAsync.mockResolvedValue(null); // When checking if entity exists
      
      await queries.importData(data);
      
      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO links'),
        expect.any(Array)
      );
      // It should check and insert the new tag
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO entities'),
        expect.any(Array)
      );
      // It should map the link to the tag
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO link_entities'),
        expect.any(Array)
      );
    });
  });

  describe('createCollection', () => {
    it('creates collection entity and links it', async () => {
      await queries.createCollection('My Col', 'Desc', ['tag1']);

      // 1 insert for link definition
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO links'),
        expect.any(Array)
      );
      // 1 check for 'system:collection'
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM entities WHERE type = ? AND name = ?'),
        ['system', 'collection']
      );
    });
  });
});

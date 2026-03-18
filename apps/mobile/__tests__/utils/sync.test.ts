import { importZipAndAppend } from '../../utils/sync';
import * as FS from 'expo-file-system';

jest.mock('../../db/queries', () => ({
  importData: jest.fn().mockResolvedValue(undefined),
  clearAllData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/alert', () => ({
  showToast: jest.fn(),
  showConfirm: jest.fn((t, m, cb) => cb()),
}));
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

describe('utils/sync', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Not testing full JSZip functionality as it requires mocking buffer,
  // but we can test the structure if needed or leave this as a stub pending e2e tests.
  it('has importZipAndAppend exported', () => {
    expect(typeof importZipAndAppend).toBe('function');
  });
});

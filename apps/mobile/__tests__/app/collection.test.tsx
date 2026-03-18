import React from 'react';
import { render } from '@testing-library/react-native';
import CollectionScreen from '../../app/collection/[id]';

jest.mock('../../db/queries', () => ({
  getLinkById: jest.fn().mockResolvedValue({
    id: 'col-1',
    title: 'My Collection',
    notes: 'A test collection',
  }),
  getCollectionLinks: jest.fn().mockResolvedValue([]),
  updateCollectionLinkOrder: jest.fn(),
}));

describe('CollectionScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<CollectionScreen />);
    
    // Check for some static text or placeholder from the screen
    expect(getByText('Collection')).toBeTruthy();
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import EditScreen from '../../app/edit';

jest.mock('../../db/queries', () => ({
  getLinkById: jest.fn().mockResolvedValue({
    id: 'test-id',
    url: 'https://example.com',
    title: 'Test Link',
  }),
  getTagsForLink: jest.fn().mockResolvedValue(['cool']),
  getSystemEntitiesForLink: jest.fn().mockResolvedValue(['notes']),
  updateLink: jest.fn(),
}));

describe('EditScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<EditScreen />);
    
    // We mock the local search params in setup-tests to return {}
    // The screen might show loading or fallback if no ID is passed.
    expect(getByText('Edit Link')).toBeTruthy();
  });
});

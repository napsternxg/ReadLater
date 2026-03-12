import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/(tabs)/index';
import { getAllLinks, getTagsForLink, deleteLink } from '../db/queries';
import { Alert } from 'react-native';

const mockLinks = [
  {
    id: '1',
    url: 'https://example.com',
    title: 'Example',
    image_url: null,
    domain: 'example.com',
    created_at: Date.now(),
  },
  {
    id: '2',
    url: 'https://test.org/page',
    title: 'Test Page',
    image_url: 'https://test.org/img.jpg',
    domain: 'test.org',
    created_at: Date.now() - 86400000,
  },
];

jest.spyOn(Alert, 'alert');

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAllLinks as jest.Mock).mockResolvedValue(mockLinks);
    (getTagsForLink as jest.Mock).mockResolvedValue([]);
  });

  it('renders the search bar', () => {
    const { getByPlaceholderText } = render(<HomeScreen />);
    expect(getByPlaceholderText(/Search links/)).toBeTruthy();
  });

  it('renders links from database', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText('Example')).toBeTruthy();
      expect(getByText('Test Page')).toBeTruthy();
    });
  });

  it('renders add button', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('+')).toBeTruthy();
  });

  it('renders empty state when no links', async () => {
    (getAllLinks as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText('No links found.')).toBeTruthy();
    });
  });

  it('search input updates query', () => {
    const { getByPlaceholderText } = render(<HomeScreen />);
    const input = getByPlaceholderText(/Search links/);
    fireEvent.changeText(input, 'test query');
    expect(input.props.value).toBe('test query');
  });
});

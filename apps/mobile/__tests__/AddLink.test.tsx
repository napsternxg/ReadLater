import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddLinkScreen from '../app/add';
import { insertLink, addTagToLink, getAllTagNames } from '../db/queries';

describe('AddLinkScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAllTagNames as jest.Mock).mockResolvedValue(['tech', 'react', 'news', 'readlater']);
    (insertLink as jest.Mock).mockResolvedValue(undefined);
    (addTagToLink as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders all fields on mount without needing to fetch first', () => {
    const { getByPlaceholderText, getByText } = render(<AddLinkScreen />);
    expect(getByPlaceholderText('https://example.com')).toBeTruthy();
    expect(getByPlaceholderText('Link title')).toBeTruthy();
    expect(getByPlaceholderText('e.g. readlater, tech, react')).toBeTruthy();
    expect(getByText('Save Link')).toBeTruthy();
  });

  it('URL input accepts text', () => {
    const { getByPlaceholderText } = render(<AddLinkScreen />);
    const urlInput = getByPlaceholderText('https://example.com');
    fireEvent.changeText(urlInput, 'https://test.com');
    expect(urlInput.props.value).toBe('https://test.com');
  });

  it('title input accepts text', () => {
    const { getByPlaceholderText } = render(<AddLinkScreen />);
    const titleInput = getByPlaceholderText('Link title');
    fireEvent.changeText(titleInput, 'My Title');
    expect(titleInput.props.value).toBe('My Title');
  });

  it('tags input accepts text', () => {
    const { getByPlaceholderText } = render(<AddLinkScreen />);
    const tagsInput = getByPlaceholderText('e.g. readlater, tech, react');
    fireEvent.changeText(tagsInput, 'tech, ');
    expect(tagsInput.props.value).toBe('tech, ');
  });

  it('shows tag suggestions when typing', async () => {
    const { getByPlaceholderText, getByText } = render(<AddLinkScreen />);
    const tagsInput = getByPlaceholderText('e.g. readlater, tech, react');
    fireEvent(tagsInput, 'focus');
    fireEvent.changeText(tagsInput, 'rea');
    
    await waitFor(() => {
      expect(getByText('#react')).toBeTruthy();
      expect(getByText('#readlater')).toBeTruthy();
    });
  });

  it('calls insertLink on save', async () => {
    const { getByPlaceholderText, getByText } = render(<AddLinkScreen />);
    fireEvent.changeText(getByPlaceholderText('https://example.com'), 'https://test.com');
    fireEvent.changeText(getByPlaceholderText('Link title'), 'Test Title');
    fireEvent.press(getByText('Save Link'));
    
    await waitFor(() => {
      expect(insertLink).toHaveBeenCalled();
    });
  });

  it('processes tags on save', async () => {
    const { getByPlaceholderText, getByText } = render(<AddLinkScreen />);
    fireEvent.changeText(getByPlaceholderText('https://example.com'), 'https://test.com');
    fireEvent.changeText(getByPlaceholderText('e.g. readlater, tech, react'), 'tech, react');
    fireEvent.press(getByText('Save Link'));
    
    await waitFor(() => {
      expect(addTagToLink).toHaveBeenCalledTimes(2);
    });
  });

  it('pre-fills URL when passed via search params', async () => {
    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({ url: 'https://shared-link.com' });
    
    const { getByDisplayValue } = render(<AddLinkScreen />);
    
    await waitFor(() => {
      expect(getByDisplayValue('https://shared-link.com')).toBeTruthy();
    });
  });
});

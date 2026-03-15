import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { RootLayoutContent } from '../app/_layout';
import { mockRouter, mockShareIntent } from '../setup-tests';
import { initDb } from '../db';
import { act } from 'react-test-renderer';

// Mock expo-router
const { useRouter } = require('expo-router');

describe('Share Intent Flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (initDb as jest.Mock).mockResolvedValue(undefined);
    mockShareIntent.hasShareIntent = false;
    mockShareIntent.shareIntent = { type: 'text', value: '' };
    mockShareIntent.error = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to /add when share intent is detected and DB is ready', async () => {
    mockShareIntent.hasShareIntent = true;
    mockShareIntent.shareIntent = { type: 'text', value: 'https://shared.com' };

    render(<RootLayoutContent />);

    // Wait for DB ready (simulated by useEffect)
    await waitFor(() => {
      // The component should render something once DB is ready
      expect(initDb).toHaveBeenCalled();
    });

    // Advance timers for the 500ms delay in _layout.tsx
    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/add',
      params: { url: 'https://shared.com' },
    });
    
    expect(mockShareIntent.resetShareIntent).toHaveBeenCalled();
  });

  it('does not navigate if share intent has no value', async () => {
    mockShareIntent.hasShareIntent = true;
    mockShareIntent.shareIntent = { type: 'text', value: '' };

    render(<RootLayoutContent />);

    await waitFor(() => {
       expect(initDb).toHaveBeenCalled();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

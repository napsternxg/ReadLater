import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../app/(tabs)/settings';
import { Alert, Appearance } from 'react-native';
import * as Sharing from 'expo-sharing';

jest.spyOn(Alert, 'alert');
jest.spyOn(Appearance, 'setColorScheme');

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Settings header', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
  });

  it('renders Appearance section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Dark')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();
  });

  it('renders Data section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Data')).toBeTruthy();
    expect(getByText('Export Data (JSON)')).toBeTruthy();
    expect(getByText('Clear All Data')).toBeTruthy();
  });

  it('renders About section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('About')).toBeTruthy();
    expect(getByText('ReadLater')).toBeTruthy();
    expect(getByText('Version 1.0.0')).toBeTruthy();
  });

  it('calls setColorScheme when Light is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Light'));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('light');
  });

  it('calls setColorScheme when Dark is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Dark'));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('calls setColorScheme with null when System is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('System'));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith(null);
  });

  it('shows confirmation when Clear All Data is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Clear All Data'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear Data',
      expect.any(String),
      expect.any(Array)
    );
  });
});

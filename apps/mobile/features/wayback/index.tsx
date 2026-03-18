import React from 'react';
import { View, Text, Switch, TouchableOpacity, Linking, Platform, StyleSheet } from 'react-native';
import { generateWaybackUrl } from '../../utils/wayback';
export { saveToWayback } from '../../utils/wayback';

export function WaybackAddFormExtension({ 
  enabled, 
  theme, 
  url, 
  useWayback, 
  onChange 
}: { 
  enabled: boolean, 
  theme: any, 
  url: string, 
  useWayback: boolean, 
  onChange: (val: boolean) => void 
}) {
  if (!enabled) return null;

  return (
    <View style={styles.devSection}>
      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Save to Wayback Machine</Text>
        <Switch
          value={useWayback}
          onValueChange={onChange}
          trackColor={{ false: theme.border, true: theme.accent }}
          thumbColor={Platform.OS === 'ios' ? '#fff' : useWayback ? theme.accent : '#f4f3f4'}
        />
      </View>
      {useWayback && (
        <View style={[styles.waybackPreview, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Text style={[styles.waybackLabel, { color: theme.textSecondary }]}>Generated Wayback URL:</Text>
          <TouchableOpacity onPress={() => url && Linking.openURL(generateWaybackUrl(url, Date.now()))}>
            <Text style={[styles.waybackUrl, { color: theme.accent }]} numberOfLines={2}>
              {generateWaybackUrl(url || '...', Date.now())}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  devSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waybackPreview: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  waybackLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  waybackUrl: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

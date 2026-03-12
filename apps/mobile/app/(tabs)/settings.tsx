import { StyleSheet, View, Text, TouchableOpacity, Alert, Appearance, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllLinksWithTags, clearAllData } from '../../db/queries';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SettingsScreen() {
  const { theme: currentTheme, colorScheme, setTheme } = useTheme();
  const theme = Colors[colorScheme];

  const handleExport = async () => {
    try {
      const linksWithTags = await getAllLinksWithTags();
      const content = JSON.stringify(linksWithTags, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}readlater-export.json`;
      
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export ReadLater Data',
        });
      } else {
        Alert.alert('Sharing unavailable', 'Cannot share export file on this device');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleClearData = () => {
    Alert.alert('Clear Data', 'Are you sure you want to delete all saved links, tags and domains? This is irreversible.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        await clearAllData();
        Alert.alert('Success', 'All data has been cleared');
      }}
    ]);
  };

  const themeOptions = [
    { label: 'Light', icon: 'sun.max' as const, value: 'light' as const },
    { label: 'Dark', icon: 'moon' as const, value: 'dark' as const },
    { label: 'System', icon: 'iphone' as const, value: null },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.header, { color: theme.text }]}>Settings</Text>
      
      {/* Appearance */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Appearance</Text>
      <View style={[styles.appearanceCard, { backgroundColor: theme.cardBackground }]}>
        {themeOptions.map((option) => {
          const isActive = currentTheme === option.value || (option.value === null && currentTheme === 'system');
          return (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.themeButton,
                isActive && { backgroundColor: theme.inputBackground, borderColor: theme.accent, borderWidth: 1 },
              ]}
              onPress={() => setTheme(option.value as any ?? 'system')}
            >
              <IconSymbol name={option.icon} size={24} color={isActive ? theme.accent : theme.icon} />
              <Text style={[styles.themeLabel, { color: isActive ? theme.accent : theme.textSecondary }]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Data Management */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Data</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]} onPress={handleExport}>
          <View style={styles.settingLeft}>
            <IconSymbol name="arrow.down.doc" size={20} color={theme.accent} />
            <Text style={[styles.settingText, { color: theme.text }]}>Export Data (JSON)</Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={theme.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
          <View style={styles.settingLeft}>
            <IconSymbol name="trash.fill" size={20} color={theme.danger} />
            <Text style={[styles.settingText, { color: theme.danger }]}>Clear All Data</Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={theme.icon} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.aboutContent}>
          <Text style={[styles.appName, { color: theme.text }]}>ReadLater</Text>
          <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
            Save links for later reading. Organize with tags, browse by domain, and find anything instantly with search.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  appearanceCard: {
    borderRadius: 12,
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  themeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  aboutContent: {
    padding: 16,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

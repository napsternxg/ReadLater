import { StyleSheet, View, Text, TouchableOpacity, Alert, Appearance, ScrollView, Platform, Linking, Share as RNShare, Modal, TouchableWithoutFeedback, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllLinksWithTags, clearAllData, importData } from '../../db/queries';
import { getDbPath, getDbName, relocateDb, usePickedDb, resetToDefaultDb, initDb } from '../../db/index';
import { useTheme } from '../../context/ThemeContext';
import { showConfirm, showAlert } from '../../utils/alert';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { theme: currentTheme, colorScheme, setTheme } = useTheme();
  const theme = Colors[colorScheme];
  const [dbPath, setDbPath] = useState('');
  const [dbName, setDbName] = useState('');
  const [showRelocateModal, setShowRelocateModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  useEffect(() => {
    const fetchPath = async () => {
      const path = await getDbPath();
      const name = await getDbName();
      setDbPath(path);
      setDbName(name);
      setNewNameInput(name);
    };
    fetchPath();
  }, []);

  const handleExport = async () => {
    try {
      const linksWithTags = await getAllLinksWithTags();
      const content = JSON.stringify(linksWithTags, null, 2);
      const filename = 'readlater-export.json';

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const fileUri = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export ReadLater Data',
        });
      } else {
        showAlert('Sharing unavailable', 'Cannot share export file on this device');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to export data');
    }
  };

  const handleImport = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              const data = JSON.parse(event.target.result);
              await importData(data);
              showAlert('Success', 'Data imported successfully');
            } catch (err) {
              showAlert('Error', 'Invalid backup file');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const fileUri = result.assets[0].uri;
          const content = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'utf8',
          });
          const data = JSON.parse(content);
          await importData(data);
          showAlert('Success', 'Data imported successfully');
        }
      }
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to import data');
    }
  };

  const handleClearData = () => {
    showConfirm('Clear Data', 'Are you sure you want to delete all saved links, tags and domains? This is irreversible.', async () => {
      await clearAllData();
      showAlert('Success', 'All data has been cleared');
    });
  };

  const handleDbAction = () => {
    Alert.alert(
      'Database Options',
      'Manage your SQLite database file.',
      [
        { text: 'Copy Path', onPress: () => {
          Clipboard.setStringAsync(dbPath);
          showAlert('Copied', 'Path copied to clipboard');
        }},
        { text: 'Share DB File', onPress: async () => {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(dbPath);
          } else {
            showAlert('Error', 'Sharing not available');
          }
        }},
        { text: 'Pick External DB', onPress: () => {
          Alert.alert(
            'Relocate Database',
            'To work properly, the active database must stay in the app\'s internal storage. Picking an external file will copy it here.\n\nNote: You can also manage files directly in your phone\'s "Files" app since we\'ve enabled File Sharing.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Choose File', onPress: handlePickDb }
            ]
          );
        }},
        { text: 'Internal Rename', onPress: () => setShowRelocateModal(true) },
        { text: 'Reset to Default', style: 'destructive', onPress: handleResetDb },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleResetDb = () => {
    showConfirm('Reset Database', 'This internal setting will be reset to the default "readlater.db". Any currently copied databases will remain in storage but will not be active.', async () => {
      try {
        await resetToDefaultDb();
        await initDb();
        const newName = await getDbName();
        setDbName(newName);
        const newPath = await getDbPath();
        setDbPath(newPath);
        showAlert('Success', 'Reset to default database');
      } catch (e) {
        console.error(e);
        showAlert('Error', 'Failed to reset database');
      }
    });
  };

  const handlePickDb = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Some devices don't recognize .db mime type, so use wildcard
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!asset.name.endsWith('.db') && !asset.name.includes('.')) {
          // If no extension, or not .db, we might want to warn, but let's try anyway
        }
        
        await usePickedDb(asset.uri, asset.name);
        
        // Refresh UI
        const newName = await getDbName();
        setDbName(newName);
        const newPath = await getDbPath();
        setDbPath(newPath);
        showAlert('Success', `Using database: ${asset.name}`);
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Invalid Database', e.message || 'Failed to pick database');
    }
  };

  const handleRelocate = async () => {
    const trimmed = newNameInput.trim();
    if (!trimmed) return;
    const finalName = trimmed.endsWith('.db') ? trimmed : `${trimmed}.db`;
    try {
      await relocateDb(finalName);
      setDbName(finalName);
      const newPath = await getDbPath();
      setDbPath(newPath);
      setShowRelocateModal(false);
      showAlert('Success', `Database relocated to ${finalName}`);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to relocate database');
    }
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
        <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]} onPress={handleImport}>
          <View style={styles.settingLeft}>
            <IconSymbol name="arrow.up.doc" size={20} color={theme.accent} />
            <Text style={[styles.settingText, { color: theme.text }]}>Import Data (JSON)</Text>
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

      {/* System info */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>System</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, padding: 16 }]}>
        <TouchableOpacity onPress={handleDbAction}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <IconSymbol name="folder.fill" size={20} color={theme.accent} />
            <Text style={[styles.settingText, { color: theme.text, fontWeight: '600' }]}>Database Location</Text>
          </View>
          <Text style={[styles.dbPathText, { color: theme.textSecondary }]} numberOfLines={3}>
            {dbPath || 'Loading...'}
          </Text>
          <Text style={[styles.dbActionHint, { color: theme.accent }]}>Tap for options (Share, Relocate)</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.aboutContent}>
          <Text style={[styles.appName, { color: theme.text }]}>Read Later</Text>
          <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: theme.textSecondary }]}>
            Save links for later reading. Organize with tags, browse by domain, and find anything instantly with search.
          </Text>
          
          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 16 }]} />
          
          <Text style={[styles.partnerTitle, { color: theme.text }]}>Partner Extension</Text>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://chromewebstore.google.com/detail/read-later/nplngmgdacdfncdkpdomipkehfnbinfa')}
            style={styles.extensionLink}
          >
            <Text style={[styles.extensionText, { color: theme.accent }]}>
              Get the Read Later Chrome Extension
            </Text>
            <IconSymbol name="externaldrive" size={14} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Relocate Modal */}
      <Modal
        visible={showRelocateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRelocateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowRelocateModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Relocate Database</Text>
                <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                  Enter the new name for your database file. This will move the existing file.
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  value={newNameInput}
                  onChangeText={setNewNameInput}
                  placeholder="new_database.db"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: theme.inputBackground }]} 
                    onPress={() => setShowRelocateModal(false)}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: theme.accent }]} 
                    onPress={handleRelocate}
                  >
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Move</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  dbPathText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  dbActionHint: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
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
  divider: {
    height: 1,
    width: '100%',
  },
  partnerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  extensionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extensionText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});



import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, FlatList, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Link as DbLink } from '@/db/queries';

interface CollectionSelectModalProps {
  visible: boolean;
  collections: DbLink[];
  theme: any;
  newCollectionTitle: string;
  newCollectionNotes: string;
  onTitleChange: (text: string) => void;
  onNotesChange: (text: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function CollectionSelectModal({ 
  visible, collections, theme, newCollectionTitle, newCollectionNotes, 
  onTitleChange, onNotesChange, onClose, onSelect, onCreate 
}: CollectionSelectModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Collection</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <IconSymbol name="xmark" size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 200, marginBottom: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={{ padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}
                onPress={() => onSelect(item.id)}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>{item.title || 'Untitled Collection'}</Text>
                {item.notes && <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{item.notes}</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary, padding: 12, textAlign: 'center' }}>No existing collections found.</Text>}
          />

          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingTop: 16 }}>
            <Text style={[styles.modalTitle, { color: theme.text, fontSize: 16, marginBottom: 12 }]}>Or Create New</Text>
            <TextInput
              style={[styles.noteInput, { height: 44, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border, marginBottom: 8 }]}
              placeholder="Collection Title"
              placeholderTextColor={theme.textSecondary}
              value={newCollectionTitle}
              onChangeText={onTitleChange}
            />
            <TextInput
              style={[styles.noteInput, { height: 80, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textSecondary}
              value={newCollectionNotes}
              onChangeText={onNotesChange}
              multiline
            />
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: newCollectionTitle.trim() ? theme.accent : theme.border }]} 
              onPress={onCreate}
              disabled={!newCollectionTitle.trim()}
            >
              <Text style={[styles.modalBtnText, { color: newCollectionTitle.trim() ? '#fff' : theme.textSecondary }]}>Create & Add Links</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  noteInput: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

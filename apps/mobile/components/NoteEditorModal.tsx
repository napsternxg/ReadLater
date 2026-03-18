import { StyleSheet, View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface NoteEditorModalProps {
  visible: boolean;
  noteText: string;
  theme: any;
  onNoteChange: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function NoteEditorModal({ visible, noteText, theme, onNoteChange, onClose, onSave }: NoteEditorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlayInner}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Note</Text>
                  <TouchableOpacity onPress={onClose} hitSlop={10}>
                    <IconSymbol name="xmark" size={20} color={theme.icon} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="Add a note..."
                  placeholderTextColor={theme.textSecondary}
                  value={noteText}
                  onChangeText={onNoteChange}
                  multiline
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: theme.border }]} 
                    onPress={onClose}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, { backgroundColor: theme.accent }]} 
                    onPress={onSave}
                  >
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  modalOverlayInner: {
    flex: 1,
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
    height: 150,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export interface SortOption<T> {
  label: string;
  value: T;
  icon: string;
}

interface SortMenuProps<T> {
  visible: boolean;
  onClose: () => void;
  options: SortOption<T>[];
  currentValue: T;
  onSelect: (value: T) => void;
  title?: string;
}

export function SortMenu<T>({ visible, onClose, options, currentValue, onSelect, title = 'Sort By' }: SortMenuProps<T>) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menu, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={10}>
                  <IconSymbol name="xmark" size={20} color={theme.icon} />
                </TouchableOpacity>
              </View>
              {options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.option,
                    currentValue === option.value && { backgroundColor: theme.inputBackground }
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <IconSymbol 
                    name={option.icon as any} 
                    size={20} 
                    color={currentValue === option.value ? theme.accent : theme.icon} 
                  />
                  <Text style={[
                    styles.optionLabel, 
                    { color: theme.text },
                    currentValue === option.value && { color: theme.accent, fontWeight: '600' }
                  ]}>
                    {option.label}
                  </Text>
                  {currentValue === option.value && (
                    <IconSymbol name="checkmark" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menu: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
  },
});

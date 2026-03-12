import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { fetchLinkMetadata } from '../utils/scraper';
import { insertLink, addTagToLink, Link as DbLink, getAllTagNames, getLinkByUrl } from '../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { showAlert } from '../utils/alert';

export default function AddLinkScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    getAllTagNames().then(setAllTags).catch(console.error);
  }, []);

  const handleFetchPreview = async () => {
    if (!url) return;
    setLoading(true);
    let fullUrl = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
    setUrl(fullUrl);
    
    const meta = await fetchLinkMetadata(fullUrl);
    setTitle(meta.title || '');
    setImageUrl(meta.image_url || '');
    setDomain(meta.domain || '');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!url) return;
    
    let fullUrl = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
    
    // Check for duplicates
    const existing = await getLinkByUrl(fullUrl);
    if (existing) {
      showAlert('Duplicate Link', 'This link is already in your list.');
      return;
    }

    const id = Math.random().toString(36).substring(2, 15);
    const ts = Date.now();
    
    // Ensure we have a domain
    let finalDomain = domain;
    if (!finalDomain) {
      try {
        const urlObj = new URL(url.toLowerCase().startsWith('http') ? url : `https://${url}`);
        finalDomain = urlObj.hostname.replace(/^www\./, '');
      } catch(e) {}
    }

    const link: DbLink = {
      id,
      url: url.toLowerCase().startsWith('http') ? url : `https://${url}`,
      title: title || url,
      image_url: imageUrl,
      domain: finalDomain,
      created_at: ts,
    };

    await insertLink(link);
    
    if (tagsInput.trim()) {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      for (const t of tags) {
        await addTagToLink(id, t);
      }
    }
    
    router.back();
  };

  // Get current partial tag for autocomplete
  const getCurrentPartialTag = () => {
    const parts = tagsInput.split(',');
    return parts[parts.length - 1]?.trim() || '';
  };

  const filteredSuggestions = (() => {
    const partial = getCurrentPartialTag().toLowerCase();
    if (!partial || partial.length < 1) return [];
    const existingTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    return allTags.filter(t => t.toLowerCase().includes(partial) && !existingTags.includes(t.toLowerCase())).slice(0, 5);
  })();

  const handleSelectTag = (tag: string) => {
    const parts = tagsInput.split(',');
    parts.pop();
    const prefix = parts.length > 0 ? parts.join(', ') + ', ' : '';
    setTagsInput(prefix + tag + ', ');
    setShowSuggestions(false);
  };

  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input */}
        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 0 }]}>URL</Text>
        <View style={styles.row}>
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="https://example.com"
              placeholderTextColor={theme.textSecondary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
              onBlur={handleFetchPreview}
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => setUrl('')} hitSlop={8} style={{ marginRight: 8 }}>
                <IconSymbol name="xmark.circle.fill" size={18} color={theme.icon} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.fetchButton, { backgroundColor: theme.accent }]} onPress={handleFetchPreview} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <IconSymbol name="arrow.counterclockwise" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.previewImage, { backgroundColor: theme.inputBackground }]} contentFit="cover" />
        ) : faviconUrl ? (
          <View style={styles.faviconRow}>
            <Image source={{ uri: faviconUrl }} style={styles.favicon} />
            {domain ? <Text style={[styles.domainPreview, { color: theme.textSecondary }]}>{domain}</Text> : null}
          </View>
        ) : null}

        {/* Title */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Link title"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Tags */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="e.g. readlater, tech, react"
          placeholderTextColor={theme.textSecondary}
          value={tagsInput}
          onChangeText={(text) => {
            setTagsInput(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          autoCapitalize="none"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {filteredSuggestions.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.suggestionItem, { borderBottomColor: theme.border }]} onPress={() => handleSelectTag(tag)}>
                <Text style={[styles.suggestionText, { color: theme.text }]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Link</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  fetchButton: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 8,
  },
  faviconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
  },
  favicon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  domainPreview: {
    fontSize: 13,
  },
  suggestionsContainer: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    fontSize: 14,
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

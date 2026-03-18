import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { fetchLinkMetadata } from '../utils/scraper';
import { insertLink, addEntityToLink, Link as DbLink, getAllTagNames, getLinkByUrl } from '../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { showAlert } from '../utils/alert';
import { isFeatureEnabled } from '../utils/features';
import { WaybackAddFormExtension, saveToWayback } from '../features/wayback';

export default function AddLinkScreen() {
  const router = useRouter();
  const { url: paramUrl } = useLocalSearchParams<{ url?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [waybackEnabled, setWaybackEnabled] = useState(false);
  const [useWayback, setUseWayback] = useState(false);

  useFocusEffect(
    useCallback(() => {
      isFeatureEnabled('waybackArchiver').then(setWaybackEnabled).catch(console.error);
    }, [])
  );

  useEffect(() => {
    getAllTagNames().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (paramUrl && paramUrl !== url) {
      console.log('New param URL detected, filling and fetching:', paramUrl);
      setUrl(paramUrl);
      handleFetchPreviewDirectly(paramUrl);
    }
  }, [paramUrl]);

  useEffect(() => {
    if (!url || url.length < 4) return;
    
    const debounceTimer = setTimeout(() => {
      // Don't fetch if already loading or if the title/imageUrl are already set (could be from handleFetchPreviewDirectly)
      if (!loading) {
        handleFetchPreview();
      }
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [url]);

  const handleFetchPreviewDirectly = async (targetUrl: string) => {
    setLoading(true);
    let fullUrl = targetUrl.toLowerCase().startsWith('http') ? targetUrl : `https://${targetUrl}`;
    
    const meta = await fetchLinkMetadata(fullUrl);
    setTitle(meta.title || fullUrl);
    setImageUrl(meta.image_url || '');
    setDomain(meta.domain || '');
    setLoading(false);
  };

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
      notes: notes.trim() || null,
      last_clicked_at: null,
      created_at: ts,
    };

    await insertLink(link);
    
    // Add tags
    for (const t of tags) {
      await addEntityToLink(id, 'tag', t);
    }

    if (waybackEnabled && useWayback) {
      await addEntityToLink(id, 'system', 'wayback');
      saveToWayback(fullUrl);
    }
    
    router.back();
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const filteredSuggestions = (() => {
    const partial = tagInput.toLowerCase();
    if (!partial) return [];
    return allTags.filter(t => t.toLowerCase().includes(partial) && !tags.includes(t.toLowerCase())).slice(0, 5);
  })();

  const handleSelectTag = (tag: string) => {
    handleAddTag(tag);
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
              onBlur={() => {}}
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

        <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
        <View style={[styles.tagsContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          {tags.map((tag, index) => (
            <View key={index} style={[styles.tagPill, { backgroundColor: theme.accent }]}>
              <Text style={styles.tagPillText}>#{tag}</Text>
              <TouchableOpacity onPress={() => handleRemoveTag(index)} hitSlop={8}>
                <IconSymbol name="xmark" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={[styles.tagInput, { color: theme.text }]}
            placeholder={tags.length === 0 ? "e.g. tech, react" : ""}
            placeholderTextColor={theme.textSecondary}
            value={tagInput}
            onChangeText={(text) => {
              if (text.endsWith(',') || text.endsWith(' ')) {
                const tag = text.slice(0, -1).trim();
                if (tag) handleAddTag(tag);
              } else {
                setTagInput(text);
                setShowSuggestions(true);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoCapitalize="none"
          />
        </View>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {filteredSuggestions.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.suggestionItem, { borderBottomColor: theme.border }]} onPress={() => handleSelectTag(tag)}>
                <Text style={[styles.suggestionText, { color: theme.text }]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notes */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Add some notes about this link..."
          placeholderTextColor={theme.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <WaybackAddFormExtension 
          enabled={waybackEnabled} 
          theme={theme} 
          url={url} 
          useWayback={useWayback} 
          onChange={setUseWayback} 
        />

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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    gap: 4,
  },
  tagPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tagInput: {
    flex: 1,
    minWidth: 100,
    height: 30,
    fontSize: 15,
    padding: 0,
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

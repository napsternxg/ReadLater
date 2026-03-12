import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { fetchLinkMetadata } from '../utils/scraper';
import { getDb } from '../db';
import { addTagToLink, Link as DbLink, removeTagFromLink, getTagsForLink, getAllTagNames } from '../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EditLinkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    getAllTagNames().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchExisting = async () => {
      try {
        const db = await getDb();
        const link = await db.getFirstAsync<DbLink>('SELECT * FROM links WHERE id = ?', [id]);
        if (link) {
          setUrl(link.url);
          setTitle(link.title || '');
          setImageUrl(link.image_url || '');
          setDomain(link.domain || '');
          
          const tags = await getTagsForLink(id);
          setTagsInput(tags.join(', '));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchExisting();
  }, [id]);

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

  const handleUpdate = async () => {
    if (!url || !id) return;
    
    try {
      const db = await getDb();
      await db.runAsync(
        'UPDATE links SET url = ?, title = ?, image_url = ?, domain = ? WHERE id = ?',
        [url, title || url, imageUrl, domain, id]
      );
      
      const existingTags = await getTagsForLink(id);
      for (const t of existingTags) {
        await removeTagFromLink(id, t);
      }

      const inputTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      for (const t of inputTags) {
         await addTagToLink(id, t);
      }
      
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update link');
    }
  };

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

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

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
        <Text style={[styles.header, { color: theme.text }]}>Edit Link</Text>
        
        <Text style={[styles.label, { color: theme.textSecondary }]}>URL</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            placeholder="https://example.com"
            placeholderTextColor={theme.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={[styles.fetchButton, { backgroundColor: theme.accent }]} onPress={handleFetchPreview} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <IconSymbol name="arrow.counterclockwise" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.previewImage, { backgroundColor: theme.inputBackground }]} contentFit="cover" />
        ) : faviconUrl ? (
          <View style={styles.faviconRow}>
            <Image source={{ uri: faviconUrl }} style={styles.favicon} />
            {domain ? <Text style={[styles.domainPreview, { color: theme.textSecondary }]}>{domain}</Text> : null}
          </View>
        ) : null}

        <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          placeholder="Link Title"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

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

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleUpdate}>
          <Text style={styles.saveButtonText}>Update Link</Text>
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
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
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

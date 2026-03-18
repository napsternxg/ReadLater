import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { fetchLinkMetadata } from '../utils/scraper';
import { getDb } from '../db';
import { addEntityToLink, Link as DbLink, removeEntityFromLink, getTagsForLink, getAllTagNames, updateLink } from '../db/queries';
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
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
          setNotes(link.notes || '');
          
          const tags = await getTagsForLink(id);
          setTags(tags);
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
      const link: DbLink = {
        id,
        url,
        title: title || url,
        image_url: imageUrl,
        domain,
        notes: notes.trim() || null,
        last_clicked_at: null,
        created_at: 0 // Will be overwritten below
      };
      
      const db = await getDb();
      const dbLink = await db.getFirstAsync<DbLink>('SELECT created_at, last_clicked_at FROM links WHERE id = ?', [id]);
      if (dbLink) {
        link.created_at = dbLink.created_at;
        link.last_clicked_at = dbLink.last_clicked_at;
      }

      await updateLink(link);
      
      const existingTags = await getTagsForLink(id);
      for (const t of existingTags) {
        await removeEntityFromLink(id, 'tag', t);
      }

      for (const t of tags) {
         await addEntityToLink(id, 'tag', t);
      }
      
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update link');
    }
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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

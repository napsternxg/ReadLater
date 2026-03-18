import { StyleSheet, View, Text, TouchableOpacity, Share as RNShare, Alert, Modal, KeyboardAvoidingView, Platform, TextInput, TouchableWithoutFeedback, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinkCard } from '@/components/LinkCard';
import { getLinkById, getCollectionLinks, getTagsForLink, getSystemEntitiesForLink, Link as DbLink, updateCollection, updateCollectionLinkOrder, removeLinksFromCollection, updateCollectionLinkShowNotes } from '@/db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import dayjs from 'dayjs';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type LinkWithTags = DbLink & { tags: string[], systemEntities: string[] };

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  
  const [collection, setCollection] = useState<DbLink | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkWithTags[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = async () => {
    if (!id) return;
    const col = await getLinkById(id);
    if (col) setCollection(col);
    
    const colTags = await getTagsForLink(id);
    setTags(colTags);
    
    const colLinksRaw = await getCollectionLinks(id);
    const withTags = await Promise.all(
      colLinksRaw.map(async (l) => {
        const [t, s] = await Promise.all([
          getTagsForLink(l.id),
          getSystemEntitiesForLink(l.id)
        ]);
        return { ...l, tags: t, systemEntities: s };
      })
    );
    setLinks(withTags);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  const toggleNotes = async (linkId: string, show: boolean) => {
    if (!id) return;
    await updateCollectionLinkShowNotes(id, linkId, show);
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, show_notes: show ? 1 : 0 } : l));
  };

  const doShare = async () => {
    if (!collection) return;
    const text = links.map((l, index) => {
      let part = `🟢 ${index + 1}. *${l.title || 'Untitled'}*\n   🔗 ${l.url}`;
      if (l.show_notes === 1 && l.notes) {
        part += `\n   📝 _Note: ${l.notes}_`;
      }
      return part;
    }).join('\n\n');

    let desc = collection.notes ? `\n\n${collection.notes}\n` : '\n';
    const cleanTitle = (collection.title || 'Collection').trim();
    const finalMessage = `📚 *${cleanTitle}*${desc}\n${text}\n\nShared via ReadLater App`;

    try {
      await RNShare.share({ 
        message: finalMessage,
        title: cleanTitle
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    doShare();
  };

  const handleEdit = () => {
    if (!collection) return;
    setEditTitle(collection.title || '');
    setEditNotes(collection.notes || '');
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!id) return;
    await updateCollection(id, editTitle, editNotes);
    setIsEditing(false);
    load();
  };

  const handleDragEnd = async ({ data }: { data: LinkWithTags[] }) => {
    setLinks(data);
    if (id) {
      await updateCollectionLinkOrder(id, data.map(l => l.id));
    }
  };

  if (!collection) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  const renderLinkItem = ({ item, drag, isActive }: RenderItemParams<LinkWithTags>) => (
    <ScaleDecorator>
      <View style={isActive ? { opacity: 0.8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 } : {}}>
        <LinkCard 
          link={item} 
          tags={item.tags}
          systemEntities={item.systemEntities}
          compact={isEditing}
          onPress={isEditing ? undefined : (linkId) => {
             if (item.systemEntities.includes('collection')) {
               router.push(`/collection/${linkId}` as any);
             } else {
               router.push({ pathname: '/edit' as any, params: { id: linkId } });
             }
          }}
        />
        {!isEditing && item.show_notes === 1 && item.notes ? (
          <View style={[styles.inlineNoteContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Text style={[styles.inlineNoteText, { color: theme.textSecondary }]}>{item.notes}</Text>
          </View>
        ) : null}
        {isEditing && (
          <View style={[styles.organizeRow, { backgroundColor: theme.inputBackground }]}>
            <TouchableOpacity onLongPress={drag} style={{ padding: 4 }}>
              <IconSymbol name="line.3.horizontal" size={24} color={theme.icon} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10 }}>
              <Switch 
                value={item.show_notes === 1} 
                onValueChange={(val) => toggleNotes(item.id, val)}
                trackColor={{ false: theme.border, true: theme.accent }}
              />
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Show Notes</Text>
            </View>

            <TouchableOpacity onPress={() => handleRemoveLink(item.id)} style={{ padding: 4, marginLeft: 16 }}>
              <IconSymbol name="trash.circle.fill" size={26} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScaleDecorator>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ 
        title: isEditing ? 'Edit Collection' : 'Collection',
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 16, marginRight: 15 }}>
            {isEditing ? (
              <TouchableOpacity onPress={saveEdit}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={theme.accent} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={handleEdit}>
                  <IconSymbol name="pencil" size={20} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare}>
                  <IconSymbol name="square.and.arrow.up" size={20} color={theme.accent} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )
      }} />
      
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        {isEditing ? (
          <TextInput
            style={[styles.editTitleInput, { color: theme.text, borderColor: theme.border }]}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Collection Title"
            placeholderTextColor={theme.textSecondary}
          />
        ) : (
          <Text style={[styles.title, { color: theme.text }]}>{collection.title || 'Untitled Collection'}</Text>
        )}
        
        {isEditing ? (
          <TextInput
            style={[styles.editNotesInput, { color: theme.text, borderColor: theme.border }]}
            value={editNotes}
            onChangeText={setEditNotes}
            placeholder="Description (optional)"
            placeholderTextColor={theme.textSecondary}
            multiline
          />
        ) : collection.notes ? (
          <Text style={[styles.notes, { color: theme.textSecondary }]}>{collection.notes}</Text>
        ) : null}

        {!isEditing && tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tagBadge, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {links.length} link{links.length !== 1 ? 's' : ''} • {dayjs(collection.created_at).format('MMM D, YYYY')}
        </Text>
      </View>

      <DraggableFlatList
        data={links}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        renderItem={renderLinkItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No links in this collection yet.</Text>
          </View>
        }
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notes: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  list: { paddingVertical: 8 },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  editTitleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  editNotesInput: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingVertical: 4,
    minHeight: 60,
  },
  organizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -4, // pull up to touch the card
    marginBottom: 12,
  },
  inlineNoteContainer: {
    marginHorizontal: 16,
    marginTop: -4, 
    marginBottom: 12,
    padding: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  inlineNoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

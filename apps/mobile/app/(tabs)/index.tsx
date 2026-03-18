import { StyleSheet, View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinkCard } from '@/components/LinkCard';
import { getAllLinks, getLinksByTag, getLinksByDomain, deleteLink, Link as DbLink, getTagsForLink, updateLinkNotes, getSystemEntitiesForLink } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { showConfirm } from '../../utils/alert';
import { SortMenu, SortOption } from '@/components/ui/SortMenu';
import { Share as RNShare, Modal, TouchableWithoutFeedback } from 'react-native';

type LinkWithTags = DbLink & { tags: string[], systemEntities: string[] };

export default function HomeScreen() {
  const [links, setLinks] = useState<LinkWithTags[]>([]);
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ tag?: string, domain?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [compact, setCompact] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(() => {
    if (params.tag) return `tag:${params.tag}`;
    if (params.domain) return `domain:${params.domain}`;
    return '';
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'last_clicked_at' | 'title'>('created_at');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Clear search when Home tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      setSearchQuery('');
      router.setParams({ tag: undefined, domain: undefined });
    });
    return unsubscribe;
  }, [navigation]);

  const fetchLinks = async () => {
    try {
      let dbLinks: DbLink[] = [];
      
      const isTagSearch = searchQuery.startsWith('tag:');
      const isDomainSearch = searchQuery.startsWith('domain:');
      
      if (isTagSearch) {
        const tag = searchQuery.substring(4).trim();
        dbLinks = tag ? await getLinksByTag(tag, sortBy) : await getAllLinks(undefined, sortBy);
      } else if (isDomainSearch) {
        const domain = searchQuery.substring(7).trim();
        dbLinks = domain ? await getLinksByDomain(domain, sortBy) : await getAllLinks(undefined, sortBy);
      } else {
        dbLinks = await getAllLinks(searchQuery, sortBy);
      }
      const withTags = await Promise.all(
        dbLinks.map(async (l) => {
          const [tags, systemEntities] = await Promise.all([
            getTagsForLink(l.id),
            getSystemEntitiesForLink(l.id)
          ]);
          return { ...l, tags, systemEntities };
        })
      );
      setLinks(withTags);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (params.tag) setSearchQuery(`tag:${params.tag}`);
    else if (params.domain) setSearchQuery(`domain:${params.domain}`);
  }, [params.tag, params.domain]);

  useFocusEffect(
    useCallback(() => {
      fetchLinks();
    }, [searchQuery, sortBy])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLinks();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    showConfirm('Delete Link', 'Are you sure you want to delete this link?', async () => {
      await deleteLink(id);
      fetchLinks();
    });
  };

  const onAddLink = () => {
    router.push('/add');
  };

  const handleDomainPress = (domain: string) => {
    setSearchQuery(`domain:${domain}`);
    router.setParams({ domain, tag: undefined });
  };

  const handleLongPress = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleShare = async (includeNotes = false) => {
    const selectedLinks = links.filter(l => selectedIds.has(l.id));
    const text = selectedLinks.map((l, index) => {
      let part = `🟢 ${index + 1}. *${l.title || 'Untitled'}*\n   🔗 ${l.url}`;
      if (includeNotes && l.notes) {
        part += `\n   📝 _Note: ${l.notes}_`;
      }
      return part;
    }).join('\n\n');

    const finalMessage = `📚 *Read Later List*\n\n${text}\n\nShared via ReadLater App`;

    try {
      await RNShare.share({
        message: finalMessage,
      });
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const openNoteEditor = (id: string) => {
    const link = links.find(l => l.id === id);
    if (link) {
      setEditingNoteId(id);
      setNoteText(link.notes || '');
    }
  };

  const saveNote = async () => {
    if (editingNoteId) {
      await updateLinkNotes(editingNoteId, noteText);
      setEditingNoteId(null);
      fetchLinks();
    }
  };

  const sortOptions: SortOption<'created_at' | 'last_clicked_at' | 'title'>[] = [
    { label: 'Date Added', value: 'created_at', icon: 'calendar' },
    { label: 'Recently Clicked', value: 'last_clicked_at', icon: 'clock' },
    { label: 'Title', value: 'title', icon: 'textformat' },
  ];

  const hasActiveFilter = searchQuery.startsWith('tag:') || searchQuery.startsWith('domain:');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
          <IconSymbol name="house.fill" size={18} color={theme.icon} style={{ marginLeft: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search, tag: domain: or system:"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                router.setParams({ tag: undefined, domain: undefined });
              }}
              hitSlop={10}
              style={{ padding: 4, marginRight: 4 }}
            >
              <IconSymbol name="xmark.circle.fill" size={18} color={theme.icon} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setIsSortMenuVisible(true)} hitSlop={8} style={styles.toggleBtn}>
          <IconSymbol name="arrow.up.arrow.down" size={20} color={theme.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCompact(!compact)} hitSlop={8} style={styles.toggleBtn}>
          <IconSymbol name={compact ? "square.grid.2x2" : "list.bullet"} size={22} color={theme.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accent }]} onPress={onAddLink}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {selectionMode && (
        <View style={[styles.selectionBar, { backgroundColor: theme.accent }]}>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())} style={styles.selectionBarBtn}>
            <IconSymbol name="xmark" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={() => handleShare(false)} style={styles.selectionBarBtn}>
              <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              Alert.alert('Include Notes?', 'Do you want to include notes in the shared text?', [
                { text: 'No', onPress: () => handleShare(false) },
                { text: 'Yes', onPress: () => handleShare(true) },
              ]);
            }} style={styles.selectionBarBtn}>
              <IconSymbol name="doc.text" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hasActiveFilter && (
        <View style={[styles.filterBar, { backgroundColor: theme.inputBackground }]}>
          <Text style={[styles.filterText, { color: theme.text }]}>
            {(() => {
              const colonIndex = searchQuery.indexOf(':');
              const type = searchQuery.substring(0, colonIndex);
              const name = searchQuery.substring(colonIndex + 1);
              const icons: Record<string, string> = { 'tag': '🏷️', 'domain': '🌐', 'system': '⚙️' };
              return `${icons[type] || '🔍'} ${name}`;
            })()}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              router.setParams({ tag: undefined, domain: undefined });
            }}
            hitSlop={8}
          >
            <IconSymbol name="xmark.circle.fill" size={18} color={theme.icon} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LinkCard 
            link={item} 
            tags={item.tags}
            systemEntities={item.systemEntities}
            compact={compact}
            selected={selectedIds.has(item.id)}
            selectionMode={selectionMode}
            onPress={(id) => router.push({ pathname: '/edit' as any, params: { id } })}
            onDelete={handleDelete}
            onLongPress={handleLongPress}
            onNotePress={openNoteEditor}
            onTagPress={(tag) => {
              setSearchQuery(`tag:${tag}`);
              router.setParams({ tag, domain: undefined });
            }}
            onSystemTagPress={(name) => {
              setSearchQuery(`system:${name}`);
              router.setParams({ tag: undefined, domain: undefined });
            }}
            onDomainPress={handleDomainPress}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text }]}>No links found.</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Add a link to get started!</Text>
          </View>
        }
      />

      <SortMenu
        visible={isSortMenuVisible}
        onClose={() => setIsSortMenuVisible(false)}
        options={sortOptions}
        currentValue={sortBy}
        onSelect={(val) => setSortBy(val)}
      />

      <Modal
        visible={editingNoteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingNoteId(null)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setEditingNoteId(null)}>
            <View style={styles.modalOverlayInner}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Note</Text>
                    <TouchableOpacity onPress={() => setEditingNoteId(null)} hitSlop={10}>
                      <IconSymbol name="xmark" size={20} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.noteInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    placeholder="Add a note..."
                    placeholderTextColor={theme.textSecondary}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    autoFocus
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: theme.border }]} 
                      onPress={() => setEditingNoteId(null)}
                    >
                      <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalBtn, { backgroundColor: theme.accent }]} 
                      onPress={saveNote}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  toggleBtn: {
    padding: 6,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  selectionCount: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionBarBtn: {
    padding: 4,
  },
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

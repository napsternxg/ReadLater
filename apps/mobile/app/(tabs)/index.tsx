import { StyleSheet, View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinkCard } from '@/components/LinkCard';
import { getAllLinks, getLinksByTag, getLinksByDomain, deleteLink, Link as DbLink, getTagsForLink } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { showConfirm } from '../../utils/alert';

type LinkWithTags = DbLink & { tags: string[] };

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
        dbLinks = tag ? await getLinksByTag(tag) : await getAllLinks();
      } else if (isDomainSearch) {
        const domain = searchQuery.substring(7).trim();
        dbLinks = domain ? await getLinksByDomain(domain) : await getAllLinks();
      } else {
        dbLinks = await getAllLinks(searchQuery);
      }
      const withTags = await Promise.all(
        dbLinks.map(async (l) => {
          const tags = await getTagsForLink(l.id);
          return { ...l, tags };
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
    }, [searchQuery])
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

  const hasActiveFilter = searchQuery.startsWith('tag:') || searchQuery.startsWith('domain:');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
          <IconSymbol name="house.fill" size={18} color={theme.icon} style={{ marginLeft: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search links, tag: or domain:"
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
        <TouchableOpacity onPress={() => setCompact(!compact)} hitSlop={8} style={styles.toggleBtn}>
          <IconSymbol name={compact ? "square.grid.2x2" : "list.bullet"} size={22} color={theme.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accent }]} onPress={onAddLink}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {hasActiveFilter && (
        <View style={[styles.filterBar, { backgroundColor: theme.inputBackground }]}>
          <Text style={[styles.filterText, { color: theme.text }]}>
            {searchQuery.startsWith('tag:') ? `🏷️ ${searchQuery.substring(4)}` : `🌐 ${searchQuery.substring(7)}`}
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
            compact={compact}
            onPress={(id) => router.push({ pathname: '/edit' as any, params: { id } })}
            onDelete={handleDelete}
            onTagPress={(tag) => {
              setSearchQuery(`tag:${tag}`);
              router.setParams({ tag, domain: undefined });
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
});

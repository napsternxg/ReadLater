import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTagsWithCount } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SortMenu, SortOption } from '@/components/ui/SortMenu';

export default function TagsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'created_at' | 'last_clicked_at'>('count');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  const fetchTags = async () => {
    try {
      const data = await getTagsWithCount(sortBy);
      setTags(data);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTags();
    }, [sortBy])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTags();
    setRefreshing(false);
  };

  const handleTagPress = (tag: string) => {
    router.push({ pathname: '/', params: { tag } });
  };

  const sortOptions: SortOption<'count' | 'name' | 'created_at' | 'last_clicked_at'>[] = [
    { label: 'Most Links', value: 'count', icon: 'list.number' },
    { label: 'Name', value: 'name', icon: 'textformat' },
    { label: 'Most Recent Addition', value: 'created_at', icon: 'calendar' },
    { label: 'Recently Clicked', value: 'last_clicked_at', icon: 'clock' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Tags</Text>
        <TouchableOpacity onPress={() => setIsSortMenuVisible(true)} hitSlop={8}>
          <IconSymbol name="arrow.up.arrow.down" size={20} color={theme.icon} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={tags}
        keyExtractor={(item) => item.name}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: theme.cardBackground }]} onPress={() => handleTagPress(item.name)}>
            <View style={styles.content}>
              <Text style={[styles.tagText, { color: theme.accent }]}>#{item.name}</Text>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>{item.count} links</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text }]}>No tags found.</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Add tags to your links to see them here.</Text>
          </View>
        }
      />
      <SortMenu
        visible={isSortMenuVisible}
        onClose={() => setIsSortMenuVisible(false)}
        options={sortOptions}
        currentValue={sortBy}
        onSelect={setSortBy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  countText: {
    fontSize: 16,
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

import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getTagsWithCount } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function TagsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTags = async () => {
    try {
      const data = await getTagsWithCount();
      setTags(data);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTags();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTags();
    setRefreshing(false);
  };

  const handleTagPress = (tag: string) => {
    router.push({ pathname: '/', params: { tag } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingTop: 60,
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

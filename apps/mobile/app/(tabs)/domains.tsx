import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDomainsWithCount } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SortMenu, SortOption } from '@/components/ui/SortMenu';

export default function DomainsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [domains, setDomains] = useState<{ domain: string; count: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'count' | 'domain' | 'created_at' | 'last_clicked_at'>('count');
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);

  const fetchDomains = async () => {
    try {
      const data = await getDomainsWithCount(sortBy);
      setDomains(data);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDomains();
    }, [sortBy])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDomains();
    setRefreshing(false);
  };

  const handleDomainPress = (domain: string) => {
    router.push({ pathname: '/', params: { domain } });
  };

  const sortOptions: SortOption<'count' | 'domain' | 'created_at' | 'last_clicked_at'>[] = [
    { label: 'Most Links', value: 'count', icon: 'list.number' },
    { label: 'Domain Name', value: 'domain', icon: 'globe' },
    { label: 'Most Recent Addition', value: 'created_at', icon: 'calendar' },
    { label: 'Recently Clicked', value: 'last_clicked_at', icon: 'clock' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Domains</Text>
        <TouchableOpacity onPress={() => setIsSortMenuVisible(true)} hitSlop={8}>
          <IconSymbol name="arrow.up.arrow.down" size={20} color={theme.icon} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={domains}
        keyExtractor={(item) => item.domain}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: theme.cardBackground }]} onPress={() => handleDomainPress(item.domain)}>
            <View style={styles.content}>
              <View style={styles.domainInfo}>
                <ExpoImage
                  source={{ uri: `https://www.google.com/s2/favicons?domain=${item.domain}&sz=64` }}
                  style={styles.favicon}
                />
                <Text style={[styles.domainText, { color: theme.accent }]}>{item.domain}</Text>
              </View>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>{item.count} links</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text }]}>No domains found.</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Add links to see domains here.</Text>
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
  domainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favicon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  domainText: {
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

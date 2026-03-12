import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDomainsWithCount } from '../../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function DomainsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [domains, setDomains] = useState<{ domain: string; count: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDomains = async () => {
    try {
      const data = await getDomainsWithCount();
      setDomains(data);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDomains();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDomains();
    setRefreshing(false);
  };

  const handleDomainPress = (domain: string) => {
    router.push({ pathname: '/', params: { domain } });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

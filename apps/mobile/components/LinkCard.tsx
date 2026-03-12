import { StyleSheet, View, Text, TouchableOpacity, Linking, Share, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link as DbLink } from '../db/queries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

dayjs.extend(relativeTime);

interface LinkCardProps {
  link: DbLink;
  tags?: string[];
  compact?: boolean;
  onTagPress?: (tag: string) => void;
  onDelete?: (id: string) => void;
  onPress?: (id: string) => void;
  onDomainPress?: (domain: string) => void;
}

const getFaviconUrl = (domain: string | null) => {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

export function LinkCard({ link, tags = [], compact = false, onTagPress, onDelete, onPress, onDomainPress }: LinkCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const handleOpenLink = () => {
    Linking.openURL(link.url).catch((err) => console.error('Failed to open URL', err));
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(link.url);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const faviconUrl = getFaviconUrl(link.domain);

  // ─── Compact Card ─────────────────────────────
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: theme.cardBackground }]}
        onPress={() => onPress?.(link.id)}
        onLongPress={handleCopyLink}
        activeOpacity={0.7}
      >
        {faviconUrl ? (
          <Image source={{ uri: faviconUrl }} style={styles.favicon} />
        ) : (
          <View style={[styles.favicon, styles.faviconPlaceholder, { backgroundColor: theme.inputBackground }]}>
            <Text style={{ fontSize: 14, color: theme.icon }}>{link.domain?.[0]?.toUpperCase() || '🔗'}</Text>
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: theme.text }]} numberOfLines={1}>
            {link.title || link.url}
          </Text>
          <View style={styles.compactMeta}>
            <TouchableOpacity onPress={() => link.domain && onDomainPress?.(link.domain)} hitSlop={8}>
              <Text style={[styles.compactDomain, { color: theme.accent }]}>{link.domain}</Text>
            </TouchableOpacity>
            <Text style={[styles.compactTime, { color: theme.textSecondary }]}>· {dayjs(link.created_at).fromNow()}</Text>
          </View>
        </View>
        <View style={styles.compactActions}>
          <TouchableOpacity onPress={handleCopyLink} hitSlop={8} style={styles.iconBtn}>
            <IconSymbol name="doc.on.doc" size={16} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenLink} hitSlop={8} style={styles.iconBtn}>
            <IconSymbol name="square.and.arrow.up" size={16} color={theme.accent} />
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(link.id)} hitSlop={8} style={styles.iconBtn}>
              <IconSymbol name="trash" size={16} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Full Card ─────────────────────────────────
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBackground }]}
      onPress={() => onPress?.(link.id)}
      onLongPress={handleCopyLink}
      activeOpacity={0.7}
    >
      {link.image_url ? (
        <Image source={{ uri: link.image_url }} style={styles.image} contentFit="cover" />
      ) : null}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          {faviconUrl ? (
            <Image source={{ uri: faviconUrl }} style={styles.favicon} />
          ) : (
            <View style={[styles.favicon, styles.faviconPlaceholder, { backgroundColor: theme.inputBackground }]}>
              <Text style={{ fontSize: 14, color: theme.icon }}>{link.domain?.[0]?.toUpperCase() || '🔗'}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {link.title || link.url}
            </Text>
            <TouchableOpacity onPress={() => link.domain && onDomainPress?.(link.domain)} hitSlop={8}>
              <Text style={[styles.domain, { color: theme.accent }]}>{link.domain || new URL(link.url).hostname}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.tagBadge, { backgroundColor: theme.inputBackground }]} onPress={() => onTagPress?.(tag)}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.time, { color: theme.textSecondary }]}>{dayjs(link.created_at).fromNow()}</Text>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={handleCopyLink} hitSlop={8} style={styles.iconBtn}>
              <IconSymbol name="doc.on.doc" size={18} color={theme.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenLink} hitSlop={8} style={styles.iconBtn}>
              <IconSymbol name="square.and.arrow.up" size={18} color={theme.accent} />
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity onPress={() => onDelete(link.id)} hitSlop={8} style={styles.iconBtn}>
                <IconSymbol name="trash" size={18} color={theme.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ─── Full Card ────────
  card: {
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  favicon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginTop: 2,
  },
  faviconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  domain: {
    fontSize: 12,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  time: {
    fontSize: 12,
  },

  // ─── Compact Card ─────
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 1,
    marginHorizontal: 16,
    borderRadius: 10,
    gap: 10,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compactDomain: {
    fontSize: 12,
  },
  compactTime: {
    fontSize: 12,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});

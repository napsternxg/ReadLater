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
import { updateLinkLastClicked } from '@/db/queries';

dayjs.extend(relativeTime);

interface LinkCardProps {
  link: DbLink;
  tags?: string[];
  systemEntities?: string[];
  compact?: boolean;
  onTagPress?: (tag: string) => void;
  onDelete?: (id: string) => void;
  onPress?: (id: string) => void;
  onDomainPress?: (domain: string) => void;
  onNotePress?: (id: string) => void;
  onSystemTagPress?: (name: string) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onLongPress?: (id: string) => void;
}

const getFaviconUrl = (domain: string | null) => {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

export function LinkCard({ 
  link, 
  tags = [], 
  systemEntities = [],
  compact = false, 
  onTagPress, 
  onDelete, 
  onPress, 
  onDomainPress,
  onNotePress,
  onSystemTagPress,
  selected = false,
  selectionMode = false,
  onLongPress
}: LinkCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const handleOpenLink = () => {
    updateLinkLastClicked(link.id);
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
        style={[
          styles.compactCard, 
          { backgroundColor: theme.cardBackground },
          selected && { backgroundColor: theme.inputBackground, borderColor: theme.accent, borderWidth: 1 }
        ]}
        onPress={() => selectionMode ? onLongPress?.(link.id) : onPress?.(link.id)}
        onLongPress={() => onLongPress?.(link.id)}
        activeOpacity={0.7}
      >
        <View style={styles.compactTopRow}>
          {selectionMode && (
            <View style={styles.selectionCircle}>
              <IconSymbol 
                name={selected ? "checkmark.circle.fill" : "circle"} 
                size={20} 
                color={selected ? theme.accent : theme.icon} 
              />
            </View>
          )}
          {faviconUrl ? (
            <Image source={{ uri: faviconUrl }} style={styles.favicon} />
          ) : (
            <View style={[styles.favicon, styles.faviconPlaceholder, { backgroundColor: theme.inputBackground }]}>
              <Text style={{ fontSize: 14, color: theme.icon }}>{link.domain?.[0]?.toUpperCase() || '🔗'}</Text>
            </View>
          )}
          <View style={styles.compactContent}>
            <Text style={[styles.compactTitle, { color: theme.text }]} numberOfLines={1}>
              {systemEntities.includes('notes') && (
                <IconSymbol name="pencil.and.outline" size={14} color={theme.accent} style={{ marginRight: 4 }} />
              )}
              {link.title || link.url}
            </Text>
            <View style={styles.compactMeta}>
              <TouchableOpacity 
                onPress={() => link.domain && onDomainPress?.(link.domain)} 
                hitSlop={8}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={[styles.compactDomain, { color: theme.accent }]} numberOfLines={1}>{link.domain}</Text>
              </TouchableOpacity>
              <Text style={[styles.compactTime, { color: theme.textSecondary }]}>{dayjs(link.created_at).fromNow()}</Text>
            </View>
            {(systemEntities.length > 0 || tags.length > 0) && (
              <View style={[styles.tagsContainer, { marginTop: 4 }]}>
                {systemEntities.map((name) => (
                  <TouchableOpacity key={name} style={[styles.tagBadge, { backgroundColor: theme.accent + '15' }]} onPress={() => onSystemTagPress?.(name)}>
                    <Text style={[styles.tagText, { color: theme.accent }]}>⚙️ {name}</Text>
                  </TouchableOpacity>
                ))}
                {tags.slice(0, 2).map((tag) => (
                  <TouchableOpacity key={tag} style={[styles.tagBadge, { backgroundColor: theme.inputBackground }]} onPress={() => onTagPress?.(tag)}>
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.compactActions}>
          <TouchableOpacity onPress={() => onNotePress?.(link.id)} hitSlop={8} style={styles.compactActionBtn}>
            <IconSymbol name="pencil.and.outline" size={14} color={link.notes ? theme.accent : theme.icon} />
            <Text style={[styles.actionLabel, { color: link.notes ? theme.accent : theme.textSecondary }]}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyLink} hitSlop={8} style={styles.compactActionBtn}>
            <IconSymbol name="doc.on.doc" size={14} color={theme.icon} />
            <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenLink} hitSlop={8} style={styles.compactActionBtn}>
            <IconSymbol name="square.and.arrow.up" size={14} color={theme.accent} />
            <Text style={[styles.actionLabel, { color: theme.accent }]}>Open</Text>
          </TouchableOpacity>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(link.id)} hitSlop={8} style={styles.compactActionBtn}>
              <IconSymbol name="trash" size={14} color={theme.danger} />
              <Text style={[styles.actionLabel, { color: theme.danger }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Full Card ─────────────────────────────────
  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { backgroundColor: theme.cardBackground },
        selected && { borderColor: theme.accent, borderWidth: 1 }
      ]}
      onPress={() => selectionMode ? onLongPress?.(link.id) : onPress?.(link.id)}
      onLongPress={() => onLongPress?.(link.id)}
      activeOpacity={0.7}
    >
      {selectionMode && (
        <View style={styles.selectionCircleFull}>
          <IconSymbol 
            name={selected ? "checkmark.circle.fill" : "circle"} 
            size={24} 
            color={selected ? theme.accent : theme.icon} 
          />
        </View>
      )}
      {link.image_url ? (
        <Image 
          source={{ uri: link.image_url }} 
          style={styles.image} 
          contentFit="cover" 
          placeholder={{ blurhash: 'L6PZf6ayfQfQfQfQfQfQfQfQfQfQ' }}
          transition={200}
          cachePolicy="memory-disk"
          priority="high"
          onError={() => {
            // Silently fail, let fallback UI stay
          }}
        />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {systemEntities.includes('notes') && (
                <IconSymbol name="pencil.and.outline" size={16} color={theme.accent} />
              )}
              <Text style={[styles.title, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                {link.title || link.url}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => link.domain && onDomainPress?.(link.domain)} 
              hitSlop={8}
              style={{ alignSelf: 'flex-start' }}
            >
              <Text style={[styles.domain, { color: theme.accent }]}>{link.domain || new URL(link.url).hostname}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(systemEntities.length > 0 || tags.length > 0) && (
          <View style={styles.tagsContainer}>
            {systemEntities.map((name) => (
              <TouchableOpacity key={name} style={[styles.tagBadge, { backgroundColor: theme.accent + '15' }]} onPress={() => onSystemTagPress?.(name)}>
                <Text style={[styles.tagText, { color: theme.accent }]}>⚙️ {name}</Text>
              </TouchableOpacity>
            ))}
            {tags.map((tag) => (
              <TouchableOpacity key={tag} style={[styles.tagBadge, { backgroundColor: theme.inputBackground }]} onPress={() => onTagPress?.(tag)}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>


        <View style={styles.footer}>
          <View style={{ marginBottom: 4 }}>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{dayjs(link.created_at).fromNow()}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={() => onNotePress?.(link.id)} hitSlop={8} style={styles.iconBtn}>
              <IconSymbol name="pencil.and.outline" size={18} color={link.notes ? theme.accent : theme.icon} />
            </TouchableOpacity>
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
    marginTop: 10,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  iconBtn: {
    padding: 4,
  },
  time: {
    fontSize: 12,
  },

  // ─── Compact Card ─────
  compactCard: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 1,
    marginHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'column',
    alignItems: 'flex-start',
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
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectionCircle: {
    marginRight: 4,
  },
  selectionCircleFull: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
  },
  notesContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'tag.fill': 'local-offer',
  'globe': 'language',
  'gearshape.fill': 'settings',
  'square.and.arrow.up': 'open-in-new',
  'trash': 'delete-outline',
  'doc.on.doc': 'content-copy',
  'arrow.counterclockwise': 'refresh',
  'xmark.circle.fill': 'cancel',
  'info.circle': 'info-outline',
  'sun.max': 'light-mode',
  'moon': 'dark-mode',
  'iphone': 'smartphone',
  'square.and.arrow.up.fill': 'file-upload',
  'trash.fill': 'delete-forever',
  'arrow.down.doc': 'file-download',
  'list.bullet': 'view-list',
  'square.grid.2x2': 'view-module',
  'arrow.up.arrow.down': 'sort',
  'calendar': 'event',
  'clock': 'access-time',
  'textformat': 'title',
  'list.number': 'format-list-numbered',
  'checkmark': 'check',
  'xmark': 'close',
  'pencil.and.outline': 'edit',
  'doc.text': 'description',
  'circle': 'radio-button-unchecked',
  'checkmark.circle.fill': 'check-circle',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

/**
 * Global ambient type declarations for packages that TS language server
 * occasionally fails to resolve in newly-created subdirectories.
 * These do NOT override the actual package types — they serve as fallback.
 */

// @expo/vector-icons — types included in package but TS server
// sometimes misses them in subdirs. Expo SDK 54 ships this package.
declare module '@expo/vector-icons' {
  import { ComponentProps } from 'react';
  import { TextStyle, ViewStyle } from 'react-native';

  interface IconProps {
    name:       string;
    size?:      number;
    color?:     string;
    style?:     TextStyle | ViewStyle;
  }

  export class Ionicons extends React.Component<IconProps & { name: IoniconName }> {}
  export class MaterialIcons extends React.Component<IconProps> {}
  export class FontAwesome extends React.Component<IconProps> {}

  // Ionicons name union (subset — full list is in the package)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally permissive fallback
  type IoniconName = string;
}

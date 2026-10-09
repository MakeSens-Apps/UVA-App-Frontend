/**
 * SVG module declarations for react-native-svg-transformer.
 * Allows `import Icon from '@/assets/svg/...svg'` to type-check:
 * each .svg resolves to a react-native-svg component.
 */
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}

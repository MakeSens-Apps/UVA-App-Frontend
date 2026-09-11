const React = require('react');
const { Text } = require('react-native');

/**
 * Mock for @expo/vector-icons in Jest test environment.
 * Renders a Text component with the icon name so tests can still query by testID.
 */
const createIconSet = () => {
  const Icon = ({ name, size, color, testID }) =>
    React.createElement(
      Text,
      { testID: testID ?? `icon-${String(name)}` },
      String(name ?? ''),
    );
  return Icon;
};

const Ionicons = createIconSet();
const MaterialIcons = createIconSet();
const MaterialCommunityIcons = createIconSet();
const FontAwesome = createIconSet();
const FontAwesome5 = createIconSet();
const Feather = createIconSet();
const AntDesign = createIconSet();
const Entypo = createIconSet();
const EvilIcons = createIconSet();
const Octicons = createIconSet();
const SimpleLineIcons = createIconSet();
const Zocial = createIconSet();
const Foundation = createIconSet();

module.exports = {
  // `moduleNameMapper` maps both the barrel (`@expo/vector-icons`) and the
  // per-family deep imports (`@expo/vector-icons/Ionicons`, used in app code to
  // avoid packing every icon font — see docs/migration/bundle-report.md) to
  // this same file. Flagging it as an ES module makes `import Icon from
  // '@expo/vector-icons/<Family>'` resolve to `default` instead of the whole
  // namespace object; every family renders the same stub anyway.
  __esModule: true,
  default: Ionicons,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
  Feather,
  AntDesign,
  Entypo,
  EvilIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
  Foundation,
  createIconSet,
  createIconSetFromFontello: createIconSet,
  createIconSetFromIcoMoon: createIconSet,
};

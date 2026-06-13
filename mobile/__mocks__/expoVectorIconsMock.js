const React = require('react');
const { Text } = require('react-native');

/**
 * Mock for @expo/vector-icons in Jest test environment.
 * Renders a Text component with the icon name so tests can still query by testID.
 */
const createIconSet = () => {
  const Icon = ({ name, size, color, testID }) =>
    React.createElement(Text, { testID: testID ?? `icon-${String(name)}` }, String(name ?? ''));
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

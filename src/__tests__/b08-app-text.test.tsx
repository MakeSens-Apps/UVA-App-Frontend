/**
 * B08 — AppText component tests
 *
 * Gate:
 *   - Renders with correct fontFamily for each weight
 *   - Separates margin from typography (no default marginVertical)
 *   - Optional marginVertical prop works
 *   - Size tokens resolve to correct numeric fontSize
 *   - Snapshot test
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText } from '../components/AppText';
import { fontFamilyForWeight } from '../theme/theme';

describe('AppText', () => {
  it('renders children text', async () => {
    const { getByText } = await render(<AppText>Hello</AppText>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('uses Montserrat-Medium by default (weight 500)', async () => {
    const { getByText } = await render(<AppText>Default</AppText>);
    const el = getByText('Default');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontFamily).toBe('Montserrat-Medium');
  });

  it('applies correct fontFamily for weight 400', async () => {
    const { getByText } = await render(<AppText weight="400">Regular</AppText>);
    const el = getByText('Regular');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontFamily).toBe('Montserrat-Regular');
  });

  it('applies correct fontFamily for weight 600', async () => {
    const { getByText } = await render(
      <AppText weight="600">SemiBold</AppText>,
    );
    const el = getByText('SemiBold');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontFamily).toBe('Montserrat-SemiBold');
  });

  it('applies correct fontFamily for weight 700', async () => {
    const { getByText } = await render(<AppText weight="700">Bold</AppText>);
    const el = getByText('Bold');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontFamily).toBe('Montserrat-Bold');
  });

  it('uses italic variant when italic=true', async () => {
    const { getByText } = await render(
      <AppText weight="600" italic>
        SemiBoldItalic
      </AppText>,
    );
    const el = getByText('SemiBoldItalic');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontFamily).toBe('Montserrat-SemiBoldItalic');
  });

  it('resolves size token "lg" to fontSize 18', async () => {
    const { getByText } = await render(<AppText size="lg">Large</AppText>);
    const el = getByText('Large');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontSize).toBe(18);
  });

  it('resolves size token "sm" to fontSize 14', async () => {
    const { getByText } = await render(<AppText size="sm">Small</AppText>);
    const el = getByText('Small');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontSize).toBe(14);
  });

  it('accepts numeric size directly', async () => {
    const { getByText } = await render(<AppText size={22}>Custom</AppText>);
    const el = getByText('Custom');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.fontSize).toBe(22);
  });

  it('has NO default marginVertical (separation from text_base mixin, R-16)', async () => {
    const { getByText } = await render(<AppText>No margin</AppText>);
    const el = getByText('No margin');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    // marginVertical must be 0 or undefined (not 10)
    expect(flatStyle.marginVertical ?? 0).toBe(0);
  });

  it('applies marginVertical when explicitly set', async () => {
    const { getByText } = await render(
      <AppText marginVertical={10}>With margin</AppText>,
    );
    const el = getByText('With margin');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.marginVertical).toBe(10);
  });

  it('applies color prop when provided', async () => {
    const { getByText } = await render(<AppText color="#FF0000">Red</AppText>);
    const el = getByText('Red');
    const style = el.props.style;
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.color).toBe('#FF0000');
  });

  it('passes extra Text props (testID, accessibilityLabel)', async () => {
    const { getByTestId } = await render(
      <AppText testID="my-text" accessibilityLabel="my label">
        Accessible
      </AppText>,
    );
    expect(getByTestId('my-text')).toBeTruthy();
  });

  it('snapshot matches expected shape', async () => {
    const { toJSON } = await render(
      <AppText size="base" weight="500" color="#000000">
        Snapshot text
      </AppText>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('all 8 fontFamily values are consistent with fontFamilyForWeight', () => {
    // Verify the mapping function contract without rendering
    const cases: ['400' | '500' | '600' | '700', boolean, string][] = [
      ['400', false, 'Montserrat-Regular'],
      ['500', false, 'Montserrat-Medium'],
      ['600', false, 'Montserrat-SemiBold'],
      ['700', false, 'Montserrat-Bold'],
      ['400', true, 'Montserrat-Italic'],
      ['500', true, 'Montserrat-MediumItalic'],
      ['600', true, 'Montserrat-SemiBoldItalic'],
      ['700', true, 'Montserrat-BoldItalic'],
    ];
    for (const [w, i, expected] of cases) {
      expect(fontFamilyForWeight(w, i)).toBe(expected);
    }
  });
});

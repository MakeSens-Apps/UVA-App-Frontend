/**
 * ConfigIcon — renders an icon whose path comes from the RACIMO configuration
 * (S3), i.e. `guide.icon.imagePath` and `measurement.icon.imagePath`.
 *
 * WHY THIS EXISTS (device bugs D-26 / D-30):
 * The original renders these icons with `<ion-icon [src]="…imagePath">`
 * (guide-measurement.component.html:11-21, register-measurement.page.html:23-29).
 * Every RACIMO icon shipped through that channel is an **SVG** — the up/down
 * arrows next to "Registro máximos" / "Registro mínimos" and next to every
 * measurement card title (docs/evidence/measurement/screen-03, screen-07,
 * screen-15, screen-16).
 *
 * React Native's `<Image>` cannot decode SVG, so `<Image source={{uri}} />`
 * over the downloaded `file://…svg` rendered NOTHING — which is exactly what the
 * device review reported ("faltan flechas ↑ verde / ↓ roja").
 *
 * Fix: when the path is an `.svg`, read the file as text and hand it to
 * react-native-svg's `SvgXml`. Any other extension keeps the `<Image>` path.
 *
 * COLOR: Ionic colours these icons through `ion-icon`'s host style
 * (`fill: currentColor; stroke: currentColor`) combined with
 * `[ngStyle]="{ color: icon.colorHex }"`. Both are *inherited* CSS properties,
 * so children that do not declare their own fill/stroke pick the colour up.
 * `color` + `fill` + `stroke` on the root `<Svg>` reproduce that inheritance
 * 1:1 in react-native-svg (children with explicit attributes still win, exactly
 * like on the web).
 */

import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { fileSystemService, Directory } from '@/data/storage/file-system';

export interface ConfigIconProps {
  /** Resolved `file://` URI returned by `ConfigContext.loadImage`. */
  uri?: string | null;
  /** Box size in dp. The original pins 24×24 for both call sites. */
  size?: number;
  /** `icon.colorHex` from the RACIMO configuration. */
  color?: string | null;
  testID?: string;
}

/** True when the URI points at an SVG file (query string tolerated). */
export function isSvgUri(uri: string): boolean {
  return /\.svg(\?.*)?$/i.test(uri);
}

/**
 * Renders a RACIMO-configured icon (SVG or bitmap), tinted with `colorHex`.
 * Renders nothing when there is no URI (mirrors `*ngIf="icon.enable"`).
 */
export function ConfigIcon({
  uri,
  size = 24,
  color,
  testID,
}: ConfigIconProps): React.JSX.Element | null {
  /**
   * The loaded markup is kept together with the URI it came from, so a URI change
   * invalidates it during render (no reset setState inside the effect, which would
   * cost a cascading render and trips react-hooks/set-state-in-effect).
   */
  const [loaded, setLoaded] = useState<{ uri: string; xml: string } | null>(null);
  const svg = uri ? isSvgUri(uri) : false;
  const xml = loaded && loaded.uri === uri ? loaded.xml : null;

  useEffect(() => {
    if (!uri || !svg) return undefined;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fileSystemService.readFile(uri, Directory.Data);
        if (!cancelled && res.success) setLoaded({ uri, xml: res.data.data });
      } catch {
        /* leave the icon unrendered, exactly like a broken <ion-icon src> */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, svg]);

  if (!uri) return null;

  if (svg) {
    if (!xml) return null;
    return (
      <SvgXml
        xml={xml}
        width={size}
        height={size}
        color={color ?? undefined}
        fill={color ?? undefined}
        stroke={color ?? undefined}
        testID={testID}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        { width: size, height: size },
        color ? { tintColor: color } : null,
      ]}
      resizeMode="contain"
      testID={testID}
    />
  );
}

export default ConfigIcon;

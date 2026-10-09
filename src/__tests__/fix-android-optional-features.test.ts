import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withAndroidOptionalFeatures = require('../../plugins/withAndroidOptionalFeatures.js');

const { applyOptionalFeatures, OPTIONAL_FEATURES } =
  withAndroidOptionalFeatures;

/**
 * Minimal shape of the parsed `AndroidManifest.xml` the `manifest` mod
 * passes as `modResults` (see `expo/config-plugins`'s `AndroidManifest`
 * type). Only the parts the plugin touches.
 */
function baseManifestJson(usesFeature?: unknown[]) {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        package: 'com.makesens.appuva',
      },
      ...(usesFeature ? { 'uses-feature': usesFeature } : {}),
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  };
}

describe('withAndroidOptionalFeatures config plugin', () => {
  it('exports a function (a valid Expo config plugin)', () => {
    expect(typeof withAndroidOptionalFeatures).toBe('function');
  });

  it('declares wifi and touchscreen as the optional features', () => {
    expect(OPTIONAL_FEATURES).toEqual(
      expect.arrayContaining([
        'android.hardware.wifi',
        'android.hardware.touchscreen',
      ]),
    );
    expect(OPTIONAL_FEATURES).toHaveLength(2);
  });

  describe('applyOptionalFeatures (AndroidManifest.xml patch)', () => {
    it('inserts uses-feature entries when the manifest has none', () => {
      const manifestJson = baseManifestJson();

      const result = applyOptionalFeatures(manifestJson, OPTIONAL_FEATURES);

      const usesFeature = result.manifest['uses-feature'];
      expect(usesFeature).toHaveLength(2);

      for (const name of OPTIONAL_FEATURES) {
        const entry = usesFeature.find(
          (item: any) => item.$['android:name'] === name,
        );
        expect(entry).toBeDefined();
        expect(entry.$['android:required']).toBe('false');
      }
    });

    it('flips android:required to "false" on an existing required=true entry instead of duplicating it', () => {
      const manifestJson = baseManifestJson([
        {
          $: {
            'android:name': 'android.hardware.wifi',
            'android:required': 'true',
          },
        },
      ]);

      const result = applyOptionalFeatures(manifestJson, OPTIONAL_FEATURES);

      const wifiEntries = result.manifest['uses-feature'].filter(
        (item: any) => item.$['android:name'] === 'android.hardware.wifi',
      );
      expect(wifiEntries).toHaveLength(1);
      expect(wifiEntries[0].$['android:required']).toBe('false');

      const touchscreenEntries = result.manifest['uses-feature'].filter(
        (item: any) =>
          item.$['android:name'] === 'android.hardware.touchscreen',
      );
      expect(touchscreenEntries).toHaveLength(1);
      expect(touchscreenEntries[0].$['android:required']).toBe('false');
    });

    it('does not duplicate entries when applied twice', () => {
      const manifestJson = baseManifestJson();

      const once = applyOptionalFeatures(manifestJson, OPTIONAL_FEATURES);
      const twice = applyOptionalFeatures(once, OPTIONAL_FEATURES);

      expect(twice.manifest['uses-feature']).toHaveLength(2);
      for (const name of OPTIONAL_FEATURES) {
        const entries = twice.manifest['uses-feature'].filter(
          (item: any) => item.$['android:name'] === name,
        );
        expect(entries).toHaveLength(1);
        expect(entries[0].$['android:required']).toBe('false');
      }
    });

    it('leaves unrelated uses-feature entries untouched', () => {
      const manifestJson = baseManifestJson([
        {
          $: {
            'android:name': 'android.hardware.camera',
            'android:required': 'true',
          },
        },
      ]);

      const result = applyOptionalFeatures(manifestJson, OPTIONAL_FEATURES);

      const cameraEntry = result.manifest['uses-feature'].find(
        (item: any) => item.$['android:name'] === 'android.hardware.camera',
      );
      expect(cameraEntry).toBeDefined();
      expect(cameraEntry.$['android:required']).toBe('true');
      expect(result.manifest['uses-feature']).toHaveLength(3);
    });
  });

  describe('plugin wiring', () => {
    it('registers a mods.android.manifest mod', () => {
      let config: any = { name: 'uva-app', slug: 'uva-app' };
      config = withAndroidOptionalFeatures(config);

      expect(typeof config.mods?.android?.manifest).toBe('function');
    });

    it('patches modResults through the manifest mod', async () => {
      let config: any = { name: 'uva-app', slug: 'uva-app' };
      config = withAndroidOptionalFeatures(config);

      const result = await config.mods.android.manifest({
        modRequest: {},
        modResults: baseManifestJson(),
      });

      const usesFeature = result.modResults.manifest['uses-feature'];
      expect(usesFeature).toHaveLength(2);
      expect(
        usesFeature.every(
          (item: any) => item.$['android:required'] === 'false',
        ),
      ).toBe(true);
    });

    it('is registered in app.json under expo.plugins', () => {
      const appJsonPath = path.resolve(__dirname, '../../app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      const plugins: unknown[] = appJson.expo.plugins ?? [];

      const isRegistered = plugins.some((plugin) => {
        if (typeof plugin === 'string') {
          return plugin === './plugins/withAndroidOptionalFeatures.js';
        }
        if (Array.isArray(plugin)) {
          return plugin[0] === './plugins/withAndroidOptionalFeatures.js';
        }
        return false;
      });

      expect(isRegistered).toBe(true);
    });
  });
});

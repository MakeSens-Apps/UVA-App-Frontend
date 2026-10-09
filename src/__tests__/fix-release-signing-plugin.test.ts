import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withReleaseSigning = require('../../plugins/withReleaseSigning.js');

const {
  addReleaseSigningConfig,
  applySigningGradleProperties,
  SIGNING_PROPERTY_KEYS,
} = withReleaseSigning;

/**
 * Excerpt of the `android/app/build.gradle` that `expo prebuild` generates
 * (Expo 56 / RN 0.85 template). Only the parts the plugin touches.
 */
const TEMPLATE_BUILD_GRADLE = `apply plugin: "com.android.application"

android {
    namespace 'com.makesens.appuva'
    defaultConfig {
        applicationId 'com.makesens.appuva'
        versionCode 178830097
        versionName "2.2.10"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('withReleaseSigning config plugin', () => {
  it('exports a function (a valid Expo config plugin)', () => {
    expect(typeof withReleaseSigning).toBe('function');
  });

  describe('addReleaseSigningConfig (android/app/build.gradle patch)', () => {
    it('adds a `release` entry inside signingConfigs', () => {
      const patched = addReleaseSigningConfig(TEMPLATE_BUILD_GRADLE);

      expect(patched).toMatch(/signingConfigs\s*\{[\s\S]*?release\s*\{/);
      expect(patched).toContain('MYAPP_UPLOAD_STORE_FILE');
      expect(patched).toContain('MYAPP_UPLOAD_STORE_PASSWORD');
      expect(patched).toContain('MYAPP_UPLOAD_KEY_ALIAS');
      expect(patched).toContain('MYAPP_UPLOAD_KEY_PASSWORD');
      // The debug signing config must survive untouched.
      expect(patched).toContain("storeFile file('debug.keystore')");
    });

    it('reads android/app/signing.properties as the highest-precedence source', () => {
      const patched = addReleaseSigningConfig(TEMPLATE_BUILD_GRADLE);
      expect(patched).toContain("file('signing.properties')");
    });

    it('falls back to environment variables when no gradle property is set', () => {
      const patched = addReleaseSigningConfig(TEMPLATE_BUILD_GRADLE);
      expect(patched).toContain('System.getenv(propertyName)');
    });

    it('points buildTypes.release at the release signing config, with a debug fallback', () => {
      const patched = addReleaseSigningConfig(TEMPLATE_BUILD_GRADLE);

      expect(patched).toContain(
        'signingConfig signingConfigs.release.storeFile != null ? signingConfigs.release : signingConfigs.debug',
      );

      // buildTypes.debug must keep using the debug signing config verbatim.
      const buildTypes = patched.slice(patched.indexOf('buildTypes {'));
      const debugBlock = buildTypes.slice(
        buildTypes.indexOf('debug {'),
        buildTypes.indexOf('release {'),
      );
      expect(debugBlock).toContain('signingConfig signingConfigs.debug');
      expect(debugBlock).not.toContain('signingConfigs.release');
    });

    it('is idempotent (a second pass does not duplicate the release block)', () => {
      const once = addReleaseSigningConfig(TEMPLATE_BUILD_GRADLE);
      const twice = addReleaseSigningConfig(once);
      expect(twice).toBe(once);
    });

    it('throws a descriptive error if the Expo template no longer matches', () => {
      expect(() => addReleaseSigningConfig('android { }')).toThrow(
        /signingConfigs/,
      );
    });
  });

  describe('applySigningGradleProperties (android/gradle.properties)', () => {
    it('mirrors the MYAPP_UPLOAD_* env vars into gradle.properties', () => {
      const properties = [
        { type: 'property', key: 'someOtherProp', value: 'true' },
      ];

      const result = applySigningGradleProperties(properties, {
        MYAPP_UPLOAD_STORE_FILE: '/tmp/release.keystore',
        MYAPP_UPLOAD_STORE_PASSWORD: 'store-secret',
        MYAPP_UPLOAD_KEY_ALIAS: 'uva',
        MYAPP_UPLOAD_KEY_PASSWORD: 'key-secret',
      });

      for (const key of SIGNING_PROPERTY_KEYS) {
        const item = result.find(
          (entry: any) => entry.type === 'property' && entry.key === key,
        );
        expect(item).toBeDefined();
      }
      expect(
        result.find((entry: any) => entry.key === 'MYAPP_UPLOAD_STORE_FILE')
          ?.value,
      ).toBe('/tmp/release.keystore');

      // Untouched properties survive.
      expect(
        result.find((entry: any) => entry.key === 'someOtherProp')?.value,
      ).toBe('true');
    });

    it('writes nothing when the env vars are absent (local dev builds)', () => {
      const result = applySigningGradleProperties([], {});
      expect(result).toHaveLength(0);
    });

    it('overwrites an existing property instead of duplicating it', () => {
      const result = applySigningGradleProperties(
        [{ type: 'property', key: 'MYAPP_UPLOAD_KEY_ALIAS', value: 'old' }],
        { MYAPP_UPLOAD_KEY_ALIAS: 'new' },
      );

      const matches = result.filter(
        (entry: any) => entry.key === 'MYAPP_UPLOAD_KEY_ALIAS',
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].value).toBe('new');
    });
  });

  describe('plugin wiring', () => {
    it('registers appBuildGradle and gradleProperties mods', () => {
      let config: any = { name: 'uva-app', slug: 'uva-app' };
      config = withReleaseSigning(config);

      expect(typeof config.mods?.android?.appBuildGradle).toBe('function');
      expect(typeof config.mods?.android?.gradleProperties).toBe('function');
    });

    it('patches the gradle contents through the appBuildGradle mod', async () => {
      let config: any = { name: 'uva-app', slug: 'uva-app' };
      config = withReleaseSigning(config);

      const result = await config.mods.android.appBuildGradle({
        modRequest: {},
        modResults: { language: 'groovy', contents: TEMPLATE_BUILD_GRADLE },
      });

      expect(result.modResults.contents).toContain('MYAPP_UPLOAD_STORE_FILE');
    });

    it('is registered in app.json under expo.plugins', () => {
      const appJsonPath = path.resolve(__dirname, '../../app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      const plugins: unknown[] = appJson.expo.plugins ?? [];

      const isRegistered = plugins.some((plugin) => {
        if (typeof plugin === 'string') {
          return plugin === './plugins/withReleaseSigning.js';
        }
        if (Array.isArray(plugin)) {
          return plugin[0] === './plugins/withReleaseSigning.js';
        }
        return false;
      });

      expect(isRegistered).toBe(true);
    });
  });
});

describe('app.config.js (env-injected version / versionCode)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appConfig = require('../../app.config.js');
  const appJson = require('../../app.json');

  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to the values committed in app.json when no env is set', () => {
    delete process.env.EXPO_ANDROID_VERSION_CODE;
    delete process.env.EXPO_APP_VERSION;

    const result = appConfig({ config: appJson.expo });

    expect(result.version).toBe(appJson.expo.version);
    expect(result.android.versionCode).toBe(appJson.expo.android.versionCode);
  });

  it('overrides versionCode and version from the environment', () => {
    process.env.EXPO_ANDROID_VERSION_CODE = '178908500';
    process.env.EXPO_APP_VERSION = '3.0.0';

    const result = appConfig({ config: appJson.expo });

    expect(result.android.versionCode).toBe(178908500);
    expect(result.version).toBe('3.0.0');
    // Everything else is preserved.
    expect(result.android.package).toBe('com.makesens.appuva');
  });

  it('rejects a versionCode that is not above the one already on Google Play', () => {
    process.env.EXPO_ANDROID_VERSION_CODE = '1000';
    expect(() => appConfig({ config: appJson.expo })).toThrow(/178830096/);
  });

  it('keeps the committed versionCode above the published reference build', () => {
    expect(appJson.expo.android.versionCode).toBeGreaterThan(
      appConfig.MIN_ANDROID_VERSION_CODE,
    );
  });
});

import fs from 'fs';
import path from 'path';

const withAsyncStorageDbSize = require('../../plugins/withAsyncStorageDbSize.js');

describe('withAsyncStorageDbSize config plugin', () => {
  it('exports a function (a valid Expo config plugin)', () => {
    expect(typeof withAsyncStorageDbSize).toBe('function');
  });

  it('registers a mods.android.gradleProperties mod that sets AsyncStorage_db_size_in_MB=200', async () => {
    let config: any = { name: 'uva-app', slug: 'uva-app' };

    config = withAsyncStorageDbSize(config);

    expect(typeof config.mods?.android?.gradleProperties).toBe('function');

    const modAction = config.mods.android.gradleProperties;

    // Simulate the shape the Expo prebuild "mods" pipeline passes in: the
    // gradle.properties file already parsed into a PropertiesItem[] list.
    const result = await modAction({
      modRequest: {},
      modResults: [{ type: 'property', key: 'someOtherProp', value: 'true' }],
    });

    const dbSizeProp = result.modResults.find(
      (item: any) =>
        item.type === 'property' && item.key === 'AsyncStorage_db_size_in_MB',
    );

    expect(dbSizeProp).toBeDefined();
    expect(dbSizeProp.value).toBe('200');

    // Untouched properties should be preserved.
    const otherProp = result.modResults.find(
      (item: any) => item.type === 'property' && item.key === 'someOtherProp',
    );
    expect(otherProp?.value).toBe('true');
  });

  it('overwrites an existing AsyncStorage_db_size_in_MB property instead of duplicating it', async () => {
    let config: any = { name: 'uva-app', slug: 'uva-app' };
    config = withAsyncStorageDbSize(config);

    const modAction = config.mods.android.gradleProperties;

    const result = await modAction({
      modRequest: {},
      modResults: [
        { type: 'property', key: 'AsyncStorage_db_size_in_MB', value: '6' },
      ],
    });

    const matches = result.modResults.filter(
      (item: any) =>
        item.type === 'property' && item.key === 'AsyncStorage_db_size_in_MB',
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('200');
  });

  it('is registered in app.json under expo.plugins', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const plugins: unknown[] = appJson.expo.plugins ?? [];

    const isRegistered = plugins.some((plugin) => {
      if (typeof plugin === 'string') {
        return plugin === './plugins/withAsyncStorageDbSize.js';
      }
      if (Array.isArray(plugin)) {
        return plugin[0] === './plugins/withAsyncStorageDbSize.js';
      }
      return false;
    });

    expect(isRegistered).toBe(true);
  });
});

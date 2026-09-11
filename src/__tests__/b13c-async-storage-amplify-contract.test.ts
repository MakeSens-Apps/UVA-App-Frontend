/**
 * B13c regression test — contrato entre Amplify (DataStore v5 + core) y
 * @react-native-async-storage/async-storage.
 *
 * Causa raíz del bloqueante B13: async-storage v3 eliminó multiGet/multiSet/
 * multiRemove (reemplazados por getMany/setMany/removeMany con firmas
 * distintas), por lo que DataStore.start() rechazaba con
 * "TypeError: undefined is not a function" dentro de
 * AsyncStorageDatabase.getAll → this.storage.multiGet(...).
 * Expo SDK 56 empaqueta la 2.2.0; Amplify requiere la API v2.
 *
 * Este test importa el módulo REAL (jest.requireActual evita el mock global de
 * jest.setup.js, que fue justamente lo que ocultó el bug en B03) y verifica la
 * superficie de API que Amplify invoca de verdad:
 *  - @aws-amplify/datastore AsyncStorageDatabase: getItem, setItem, removeItem,
 *    getAllKeys, multiGet, multiSet, multiRemove
 *  - @aws-amplify/core DefaultStorage.native / createQueuedStorage.native:
 *    multiGet, multiSet, multiRemove, clear
 */

// El módulo real lanza en el import si el módulo nativo no existe (entorno
// Jest). Se inyecta un stub vía TurboModuleRegistry para poder importar la
// implementación JS real y verificar su superficie de API.
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  get: (name: string) => (name === 'RNCAsyncStorage' ? {} : null),
  getEnforcing: () => ({}),
}));

const REQUIRED_BY_AMPLIFY = [
  'getItem',
  'setItem',
  'removeItem',
  'getAllKeys',
  'multiGet',
  'multiSet',
  'multiRemove',
  'clear',
] as const;

describe('b13c: contrato async-storage requerido por Amplify DataStore v5', () => {
  it('el export default real expone todos los métodos que Amplify invoca', () => {
    const storage = jest.requireActual(
      '@react-native-async-storage/async-storage',
    ).default;

    for (const method of REQUIRED_BY_AMPLIFY) {
      expect(typeof storage[method]).toBe('function');
    }
  });

  it('la versión instalada es la línea 2.x empaquetada por Expo SDK 56', () => {
    const { version } = jest.requireActual(
      '@react-native-async-storage/async-storage/package.json',
    );
    expect(version.split('.')[0]).toBe('2');
  });
});

jest.mock('@/shared/storage', () => ({catalogCache: {getString: jest.fn(), set: jest.fn()}}));
const source = '[[operators]]\nplmn = "23410"\nicon = "o2"';
const result = {23410: {icon: 'o2', scope: '234', brand: undefined}};
function create(cached?: unknown) {
  jest.resetModules();
  const {catalogCache} = require('@/shared/storage');
  catalogCache.getString.mockReturnValue(cached ? JSON.stringify(cached) : undefined);
  return {...require('../operatorCatalogCache'), storage: catalogCache};
}
afterEach(() => jest.restoreAllMocks());
test('offline failure is not cached as an empty success and next lookup retries', async () => {
  const {catalogFor, storage} = create();
  global.fetch = jest.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ok: true, text: async () => source});
  expect(await catalogFor('234')).toEqual({});
  expect(storage.set).not.toHaveBeenCalled();
  expect(await catalogFor('234')).toEqual(result);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('concurrent catalog lookups share one fetch', async () => {
  const {catalogFor} = create();
  global.fetch = jest.fn().mockResolvedValue({ok: true, text: async () => source});
  await Promise.all([catalogFor('234'), catalogFor('234')]);
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('stale cache refresh publishes new icons to mounted subscribers', async () => {
  const {catalogFor, subscribeCatalog} = create({catalog: {}, fetchedAt: 1});
  global.fetch = jest.fn().mockResolvedValue({ok: true, text: async () => source});
  const listener = jest.fn(); const unsubscribe = subscribeCatalog(listener);
  expect(await catalogFor('234')).toEqual({});
  await Promise.resolve(); await Promise.resolve();
  expect(listener).toHaveBeenCalledWith('234', result);
  expect(await catalogFor('234')).toEqual(result);
  unsubscribe();
});
test('temporary server error does not overwrite usable stale icons', async () => {
  const {catalogFor, storage} = create({catalog: result, fetchedAt: 1});
  global.fetch = jest.fn().mockResolvedValue({ok: false, status: 503});
  expect(await catalogFor('234')).toEqual(result);
  await Promise.resolve();
  expect(storage.set).not.toHaveBeenCalled();
});

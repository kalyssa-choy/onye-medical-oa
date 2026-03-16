export const createCacheStore = (ttlMs) => {
  const store = new Map();

  const get = (key) => {
    const entry = store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp >= ttlMs) {
      store.delete(key);
      return null;
    }

    return entry.data;
  };

  const set = (key, data) => {
    store.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  return {
    get,
    set,
  };
};

export const buildCacheKey = (endpoint, useMockMode, body) =>
  JSON.stringify({ endpoint, useMockMode, body });

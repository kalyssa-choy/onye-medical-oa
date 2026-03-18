// for caching the responses to reduce latency and API usage

// @param ttlMs the time for the data to live in the cache (in milliseconds)
export const createCacheStore = (ttlMs) => {
  // store recent responses in map
  const store = new Map();

  //get the cache entry by key from the map
  const get = (key) => {
    const entry = store.get(key);
    if (!entry) return null; //if the entry is not found/expired

    if (Date.now() - entry.timestamp >= ttlMs) {
      store.delete(key);
      return null; //delete entry if expired
    }

    return entry.data;
  };

  //update cache entry by key with new data 
  const set = (key, data) => {
    store.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  //return the get and set functions
  return {
    get,
    set,
  };
};

// create cache key to refer to later/identify the cache entry
// @param endpoint the endpoint of the request
// @param useMockMode whether to use mock mode
// @param body the body of the request
// @return the cache key string
export const buildCacheKey = (endpoint, useMockMode, body) =>
  JSON.stringify({ endpoint, useMockMode, body }); 

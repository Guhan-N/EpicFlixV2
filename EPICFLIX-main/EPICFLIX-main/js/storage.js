const STORAGE_KEYS = {
  watchlist: 'epicflix_watchlist',
  history: 'epicflix_history',
  continueWatching: 'epicflix_continue',
  ratings: 'epicflix_ratings',
  theme: 'epicflix_theme',
  preferences: 'epicflix_preferences',
  searchHistory: 'epicflix_search_history'
};

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Failed to read storage key ${key}:`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  } catch (error) {
    console.warn(`Failed to write storage key ${key}:`, error);
    return value;
  }
}

export const StorageManager = {
  watchlist: {
    add(item) {
      const list = this.get();
      const existingIndex = list.findIndex(entry => entry.id === item.id && entry.type === item.type);
      const normalizedItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        poster_path: item.poster_path || null,
        addedAt: item.addedAt || new Date().toISOString()
      };

      if (existingIndex >= 0) {
        list[existingIndex] = normalizedItem;
      } else {
        list.unshift(normalizedItem);
      }

      writeStorage(STORAGE_KEYS.watchlist, list);
      return list;
    },

    remove(id, type = null) {
      const list = this.get().filter(entry => {
        const sameId = entry.id === id;
        const sameType = type ? entry.type === type : true;
        return !(sameId && sameType);
      });

      writeStorage(STORAGE_KEYS.watchlist, list);
      return list;
    },

    get() {
      return readStorage(STORAGE_KEYS.watchlist, []);
    }
  },

  history: {
    add(item) {
      const list = this.get();
      const normalizedItem = {
        id: item.id,
        type: item.type,
        title: item.title || null,
        poster_path: item.poster_path || null,
        watchedAt: item.watchedAt || new Date().toISOString(),
        progress: item.progress || 0,
        season: item.season || 1,
        episode: item.episode || 1
      };

      const existingIndex = list.findIndex(entry => entry.id === item.id && entry.type === item.type);
      if (existingIndex >= 0) {
        list.splice(existingIndex, 1);
      }

      list.unshift(normalizedItem);
      writeStorage(STORAGE_KEYS.history, list.slice(0, 50));
      return list;
    },

    get() {
      return readStorage(STORAGE_KEYS.history, []);
    }
  },

  continueWatching: {
    save(item) {
      return writeStorage(STORAGE_KEYS.continueWatching, item);
    },

    get() {
      return readStorage(STORAGE_KEYS.continueWatching, null);
    }
  },

  rating: {
    set(type, id, value) {
      const ratings = readStorage(STORAGE_KEYS.ratings, {});
      ratings[`${type}-${id}`] = value;
      writeStorage(STORAGE_KEYS.ratings, ratings);
      return ratings;
    },

    get(type, id) {
      const ratings = readStorage(STORAGE_KEYS.ratings, {});
      return ratings[`${type}-${id}`] || 0;
    }
  },

  theme: {
    save(theme) {
      return writeStorage(STORAGE_KEYS.theme, theme);
    },

    load() {
      return readStorage(STORAGE_KEYS.theme, 'dark');
    }
  },

  preferences: {
    save(preferences) {
      return writeStorage(STORAGE_KEYS.preferences, preferences);
    },

    load() {
      return readStorage(STORAGE_KEYS.preferences, {});
    }
  },

  searchHistory: {
    add(term) {
      const normalized = (term || '').trim();
      if (!normalized) return this.get();

      const history = this.get().filter(entry => entry.toLowerCase() !== normalized.toLowerCase());
      history.unshift(normalized);
      const limited = history.slice(0, 8);
      writeStorage(STORAGE_KEYS.searchHistory, limited);
      return limited;
    },

    get() {
      return readStorage(STORAGE_KEYS.searchHistory, []);
    }
  }
};

export { STORAGE_KEYS };

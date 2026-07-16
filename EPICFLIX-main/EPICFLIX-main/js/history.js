import { StorageManager } from './storage.js';

export function addToHistory(item, type, progress = 0, season = 1, episode = 1) {
  StorageManager.history.add({
    id: item.id,
    type,
    title: type === 'movie' ? item.title : item.name,
    poster_path: item.poster_path || null,
    progress,
    season,
    episode
  });
}

export function getHistory() {
  return StorageManager.history.get();
}

export function saveContinueWatching(item) {
  StorageManager.continueWatching.save(item);
}

export function getContinueWatching() {
  return StorageManager.continueWatching.get();
}

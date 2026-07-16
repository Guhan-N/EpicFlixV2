import { StorageManager } from './storage.js';

export function addSearchTerm(term) {
  return StorageManager.searchHistory.add(term);
}

export function getSearchHistory() {
  return StorageManager.searchHistory.get();
}

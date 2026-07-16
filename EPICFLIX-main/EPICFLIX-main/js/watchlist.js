import { StorageManager } from './storage.js';
import { showAlert } from './ui.js';

export function addToWatchlist(item, type) {
  const normalizedItem = {
    id: item.id,
    type,
    title: type === 'movie' ? item.title : item.name,
    poster_path: item.poster_path || null,
    addedAt: new Date().toISOString()
  };

  StorageManager.watchlist.add(normalizedItem);
  showAlert('success', 'Added to Watchlist!', `${normalizedItem.title} has been added to your watchlist.`);
  return normalizedItem;
}

export function removeFromWatchlist(contentId, contentType) {
  StorageManager.watchlist.remove(contentId, contentType);
  showAlert('success', 'Removed from Watchlist!', 'Item removed from your watchlist.');
}

export function getWatchlist() {
  return StorageManager.watchlist.get();
}

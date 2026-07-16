import { StorageManager } from './storage.js';

export function setRating(type, id, value) {
  return StorageManager.rating.set(type, id, value);
}

export function getRating(type, id) {
  return StorageManager.rating.get(type, id);
}

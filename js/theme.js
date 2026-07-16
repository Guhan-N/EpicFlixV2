import { StorageManager } from './storage.js';

export function applySavedTheme(themeToggle) {
  const savedTheme = StorageManager.theme.load() || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? '' : '';
  }
  return savedTheme;
}

export function toggleTheme(themeToggle) {
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  StorageManager.theme.save(newTheme);
  if (themeToggle) {
    themeToggle.textContent = newTheme === 'dark' ? '' : '';
  }
  return newTheme;
}

const TMDB_API_KEY = '44983101bc2e8821e3a20c61a9df7a4a';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const cache = new Map();

async function fetchTmdb(endpoint) {
  const cacheKey = endpoint;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const response = await fetch(`${TMDB_API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`);
  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

export async function fetchContent(endpoint) {
  try {
    return await fetchTmdb(endpoint);
  } catch (error) {
    console.error('Error fetching content:', error);
    return null;
  }
}

export function getImageUrl(path, size = 'w500') {
  if (!path) {
    return 'https://via.placeholder.com/500x750';
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path) {
  if (!path) {
    return 'https://via.placeholder.com/1280x720';
  }
  return `${BACKDROP_BASE_URL}${path}`;
}

export { IMAGE_BASE_URL, BACKDROP_BASE_URL, TMDB_API_KEY };

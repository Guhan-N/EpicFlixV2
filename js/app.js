import { fetchContent, getImageUrl, getBackdropUrl } from './api.js';
import { StorageManager } from './storage.js';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from './watchlist.js';
import { addToHistory, getHistory, saveContinueWatching, getContinueWatching } from './history.js';
import { setRating, getRating } from './ratings.js';
import { applySavedTheme, toggleTheme } from './theme.js';
import { addSearchTerm, getSearchHistory } from './search.js';
import { setupNavigation } from './navigation.js';
import { showAlert, setContentContainer } from './ui.js';

const main = document.getElementById('main');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search');
const mobileSearchInput = document.getElementById('mobile-search');
const genreSelect = document.getElementById('genre-select');
const mobileGenreSelect = document.getElementById('mobile-genre-select');
const contentType = document.getElementById('content-type');
const mobileContentType = document.getElementById('mobile-content-type');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileSidebarMenu = document.getElementById('mobile-sidebar-menu');
const closeMobileMenuButton = document.querySelector('.close-mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

let currentPage = 'home';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let comments = JSON.parse(localStorage.getItem('comments')) || {};
let ratings = JSON.parse(localStorage.getItem('ratings')) || {};
let navigationStack = [];

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function createContentCard(item, type = 'movie') {
  const title = type === 'movie' ? item.title : item.name;
  const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : 'No rating';

  const card = document.createElement('div');
  card.className = 'movie-card';
  card.innerHTML = `
    <div class="movie-poster-container">
      <img src="${getImageUrl(item.poster_path)}" alt="${title}" class="movie-poster">
      <div class="card-actions">
        <button class="action-btn watchlist-btn" onclick="window.addToWatchlistFromApp(${JSON.stringify(item).replace(/"/g, '&quot;')}, '${type}')" title="Add to Watchlist">📋</button>
      </div>
    </div>
    <div class="movie-info">
      <h3>${title}</h3>
      <p class="rating">${rating}</p>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('action-btn')) {
      e.stopPropagation();
      return;
    }
    navigationStack.push({ page: currentPage });
    showDetails(item.id, type);
  });

  return card;
}

async function showActorDetails(actorId) {
  const [actor, credits] = await Promise.all([
    fetchContent(`/person/${actorId}`),
    fetchContent(`/person/${actorId}/combined_credits`)
  ]);

  if (!actor || !credits) return;

  navigationStack.push({ page: 'details' });

  main.innerHTML = `
    <div class="details-container">
      <button class="back-button">← Back</button>
      <div class="actor-details">
        <div class="actor-info">
          <img src="${getImageUrl(actor.profile_path, 'w300')}" alt="${actor.name}" class="actor-image">
          <div class="actor-bio">
            <h1>${actor.name}</h1>
            <p class="birth-info">Born: ${actor.birthday || 'N/A'}</p>
            <p class="place-of-birth">Place of Birth: ${actor.place_of_birth || 'N/A'}</p>
            <p class="biography">${actor.biography || 'No biography available.'}</p>
          </div>
        </div>
        <div class="filmography">
          <h2>Filmography</h2>
          <div class="movies-grid">
            ${credits.cast.sort((a, b) => b.popularity - a.popularity).slice(0, 20).map(credit => {
              const type = credit.media_type;
              const title = type === 'movie' ? credit.title : credit.name;
              const rating = credit.vote_average ? `⭐ ${credit.vote_average.toFixed(1)}` : 'No rating';
              return `
                <div class="movie-card" onclick="window.showDetails(${credit.id}, '${type}')">
                  <img src="${getImageUrl(credit.poster_path, 'w500')}" alt="${title}" class="movie-poster">
                  <div class="movie-info">
                    <h3>${title}</h3>
                    <p class="character">${credit.character || 'Unknown Role'}</p>
                    <p class="rating">${rating}</p>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;

  document.querySelector('.back-button')?.addEventListener('click', () => {
    navigationStack.pop();
    const previous = navigationStack[navigationStack.length - 1];
    if (previous?.type === 'content') {
      showDetails(previous.id, previous.contentType);
    } else {
      displayContent(previous?.page || 'home');
    }
  });
}

async function showDetails(id, type) {
  const [details, credits, videos] = await Promise.all([
    fetchContent(`/${type}/${id}`),
    fetchContent(`/${type}/${id}/credits`),
    fetchContent(`/${type}/${id}/videos`)
  ]);

  if (!details || !credits) return;

  const title = type === 'movie' ? details.title : details.name;
  const releaseDate = type === 'movie' ? details.release_date : details.first_air_date;
  const runtime = type === 'movie' ? `${details.runtime} minutes` : `${details.number_of_seasons} seasons`;
  const userRating = getRating(type, id);
  const contentComments = comments[`${type}-${id}`] || [];
  const rating = details.vote_average ? `⭐ ${details.vote_average.toFixed(1)}` : 'No rating';
  const trailer = videos?.results?.find(video => video.type === 'Trailer' && video.site === 'YouTube');

  const getStreamingUrl = (season = 1, episode = 1) => {
    if (type === 'movie') {
      return `https://vidsrc.sbs/embed/movie/${id}`;
    }
    return `https://vidsrc.sbs/embed/tv/${id}/${season}/${episode}`;
  };

  const initialVidsrcUrl = getStreamingUrl();

  main.innerHTML = `
    <div class="details-container">
      <div class="details-backdrop" style="background-image: url(${getBackdropUrl(details.backdrop_path)})">
        <div class="details-content">
          <div class="details-poster">
            <button class="back-button">← Back</button>
            <img src="${getImageUrl(details.poster_path)}" alt="${title}">
          </div>
          <div class="details-info">
            <h1>${title}</h1>
            <p class="release-date">Release Date: ${releaseDate}</p>
            <p class="runtime">Runtime: ${runtime}</p>
            <p class="rating">Rating: ${rating}</p>
            <p class="overview">${details.overview}</p>
            <div class="genres">
              ${details.genres.map(genre => `<span class="genre">${genre.name}</span>`).join('')}
            </div>
            <div class="user-rating">
              <h3>Your Rating</h3>
              <div class="stars">
                ${Array.from({ length: 5 }, (_, i) => `<span class="star ${i < userRating ? 'active' : ''}" data-rating="${i + 1}">⭐</span>`).join('')}
              </div>
            </div>
            <div class="content-actions">
              <button class="action-button watchlist-button" onclick="window.addToWatchlistFromApp(${JSON.stringify(details).replace(/"/g, '&quot;')}, '${type}')">📋 Add to Watchlist</button>
              <button class="action-button" id="share-btn"><span>🔗</span> Share</button>
            </div>
          </div>
        </div>
      </div>
      <div class="content-section">
        ${(trailer || initialVidsrcUrl) ? `
          <section class="video-player-section">
            <div class="video-controls">
              <button class="video-btn ${!trailer ? 'disabled' : ''}" id="watch-trailer" ${!trailer ? 'disabled' : ''}>🎬 Watch Trailer</button>
              <button class="video-btn ${!initialVidsrcUrl ? 'disabled' : ''}" id="watch-content" ${!initialVidsrcUrl ? 'disabled' : ''}>▶️ ${type === 'movie' ? 'Watch Movie' : 'Watch Episode'}</button>
            </div>
            ${type === 'tv' && details.seasons && details.seasons.length > 0 ? `
              <div class="episode-selection">
                <div class="selection-group">
                  <label for="season-select">Season:</label>
                  <select id="season-select">
                    ${details.seasons.filter(season => season.season_number > 0).map(season => `<option value="${season.season_number}">Season ${season.season_number}</option>`).join('')}
                  </select>
                </div>
                <div class="selection-group">
                  <label for="episode-select">Episode:</label>
                  <select id="episode-select">
                    <option value="1">Episode 1</option>
                  </select>
                </div>
              </div>` : ''}
            <div class="video-container">
              <iframe id="video-player" src="${trailer ? `https://www.youtube.com/embed/${trailer.key}` : ''}" frameborder="0" allowfullscreen></iframe>
            </div>
          </section>` : ''}
        <section class="cast-section">
          <h2>Cast</h2>
          <div class="cast-grid">
            ${credits.cast.slice(0, 8).map(actor => `
              <div class="cast-card" onclick="window.showActorDetails(${actor.id})">
                <img src="${getImageUrl(actor.profile_path, 'w300')}" alt="${actor.name}">
                <h4>${actor.name}</h4>
                <p>${actor.character}</p>
              </div>`).join('')}
          </div>
        </section>
        <section class="comments-section">
          <h2>comment</h2>
          <div class="comments">
            ${contentComments.map(comment => `<div class="comment"><p>${comment.text}</p><span>${new Date(comment.date).toLocaleDateString()}</span></div>`).join('')}
          </div>
          <div class="add-comment">
            <textarea class="comment-input" placeholder="Add your comment..."></textarea>
            <button class="submit-comment">Submit Comment</button>
          </div>
        </section>
      </div>
    </div>`;

  document.querySelector('.back-button')?.addEventListener('click', () => {
    navigationStack.pop();
    const previous = navigationStack[navigationStack.length - 1];
    displayContent(previous?.page || 'home');
  });

  const updateVideoSource = (src) => {
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer && src) {
      videoPlayer.src = src;
    }
  };

  if (type === 'tv' && details.seasons && details.seasons.length > 0) {
    const seasonSelect = document.getElementById('season-select');
    const episodeSelect = document.getElementById('episode-select');

    const loadEpisodes = async (seasonNumber) => {
      try {
        const seasonData = await fetchContent(`/tv/${id}/season/${seasonNumber}`);
        if (seasonData && seasonData.episodes) {
          episodeSelect.innerHTML = '';
          seasonData.episodes.forEach(episode => {
            const option = document.createElement('option');
            option.value = episode.episode_number;
            option.textContent = `Episode ${episode.episode_number}${episode.name ? ` - ${episode.name}` : ''}`;
            episodeSelect.appendChild(option);
          });
          updateVideoSource(getStreamingUrl(seasonNumber, 1));
        }
      } catch (error) {
        console.error('Error loading episodes:', error);
      }
    };

    if (seasonSelect?.value) {
      loadEpisodes(parseInt(seasonSelect.value));
    }

    seasonSelect?.addEventListener('change', () => loadEpisodes(parseInt(seasonSelect.value)));
    episodeSelect?.addEventListener('change', () => {
      updateVideoSource(getStreamingUrl(parseInt(seasonSelect.value), parseInt(episodeSelect.value)));
    });
  }

  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      setRating(type, id, rating);
      document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < rating));
    });
  });

  const commentInput = document.querySelector('.comment-input');
  const submitButton = document.querySelector('.submit-comment');

  submitButton?.addEventListener('click', () => {
    const text = commentInput.value.trim();
    if (text) {
      const comment = { text, date: new Date().toISOString() };
      if (!comments[`${type}-${id}`]) comments[`${type}-${id}`] = [];
      comments[`${type}-${id}`].unshift(comment);
      localStorage.setItem('comments', JSON.stringify(comments));
      const commentsList = document.querySelector('.comments');
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `<p>${comment.text}</p><span>${new Date(comment.date).toLocaleDateString()}</span>`;
      commentsList?.insertBefore(commentElement, commentsList.firstChild);
      commentInput.value = '';
    }
  });

  const watchTrailerBtn = document.getElementById('watch-trailer');
  const watchContentBtn = document.getElementById('watch-content');
  const videoPlayer = document.getElementById('video-player');

  if (watchTrailerBtn && !watchTrailerBtn.disabled) {
    watchTrailerBtn.addEventListener('click', () => {
      videoPlayer.src = `https://www.youtube.com/embed/${trailer.key}`;
      watchTrailerBtn.classList.add('active');
      if (watchContentBtn) watchContentBtn.classList.remove('active');
    });
  }

  if (watchContentBtn && !watchContentBtn.disabled) {
    watchContentBtn.addEventListener('click', () => {
      addToHistory(details, type);
      saveContinueWatching({ id, type, season: 1, episode: 1 });
      const selectedSeason = document.getElementById('season-select') ? parseInt(document.getElementById('season-select').value) : 1;
      const selectedEpisode = document.getElementById('episode-select') ? parseInt(document.getElementById('episode-select').value) : 1;
      const contentUrl = type === 'tv' ? getStreamingUrl(selectedSeason, selectedEpisode) : getStreamingUrl();
      if (contentUrl) videoPlayer.src = contentUrl;
      watchContentBtn.classList.add('active');
      if (watchTrailerBtn) watchTrailerBtn.classList.remove('active');
    });
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: details.title || details.name,
        text: `Check out "${details.title || details.name}" - ${details.overview ? details.overview.substring(0, 100) + '...' : 'A great movie/show to watch!'}`,
        url: `${window.location.origin}${window.location.pathname}#details/${type}/${details.id}`
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
          showAlert('success', 'Shared!', 'Content shared successfully!');
        } else {
          const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareText);
            showAlert('success', 'Copied!', 'Link copied to clipboard!');
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showAlert('success', 'Copied!', 'Link copied to clipboard!');
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          showAlert('error', 'Share Failed', 'Failed to share content. Please try again.');
        }
      }
    });
  }

  if (watchContentBtn && !watchContentBtn.disabled) {
    watchContentBtn.classList.add('active');
    if (type === 'tv' && initialVidsrcUrl) {
      videoPlayer.src = initialVidsrcUrl;
    }
  } else if (watchTrailerBtn && !watchTrailerBtn.disabled) {
    watchTrailerBtn.classList.add('active');
  }
}

async function loadWatchlist() {
  const watchlistGrid = document.getElementById('watchlist-grid');
  if (!watchlistGrid) return;

  const watchlist = getWatchlist();
  watchlistGrid.innerHTML = '';

  if (watchlist.length === 0) {
    watchlistGrid.innerHTML = `<div class="empty-state"><h3>Your watchlist is empty</h3><p>Add movies and TV shows you want to watch later</p></div>`;
    return;
  }

  watchlist.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card watchlist-card';
    card.innerHTML = `
      <div class="movie-poster-container">
        <img src="${getImageUrl(item.poster_path)}" alt="${item.title}" class="movie-poster">
        <div class="card-actions">
          <button class="action-btn remove-btn" onclick="window.removeFromWatchlistFromApp(${item.id}, '${item.type}')" title="Remove from Watchlist">❌</button>
        </div>
      </div>
      <div class="movie-info">
        <h3>${item.title}</h3>
        <p class="added-date">Added ${new Date(item.addedAt).toLocaleDateString()}</p>
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('action-btn')) {
        e.stopPropagation();
        return;
      }
      navigationStack.push({ page: currentPage });
      showDetails(item.id, item.type);
    });

    watchlistGrid.appendChild(card);
  });
}

async function loadWatchHistory() {
  const historyGrid = document.getElementById('history-grid');
  if (!historyGrid) return;

  const history = getHistory();
  historyGrid.innerHTML = '';

  if (history.length === 0) {
    historyGrid.innerHTML = `<div class="empty-state"><h3>No watch history</h3><p>Start watching content to see your history here</p></div>`;
    return;
  }

  const resolvedHistory = await Promise.all(history.map(async (item) => {
    let title = item.title || null;
    let posterPath = item.poster_path || null;

    if (!title || !posterPath) {
      const details = await fetchContent(`/${item.type}/${item.id}`);
      if (details) {
        title = details.title || details.name || title;
        posterPath = details.poster_path || posterPath;
      }
    }

    return {
      ...item,
      title: title || `Item ${item.id}`,
      posterPath
    };
  }));

  resolvedHistory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card history-card';
    card.innerHTML = `
      <div class="movie-poster-container">
        <img src="${getImageUrl(item.posterPath)}" alt="${item.title}" class="movie-poster">
      </div>
      <div class="movie-info">
        <h3>${item.title}</h3>
        <p class="watch-date">Watched ${new Date(item.watchedAt).toLocaleDateString()}</p>
      </div>`;
    historyGrid.appendChild(card);
  });
}

async function loadGenres() {
  const movieGenres = await fetchContent('/genre/movie/list');
  const tvGenres = await fetchContent('/genre/tv/list');
  const allGenres = [...new Set([...movieGenres.genres, ...tvGenres.genres].map(g => JSON.stringify(g)))];
  const uniqueGenres = allGenres.map(g => JSON.parse(g));

  [genreSelect, mobileGenreSelect].forEach(select => {
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    uniqueGenres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre.id;
      option.textContent = genre.name;
      select.appendChild(option);
    });
  });
}

async function displayContent(page) {
  currentPage = page;
  navigationStack = [{ page }];

  if (page === 'profile') {
    main.innerHTML = `
      <div class="content-section">
        <div class="profile-header">
          <h1>My Profile</h1>
          <p>Welcome to your local profile view.</p>
        </div>
        <div class="profile-tabs">
          <button class="tab-btn active" data-tab="watchlist">My Watchlist</button>
          <button class="tab-btn" data-tab="history">Watch History</button>
        </div>
        <div class="tab-content">
          <div id="watchlist-tab" class="tab-pane active">
            <div class="section-header">
              <h2>My Watchlist</h2>
              <p>Items you want to watch later</p>
            </div>
            <div class="movies-grid" id="watchlist-grid">
              <div class="loading">Loading watchlist...</div>
            </div>
          </div>
          <div id="history-tab" class="tab-pane">
            <div class="section-header">
              <h2>Watch History</h2>
              <p>Content you've recently watched</p>
            </div>
            <div class="movies-grid" id="history-grid">
              <div class="loading">Loading watch history...</div>
            </div>
          </div>
        </div>
      </div>`;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        if (btn.dataset.tab === 'watchlist') loadWatchlist();
        else loadWatchHistory();
      });
    });
    loadWatchlist();
    return;
  }

  if (page === 'movies') {
    main.innerHTML = `
      <div class="hero-section splide">
        <div class="splide__track">
          <div class="splide__list" id="hero-slider"></div>
        </div>
      </div>
      <div class="content-section">
        <h2>Trending Movies</h2>
        <div class="movies-grid" id="trending-grid"></div>
        <h2>Popular Movies</h2>
        <div class="movies-grid" id="movies-grid"></div>
      </div>`;
  } else if (page === 'tvshows') {
    main.innerHTML = `
      <div class="hero-section splide">
        <div class="splide__track">
          <div class="splide__list" id="hero-slider"></div>
        </div>
      </div>
      <div class="content-section">
        <h2>Trending TV Shows</h2>
        <div class="movies-grid" id="trending-grid"></div>
        <h2>Popular TV Shows</h2>
        <div class="movies-grid" id="tvshows-grid"></div>
      </div>`;
  } else if (page === 'anime') {
    main.innerHTML = `
      <div class="hero-section splide">
        <div class="splide__track">
          <div class="splide__list" id="hero-slider"></div>
        </div>
      </div>
      <div class="content-section">
        <h2>Trending Anime</h2>
        <div class="movies-grid" id="trending-grid"></div>
        <h2>Popular Anime</h2>
        <div class="movies-grid" id="anime-grid"></div>
      </div>`;
  } else {
    main.innerHTML = `
      <div class="hero-section splide">
        <div class="splide__track">
          <div class="splide__list" id="hero-slider"></div>
        </div>
      </div>
      <div class="content-section">
        <h2>Trending Now</h2>
        <div class="movies-grid" id="trending-grid"></div>
        <h2>Popular Movies</h2>
        <div class="movies-grid" id="movies-grid"></div>
        <h2>Popular TV Shows</h2>
        <div class="movies-grid" id="tvshows-grid"></div>
      </div>`;
  }

  const heroSlider = document.getElementById('hero-slider');
  const trendingGrid = document.getElementById('trending-grid');
  const moviesGrid = document.getElementById('movies-grid');
  const tvShowsGrid = document.getElementById('tvshows-grid');
  const animeGrid = document.getElementById('anime-grid');

  switch (page) {
    case 'home': {
      const [trending, movies, tvShows] = await Promise.all([fetchContent('/trending/all/week'), fetchContent('/movie/popular'), fetchContent('/tv/popular')]);
      trending.results.slice(0, 5).forEach(item => {
        const slide = document.createElement('div');
        slide.className = 'splide__slide';
        slide.innerHTML = `<div class="hero-slide" style="background-image: url(${getBackdropUrl(item.backdrop_path)})"><div class="hero-content"><h2>${item.title || item.name}</h2><p>${item.overview}</p><div class="hero-buttons"><button class="hero-btn primary" data-id="${item.id}" data-type="${item.title ? 'movie' : 'tv'}">Watch Now</button><button class="hero-btn secondary" data-id="${item.id}" data-type="${item.title ? 'movie' : 'tv'}">More Info</button></div></div></div>`;
        heroSlider.appendChild(slide);
      });
      new Splide('.splide', { type: 'fade', rewind: true, autoplay: true, interval: 5000 }).mount();
      trending.results.forEach(item => trendingGrid.appendChild(createContentCard(item, item.media_type || (item.title ? 'movie' : 'tv'))));
      movies.results.forEach(movie => moviesGrid.appendChild(createContentCard(movie, 'movie')));
      tvShows.results.forEach(show => tvShowsGrid.appendChild(createContentCard(show, 'tv')));
      break;
    }
    case 'movies': {
      const [trendingMovies, popularMovies] = await Promise.all([fetchContent('/trending/movie/week'), fetchContent('/movie/popular')]);
      popularMovies.results.slice(0, 5).forEach(movie => {
        const slide = document.createElement('div');
        slide.className = 'splide__slide';
        slide.innerHTML = `<div class="hero-slide" style="background-image: url(${getBackdropUrl(movie.backdrop_path)})"><div class="hero-content"><h2>${movie.title}</h2><p>${movie.overview}</p><div class="hero-buttons"><button class="hero-btn primary" data-id="${movie.id}" data-type="movie">Watch Now</button><button class="hero-btn secondary" data-id="${movie.id}" data-type="movie">More Info</button></div></div></div>`;
        heroSlider.appendChild(slide);
      });
      new Splide('.splide', { type: 'fade', rewind: true, autoplay: true, interval: 5000 }).mount();
      trendingMovies.results.forEach(movie => trendingGrid.appendChild(createContentCard(movie, 'movie')));
      popularMovies.results.forEach(movie => moviesGrid.appendChild(createContentCard(movie, 'movie')));
      break;
    }
    case 'tvshows': {
      const [trendingTVShows, popularTVShows] = await Promise.all([fetchContent('/trending/tv/week'), fetchContent('/tv/popular')]);
      popularTVShows.results.slice(0, 5).forEach(show => {
        const slide = document.createElement('div');
        slide.className = 'splide__slide';
        slide.innerHTML = `<div class="hero-slide" style="background-image: url(${getBackdropUrl(show.backdrop_path)})"><div class="hero-content"><h2>${show.name}</h2><p>${show.overview}</p><div class="hero-buttons"><button class="hero-btn primary" data-id="${show.id}" data-type="tv">Watch Now</button><button class="hero-btn secondary" data-id="${show.id}" data-type="tv">More Info</button></div></div></div>`;
        heroSlider.appendChild(slide);
      });
      new Splide('.splide', { type: 'fade', rewind: true, autoplay: true, interval: 5000 }).mount();
      trendingTVShows.results.forEach(show => trendingGrid.appendChild(createContentCard(show, 'tv')));
      popularTVShows.results.forEach(show => tvShowsGrid.appendChild(createContentCard(show, 'tv')));
      break;
    }
    case 'anime': {
      const [animationGenreContent, japaneseContent, animeKeywordContent] = await Promise.all([
        fetchContent('/discover/tv?with_genres=16&sort_by=popularity.desc&with_origin_country=JP'),
        fetchContent('/discover/tv?with_origin_country=JP&sort_by=popularity.desc'),
        fetchContent('/discover/tv?with_keywords=210024|287928&sort_by=popularity.desc')
      ]);
      const allAnimeResults = [...(animationGenreContent?.results || []), ...(japaneseContent?.results || []), ...(animeKeywordContent?.results || [])];
      const uniqueAnime = allAnimeResults.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));
      const filteredAnime = uniqueAnime.filter(item => {
        const title = (item.name || item.title || '').toLowerCase();
        const overview = (item.overview || '').toLowerCase();
        const keywords = ['anime', 'manga', 'japanese', 'studio', 'shounen', 'shoujo', 'seinen', 'josei', 'mecha', 'isekai', 'slice of life', 'magical girl', 'otaku', 'kawaii'];
        return item.origin_country?.includes('JP') || keywords.some(keyword => title.includes(keyword) || overview.includes(keyword));
      });
      const trendingAnimeRaw = await fetchContent('/trending/tv/week?with_origin_country=JP');
      const trendingAnime = (trendingAnimeRaw?.results || []).filter(item => {
        const title = (item.name || item.title || '').toLowerCase();
        const overview = (item.overview || '').toLowerCase();
        const keywords = ['anime', 'manga', 'japanese', 'studio', 'shounen', 'shoujo', 'seinen', 'josei', 'mecha', 'isekai', 'slice of life', 'magical girl', 'otaku', 'kawaii'];
        return item.origin_country?.includes('JP') || keywords.some(keyword => title.includes(keyword) || overview.includes(keyword));
      });
      filteredAnime.slice(0, 5).forEach(anime => {
        const slide = document.createElement('div');
        slide.className = 'splide__slide';
        slide.innerHTML = `<div class="hero-slide" style="background-image: url(${getBackdropUrl(anime.backdrop_path)})"><div class="hero-content"><h2>${anime.name}</h2><p>${anime.overview}</p><div class="hero-buttons"><button class="hero-btn primary" data-id="${anime.id}" data-type="tv">Watch Now</button><button class="hero-btn secondary" data-id="${anime.id}" data-type="tv">More Info</button></div></div></div>`;
        heroSlider.appendChild(slide);
      });
      new Splide('.splide', { type: 'fade', rewind: true, autoplay: true, interval: 5000 }).mount();
      trendingAnime.slice(0, 20).forEach(anime => trendingGrid.appendChild(createContentCard(anime, 'tv')));
      filteredAnime.slice(0, 20).forEach(anime => animeGrid.appendChild(createContentCard(anime, 'tv')));
      break;
    }
  }

  document.querySelectorAll('.hero-btn').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const type = button.dataset.type;
      navigationStack.push({ type: 'content', id, contentType: type });
      showDetails(id, type);
    });
  });
}

function setupSearchFunctionality(searchInputElement, contentTypeSelect, genreSelectElement) {
  searchInputElement.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    const type = contentTypeSelect.value;
    const selectedGenre = genreSelectElement.value;
    addSearchTerm(query);

    if (!query && !selectedGenre) {
      displayContent(currentPage);
      return;
    }

    let endpoint = '/discover';
    let params = [];

    if (type !== 'all') {
      endpoint += `/${type}`;
    } else {
      endpoint += '/movie';
    }

    if (selectedGenre) {
      params.push(`with_genres=${selectedGenre}`);
    }

    if (query) {
      params.push(`query=${encodeURIComponent(query)}`);
      endpoint = `/search/${type === 'all' ? 'multi' : type}`;
    }

    const data = await fetchContent(`${endpoint}?${params.join('&')}`);
    if (data?.results) {
      main.innerHTML = `
        <div class="content-section">
          <h2>Search Results</h2>
          <div class="movies-grid" id="search-results"></div>
        </div>`;
      const searchResults = document.getElementById('search-results');
      data.results.forEach(item => {
        if (type === 'all' || item.media_type === type || !item.media_type) {
          searchResults.appendChild(createContentCard(item, item.media_type || type));
        }
      });
    }
  }, 500));
}

function setupMobileMenu() {
  mobileMenuToggle?.addEventListener('click', () => {
    mobileSidebarMenu?.classList.add('active');
  });

  closeMobileMenuButton?.addEventListener('click', () => {
    mobileSidebarMenu?.classList.remove('active');
  });

  mobileSidebarMenu?.addEventListener('click', (e) => {
    if (e.target === mobileSidebarMenu) {
      mobileSidebarMenu.classList.remove('active');
    }
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      mobileNavLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
      document.getElementById(page)?.classList.add('active');
      mobileSidebarMenu?.classList.remove('active');
      displayContent(page);
    });
  });
}

function init() {
  if (!document.getElementById('main')) {
    return;
  }

  applySavedTheme(themeToggle);
  setupNavigation((page) => displayContent(page));
  setupMobileMenu();
  setupSearchFunctionality(searchInput, contentType, genreSelect);
  setupSearchFunctionality(mobileSearchInput, mobileContentType, mobileGenreSelect);

  window.showDetails = showDetails;
  window.showActorDetails = showActorDetails;
  window.addToWatchlistFromApp = (item, type) => {
    addToWatchlist(item, type);
    showAlert('success', 'Added to Watchlist!', `${type === 'movie' ? item.title : item.name} added locally.`);
  };
  window.removeFromWatchlistFromApp = (id, type) => {
    removeFromWatchlist(id, type);
    loadWatchlist();
  };

  themeToggle?.addEventListener('click', () => toggleTheme(themeToggle));

  loadGenres();

  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search') || urlParams.get('q');
  if (searchQuery) {
    displayContent('home');
    if (searchInput) {
      searchInput.value = searchQuery;
      searchInput.dispatchEvent(new Event('input'));
    }
  } else {
    displayContent('home');
  }
}

document.addEventListener('DOMContentLoaded', init);

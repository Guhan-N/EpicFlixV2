export function setupNavigation(onNavigate) {
  const homeLink = document.getElementById('home');
  const moviesLink = document.getElementById('movies');
  const tvShowsLink = document.getElementById('tvshows');
  const animeLink = document.getElementById('anime');
  const profileLink = document.getElementById('profile');

  const activateLink = (activeLink) => {
    document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
    activeLink?.classList.add('active');
  };

  const route = (page, event) => {
    if (event) event.preventDefault();
    activateLink(document.getElementById(page));
    if (typeof onNavigate === 'function') {
      onNavigate(page);
    }
  };

  homeLink?.addEventListener('click', (event) => route('home', event));
  moviesLink?.addEventListener('click', (event) => route('movies', event));
  tvShowsLink?.addEventListener('click', (event) => route('tvshows', event));
  animeLink?.addEventListener('click', (event) => route('anime', event));
  profileLink?.addEventListener('click', (event) => route('profile', event));
}

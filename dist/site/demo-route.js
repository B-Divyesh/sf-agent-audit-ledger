if (window.location.pathname.replace(/\/$/, '') === '/demo' || new URLSearchParams(window.location.search).has('demo')) {
  document.documentElement.dataset.demoRoute = 'true';
}

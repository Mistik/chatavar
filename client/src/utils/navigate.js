// Tiny client-side router helper — shared across components
export function navigate(path, replace = false) {
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState(null, '', path);
  else         window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

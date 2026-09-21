/* The website and installed app share the same static shell. */
if ('serviceWorker' in navigator && (
  location.protocol === 'https:' ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'
)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      console.warn('Offline support could not be enabled:', error);
    });
  });
}

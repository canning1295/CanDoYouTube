(function() {
  const DEFAULT_SITES = ['youtube.com'];
  const DEFAULT_W_SPEED = 4;

  function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['allowedSites', 'wSpeed'], (data) => {
        resolve({
          allowedSites: data.allowedSites || DEFAULT_SITES,
          wSpeed: typeof data.wSpeed === 'number' ? data.wSpeed : DEFAULT_W_SPEED
        });
      });
    });
  }

  function isAllowed(hostname, sites) {
    return sites.some(site => hostname === site || hostname.endsWith('.' + site));
  }

  function adjustVideo(rateSetter) {
    const video = document.querySelector('video');
    if (video) {
      rateSetter(video);
    }
  }

  function init() {
    getSettings().then(({allowedSites, wSpeed}) => {
      if (!isAllowed(location.hostname, allowedSites)) {
        return;
      }

      document.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
          return; // ignore typing in inputs
        }
        switch (e.key) {
          case 'a':
            adjustVideo(video => {
              video.playbackRate = Math.max(0.25, Math.round((video.playbackRate - 0.25)*100)/100);
            });
            break;
          case 's':
            adjustVideo(video => {
              video.playbackRate = Math.round((video.playbackRate + 0.25)*100)/100;
            });
            break;
          case 'q':
            adjustVideo(video => { video.playbackRate = 1; });
            break;
          case 'w':
            adjustVideo(video => { video.playbackRate = wSpeed; });
            break;
          default:
            return;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

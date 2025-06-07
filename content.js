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
      showSpeedIndicator(video.playbackRate);
      console.debug('Playback rate changed to', video.playbackRate);
    }
  }

  function showSpeedIndicator(rate) {
    let indicator = document.getElementById('cando-speed-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'cando-speed-indicator';
      Object.assign(indicator.style, {
        position: 'fixed',
        bottom: '10%',
        right: '5%',
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '20px',
        borderRadius: '4px',
        zIndex: 9999,
        pointerEvents: 'none'
      });
      document.body.appendChild(indicator);
    }
    indicator.textContent = `Speed: ${rate}x`;
    indicator.style.display = 'block';
    clearTimeout(indicator._timeout);
    indicator._timeout = setTimeout(() => {
      indicator.style.display = 'none';
    }, 1000);
  }

  function init() {
    getSettings().then(({allowedSites, wSpeed}) => {
      console.debug('Settings loaded', {allowedSites, wSpeed});
      if (!isAllowed(location.hostname, allowedSites)) {
        console.debug('Site not allowed for speed control');
        return;
      }

      document.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
          return; // ignore typing in inputs
        }
        console.debug('Key pressed', e.key);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

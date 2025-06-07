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

  function findSkipButton() {
    const selectors = [
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button',
      '[id*="skip" i]',
      '[class*="skip" i]',
      '[aria-label*="skip" i]'
    ];
    const elements = document.querySelectorAll(selectors.join(','));
    for (const el of elements) {
      if (el.offsetParent === null) continue; // ignore hidden elements
      const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
      if (btn) return btn;
    }
    return null;
  }

  function clickSkipButton() {
    const btn = findSkipButton();
    if (btn) {
      // Earlier revisions simply called btn.click() (see commit a4175b1),
      // but YouTube sometimes ignores that programmatic click.  We now
      // dispatch pointer and click events to better emulate a real user.
      ['pointerdown', 'pointerup', 'click'].forEach(type => {
        btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
      return true;
    }
    return false;
  }

  function setupAdSkip() {
    if (!location.hostname.includes('youtube.com')) {
      return;
    }
    const observer = new MutationObserver(clickSkipButton);
    observer.observe(document, { childList: true, subtree: true, attributes: true });
    setInterval(clickSkipButton, 1000);
  }

  function setupAdSpeed() {
    if (!location.hostname.includes('youtube.com')) {
      return;
    }

    const trySetup = () => {
      const player = document.querySelector('.html5-video-player');
      const video = document.querySelector('video');
      if (!player || !video) {
        return false;
      }

      let lastState = player.classList.contains('ad-showing');
      let speedTimeout = null;
      let rampInterval = null;

      const clearTimers = () => {
        clearTimeout(speedTimeout);
        clearInterval(rampInterval);
        speedTimeout = null;
        rampInterval = null;
      };

      const startRamp = () => {
        clearTimers();
        speedTimeout = setTimeout(() => {
          let rate = video.playbackRate;
          rampInterval = setInterval(() => {
            rate = Math.round(Math.min(2, rate + 0.25) * 100) / 100;
            video.playbackRate = rate;
            showSpeedIndicator(video.playbackRate);
            if (rate >= 2) {
              clearInterval(rampInterval);
            }
          }, 250);
        }, 1100);
      };

      const update = () => {
        const isAd = player.classList.contains('ad-showing');
        if (isAd !== lastState) {
          lastState = isAd;
          clearTimers();
          if (isAd) {
            video.playbackRate = 1;
            showSpeedIndicator(video.playbackRate);
            startRamp();
          } else {
            video.playbackRate = 1;
            showSpeedIndicator(video.playbackRate);
          }
        }
      };

      new MutationObserver(update).observe(player, { attributes: true, attributeFilter: ['class'] });
      setInterval(update, 1000);
      update();
      return true;
    };

    if (!trySetup()) {
      const interval = setInterval(() => {
        if (trySetup()) {
          clearInterval(interval);
        }
      }, 1000);
    }
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
        const key = e.key.toLowerCase();
        console.debug('Key pressed', key);
        switch (key) {
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
          case 'e':
            // Manual Skip Ad key. Originally added in commit a4175b1 along with
            // improved button detection. Later attempts (4dabaa2) expanded the
            // MutationObserver to catch attribute changes, but some users still
            // reported "e" not working consistently.  Dispatching mouse events
            // in clickSkipButton is our latest approach.
            clickSkipButton();
            break;
          default:
            return;
        }
      });

      setupAdSkip();
      setupAdSpeed();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

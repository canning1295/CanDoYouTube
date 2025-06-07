(function() {
  const DEFAULT_SITES = ['youtube.com'];
  const DEFAULT_W_SPEED = 4;
  const DEFAULT_AD_DELAY = 2; // seconds before speeding up ads

  // Prevent duplicate observers if the script is injected more than once
  let adSkipInitialized = false;
  let adSpeedInitialized = false;

  function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(['allowedSites', 'wSpeed', 'adDelay'], (data) => {
        resolve({
          allowedSites: data.allowedSites || DEFAULT_SITES,
          wSpeed: typeof data.wSpeed === 'number' ? data.wSpeed : DEFAULT_W_SPEED,
          adDelay: typeof data.adDelay === 'number' ? data.adDelay : DEFAULT_AD_DELAY
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
    console.debug('Searching for skip button among', elements.length, 'elements');
    for (const el of elements) {
      if (el.offsetParent === null) continue; // ignore hidden elements
      const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
      if (btn) return btn;
    }
    return null;
  }

  function moveMouseToElement(el) {
    // Browsers don't allow scripts to move the real cursor for security
    // reasons. We instead dispatch pointer events at the element so the
    // page reacts as if the user hovered it. This is primarily for debugging
    // and to better emulate real interaction. To give the user visual
    // feedback, we also move a small fake cursor overlay to the element.
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    console.debug('Simulating mouse move to', {x, y});
    ['mousemove', 'mouseover', 'mouseenter'].forEach(type => {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y
      }));
    });
    let cursor = document.getElementById('cando-fake-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'cando-fake-cursor';
      Object.assign(cursor.style, {
        position: 'fixed',
        width: '24px',
        height: '24px',
        background: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27black%27 d=%27M0 0 L6 24 L10 14 L20 18 Z%27/%3E%3C/svg%3E") no-repeat center center',
        backgroundSize: 'contain',
        pointerEvents: 'none',
        zIndex: 999999,
        transform: 'translate(-12px, -12px)',
        transition: 'top 0.2s ease, left 0.2s ease'
      });
      document.body.appendChild(cursor);
    }
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    cursor.style.display = 'block';
    console.debug('Fake cursor moved to', {x, y});
    clearTimeout(cursor._hideTimer);
    cursor._hideTimer = setTimeout(() => {
      cursor.style.display = 'none';
    }, 2000);
  }

  function clickSkipButton() {
    const player = document.querySelector('.html5-video-player');
    const video = document.querySelector('video');
    if (!player || !video) {
      return false;
    }

    const btn = findSkipButton();
    if (btn) {
      console.debug('Skip button found, moving mouse and attempting click');
      moveMouseToElement(btn);
      // Earlier revisions simply called btn.click() (see commit a4175b1),
      // but YouTube sometimes ignores that programmatic click.  We now
      // dispatch pointer and click events to better emulate a real user.
      ['pointerdown', 'pointerup', 'click'].forEach(type => {
        btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      });
      return true;
    }
    console.debug('Skip button not found');
    return false;
  }

  function setupAdSkip() {
    if (!location.hostname.includes('youtube.com') || adSkipInitialized) {
      return;
    }
    adSkipInitialized = true;

    const trySetup = () => {
      const player = document.querySelector('.html5-video-player');
      const video = document.querySelector('video');
      if (!player || !video) {
        return false;
      }

      const observer = new MutationObserver(clickSkipButton);
      observer.observe(player, { childList: true, subtree: true, attributes: true });
      setInterval(clickSkipButton, 1000);
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

  function setupAdSpeed(adDelay) {
    if (!location.hostname.includes('youtube.com') || adSpeedInitialized) {
      return;
    }
    adSpeedInitialized = true;

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
        console.debug('Ad detected, will speed up in', adDelay, 's');
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
        }, adDelay * 1000);
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
    getSettings().then(({allowedSites, wSpeed, adDelay}) => {
      console.debug('Settings loaded', {allowedSites, wSpeed, adDelay});
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
            // Manual Skip Ad key. Attempts to get this working have included:
            //   1. Simple `btn.click()` when the key was pressed.
            //   2. Adding broader selectors for new Skip button variations.
            //   3. Observing DOM mutations and attribute changes to detect
            //      dynamic buttons.
            //   4. Dispatching pointer/click events instead of `.click()` to
            //      mimic real interaction (current approach).
            //   5. Moving a simulated mouse pointer to the button before the
            //      click to mirror user behaviour (added in this revision).
            console.debug('"e" key pressed - attempting manual ad skip');
            const skipped = clickSkipButton();
            console.debug('Manual skip result', skipped);
            break;
          default:
            return;
        }
      });

      setupAdSkip();
      setupAdSpeed(adDelay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

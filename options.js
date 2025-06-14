const DEFAULT_SITES = ['youtube.com'];
const DEFAULT_W_SPEED = 4;
const DEFAULT_AD_DELAY = 2;
const DEFAULT_SKIP_METHOD = 'pointer';

function loadOptions() {
  chrome.storage.sync.get(['allowedSites', 'wSpeed', 'adDelay', 'skipMethod'], (data) => {
    document.getElementById('wSpeed').value = typeof data.wSpeed === 'number' ? data.wSpeed : DEFAULT_W_SPEED;
    const sites = (data.allowedSites || DEFAULT_SITES).join(', ');
    document.getElementById('sites').value = sites;
    document.getElementById('adDelay').value = typeof data.adDelay === 'number' ? data.adDelay : DEFAULT_AD_DELAY;
    document.getElementById('skipMethod').value = data.skipMethod || DEFAULT_SKIP_METHOD;
  });
}

function saveOptions() {
  const wSpeed = parseFloat(document.getElementById('wSpeed').value) || DEFAULT_W_SPEED;
  const adDelay = parseFloat(document.getElementById('adDelay').value) || DEFAULT_AD_DELAY;
  const sitesInput = document.getElementById('sites').value.trim();
  const allowedSites = sitesInput ? sitesInput.split(/\s*,\s*/).filter(Boolean) : DEFAULT_SITES;
  const skipMethod = document.getElementById('skipMethod').value || DEFAULT_SKIP_METHOD;

  chrome.storage.sync.set({ wSpeed, allowedSites, adDelay, skipMethod }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => { status.textContent = ''; }, 1000);
  });
}

document.getElementById('save').addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', loadOptions);

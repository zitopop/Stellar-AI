import { CITY_SPAWNS, startingVehicle, stepVehicle } from './physics.mjs';

const byId = (id) => document.getElementById(id);
const citySelect = byId('city-selector');
const mapMessage = byId('loading-message');
const startPanel = byId('start-panel');
const speedDisplay = byId('speed');
const distanceDisplay = byId('distance');
const locationDisplay = byId('location');
const speedFill = byId('speed-track-fill');
const pauseButton = byId('pause-button');
const startButton = byId('start-button');
const resetButton = byId('reset-button');
const cameraButton = byId('camera-button');
const styleButton = byId('map-style-button');
const fullscreenButton = byId('fullscreen-button');

const input = { accelerate: false, brake: false, left: false, right: false };
const keyToAction = Object.freeze({
  KeyW: 'accelerate', ArrowUp: 'accelerate',
  KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right'
});
let city = CITY_SPAWNS[0];
let vehicle = startingVehicle(city);
let paused = true;
let started = false;
let mapReady = false;
let lastFrame = 0;
let lastCamera = 0;
let viewMode = '3d';
let mapTheme = 'liberty';
let map = null;
let maplibregl;

function setMessage(message) {
  mapMessage.textContent = message;
  mapMessage.hidden = !message;
}

function releaseControls() {
  for (const action of Object.keys(input)) input[action] = false;
  for (const button of document.querySelectorAll('[data-drive]')) {
    button.setAttribute('aria-pressed', 'false');
  }
}

function paintHud() {
  const kmh = Math.round(Math.abs(vehicle.speed) * 3.6);
  speedDisplay.textContent = String(kmh);
  speedFill.style.width = Math.min(100, kmh / 129.6 * 100) + '%';
  distanceDisplay.textContent = (vehicle.distance / 1000).toFixed(2) + ' km';
  locationDisplay.textContent = city.name;
}

function cameraOptions() {
  const thirdPerson = viewMode === '3d';
  return {
    center: [vehicle.longitude, vehicle.latitude],
    zoom: thirdPerson ? 17.9 : 16.5,
    bearing: vehicle.heading,
    pitch: thirdPerson ? 64 : 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  };
}

function syncCamera() {
  if (map && mapReady) map.jumpTo(cameraOptions());
}

function resetVehicle(selectedCity = city) {
  city = selectedCity;
  vehicle = startingVehicle(city);
  releaseControls();
  paintHud();
  syncCamera();
}

function syncPauseButton() {
  pauseButton.textContent = paused ? '▶ Resume' : 'Ⅱ Pause';
  pauseButton.setAttribute('aria-pressed', String(paused));
}

function togglePause() {
  if (!started || !mapReady) return;
  paused = !paused;
  if (paused) releaseControls();
  syncPauseButton();
}

function bindControls() {
  document.addEventListener('keydown', (event) => {
    const tag = event.target instanceof Element ? event.target.tagName : '';
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag)) return;
    const action = keyToAction[event.code];
    if (action) {
      event.preventDefault();
      input[action] = true;
    } else if (event.code === 'KeyP' && !event.repeat) {
      event.preventDefault();
      togglePause();
    }
  });
  document.addEventListener('keyup', (event) => {
    const action = keyToAction[event.code];
    if (!action) return;
    event.preventDefault();
    input[action] = false;
  });
  window.addEventListener('blur', () => {
    releaseControls();
    if (started) { paused = true; syncPauseButton(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { releaseControls(); if (started) { paused = true; syncPauseButton(); } }
  });
  for (const button of document.querySelectorAll('[data-drive]')) {
    const action = button.dataset.drive;
    const press = (event) => {
      event.preventDefault();
      if (paused || !started) return;
      input[action] = true;
      button.setAttribute('aria-pressed', 'true');
      try { button.setPointerCapture(event.pointerId); } catch { /* pointer ended */ }
    };
    const release = (event) => {
      event.preventDefault();
      input[action] = false;
      button.setAttribute('aria-pressed', 'false');
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  citySelect.addEventListener('change', () => {
    const selectedCity = CITY_SPAWNS.find((item) => item.id === citySelect.value);
    if (selectedCity) resetVehicle(selectedCity);
  });
  resetButton.addEventListener('click', () => resetVehicle());
  pauseButton.addEventListener('click', togglePause);
  startButton.addEventListener('click', () => {
    if (!mapReady) return;
    started = true;
    paused = false;
    startPanel.hidden = true;
    syncPauseButton();
    lastFrame = performance.now();
  });
  cameraButton.addEventListener('click', () => {
    viewMode = viewMode === '3d' ? 'top' : '3d';
    cameraButton.textContent = viewMode === '3d' ? 'Camera: 3D' : 'Camera: top';
    syncCamera();
  });
  styleButton.addEventListener('click', () => {
    if (!map || !mapReady) return;
    mapTheme = mapTheme === 'liberty' ? 'dark' : 'liberty';
    // Each style has its own data source; restore optional buildings on style.load.
    mapReady = false;
    setMessage('Changing real-world map style…');
    styleButton.textContent = mapTheme === 'liberty' ? 'Night map' : 'Day map';
    map.setStyle('https://tiles.openfreemap.org/styles/' + mapTheme);
  });
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* Some mobile browsers do not support fullscreen */ }
  });
}

function addBuildings() {
  if (!map || !map.getStyle()) return;
  const style = map.getStyle();
  const vectorSources = Object.entries(style.sources || {})
    .filter(([, source]) => source.type === 'vector');
  if (!vectorSources.length || map.getLayer('stellar-real-buildings')) return;
  try {
    map.addLayer({
      id: 'stellar-real-buildings',
      source: vectorSources[0][0],
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': mapTheme === 'dark' ? '#343b56' : '#b4b3c0',
        'fill-extrusion-opacity': 0.83,
        'fill-extrusion-height': [
          'coalesce',
          ['to-number', ['get', 'render_height'], null],
          ['to-number', ['get', 'height'], null],
          10
        ],
        'fill-extrusion-base': [
          'coalesce',
          ['to-number', ['get', 'render_min_height'], null],
          ['to-number', ['get', 'min_height'], null],
          0
        ]
      }
    });
  } catch (error) {
    // Maps are still playable if a provider does not expose building geometry.
    console.warn('Stellar Drive: 3D buildings unavailable on selected tiles.', error);
  }
}

function frame(timestamp) {
  const elapsed = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
  lastFrame = timestamp;
  if (started && !paused && mapReady) {
    vehicle = stepVehicle(vehicle, input, elapsed);
    if (timestamp - lastCamera > 32) {
      syncCamera();
      paintHud();
      lastCamera = timestamp;
    }
  }
  window.requestAnimationFrame(frame);
}

async function loadMap() {
  setMessage('Loading real-world streets and buildings…');
  try {
    const module = await import('https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.mjs');
    maplibregl = module;
    if (!maplibregl.supported()) {
      setMessage('This browser needs WebGL to show 3D maps. Try a modern browser with hardware acceleration.');
      startButton.disabled = true;
      return;
    }
    map = new maplibregl.Map({
      container: 'world',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [vehicle.longitude, vehicle.latitude],
      zoom: 17.9,
      bearing: vehicle.heading,
      pitch: 64,
      attributionControl: true,
      interactive: false,
      antialias: true,
      maxZoom: 20,
      cooperativeGestures: false
    });
    map.on('style.load', () => {
      addBuildings();
      mapReady = true;
      setMessage('');
      syncCamera();
    });
    map.on('error', (error) => {
      // Do not report individual optional tile errors as total game failure.
      if (!mapReady && error && error.error) console.warn('Map tile/style load issue:', error.error);
    });
    map.on('load', () => { mapReady = true; setMessage(''); });
    // Detect complete style failure; do not leave the player with a working button over a blank map.
    window.setTimeout(() => {
      if (!mapReady) {
        setMessage('Could not load the map. Check your internet connection and reload this page.');
        startButton.disabled = true;
      }
    }, 20000);
    window.addEventListener('resize', () => map?.resize());
  } catch (error) {
    console.error('Unable to start map:', error);
    setMessage('Could not load the real-world map. Check your connection, then reload.');
    startButton.disabled = true;
  }
}

bindControls();
paintHud();
syncPauseButton();
window.requestAnimationFrame(frame);
loadMap();

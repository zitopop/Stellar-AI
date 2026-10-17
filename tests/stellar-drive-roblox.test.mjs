import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = 'roblox-games/stellar-drive/';
const load = (file) => readFileSync(root + file, 'utf8');

test('Stellar Drive is a Roblox Studio project, not a browser map', () => {
  const readme = load('README.md');
  assert.match(readme, /Roblox Studio/);
  assert.match(readme, /Stellar Drive/);
  assert.doesNotMatch(readme, /Google Maps images are embedded/);
});

test('map importer uses real OSM geometry, licensing and bounded workload', () => {
  const source = load('StudioImport.commandbar.lua');
  assert.match(source, /OpenStreetMap/);
  assert.match(source, /overpass-api\.de/);
  assert.match(source, /out geom/);
  assert.match(source, /OSMWayId/);
  assert.match(source, /maxRoadSegments/);
  assert.match(source, /maxBuildings/);
  assert.doesNotMatch(source, /OSMDataFake|random roads|math\.random/);
});

test('vehicle system uses Roblox built-in seat controls with server-side ownership', () => {
  const source = load('StellarDrive.server.lua');
  assert.match(source, /Instance\.new\("VehicleSeat"\)/);
  assert.match(source, /ThrottleFloat/);
  assert.match(source, /SteerFloat/);
  assert.match(source, /otherPlayer ~= player/);
  assert.match(source, /GetPlayerFromCharacter\(seat\.Occupant\.Parent\) == player/);
  assert.match(source, /StellarDriveWorld/);
});

test('mobile-friendly HUD contains OSM data attribution', () => {
  const hud = load('StellarDriveHUD.client.lua');
  assert.match(hud, /OpenStreetMap contributors/);
  assert.match(hud, /StarterPlayer/);
  assert.match(hud, /SpeedKmh/);
});

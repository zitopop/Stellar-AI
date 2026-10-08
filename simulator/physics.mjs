// Lightweight, deterministic arcade driving physics in real geographic coordinates.
// No artificial street layouts, road meshes, external API calls or personal location.
export const CITY_SPAWNS = Object.freeze([
  { id: 'london', name: 'London', longitude: -0.1249, latitude: 51.5077, heading: 90 },
  { id: 'manchester', name: 'Manchester', longitude: -2.2445, latitude: 53.4788, heading: 90 },
  { id: 'new-york', name: 'New York', longitude: -73.9844, latitude: 40.7547, heading: 0 },
  { id: 'tokyo', name: 'Tokyo', longitude: 139.7682, latitude: 35.6806, heading: 90 },
  { id: 'los-angeles', name: 'Los Angeles', longitude: -118.2506, latitude: 34.0495, heading: 0 }
]);
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const EARTH_RADIUS_METRES = 6378137;
const MAX_FORWARD = 36;
const MAX_REVERSE = -9;

export function startingVehicle(city = CITY_SPAWNS[0]) {
  return {
    longitude: city.longitude,
    latitude: city.latitude,
    heading: city.heading,
    speed: 0,
    distance: 0
  };
}

export function movePosition(longitude, latitude, heading, distanceMetres) {
  const nextLatitude = Math.max(-85, Math.min(85,
    latitude + Math.cos(heading * RAD) * distanceMetres / EARTH_RADIUS_METRES * DEG));
  const cosLat = Math.max(0.087, Math.cos(latitude * RAD));
  const nextLongitude = longitude + Math.sin(heading * RAD) * distanceMetres /
    (EARTH_RADIUS_METRES * cosLat) * DEG;
  return {
    longitude: ((nextLongitude + 180) % 360 + 360) % 360 - 180,
    latitude: nextLatitude
  };
}

export function stepVehicle(vehicle, input, elapsedSeconds) {
  const dt = Math.max(0, Math.min(0.05, Number(elapsedSeconds) || 0));
  let speed = vehicle.speed;
  const accelerate = Boolean(input.accelerate);
  const brake = Boolean(input.brake);
  if (accelerate && !brake) {
    speed += (speed < 0 ? 20 : 9) * dt;
  } else if (brake && !accelerate) {
    speed -= (speed > 0 ? 23 : 7) * dt;
  } else {
    const friction = (2.3 + Math.abs(speed) * 0.17) * dt;
    speed = Math.abs(speed) <= friction ? 0 : speed - Math.sign(speed) * friction;
  }
  speed = Math.max(MAX_REVERSE, Math.min(MAX_FORWARD, speed));
  const steering = (Number(Boolean(input.right)) - Number(Boolean(input.left)));
  const steerRate = 75 * Math.min(1, Math.abs(speed) / 5) /
    (1 + Math.abs(speed) / 28);
  const heading = ((vehicle.heading + steering * steerRate * dt *
    (speed < 0 ? -1 : 1)) % 360 + 360) % 360;
  const metres = speed * dt;
  const next = movePosition(vehicle.longitude, vehicle.latitude, heading, metres);
  return {
    ...next,
    heading,
    speed,
    distance: vehicle.distance + Math.abs(metres)
  };
}

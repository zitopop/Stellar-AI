import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_SPAWNS, startingVehicle, movePosition, stepVehicle } from '../simulator/physics.mjs';

test('Stellar Drive starts in a real city without generated roads', () => {
  assert.ok(CITY_SPAWNS.length >= 5);
  assert.equal(new Set(CITY_SPAWNS.map((city) => city.id)).size, CITY_SPAWNS.length);
  const vehicle = startingVehicle(CITY_SPAWNS[0]);
  assert.equal(vehicle.latitude, 51.5077);
  assert.equal(vehicle.longitude, -0.1249);
  assert.equal(vehicle.speed, 0);
});

test('accelerating moves a vehicle in real longitude/latitude coordinates', () => {
  const initial = startingVehicle(CITY_SPAWNS[0]);
  let moving = initial;
  for (let i = 0; i < 120; i++) moving = stepVehicle(moving, { accelerate: true }, 1 / 60);
  assert.ok(moving.speed > 0 && moving.speed <= 36);
  assert.ok(moving.distance > 0);
  assert.ok(moving.longitude > initial.longitude);
});

test('steering changes heading with speed, and slows when input is released', () => {
  let vehicle = { ...startingVehicle(), speed: 12 };
  vehicle = stepVehicle(vehicle, { left: true }, 0.05);
  assert.ok(vehicle.heading < 90);
  const before = vehicle.speed;
  vehicle = stepVehicle(vehicle, {}, 0.05);
  assert.ok(vehicle.speed < before);
});

test('braking safely switches to reverse and clamps maximum speed', () => {
  let vehicle = { ...startingVehicle(), speed: 0 };
  for (let i = 0; i < 200; i++) vehicle = stepVehicle(vehicle, { brake: true }, 0.05);
  assert.equal(vehicle.speed, -9);
  for (let i = 0; i < 200; i++) vehicle = stepVehicle(vehicle, { accelerate: true }, 0.05);
  assert.ok(vehicle.speed > 0 && vehicle.speed <= 36);
});

test('geographic coordinates stay finite and longitude wraps at the dateline', () => {
  const moved = movePosition(179.999, 0, 90, 500);
  assert.ok(moved.longitude < -179.99);
  assert.equal(moved.latitude, 0);
  const step = stepVehicle({ ...startingVehicle(), speed: 10 }, { accelerate: true }, 200);
  assert.ok(Number.isFinite(step.longitude));
  assert.ok(Number.isFinite(step.latitude));
  assert.ok(step.distance < 1);
});

test('stationary car does not steer or drift without controls', () => {
  const original = startingVehicle();
  const next = stepVehicle(original, { left: true }, 0.05);
  assert.equal(next.speed, 0);
  assert.equal(next.heading, original.heading);
  assert.equal(next.longitude, original.longitude);
});

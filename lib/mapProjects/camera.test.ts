import { describe, expect, it } from 'vitest';
import { screenPoint } from '@/test/mercator';
import {
  cameraAlong,
  cameraForBounds,
  centerFor,
  NO_PADDING,
  zoomForSpan,
} from './camera';

const LOWER_48 = { south: 24.4, west: -124.8, north: 49.4, east: -66.9 };

describe('cameraForBounds (AC-2.10)', () => {
  const size = { width: 1440, height: 780 };

  it('fits the bounds edge to edge in the open area, at a fractional zoom', () => {
    const camera = cameraForBounds(LOWER_48, size, NO_PADDING);
    const corner = screenPoint(
      { lat: LOWER_48.north, lng: LOWER_48.west },
      camera,
      size,
    );
    const opposite = screenPoint(
      { lat: LOWER_48.south, lng: LOWER_48.east },
      camera,
      size,
    );
    // The bounds fill the height, the tighter side here, and center across the width.
    expect(corner.y).toBeCloseTo(0, 6);
    expect(opposite.y).toBeCloseTo(size.height, 6);
    expect(corner.x + opposite.x).toBeCloseTo(size.width, 6);
    expect(Number.isInteger(camera.zoom)).toBe(false);
  });

  it('keeps the bounds out from under the UI', () => {
    const padding = { top: 120, right: 16, bottom: 90, left: 16 };
    const camera = cameraForBounds(LOWER_48, size, padding);
    const corner = screenPoint(
      { lat: LOWER_48.north, lng: LOWER_48.west },
      camera,
      size,
    );
    const opposite = screenPoint(
      { lat: LOWER_48.south, lng: LOWER_48.east },
      camera,
      size,
    );
    expect(corner.y).toBeCloseTo(padding.top, 6);
    expect(opposite.y).toBeCloseTo(size.height - padding.bottom, 6);
    expect(corner.x).toBeGreaterThanOrEqual(padding.left);
    expect(opposite.x).toBeLessThanOrEqual(size.width - padding.right);
  });

  it('fits bounds that cross the antimeridian, as Alaska does', () => {
    const alaska = { south: 51.2, west: 172.4, north: 71.4, east: -129.9 };
    const camera = cameraForBounds(alaska, size, NO_PADDING);
    const west = screenPoint({ lat: 60, lng: alaska.west - 360 }, camera, size);
    const east = screenPoint({ lat: 60, lng: alaska.east }, camera, size);
    expect(west.x).toBeGreaterThanOrEqual(-1e-6);
    expect(east.x).toBeLessThanOrEqual(size.width + 1e-6);
    expect(camera.center.lng).toBeGreaterThanOrEqual(-180);
    expect(camera.center.lng).toBeLessThanOrEqual(180);
  });

  it('never zooms past the cap', () => {
    const tiny = { south: 41.5, west: -71.5, north: 41.51, east: -71.49 };
    expect(cameraForBounds(tiny, size, NO_PADDING, 9).zoom).toBe(9);
  });

  it('still answers for a map with no size yet', () => {
    const camera = cameraForBounds(
      LOWER_48,
      { width: 0, height: 0 },
      NO_PADDING,
    );
    expect(Number.isFinite(camera.zoom)).toBe(true);
    expect(Number.isFinite(camera.center.lat)).toBe(true);
  });
});

describe('centerFor (AC-9.3)', () => {
  const size = { width: 1200, height: 800 };
  const point = { lat: 35, lng: -90 };

  it('centers the point on the map when nothing covers it', () => {
    const center = centerFor(point, 7, NO_PADDING);
    expect(center.lat).toBeCloseTo(point.lat, 9);
    expect(center.lng).toBeCloseTo(point.lng, 9);
  });

  it('centers the point in the open area beside the UI', () => {
    const padding = { top: 200, right: 0, bottom: 100, left: 400 };
    const center = centerFor(point, 7, padding);
    const onScreen = screenPoint(point, { center, zoom: 7 }, size);
    expect(onScreen.x).toBeCloseTo((400 + 1200) / 2, 6);
    expect(onScreen.y).toBeCloseTo((200 + 700) / 2, 6);
  });
});

describe('cameraAlong (AC-9.3)', () => {
  const size = { width: 1200, height: 800 };
  const us = { center: { lat: 39, lng: -96 }, zoom: 4.6 };
  const arkansas = { center: { lat: 35, lng: -92.4 }, zoom: 7 };

  it('starts at the first camera and ends at the second', () => {
    const start = cameraAlong(us, arkansas, 0, size);
    expect(start.zoom).toBe(us.zoom);
    expect(start.center.lat).toBeCloseTo(us.center.lat, 9);
    expect(start.center.lng).toBeCloseTo(us.center.lng, 9);
    const end = cameraAlong(us, arkansas, 1, size);
    expect(end.zoom).toBeCloseTo(arkansas.zoom, 9);
    expect(end.center.lat).toBeCloseTo(arkansas.center.lat, 9);
    expect(end.center.lng).toBeCloseTo(arkansas.center.lng, 9);
  });

  it("moves the end's center in a straight line to the middle of the screen", () => {
    const start = screenPoint(arkansas.center, us, size);
    for (const t of [0.25, 0.5, 0.75]) {
      const now = screenPoint(
        arkansas.center,
        cameraAlong(us, arkansas, t, size),
        size,
      );
      // The point stays on the line from its start to the middle.
      const across = (now.x - size.width / 2) * (start.y - size.height / 2);
      const down = (now.y - size.height / 2) * (start.x - size.width / 2);
      expect(across).toBeCloseTo(down, 3);
      expect(Math.hypot(now.x - 600, now.y - 400)).toBeLessThan(
        Math.hypot(start.x - 600, start.y - 400),
      );
    }
  });

  it('zooms out on the way to a far target, and not to a near one', () => {
    const maine = { center: { lat: 45, lng: -69 }, zoom: 7 };
    const california = { center: { lat: 37, lng: -120 }, zoom: 7 };
    expect(cameraAlong(california, maine, 0.5, size).zoom).toBeLessThan(6);
    expect(cameraAlong(us, arkansas, 0.5, size).zoom).toBeGreaterThan(us.zoom);
  });

  it('moves the center steadily toward a far target, never back past the start', () => {
    const california = { center: { lat: 37, lng: -120 }, zoom: 7 };
    const maine = { center: { lat: 45, lng: -69 }, zoom: 7 };
    for (const screen of [size, { width: 375, height: 544 }]) {
      let last = california.center.lng;
      for (let t = 0.05; t <= 1; t += 0.05) {
        const { lng } = cameraAlong(california, maine, t, screen).center;
        expect(lng).toBeGreaterThanOrEqual(last - 1e-9);
        last = lng;
      }
    }
  });

  it('crosses the antimeridian the short way', () => {
    const west = { center: { lat: 55, lng: 175 }, zoom: 6 };
    const east = { center: { lat: 55, lng: -175 }, zoom: 6 };
    const middle = cameraAlong(west, east, 0.5, size).center.lng;
    expect(Math.abs(middle)).toBeGreaterThan(170);
  });
});

describe('zoomForSpan (AC-9.3)', () => {
  const padding = { top: 100, right: 16, bottom: 100, left: 16 };

  it("spans the degrees across the open area's typical side on any screen", () => {
    for (const size of [
      { width: 1440, height: 780 },
      { width: 375, height: 544 },
    ]) {
      const zoom = zoomForSpan(12, size, padding);
      const camera = { center: { lat: 35, lng: -100 }, zoom };
      const west = screenPoint({ lat: 35, lng: -106 }, camera, size);
      const east = screenPoint({ lat: 35, lng: -94 }, camera, size);
      const side = Math.sqrt((size.width - 32) * (size.height - 200));
      expect(east.x - west.x).toBeCloseTo(side, 6);
    }
  });

  it('stays between zoom 3 and 12', () => {
    expect(zoomForSpan(12, { width: 0, height: 0 }, padding)).toBe(3);
    expect(zoomForSpan(0.001, { width: 1440, height: 780 }, padding)).toBe(12);
  });
});

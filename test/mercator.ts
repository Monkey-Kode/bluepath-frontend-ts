import type { Camera, Size } from '@/lib/mapProjects/camera';

/**
 * Where a point lands on the projects map's screen, in pixels from the map's top left corner. Tests
 * use it to check what the camera shows, in Google's Web Mercator projection.
 */
export function screenPoint(
  point: google.maps.LatLngLiteral,
  camera: Camera,
  size: Size,
) {
  const scale = 256 * 2 ** camera.zoom;
  const x = (lng: number) => ((lng + 180) / 360) * scale;
  const y = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  };
  return {
    x: x(point.lng) - x(camera.center.lng) + size.width / 2,
    y: y(point.lat) - y(camera.center.lat) + size.height / 2,
  };
}

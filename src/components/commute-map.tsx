'use client';

import { useEffect, useRef } from 'react';

interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

interface CommuteMapProps {
  homeLatLng: [number, number];
  workLatLng: [number, number];
  routeGeometry: RouteGeometry;
}

export default function CommuteMap({ homeLatLng, workLatLng, routeGeometry }: CommuteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cleanup: (() => void) | undefined;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default marker icons (webpack asset path issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: true, scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Route polyline in navy
      const latlngs = routeGeometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const polyline = L.polyline(latlngs, { color: '#1a3668', weight: 4, opacity: 0.85 }).addTo(map);

      // Home pin (pink)
      const homeIcon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:#df2681;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      // Work pin (navy)
      const workIcon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:#1a3668;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker(homeLatLng, { icon: homeIcon }).addTo(map).bindPopup('Home');
      L.marker(workLatLng, { icon: workIcon }).addTo(map).bindPopup('Work');

      map.fitBounds(polyline.getBounds(), { padding: [32, 32] });

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    });

    return () => cleanup?.();
  // Only run once on mount — inputs are stable after calculation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height: 280, width: '100%', borderRadius: 12, overflow: 'hidden' }} />
    </>
  );
}

import { useEffect, useState } from 'react';

/**
 * useGeolocation — Gets the user's current geographic position.
 *
 * Uses the browser Geolocation API with high accuracy.
 * Only runs once on mount.
 *
 * @returns {{ location: {lat: number, lng: number} | null, status: string }}
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('Locating you...');

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Location not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('Location ready');
      },
      () => setStatus('Enable location to continue'),
      { enableHighAccuracy: true }
    );
  }, []);

  return { location, status };
}

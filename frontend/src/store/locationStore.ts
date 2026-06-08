import { create } from 'zustand';

const STORAGE_KEY = 'kbn_location';

export interface UserLocation {
  lat: number;
  lon: number;
  label: string; // nama kota / "Lokasi GPS" / default
}

const DEFAULT_LOCATION: UserLocation = {
  lat: -2.99,
  lon: 121.13,
  label: 'Palopo (default)',
};

function loadLocation(): UserLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UserLocation;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCATION;
}

interface LocationState {
  location: UserLocation;
  setLocation: (loc: UserLocation) => void;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: loadLocation(),
  setLocation: (loc) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    set({ location: loc });
  },
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ location: DEFAULT_LOCATION });
  },
}));

// Minta lokasi GPS dari browser.
export function requestGpsLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS tidak didukung perangkat ini.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Lokasi GPS',
        });
      },
      (err) => reject(new Error(err.message || 'Gagal mendapatkan lokasi.')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// Geocode nama kota → lat/lon via Open-Meteo (gratis, tanpa key).
export async function geocodeCity(name: string): Promise<UserLocation> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=id&format=json`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    results?: { latitude: number; longitude: number; name: string; admin1?: string }[];
  };
  if (!data.results || data.results.length === 0) {
    throw new Error('Kota tidak ditemukan.');
  }
  const r = data.results[0];
  return {
    lat: r.latitude,
    lon: r.longitude,
    label: r.admin1 ? `${r.name}, ${r.admin1}` : r.name,
  };
}

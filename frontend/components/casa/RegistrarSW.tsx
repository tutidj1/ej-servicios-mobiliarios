'use client';

import { useEffect } from 'react';

/** Registra el service worker de EJ Casa (alcance: solo /casa). Solo en producción. */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/casa-sw.js', { scope: '/casa' }).catch(() => {
      /* sin service worker la app anda igual, solo que sin pantalla de "sin conexión" */
    });
  }, []);
  return null;
}

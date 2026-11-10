import { notFound } from 'next/navigation';

// La app tiene dos layouts raíz (sitio y /casa), así que Next no tiene un 404 global propio.
// Esta ruta atrapa cualquier dirección que no exista y muestra el 404 del sitio (not-found.tsx).
export default function NoEncontrada() {
  notFound();
}

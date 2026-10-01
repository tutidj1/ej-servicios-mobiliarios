import type { Metadata } from 'next';

// El panel no debe aparecer en Google
export const metadata: Metadata = {
  title: { absolute: 'Panel Administrador | EJ Servicios Mobiliarios' },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

// El panel no debe aparecer en Google
export const metadata: Metadata = {
  title: 'Panel de administración',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

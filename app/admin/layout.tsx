import type { Metadata } from 'next';
import { AdminProvider } from '@/lib/adminStore';

/* Nothing in the product links here — keep search engines out of it too. */
export const metadata: Metadata = {
  title: 'Traqi Admin',
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}

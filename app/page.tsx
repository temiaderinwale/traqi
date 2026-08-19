import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

export const metadata: Metadata = {
  /* title.template in the root layout does not reach this segment — spell it out. */
  title: 'Traqi - Run your whole business from one place',
  description: 'Traqi is the modern business management platform for sales, inventory, customers and financial reports. Track it. Grow it.'
};

export default function HomePage() {
  return <Landing />;
}

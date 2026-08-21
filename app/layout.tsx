import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import { TraqiProvider } from '@/lib/store';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-archivo', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Traqi - Business Manager', template: '%s - Traqi' },
  description: 'Traqi - track it, grow it. Sales, inventory, customers and financials in one workspace.'
};

/* Light is the default; dark only when the user chose it. */
const themeInit = `try{if(localStorage.getItem('traqi_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body className={`${archivo.variable} ${inter.variable}`}>
        <TraqiProvider>{children}</TraqiProvider>
      </body>
    </html>
  );
}

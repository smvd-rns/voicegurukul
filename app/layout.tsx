import type { Metadata } from 'next';
import { Inter, Playfair_Display, Merriweather } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900']
});
const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700', '900']
});

export const metadata: Metadata = {
  title: 'VOICE Gurukul',
  description: 'Daily spiritual practice tracking and mentorship communication platform',
};

import { DeepLinkHandler } from '@/components/providers/DeepLinkHandler';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${merriweather.variable} font-sans`}>
        <DeepLinkHandler />
        <AuthProvider>{children}</AuthProvider>
        <Toaster 
          position="top-center" 
          toastOptions={{ 
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#fff',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              padding: '16px 24px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            }
          }} 
        />
      </body>
    </html>
  );
}

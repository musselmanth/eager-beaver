import { Anton, Inter } from 'next/font/google';

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Albany County, WY Results Watch',
  description: 'Live countdown and results checker for the 2026 general election in Albany County, Wyoming.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body style={{ margin: 0, background: '#0b1614' }}>
        {children}
      </body>
    </html>
  );
}

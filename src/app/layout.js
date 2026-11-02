import { Anton, Inter } from 'next/font/google';
import Script from 'next/script';

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

const title = 'Albany County Election Results';
const description =
  'Election night results for the 2026 general election in Albany County, Wyoming, posted as soon as the County Clerk releases them.';

// The share image and icons are the image files next to this one (opengraph-image.png, icon.png, …).
export const metadata = {
  metadataBase: new URL('https://albanyballotbeaver.com'),
  title,
  description,
  openGraph: { title, description, url: '/', siteName: 'Albany Ballot Beaver', type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  themeColor: '#0b1614',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable}`}>
      <body style={{ margin: 0, background: '#0b1614' }}>
        {children}
        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-3LE1779WN9" />
        <Script id="gtag">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3LE1779WN9');`}
        </Script>
      </body>
    </html>
  );
}

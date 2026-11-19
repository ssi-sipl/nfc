import './globals.css';

export const metadata = {
  title: 'Guest Wi-Fi',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0d12',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

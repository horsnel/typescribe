'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

// Footer is only shown on the homepage. Every other route renders footer-less
// so the navbar + page content is the entire chrome.
export default function ConditionalFooter() {
  const pathname = usePathname();

  // Normalize trailing slash so `/` and `` both match homepage.
  const normalized = pathname.replace(/\/$/, '');
  const isHomepage = normalized === '';

  if (!isHomepage) return null;

  return <Footer />;
}

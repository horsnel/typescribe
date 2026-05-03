'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

// Routes where footer should be hidden
const FOOTLESS_ROUTES = [
  '/stream/',  // Video player pages (starts with)
];

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on video player pages
  const shouldHideFooter = FOOTLESS_ROUTES.some(route => pathname.startsWith(route));

  if (shouldHideFooter) return null;

  return <Footer />;
}

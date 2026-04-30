'use client';

import { useState, useRef } from 'react';
import { Film, Twitter, Instagram, Github, Mail, Loader2, Check, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export default function Footer() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Triple-click on O.L.H.M.E.S → Admin Data Pipeline
  const [clickCount, setClickCount] = useState(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleBrandClick = (e: React.MouseEvent) => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (clickTimer.current) clearTimeout(clickTimer.current);

    // Triple click → Admin Data Pipeline
    if (newCount >= 3) {
      setClickCount(0);
      e.preventDefault();
      e.stopPropagation();
      setShowAdminModal(true);
      return;
    }

    // Reset after short delay if no triple click
    const timer = setTimeout(() => {
      setClickCount(0);
    }, 500);
    clickTimer.current = timer;
  };

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('typescribe_admin_auth', data.token);
        localStorage.setItem('typescribe_admin_token', data.token);
        setShowAdminModal(false);
        setAdminPassword('');
        router.push('/admin/data');
      } else {
        setAdminError(data.error || 'Invalid password');
      }
    } catch {
      setAdminError('Connection failed');
    } finally {
      setAdminLoading(false);
    }
  };

  const aboutLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'How It Works', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Communities', href: '/communities' },
  ];

  const categoryLinks = [
    { label: 'Action', href: '/category/action' },
    { label: 'Drama', href: '/category/drama' },
    { label: 'Comedy', href: '/category/comedy' },
    { label: 'Horror', href: '/category/horror' },
    { label: 'Sci-Fi', href: '/category/sci-fi' },
    { label: 'Romance', href: '/category/romance' },
    { label: 'Thriller', href: '/category/thriller' },
    { label: 'Documentary', href: '/category/documentary' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'DMCA', href: '/dmca' },
    { label: 'Disclaimer', href: '/disclaimer' },
    { label: 'Accessibility', href: '/accessibility' },
  ];

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/typescribe', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/typescribe', label: 'Instagram' },
    { icon: Github, href: 'https://github.com/horsnel/typescribe', label: 'GitHub' },
  ];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch('https://formspree.io/f/xreawkow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, _subject: 'New Typescribe Newsletter Subscription (Footer)' }),
      });
      if (response.ok) setSubscribed(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <>
      <footer className="bg-[#050507] border-t border-[#1e1e28]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2 md:col-span-1">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">About</h4>
              <ul className="space-y-3">
                {aboutLinks.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-[#9ca3af] hover:text-white transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Categories</h4>
              <ul className="space-y-3">
                {categoryLinks.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-[#9ca3af] hover:text-white transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.label}><Link href={link.href} className="text-sm text-[#9ca3af] hover:text-white transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="col-span-2">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Newsletter</h4>
              <p className="text-sm text-[#9ca3af] mb-4 leading-relaxed">Get weekly movie picks and exclusive AI reviews delivered to your inbox every Friday.</p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                  <span>You&apos;re subscribed!</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2 mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                    className="flex-1 bg-[#0c0c10] border border-[#1e1e28] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853]"
                  />
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-[#d4a853] hover:bg-[#b8922e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Mail className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </form>
              )}
              <div className="flex gap-3 mb-4">
                {socialLinks.map((social) => (
                  <a key={social.label} href={social.href} className="p-2.5 bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#d4a853] rounded-lg transition-all" aria-label={social.label}>
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed">AI-powered movie reviews and community ratings. Made for film lovers.</p>
            </div>
          </div>
          <Separator className="my-10 bg-[#1e1e28]" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
              <span
                onClick={handleBrandClick}
                className="text-sm text-[#6b7280] font-bold tracking-[0.2em] cursor-pointer select-none hover:text-[#9ca3af] transition-colors"
              >
                O.L.H.M.E.S
              </span>
              <span className="text-sm text-[#6b7280]">&copy; 2026 Typescribe. All rights reserved.</span>
            </div>
            <span className="text-xs text-[#6b7280] bg-[#0c0c10] px-3 py-1.5 rounded-full border border-[#1e1e28]">Made with AI + Community</span>
          </div>
        </div>
      </footer>

      {/* Admin Data Pipeline Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#d4a853]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Data Pipeline Access</h3>
                <p className="text-xs text-[#6b7280]">O.L.H.M.E.S Authentication Required</p>
              </div>
            </div>
            {adminError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{adminError}</p>
              </div>
            )}
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Enter admin password"
              className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                onClick={handleAdminLogin}
                disabled={!adminPassword || adminLoading}
                className="flex-1 bg-[#d4a853] hover:bg-[#b8922e] text-white disabled:opacity-50"
              >
                {adminLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} /> : <Lock className="w-4 h-4 mr-2" strokeWidth={1.5} />}
                Authenticate
              </Button>
              <Button
                onClick={() => { setShowAdminModal(false); setAdminPassword(''); setAdminError(''); }}
                variant="outline"
                className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

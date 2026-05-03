'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, Film, LogOut, LayoutDashboard, Star, Users, Bookmark, Bell, Settings, User, Lock, Loader2, Play } from 'lucide-react';
import { openNotificationPanel } from '@/components/community/NotificationPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import SearchOverlay from '@/components/layout/SearchOverlay';
import NotificationBell from '@/components/community/NotificationBell';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  // Triple-click on logo → Admin access
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [logoClickTimer, setLogoClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (logoClickTimer) clearTimeout(logoClickTimer);

    // Triple click → Admin Dashboard
    if (newCount >= 3) {
      setLogoClickCount(0);
      e.preventDefault();
      e.stopPropagation();
      setShowAdminModal(true);
      return;
    }

    // Single or double click → navigate home after a short delay
    // (to check if a triple click is coming)
    const timer = setTimeout(() => {
      setLogoClickCount(0);
      if (pathname !== '/') {
        router.push('/');
      }
    }, 400);
    setLogoClickTimer(timer);
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
        router.push('/admin');
      } else {
        setAdminError(data.error || 'Invalid password');
      }
    } catch {
      setAdminError('Connection failed');
    } finally {
      setAdminLoading(false);
    }
  };

  // Scroll detection — listen to the <main> scroll container (app shell architecture)
  useEffect(() => {
    const mainEl = document.querySelector('main');
    const handleScroll = () => setScrolled((mainEl?.scrollTop ?? window.scrollY) > 20);
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
      return () => mainEl.removeEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Close mobile menu & profile dropdown on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  // Cmd/Ctrl+K search shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close profile menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  // Escape key to close profile menu
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    }
    if (profileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profileMenuOpen]);

  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen((prev) => !prev);
  }, []);

  const navLinks = [
    { label: 'Stream', href: '/stream', isStream: true as const },
    { label: 'Browse', href: '/browse' },
    { label: 'Top Rated', href: '/top-rated' },
    { label: 'Box Office', href: '/box-office' },
    { label: 'New Releases', href: '/new-releases' },
    { label: 'Upcoming', href: '/upcoming' },
    { label: 'News', href: '/news' },
    { label: 'Communities', href: '/communities' },
  ];

  const userInitials = user?.display_name
    ? user.display_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const mobileUserLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Reviews', href: '/dashboard/reviews', icon: Star },
    { label: 'My Communities', href: '/dashboard/communities', icon: Users },
    { label: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
    { label: 'Notifications', href: '#notifications', icon: Bell, isPanel: true as const },
    { label: 'Saved', href: '/dashboard/saved', icon: Bookmark },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const profileMenuLinks = [
    { label: 'Profile', href: '/dashboard', icon: User },
    { label: 'My Reviews', href: '/dashboard/reviews', icon: Star },
    { label: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-12 transition-all duration-300 ${
        scrolled || pathname !== '/' ? 'bg-black/70 backdrop-blur-md border-b border-[#1e1e28]/50' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-2 group z-10">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer"
            aria-label="Typescribe Logo — Triple-click for Admin"
          >
            <Film className="w-6 h-6 text-[#d4a853] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            {pathname === '/' && <span className="text-xl font-extrabold text-white tracking-tight">Typescribe</span>}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
              pathname === link.href ? 'text-amber-400' : 'text-[#9ca3af] hover:text-amber-400'} ${
              'isStream' in link && link.isStream ? 'text-[#d4a853] hover:text-[#e6bc6a]' : ''}`}>
              {'isStream' in link && link.isStream && (
                <>
                  <Play className="w-3.5 h-3.5 fill-[#d4a853]" strokeWidth={2} />
                  <span className="relative">
                    {link.label}
                    <span className="absolute -top-1 -right-1.5 w-1 h-1 rounded-full bg-[#d4a853]" />
                  </span>
                </>
              )}
              {!('isStream' in link && link.isStream) && link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 z-10">
          <button onClick={() => setSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a45] focus:border-[#d4a853] transition-all text-sm" aria-label="Search">
            <Search className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden lg:inline">Search...</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 bg-[#050507] rounded text-[10px] font-mono border border-[#1e1e28]">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 text-[#9ca3af] hover:text-amber-400 transition-colors" aria-label="Search">
            <Search className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Notification Bell for authenticated users */}
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={toggleProfileMenu}
                className={`flex items-center transition-all focus:outline-none ${profileMenuOpen ? 'ring-2 ring-[#d4a853]/50 rounded-full' : 'hover:opacity-80 rounded-full'}`}
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" /> : userInitials}
                </div>
              </button>

              {/* Profile dropdown menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0c0c10] border border-[#1e1e28] rounded-xl shadow-2xl overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-[#1e1e28]">
                    <p className="text-sm font-semibold text-white truncate">{user?.display_name || 'User'}</p>
                    <p className="text-xs text-[#6b7280] truncate mt-0.5">{user?.email || ''}</p>
                  </div>

                  {/* Menu links */}
                  <div className="py-1.5">
                    {profileMenuLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#9ca3af] hover:text-white hover:bg-[#111118] transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Divider + Log Out */}
                  <div className="border-t border-[#1e1e28] py-1.5">
                    <button
                      onClick={() => { logout(); setProfileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#9ca3af] hover:text-red-400 hover:bg-[#111118] transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" className="border-[#1e1e28] bg-transparent text-white hover:bg-[#111118] hover:text-white text-sm font-medium">Sign In</Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white text-sm font-medium">Sign Up</Button>
              </Link>
            </div>
          )}

          <button className="md:hidden p-2 text-[#9ca3af] hover:text-amber-400 transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#050507]/95 backdrop-blur-md pt-20 px-6 md:hidden overflow-y-auto">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`text-lg font-medium transition-colors flex items-center gap-2 ${
                pathname === link.href ? 'text-amber-400' : 'text-[#9ca3af] hover:text-amber-400'} ${
                'isStream' in link && link.isStream ? 'text-[#d4a853] hover:text-[#e6bc6a]' : ''}`}>
                {'isStream' in link && link.isStream && <Play className="w-4 h-4 fill-[#d4a853]" strokeWidth={2} />}
                {link.label}
                {'isStream' in link && link.isStream && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] ml-1" />}
              </Link>
            ))}
            <div className="border-t border-[#1e1e28] pt-4 mt-2">
              {isAuthenticated ? (
                <>
                  {mobileUserLinks.map((item) => {
                    if ('isPanel' in item && item.isPanel) {
                      return (
                        <button key={item.label} onClick={() => { openNotificationPanel(); setMobileMenuOpen(false); }} className="flex items-center gap-3 py-2.5 text-[#9ca3af] hover:text-amber-400 transition-colors w-full text-left">
                          <item.icon className="w-4 h-4" strokeWidth={1.5} />
                          {item.label}
                        </button>
                      );
                    }
                    return (
                      <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-[#9ca3af] hover:text-amber-400 transition-colors">
                        <item.icon className="w-4 h-4" strokeWidth={1.5} />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 py-2.5 text-red-400 hover:text-red-300 transition-colors">
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                    Log Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}><Button className="w-full bg-[#d4a853] hover:bg-[#b8922e] text-white font-medium">Sign In</Button></Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full border-[#1e1e28] text-white hover:bg-[#111118]">Sign Up</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Admin Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#d4a853]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Admin Access</h3>
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

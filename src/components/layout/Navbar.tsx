'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Film, LogOut, LayoutDashboard, Star, Users, Bookmark, Bell, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import SearchOverlay from '@/components/layout/SearchOverlay';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
    { label: 'Browse', href: '/browse' },
    { label: 'Top Rated', href: '/top-rated' },
    { label: 'Box Office', href: '/box-office' },
    { label: 'New Releases', href: '/new-releases' },
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
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
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
        <Link href="/" className="flex items-center gap-2 group z-10">
          <Film className="w-6 h-6 text-[#d4a853] group-hover:scale-110 transition-transform" />
          {pathname === '/' && <span className="text-xl font-extrabold text-white tracking-tight">Typescribe</span>}
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className={`text-sm font-medium transition-colors duration-200 ${
              pathname === link.href ? 'text-amber-400' : 'text-[#9ca3af] hover:text-amber-400'}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 z-10">
          <button onClick={() => setSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-[#6b7280] hover:text-[#9ca3af] hover:border-[#3a3a45] focus:border-[#d4a853] transition-all text-sm" aria-label="Search">
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search...</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 bg-[#050507] rounded text-[10px] font-mono border border-[#1e1e28]">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 text-[#9ca3af] hover:text-amber-400 transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

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
                        <item.icon className="w-4 h-4 text-[#d4a853]" />
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
                      <LogOut className="w-4 h-4 text-[#d4a853]" />
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
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#050507]/95 backdrop-blur-md pt-20 px-6 md:hidden overflow-y-auto">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`text-lg font-medium transition-colors ${
                pathname === link.href ? 'text-amber-400' : 'text-[#9ca3af] hover:text-amber-400'}`}>{link.label}</Link>
            ))}
            <div className="border-t border-[#1e1e28] pt-4 mt-2">
              {isAuthenticated ? (
                <>
                  {mobileUserLinks.map((item) => (
                    <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 text-[#9ca3af] hover:text-amber-400 transition-colors">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex items-center gap-3 py-2.5 text-red-400 hover:text-red-300 transition-colors">
                    <LogOut className="w-4 h-4" />
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
    </>
  );
}

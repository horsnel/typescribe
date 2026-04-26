'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, Film, User, Bookmark, MessageSquare, Settings, LogOut, ChevronDown, Users, LayoutDashboard, Bell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import SearchOverlay from '@/components/layout/SearchOverlay';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); setUserMenuOpen(false); }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { label: 'Browse', href: '/browse' },
    { label: 'Top Rated', href: '/top-rated' },
    { label: 'New Releases', href: '/new-releases' },
    { label: 'News', href: '/news' },
    { label: 'Communities', href: '/communities' },
  ];

  const userInitials = user?.display_name
    ? user.display_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const userMenuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Reviews', href: '/dashboard/reviews', icon: Star },
    { label: 'My Communities', href: '/dashboard/communities', icon: Users },
    { label: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { label: 'Saved', href: '/dashboard/saved', icon: Bookmark },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-12 transition-all duration-300 ${
        scrolled || pathname !== '/' ? 'bg-black/70 backdrop-blur-md border-b border-[#2a2a35]/50' : 'bg-transparent'
      }`}>
        <Link href="/" className="flex items-center gap-2 group z-10">
          <Film className="w-6 h-6 text-[#e50914] group-hover:scale-110 transition-transform" />
          <span className="text-xl font-extrabold text-white tracking-tight">Typescribe</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className={`text-sm font-medium transition-colors duration-200 ${
              pathname === link.href ? 'text-white' : 'text-[#a0a0b0] hover:text-white'}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 z-10">
          <button onClick={() => setSearchOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#12121a] border border-[#2a2a35] rounded-lg text-[#6b6b7b] hover:text-[#a0a0b0] hover:border-[#3a3a45] transition-all text-sm" aria-label="Search">
            <Search className="w-4 h-4" />
            <span className="hidden lg:inline">Search...</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 bg-[#0a0a0f] rounded text-[10px] font-mono border border-[#2a2a35]">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 text-[#a0a0b0] hover:text-white transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="User menu">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" /> : userInitials}
                </div>
                <ChevronDown className={`w-3 h-3 text-[#a0a0b0] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#12121a] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-[#2a2a35]">
                    <p className="text-sm font-semibold text-white truncate">{user?.display_name}</p>
                    <p className="text-xs text-[#6b6b7b] truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    {userMenuItems.map((item) => (
                      <Link key={item.label} href={item.href} className="flex items-center gap-3 px-3 py-2 text-sm text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] rounded-lg transition-colors">
                        <item.icon className="w-4 h-4" />{item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="p-1 border-t border-[#2a2a35]">
                    <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                      <LogOut className="w-4 h-4" />Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" className="border-[#2a2a35] bg-transparent text-white hover:bg-[#1a1a25] hover:text-white text-sm font-medium">Sign In</Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button className="bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-medium">Sign Up</Button>
              </Link>
            </div>
          )}

          <button className="md:hidden p-2 text-[#a0a0b0] hover:text-white transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-md pt-20 px-6 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`text-lg font-medium transition-colors ${
                pathname === link.href ? 'text-white' : 'text-[#a0a0b0] hover:text-white'}`}>{link.label}</Link>
            ))}
            <div className="border-t border-[#2a2a35] pt-4 mt-2">
              {isAuthenticated ? (
                <>
                  {userMenuItems.map((item) => (
                    <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[#a0a0b0] hover:text-white">
                      {item.label}
                    </Link>
                  ))}
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block py-2 text-red-400 hover:text-red-300">Log Out</button>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}><Button className="w-full bg-[#e50914] hover:bg-[#b20710] text-white font-medium">Sign In</Button></Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}><Button variant="outline" className="w-full border-[#2a2a35] text-white hover:bg-[#1a1a25]">Sign Up</Button></Link>
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

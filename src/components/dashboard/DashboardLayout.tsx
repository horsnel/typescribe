'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  PenSquare,
  Users,
  Bookmark,
  Bell,
  Activity,
  BookmarkCheck,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Home,
  MessageSquare,
} from 'lucide-react';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'My Reviews', icon: PenSquare },
  { href: '/dashboard/communities', label: 'My Communities', icon: Users },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/activity', label: 'Activity Feed', icon: Activity },
  { href: '/dashboard/saved', label: 'Saved', icon: BookmarkCheck },
];

const bottomLinks = [
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Please sign in</h2>
          <p className="text-[#9ca3af]">You need to be logged in to access the dashboard.</p>
          <Link href="/login">
            <Button className="bg-[#e50914] hover:bg-[#e50914]/90 text-white">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#e50914] rounded-lg flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">Typescribe</span>
        )}
      </div>

      <Separator className="bg-[#2a2a35]" />

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  active
                    ? 'bg-[#e50914]/15 text-[#e50914]'
                    : 'text-[#9ca3af] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-[#2a2a35]" />

      {/* Bottom */}
      <div className="px-2 py-3 space-y-1">
        {bottomLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                active
                  ? 'bg-[#e50914]/15 text-[#e50914]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#111118]'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </div>

      <Separator className="bg-[#2a2a35]" />

      {/* User */}
      <div className="p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-9 h-9 flex-shrink-0 border border-[#1e1e28]">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-[#e50914]/20 text-[#e50914] text-xs font-bold">
              {user?.display_name ? getInitials(user.display_name) : 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.display_name || 'User'}</p>
              <p className="text-[#6b7280] text-xs truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <div className={`flex gap-2 mt-2 ${collapsed ? 'justify-center' : ''}`}>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-white h-8">
              <Home className="w-4 h-4" />
              {!collapsed && <span className="ml-1.5 text-xs">Home</span>}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#e50914] h-8" onClick={logout}>
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-1.5 text-xs">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050507] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[#1e1e28] bg-[#050507] transition-all duration-300 relative ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 z-10 w-6 h-6 bg-[#111118] border border-[#1e1e28] rounded-full flex items-center justify-center text-[#6b7280] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#050507] border-r border-[#1e1e28] z-50">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-[#6b7280] hover:text-white z-50">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-[#1e1e28] bg-[#050507]">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-white hover:bg-[#111118]">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#e50914] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold">Typescribe</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

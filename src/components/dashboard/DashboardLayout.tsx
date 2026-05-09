'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Film,
} from 'lucide-react';
import { openNotificationPanel } from '@/components/community/NotificationPanel';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'My Reviews', icon: PenSquare },
  { href: '/dashboard/communities', label: 'My Communities', icon: Users },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '#notifications', label: 'Notifications', icon: Bell, isPanel: true as const },
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
      <div className="flex items-center justify-center h-full bg-[#050507]">
        <div className="text-center space-y-4 px-6">
          <h2 className="text-2xl font-bold text-white">Please sign in</h2>
          <p className="text-[#9ca3af]">You need to be logged in to access the dashboard.</p>
          <Link href="/login">
            <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white">Sign In</Button>
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
        <div className="w-8 h-8 bg-[#D4A853] rounded-lg flex items-center justify-center flex-shrink-0">
          <Film className="w-4 h-4 text-white" strokeWidth={1.5} />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">Typescribe</span>
        )}
      </div>

      <Separator className="bg-[#2a2a35]" />

      {/* Nav */}
      <div className="flex-1 px-2 py-3 overflow-y-auto">
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            if ('isPanel' in link && link.isPanel) {
              return (
                <button
                  key={link.href}
                  onClick={openNotificationPanel}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium w-full text-left ${
                    'text-[#9ca3af] hover:text-white hover:bg-[#111118]'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{link.label}</span>}
                </button>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  active
                    ? 'bg-[#D4A853]/15 text-[#D4A853]'
                    : 'text-[#9ca3af] hover:text-white hover:bg-[#111118]'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

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
                  ? 'bg-[#D4A853]/15 text-[#D4A853]'
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
            <AvatarFallback className="bg-[#D4A853]/20 text-[#D4A853] text-xs font-bold">
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
              <Home className="w-4 h-4" strokeWidth={1.5} />
              {!collapsed && <span className="ml-1.5 text-xs">Home</span>}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-red-400 h-8" onClick={logout}>
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            {!collapsed && <span className="ml-1.5 text-xs">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[#050507]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[#1e1e28] bg-[#050507] transition-all duration-300 relative flex-shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 z-10 w-6 h-6 bg-[#111118] border border-[#1e1e28] rounded-full flex items-center justify-center text-[#6b7280] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" strokeWidth={1.5} /> : <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />}
        </button>
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#050507] border-r border-[#1e1e28] z-50 safe-bottom">
            <div className="flex items-center justify-between p-4 border-b border-[#1e1e28]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#D4A853] rounded-lg flex items-center justify-center">
                  <Film className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-white font-bold">Typescribe</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-[#6b7280] hover:text-white">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile header bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1e1e28] bg-[#050507] flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-white hover:bg-[#111118] h-9 w-9">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-[#D4A853] rounded-lg flex items-center justify-center flex-shrink-0">
              <Film className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-white font-bold truncate">Dashboard</span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

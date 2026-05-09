'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Star, Users, Bookmark, Bell, Activity, BookmarkCheck, Settings, User } from 'lucide-react';
import { openNotificationPanel } from '@/components/community/NotificationPanel';

const dashboardLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'My Communities', href: '/dashboard/communities', icon: Users },
  { label: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
  { label: 'Notifications', href: '#notifications', icon: Bell, isPanel: true as const },
  { label: 'Activity', href: '/dashboard/activity', icon: Activity },
  { label: 'Saved', href: '/dashboard/saved', icon: BookmarkCheck },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050507] pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-2 lg:sticky lg:top-24">
              {/* Mobile horizontal scroll */}
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {dashboardLinks.map((link) => {
                  const isActive = pathname === link.href;
                  if ('isPanel' in link && link.isPanel) {
                    return (
                      <button
                        key={link.href}
                        onClick={openNotificationPanel}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-[#9ca3af] hover:text-white hover:bg-[#111118]"
                      >
                        <link.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                        <span className="hidden lg:inline">{link.label}</span>
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[#D4A853] text-white'
                          : 'text-[#9ca3af] hover:text-white hover:bg-[#111118]'
                      }`}
                    >
                      <link.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                      <span className="hidden lg:inline">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

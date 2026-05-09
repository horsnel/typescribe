'use client';

import { useEffect } from 'react';
import { openNotificationPanel } from '@/components/community/NotificationPanel';

export default function DashboardNotificationsPage() {
  useEffect(() => {
    // Auto-open the slide-in panel and redirect back
    openNotificationPanel();
  }, []);

  return (
    <>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-full bg-[#D4A853]/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#D4A853]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Notifications</h2>
        <p className="text-sm text-[#9ca3af] text-center max-w-sm">
          Your notification panel has opened on the right. Click the bell icon in the navbar anytime to access it.
        </p>
      </div>
    </>
  );
}

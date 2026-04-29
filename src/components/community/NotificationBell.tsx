'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '@/lib/community-storage';
import { openNotificationPanel } from '@/components/community/NotificationPanel';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const update = () => setUnread(getUnreadCount());
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={openNotificationPanel}
      className="relative p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#111118] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

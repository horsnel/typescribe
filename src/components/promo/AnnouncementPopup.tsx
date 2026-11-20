'use client';

/**
 * Announcement popup — reuses the "Diagonal Split Popup" shell
 * (deepseek_html_20261120_587fb0.html: clip-path triangles, right-aligned
 * content, cutout ✕ bottom-right, slideUp) with platform content.
 *
 * Announcement = platform messaging, so the promo red is replaced by the
 * platform gold gradient (#D4A853→#B8922F) in the poster triangle and CTA.
 * Opened from the footer dock; no auto-show.
 */

import Link from 'next/link';
import { Megaphone } from 'lucide-react';

export default function AnnouncementPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]" onClick={onClose} role="presentation">
      <div
        className="tsa-diag-card relative w-full"
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-modal="true"
        aria-label="Platform announcement"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold announcement triangle — mockup .diagonal-image position */}
        <div className="tsa-diag-image">
          <Megaphone className="w-12 h-12 text-white/90" strokeWidth={1.5} />
        </div>

        {/* Label in the digital-timer position */}
        <div className="tsa-diag-timer">📢 New</div>

        {/* Content triangle — mockup .diagonal-content */}
        <div className="tsa-diag-content">
          <div className="tsa-diag-title">What&apos;s New</div>
          <div className="tsa-diag-sub">Announcements, features & platform updates</div>
          <div className="tsa-diag-actions">
            <Link href="/news" className="tsa-diag-play">See What&apos;s New</Link>
            <Link href="/communities" className="tsa-diag-save" aria-label="Open communities">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Cancel button, opposite corner — mockup .diagonal-cancel */}
        <button type="button" className="tsa-diag-cancel" onClick={onClose} aria-label="Close announcement">✕</button>
      </div>

      <style>{`
        .tsa-diag-card {
          height: 280px; background: #1c1c1e; border-radius: 24px; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          animation: tsa-diagSlideUp 0.5s ease-out;
        }
        @keyframes tsa-diagSlideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .tsa-diag-image {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #D4A853 0%, #B8922F 100%);
          display: flex; align-items: flex-start; justify-content: flex-start;
          padding: 60px 0 0 64px;
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
        .tsa-diag-timer {
          position: absolute; top: 20px; left: 20px;
          font-size: 24px; font-weight: 800; color: white;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
          z-index: 10;
        }
        .tsa-diag-content {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #1c1c1e;
          clip-path: polygon(100% 0, 100% 100%, 0 100%);
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 24px; color: white;
        }
        .tsa-diag-cancel {
          position: absolute; bottom: 20px; right: 20px;
          width: 40px; height: 40px; background: #D4A853;
          border: 4px solid #1c1c1e; border-radius: 50%;
          color: #050507; font-weight: bold; font-size: 16px;
          display: flex; justify-content: center; align-items: center;
          cursor: pointer; z-index: 20;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .tsa-diag-title { font-size: 24px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; text-align: right; }
        .tsa-diag-sub { font-size: 13px; color: #a0a0a5; margin-bottom: 20px; text-align: right; }
        .tsa-diag-actions { display: flex; justify-content: flex-end; gap: 12px; padding-right: 50px; }
        .tsa-diag-play {
          background: #D4A853; color: #050507; border: none; border-radius: 12px;
          padding: 12px 24px; font-weight: 700; font-size: 14px; cursor: pointer;
        }
        .tsa-diag-save {
          background: rgba(255,255,255,0.1); color: white; border: none; width: 44px; border-radius: 12px;
          display: flex; justify-content: center; align-items: center;
        }
      `}</style>
    </div>
  );
}

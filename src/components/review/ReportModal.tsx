'use client';

import React, { useState } from 'react';
import { Flag, X, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportReason } from '@/lib/types';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Irrelevant, repetitive, or promotional content' },
  { value: 'harassment', label: 'Harassment', description: 'Personal attacks, bullying, or targeted harassment' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory language targeting protected groups' },
  { value: 'misinformation', label: 'Misinformation', description: 'Deliberately false or misleading claims' },
  { value: 'spoiler', label: 'Spoiler', description: 'Unmarked plot spoilers that ruin the experience' },
  { value: 'off_topic', label: 'Off Topic', description: 'Content unrelated to the movie or discussion' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Explicit, offensive, or otherwise inappropriate content' },
  { value: 'other', label: 'Other', description: 'Any other violation not listed above' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
  contentType: 'review' | 'comment';
  contentPreview?: string;
}

export default function ReportModal({ isOpen, onClose, onSubmit, contentType, contentPreview }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedReason) return;
    setSubmitting(true);
    // Simulate network delay
    setTimeout(() => {
      onSubmit(selectedReason, details.trim());
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason(null);
        setDetails('');
        onClose();
      }, 2000);
    }, 500);
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedReason(null);
      setDetails('');
      setSubmitted(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#12121a] border border-[#2a2a35] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a35]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Report {contentType === 'review' ? 'Review' : 'Comment'}</h3>
              <p className="text-xs text-[#6b6b7b]">Help us maintain a respectful community</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#0a0a0f] border border-[#2a2a35] flex items-center justify-center text-[#6b6b7b] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <div className="px-5 pt-4">
            <div className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg p-3">
              <p className="text-xs text-[#6b6b7b] mb-1">Reported content:</p>
              <p className="text-sm text-[#a0a0b0] line-clamp-2">{contentPreview}</p>
            </div>
          </div>
        )}

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Report Submitted</h4>
            <p className="text-sm text-[#a0a0b0]">
              Thank you for helping keep our community safe. Our team and AI moderation will review this content.
            </p>
          </div>
        ) : (
          <>
            {/* Reason Selection */}
            <div className="p-5 space-y-5">
              <div>
                <label className="text-sm font-medium text-white mb-3 block">
                  Why are you reporting this?
                </label>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setSelectedReason(reason.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedReason === reason.value
                          ? 'bg-[#e50914]/10 border-[#e50914]/40'
                          : 'bg-[#0a0a0f] border-[#2a2a35] hover:border-[#3a3a45]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            selectedReason === reason.value
                              ? 'border-[#e50914] bg-[#e50914]'
                              : 'border-[#2a2a35]'
                          }`}
                        >
                          {selectedReason === reason.value && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${selectedReason === reason.value ? 'text-white' : 'text-[#a0a0b0]'}`}>
                            {reason.label}
                          </span>
                          <p className="text-xs text-[#6b6b7b] mt-0.5">{reason.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label className="text-sm font-medium text-[#a0a0b0] mb-2 block">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide more context about the issue..."
                  rows={3}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b6b7b] focus:outline-none focus:border-[#e50914] resize-none text-sm"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300/80">
                  False reports may result in account restrictions. Only report content that genuinely violates community guidelines.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[#2a2a35]">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedReason || submitting}
                className="bg-red-600 hover:bg-red-700 text-white gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

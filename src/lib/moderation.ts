'use client';

/**
 * AI Auto-Moderation System
 *
 * This module provides client-side content moderation that simulates
 * what would normally be a server-side AI moderation pipeline.
 *
 * In production, replace the `moderateContent` function with a call
 * to your backend that uses OpenAI, Perspective API, or similar.
 */

import type { ModerationResult, ReportReason } from '@/lib/types';

// ─── Toxicity Patterns ───

const TOXIC_PATTERNS: { pattern: RegExp; reason: ReportReason; severity: 'low' | 'medium' | 'high'; label: string }[] = [
  // Hate speech indicators
  { pattern: /\b(racial|ethnic)\s+slur\b/i, reason: 'hate_speech', severity: 'high', label: 'Potential hate speech detected' },
  // Harassment indicators
  { pattern: /\b(kill\s+yourself|kys|go\s+die)\b/i, reason: 'harassment', severity: 'high', label: 'Harassment / self-harm language' },
  { pattern: /\b(you\s*'\s*re\s+stupid|you\s*suck|loser+)\b/i, reason: 'harassment', severity: 'medium', label: 'Potential personal attack' },
  // Spam indicators
  { pattern: /(.)\1{10,}/, reason: 'spam', severity: 'low', label: 'Spam-like repeated characters' },
  { pattern: /(http|https):\/\/[^\s]+/i, reason: 'spam', severity: 'medium', label: 'Contains external link (potential spam)' },
  { pattern: /\b(buy\s+now|click\s+here|free\s+money)\b/i, reason: 'spam', severity: 'high', label: 'Spam / promotional content' },
  // Spoiler indicators
  { pattern: /\b(dies?\s+at\s+the\s+end|the\s+killer\s+is|plot\s+twist\s*:)\b/i, reason: 'spoiler', severity: 'medium', label: 'Potential unmarked spoiler' },
  { pattern: /\[?spoiler\]?/i, reason: 'spoiler', severity: 'low', label: 'Spoiler tag detected (low risk)' },
];

// ─── Quality Patterns ───

const LOW_QUALITY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /^(.{1,10})$/, label: 'Review too short to be substantive' },
  { pattern: /\b(amazing|terrible|great|bad|awful)\b\s*(movie|film|show|series)?\s*[.!]?\s*$/i, label: 'Generic one-word review' },
  { pattern: /^(10\/10|1\/10|0\/10)\s*$/, label: 'Rating-only review with no substance' },
];

// ─── Main Moderation Function ───

export function moderateContent(text: string, rating?: number): ModerationResult {
  const result: ModerationResult = {
    flagged: false,
    severity: 'none',
    confidence: 0,
  };

  // Check toxicity patterns
  for (const { pattern, reason, severity, label } of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      result.flagged = true;
      result.reason = label;
      result.severity = severity;
      result.confidence = severity === 'high' ? 0.95 : severity === 'medium' ? 0.75 : 0.55;

      // High severity: reject outright
      if (severity === 'high') {
        result.autoAction = 'reject';
      }
      // Medium severity: hold for review
      else if (severity === 'medium') {
        result.autoAction = 'hold';
      }
      // Low severity: warn user
      else {
        result.autoAction = 'warn';
      }

      return result;
    }
  }

  // Check quality patterns (only for reviews, not comments)
  if (rating !== undefined) {
    for (const { pattern, label } of LOW_QUALITY_PATTERNS) {
      if (pattern.test(text)) {
        return {
          flagged: true,
          reason: label,
          severity: 'low',
          autoAction: 'warn',
          confidence: 0.6,
        };
      }
    }

    // Extreme rating without explanation
    if ((rating === 1 || rating === 10) && text.length < 50) {
      return {
        flagged: true,
        reason: 'Extreme rating with minimal explanation — please provide more detail',
        severity: 'low',
        autoAction: 'warn',
        confidence: 0.5,
      };
    }
  }

  return result;
}

// ─── Moderation Badge Component Helpers ───

export interface ModerationBadgeInfo {
  type: 'pending' | 'flagged' | 'auto-approved';
  label: string;
  color: string;
  bgColor: string;
}

export function getModerationBadge(
  moderated: boolean,
  moderationNote: string,
  reports: { length: number }
): ModerationBadgeInfo | null {
  if (!moderated && reports.length === 0) {
    // Auto-approved (passed AI filter)
    return null;
  }

  if (moderated && moderationNote) {
    return {
      type: 'flagged',
      label: moderationNote,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    };
  }

  if (reports.length > 0) {
    return {
      type: 'pending',
      label: `Under review (${reports.length} report${reports.length > 1 ? 's' : ''})`,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
    };
  }

  return null;
}

// ─── Pre-submission Check (shows warnings before submit) ───

export interface PreSubmitCheckResult {
  canSubmit: boolean;
  warnings: string[];
  blocked: string;
}

export function preSubmitCheck(text: string, rating?: number): PreSubmitCheckResult {
  const result: PreSubmitCheckResult = {
    canSubmit: true,
    warnings: [],
    blocked: '',
  };

  const moderation = moderateContent(text, rating);

  if (moderation.autoAction === 'reject') {
    result.canSubmit = false;
    result.blocked = moderation.reason || 'Content violates community guidelines';
  } else if (moderation.autoAction === 'warn') {
    result.warnings.push(moderation.reason || 'Content may need review');
  } else if (moderation.autoAction === 'hold') {
    result.warnings.push(moderation.reason || 'Content will be held for manual review before publishing');
    result.canSubmit = true; // Allow submit but it'll be held
  }

  return result;
}

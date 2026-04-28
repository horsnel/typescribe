'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Accessibility, ChevronRight, Eye, EyeOff, Volume2, Type, Keyboard, Monitor, Sun, Moon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'typescribe_accessibility';

interface A11ySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  screenReader: boolean;
}

const defaults: A11ySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  screenReader: false,
};

function loadSettings(): A11ySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch { return defaults; }
}

function saveSettings(s: A11ySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ }
}

function applySettings(s: A11ySettings) {
  const root = document.documentElement;
  root.classList.toggle('high-contrast', s.highContrast);
  root.classList.toggle('reduced-motion', s.reducedMotion);
  root.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
  const map: Record<string, string> = { small: 'font-sm', medium: 'font-md', large: 'font-lg', xl: 'font-xl' };
  root.classList.add(map[s.fontSize] || 'font-md');
  if (s.screenReader) root.setAttribute('data-screen-reader', 'true');
  else root.removeAttribute('data-screen-reader');
}

const KEYBOARD_SHORTCUTS = [
  { keys: '⌘K / Ctrl+K', action: 'Open search' },
  { keys: 'Tab', action: 'Move to next interactive element' },
  { keys: 'Shift+Tab', action: 'Move to previous element' },
  { keys: 'Enter / Space', action: 'Activate focused button or link' },
  { keys: 'Escape', action: 'Close modals, overlays, and menus' },
  { keys: '← →', action: 'Navigate carousel items' },
  { keys: 'Home / End', action: 'Jump to start/end of page or list' },
  { keys: '?', action: 'Show keyboard shortcuts' },
];

export default function AccessibilityPage() {
  const [settings, setSettings] = useState<A11ySettings>(defaults);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applySettings(loaded);
  }, []);

  const update = (partial: Partial<A11ySettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    applySettings(next);
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#9ca3af]">Accessibility</span>
        </nav>
        <div className="flex items-center gap-3 mb-2">
          <Accessibility className="w-7 h-7 text-[#d4a853]" />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Accessibility Settings</h1>
        </div>
        <p className="text-sm text-[#6b7280] mb-8">Customize your experience to make Typescribe work best for you. All preferences are saved automatically.</p>

        <div className="space-y-6">
          {/* High Contrast */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d4a853]/10 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-[#d4a853]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">High Contrast Mode</h2>
                  <p className="text-sm text-[#6b7280]">Increase visual contrast for better readability. Makes text brighter and borders more visible.</p>
                </div>
              </div>
              <button
                onClick={() => update({ highContrast: !settings.highContrast })}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${settings.highContrast ? 'bg-[#d4a853]' : 'bg-[#2a2a35]'}`}
                aria-label="Toggle high contrast mode"
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${settings.highContrast ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {settings.highContrast && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">High contrast enabled — text and borders are now more vivid</span>
              </div>
            )}
          </div>

          {/* Reduced Motion */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Reduced Motion</h2>
                  <p className="text-sm text-[#6b7280]">Minimize animations and transitions throughout the site. Recommended for users sensitive to motion.</p>
                </div>
              </div>
              <button
                onClick={() => update({ reducedMotion: !settings.reducedMotion })}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${settings.reducedMotion ? 'bg-purple-600' : 'bg-[#2a2a35]'}`}
                aria-label="Toggle reduced motion"
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${settings.reducedMotion ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {settings.reducedMotion && (
              <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">Reduced motion enabled — animations are now minimal</span>
              </div>
            )}
          </div>

          {/* Font Size */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Type className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Font Size</h2>
                <p className="text-sm text-[#6b7280]">Adjust the base text size across the site.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'small' as const, label: 'Small', preview: 'text-sm' },
                { value: 'medium' as const, label: 'Medium', preview: 'text-base' },
                { value: 'large' as const, label: 'Large', preview: 'text-lg' },
                { value: 'xl' as const, label: 'Extra Large', preview: 'text-xl' },
              ].map(size => (
                <button
                  key={size.value}
                  onClick={() => update({ fontSize: size.value })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    settings.fontSize === size.value
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-[#050507] border-[#1e1e28] text-[#9ca3af] hover:border-[#3a3a45]'
                  }`}
                >
                  <span className={`${size.preview} font-bold block mb-1`}>Aa</span>
                  <span className="text-[10px]">{size.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Screen Reader */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Screen Reader Optimization</h2>
                  <p className="text-sm text-[#6b7280]">Add enhanced ARIA labels, descriptions, and semantic landmarks for assistive technology.</p>
                </div>
              </div>
              <button
                onClick={() => update({ screenReader: !settings.screenReader })}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${settings.screenReader ? 'bg-sky-600' : 'bg-[#2a2a35]'}`}
                aria-label="Toggle screen reader optimization"
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${settings.screenReader ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Keyboard Navigation */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-[#6b7280]">Navigate Typescribe without a mouse using these shortcuts.</p>
              </div>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(shortcut => (
                <div key={shortcut.keys} className="flex items-center justify-between p-2 bg-[#050507] border border-[#1e1e28] rounded-lg">
                  <span className="text-sm text-[#9ca3af]">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-[#111118] border border-[#1e1e28] rounded text-xs font-mono text-white">{shortcut.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Indicators */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d4a853]/10 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-[#d4a853]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Focus Indicators</h2>
                <p className="text-sm text-[#6b7280]">Enhanced focus rings are always active on Typescribe. When navigating with Tab, focused elements show a visible red ring outline for clear visibility.</p>
              </div>
            </div>
          </div>

          {/* Our Commitment */}
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Our Commitment</h2>
            <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">At Typescribe, we are committed to ensuring that our platform is accessible to all users, including those with disabilities. We aim to meet WCAG 2.1 Level AA standards and continuously improve our accessibility features. The settings above give you direct control over your browsing experience.</p>
            <p className="text-sm text-[#9ca3af] leading-relaxed">If you encounter any barriers or have suggestions, please reach out at accessibility@typescribe.com or through <Link href="/contact" className="text-[#d4a853] hover:underline">our contact page</Link>.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/privacy" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Terms of Service</Link>
          <Link href="/contact" className="px-4 py-2 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}

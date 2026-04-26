'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  screenReader: boolean;
}

const STORAGE_KEY = 'typescribe_accessibility';

const defaults: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  screenReader: false,
};

function loadSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return defaults;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings(s: AccessibilitySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

interface AccessibilityContextType extends AccessibilitySettings {
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: AccessibilitySettings['fontSize']) => void;
  toggleScreenReader: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaults,
  toggleHighContrast: () => {},
  toggleReducedMotion: () => {},
  setFontSize: () => {},
  toggleScreenReader: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaults);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    // Font size
    root.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
    const classMap: Record<string, string> = { small: 'font-sm', medium: 'font-md', large: 'font-lg', xl: 'font-xl' };
    root.classList.add(classMap[settings.fontSize] || 'font-md');
    // Screen reader
    if (settings.screenReader) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }
    saveSettings(settings);
  }, [settings]);

  const toggleHighContrast = () => setSettings(s => ({ ...s, highContrast: !s.highContrast }));
  const toggleReducedMotion = () => setSettings(s => ({ ...s, reducedMotion: !s.reducedMotion }));
  const setFontSize = (size: AccessibilitySettings['fontSize']) => setSettings(s => ({ ...s, fontSize: size }));
  const toggleScreenReader = () => setSettings(s => ({ ...s, screenReader: !s.screenReader }));

  return (
    <AccessibilityContext.Provider value={{ ...settings, toggleHighContrast, toggleReducedMotion, setFontSize, toggleScreenReader }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

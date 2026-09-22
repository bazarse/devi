import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0";
  }
  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function parseSafeDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  
  const str = String(date).trim();
  if (!str) return null;

  // 1. Indian format: DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY or D-M-YY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(.*)$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    
    const rest = dmyMatch[4].trim();
    let hours = 0, minutes = 0, seconds = 0;
    if (rest) {
      const timeMatch = rest.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      }
    }
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Standard ISO parse (YYYY-MM-DD or full timestamp)
  const standardDate = new Date(str);
  if (!isNaN(standardDate.getTime())) return standardDate;

  return null;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  try {
    const d = parseSafeDate(date);
    if (!d || isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch (e) {
    return "N/A";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  try {
    const d = parseSafeDate(date);
    if (!d || isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch (e) {
    return "N/A";
  }
}

// 🛡️ Bulletproof check to ensure Download APK button NEVER shows inside Android APK or installed App
export function isRunningInApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Capacitor Native Platform check
    if ((window as any).Capacitor && typeof (window as any).Capacitor.isNativePlatform === 'function') {
      if ((window as any).Capacitor.isNativePlatform()) return true;
    }
    // 2. Custom User-Agent tag (Android APK)
    if (navigator.userAgent && navigator.userAgent.includes('DeviMobileApp')) return true;
    
    // 3. Android WebView detection (Standard Android WebView signature)
    if (navigator.userAgent && (navigator.userAgent.includes('; wv') || navigator.userAgent.includes('Version/4.0 Chrome'))) {
      return true;
    }

    // 4. Standalone PWA / WebAPK / TWA check
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if ((navigator as any).standalone === true) return true;

    // 5. Capacitor Protocol or URL parameters
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
    if (window.location.search && (window.location.search.includes('source=app') || window.location.search.includes('source=apk'))) return true;
    if (localStorage.getItem('is_native_apk') === 'true') return true;
  } catch (e) {}
  return false;
}

/**
 * Extracts installed Devi Android APK version from User Agent:
 * e.g. "Mozilla/5.0 ... DeviMobileApp/2.4.0" -> "2.4.0"
 */
export function getInstalledAppVersion(): string | null {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent || '';
  const match = ua.match(/DeviMobileApp\/([0-9.]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (isRunningInApp()) {
    return '2.4.0'; // Any installed older Android build
  }
  return null;
}

/**
 * Checks if user is running an older version of the APK that requires an update.
 * Automatically catches any user running the Android app unless it is v2.5.0.
 */
export function isAppUpdateRequired(targetVersion = '2.5.0'): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  
  // If user is running the new v2.5.0 Android app, no update needed!
  if (ua.includes('DeviMobileApp/' + targetVersion)) {
    return false;
  }

  // If user is running inside ANY older Android APK, update is MANDATORY!
  if (isRunningInApp()) {
    return true;
  }

  return false;
}

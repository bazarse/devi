'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Smartphone, Download, CheckCircle2, ArrowDownToLine, QrCode, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('https://devi-mobile.vercel.app');

  const localApkUrl = '/downloads/Devi-Mobile-POS.apk';
  const mirrorApkUrl = 'https://tinyurl.com/2ck25rre';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const fullApkUrl = `${currentOrigin}${localApkUrl}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullApkUrl)}&color=0f172a&bgcolor=ffffff`;

  const triggerDownload = (urlToUse = localApkUrl) => {
    setDownloading(true);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

    const absoluteUrl = urlToUse.startsWith('http')
      ? urlToUse
      : `${typeof window !== 'undefined' ? window.location.origin : currentOrigin}${urlToUse}`;

    // 1. If in native Android WebView, use native bridge if present
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidApp?.openExternalBrowser) {
        (window as any).AndroidApp.openExternalBrowser(absoluteUrl);
        setTimeout(() => {
          setDownloading(false);
          setDownloadSuccess(true);
        }, 800);
        return;
      }
    } catch (_) {}

    // 2. Direct navigation: Capacitor forwards external hosts to Android Chrome
    try {
      window.location.href = absoluteUrl;
    } catch (_) {}

    // 3. Synthetic link click fallback
    try {
      const link = document.createElement('a');
      link.href = absoluteUrl;
      link.setAttribute('download', 'Devi-Mobile-POS-v2.5.0.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_) {}

    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
    }, 800);
  };

  useEffect(() => {
    // Automatically start download only if on Android (do not auto-download for iOS/desktop)
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      const timer = setTimeout(() => {
        triggerDownload(localApkUrl);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/70 via-white to-slate-50 text-slate-900 font-sans flex flex-col justify-between p-4 sm:p-8 select-none">
      
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-200/80">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
            <Image
              src="/icons/logo.png"
              alt="Devi Mobile"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <div className="text-base font-black text-slate-900">DEVI MOBILE</div>
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Enterprise POS System</div>
          </div>
        </Link>

        <Link
          href="/pos"
          className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
        >
          <span>Open Web App</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Main Download Card */}
      <main className="max-w-2xl w-full mx-auto my-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-2xl shadow-blue-500/10 space-y-8 animate-fadeIn">
        
        {/* App Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Official Android Release • Version 2.5.0</span>
          </div>

          <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border-2 border-white shadow-2xl shadow-blue-500/20 bg-white p-1 my-2">
            <Image
              src="/icons/logo.png"
              alt="Devi Mobile Logo"
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Download Devi Mobile POS App
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium">
            Fast Barcode/IMEI Scanner, Real-time Sales Approvals, Multi-Branch Stock & Bluetooth Thermal Receipt Printing.
          </p>
        </div>

        {/* Big Direct Download Button & Mirror */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => triggerDownload(localApkUrl)}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 text-white font-black text-base shadow-xl shadow-emerald-600/25 active:scale-98 transition-all min-h-[56px]"
          >
            <ArrowDownToLine className="w-6 h-6 animate-bounce" />
            <span>{downloading ? 'Starting Direct Download...' : '⬇️ Download Devi-Mobile-POS.apk (High-Speed CDN)'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerDownload(mirrorApkUrl)}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 active:scale-98 transition-all"
          >
            <span>🌐 Download via Mirror 2 (Alternate Link)</span>
          </button>

          {downloadSuccess && (
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Download started! Please check your device Downloads / Notifications.</span>
            </div>
          )}
        </div>

        {/* QR Code Phone Scan */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
            <img
              src={qrCodeUrl}
              alt="Scan QR code to download"
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-blue-700 text-xs font-black">
              <QrCode className="w-4 h-4" />
              <span>Direct Phone Camera Scan</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Scan QR code using mobile camera</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Scan this QR code with any smartphone camera to start the APK download directly on your phone.
            </p>
          </div>
        </div>

        {/* 3 Step Installation Guide */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>3-Step Installation Guide</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">1</span>
                <span>Download APK</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Download the APK file using the button above.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">2</span>
                <span>Install App</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Tap the downloaded file and select &quot;Install&quot;.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">3</span>
                <span>Sign In & Bill</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Log in with your 4-digit PIN and start POS billing.</p>
            </div>
          </div>
        </div>


      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 font-mono">
        © 2026 Devi Mobile POS • All Rights Reserved
      </footer>
    </div>
  );
}

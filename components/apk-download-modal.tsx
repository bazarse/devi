'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Smartphone, QrCode, CheckCircle2, X, Sparkles, ArrowDownToLine } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApkDownloadModal({ isOpen, onClose }: ApkDownloadModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const [currentOrigin, setCurrentOrigin] = useState('https://devi-mobile.vercel.app');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const localApkUrl = '/downloads/Devi-Mobile-POS.apk';
  const mirrorUrl = 'https://tinyurl.com/2ck25rre';
  const fullDownloadUrl = `${currentOrigin}${localApkUrl}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullDownloadUrl)}&color=0f172a&bgcolor=ffffff`;

  const handleDownload = (urlToUse = localApkUrl) => {
    setDownloading(true);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

    const absoluteUrl = urlToUse.startsWith('http')
      ? urlToUse
      : `${typeof window !== 'undefined' ? window.location.origin : currentOrigin}${urlToUse}`;

    // 1. In native Android WebView, open via bridge or location
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

    try {
      window.location.href = absoluteUrl;
    } catch (_) {}

    // Direct download trigger fallback
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

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scaleUp space-y-6 text-slate-900 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-md flex-shrink-0 bg-white p-0.5">
            <Image
              src="/icons/logo.png"
              alt="Devi Mobile App"
              width={64}
              height={64}
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Official Android App (.APK)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Devi Mobile POS</h2>
            <p className="text-xs text-slate-500 font-medium">Version 2.4.0 • Direct Server Download</p>
          </div>
        </div>

        {/* QR Code & Scan Option */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
            <img
              src={qrCodeUrl}
              alt="Scan to Download APK"
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-blue-700 text-xs font-black">
              <QrCode className="w-4 h-4" />
              <span>Direct Phone Camera Scan</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Scan QR Code from Mobile Camera</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Scan this QR code with any Android camera to download the APK file directly to your phone.
            </p>
          </div>
        </div>

        {/* Direct Download Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleDownload()}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 text-white font-black text-sm shadow-xl shadow-emerald-600/25 active:scale-98 transition-all min-h-[50px]"
          >
            <ArrowDownToLine className="w-5 h-5 animate-bounce" />
            <span>{downloading ? 'Starting Direct Download...' : 'Download Devi-Mobile-POS.apk (Direct)'}</span>
          </button>
          
          {downloadSuccess && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 py-2.5 rounded-xl border border-emerald-200 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Download started! Please check your notification bar or Downloads folder.</span>
            </div>
          )}
        </div>

        {/* 3 Step Installation Guide */}
        <div className="space-y-2.5 pt-1">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>3-Step Quick Install Guide</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">1</span>
                <span>Download APK</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Download the file directly using the button above.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">2</span>
                <span>Install App</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Tap the downloaded file and select &quot;Install&quot;.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="font-bold text-blue-700 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">3</span>
                <span>Sign In & Bill</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium">Log in with your 4-digit PIN and start POS billing.</p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

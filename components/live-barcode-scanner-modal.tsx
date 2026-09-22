'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  Scan, 
  Flashlight, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface LiveBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  subtitle?: string;
  isMultiScan?: boolean;
  onMultiScanComplete?: (scannedCodes: string[]) => void;
}

export default function LiveBarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Live Barcode & IMEI Scanner',
  subtitle = 'Align camera with phone box 15-digit IMEI or EAN barcode',
  isMultiScan = false,
  onMultiScanComplete
}: LiveBarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [multiScannedList, setMultiScannedList] = useState<string[]>([]);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'devi-live-barcode-reader';

  // Play Store Beep on successful scan using Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (e) {
      console.warn('Beep error:', e);
    }
  };

  // Start Camera Scanning
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    async function initScanner() {
      try {
        setErrorMessage(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back / environment camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          const activeCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(activeCamId);
          startCameraStream(activeCamId);
        } else {
          setErrorMessage('No camera hardware detected on this device.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(
          err?.message || 'Camera permission denied. Please allow camera access in your browser settings.'
        );
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const startCameraStream = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        const cleanCode = decodedText.trim();
        if (!cleanCode) return;

        playBeep();
        setLastScannedCode(cleanCode);

        if (isMultiScan) {
          setMultiScannedList(prev => {
            if (prev.includes(cleanCode)) return prev;
            return [...prev, cleanCode];
          });
        } else {
          onScanSuccess(cleanCode);
          stopScanner();
          onClose();
        }
      };

      const config = {
        fps: 20,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.777778
      };

      await html5QrCode.start(
        cameraId,
        config,
        qrCodeSuccessCallback,
        undefined // ignore scan error frames
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
        if (track && track.torchFeature && track.torchFeature().isSupported()) {
          setHasTorch(true);
        }
      } catch (e) {}

    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setErrorMessage(err?.message || 'Could not start camera stream.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const newStatus = !torchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: newStatus }]
      });
      setTorchOn(newStatus);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    playBeep();
    setLastScannedCode(clean);

    if (isMultiScan) {
      setMultiScannedList(prev => [...prev, clean]);
      setManualCode('');
    } else {
      onScanSuccess(clean);
      stopScanner();
      onClose();
    }
  };

  const handleFinishMultiScan = () => {
    if (onMultiScanComplete) {
      onMultiScanComplete(multiScannedList);
    }
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{title}</span>
                {isScanning && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCANNER VIEWFINDER BOX */}
        <div className="relative aspect-[4/3] sm:aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
          
          {/* HTML5-QRCODE MOUNT TARGET */}
          <div id={containerId} className="w-full h-full object-cover" />

          {/* OVERLAY AIMING LASER & FRAME */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="relative w-64 h-36 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-lg" />

                {/* Animated Red / Green Scanning Laser Bar */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-slate-900/80 px-2.5 py-1 rounded-full mt-3 backdrop-blur border border-emerald-500/30">
                Point at 15-Digit IMEI or EAN Barcode
              </span>
            </div>
          )}

          {/* Error Banner inside Viewfinder */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <div className="text-xs font-bold text-rose-400">{errorMessage}</div>
              <button
                type="button"
                onClick={() => selectedCameraId && startCameraStream(selectedCameraId)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* SCANNER CONTROLS (Camera Switcher + Torch + Manual Type) */}
        <div className="flex items-center justify-between gap-2 text-xs">
          
          {/* Camera Selector */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startCameraStream(e.target.value);
              }}
              className="bg-slate-800 text-white font-bold text-[11px] px-2.5 py-2 rounded-xl border border-slate-700 focus:outline-none max-w-[150px] truncate"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  📷 {c.label || `Camera ${c.id.slice(0, 4)}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${
                  torchOn 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Flashlight className="w-4 h-4" />
                <span>{torchOn ? 'Torch ON' : 'Torch'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <Keyboard className="w-4 h-4" />
              <span>{showManualInput ? 'Hide Keyboard' : 'Type Barcode'}</span>
            </button>
          </div>
        </div>

        {/* MANUAL CODE INPUT FORM */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="flex gap-2 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <input
              type="text"
              placeholder="Enter 15-digit IMEI manually..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Enter
            </button>
          </form>
        )}

        {/* LAST SCANNED NOTIFICATION */}
        {lastScannedCode && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Scanned Code:</span>
                <span className="font-mono font-black text-emerald-400 text-sm tracking-wider">{lastScannedCode}</span>
              </div>
            </div>
            {!isMultiScan && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                Applied ✓
              </span>
            )}
          </div>
        )}

        {/* MULTI-SCAN INVENTORY LIST */}
        {isMultiScan && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-400" />
                <span>Scanned Batch ({multiScannedList.length} Units)</span>
              </span>
              <button
                type="button"
                onClick={handleFinishMultiScan}
                disabled={multiScannedList.length === 0}
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-md disabled:opacity-50 transition-all"
              >
                Done ({multiScannedList.length} Inward)
              </button>
            </div>

            {multiScannedList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-800/60 rounded-xl border border-slate-700">
                {multiScannedList.map((code, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold"
                  >
                    <span>{code}</span>
                    <button
                      type="button"
                      onClick={() => setMultiScannedList(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

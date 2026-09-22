'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Wrench, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Smartphone, 
  PhoneCall, 
  Calendar, 
  User,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { formatINR, formatDate } from '@/lib/utils';

// Active repair orders
interface RepairOrder {
  token: string;
  customerName: string;
  phone: string;
  deviceBrand: string;
  deviceModel: string;
  issue: string;
  status: string;
  estimatedCost: number;
  advancePaid: number;
  receivedDate: string;
  deliveryDate: string;
  storeName: string;
  technician: string;
  timeline: { status: string; title: string; time: string; note: string }[];
}

const MOCK_REPAIRS: RepairOrder[] = [];

const STAGES = [
  { key: 'received', label: 'Device Received', desc: 'Job sheet logged' },
  { key: 'diagnosing', label: 'Diagnosing', desc: 'Hardware check' },
  { key: 'in_progress', label: 'In Progress', desc: 'Replacement / Fixing' },
  { key: 'ready', label: 'Ready for Pickup', desc: 'QC Passed' },
  { key: 'delivered', label: 'Delivered', desc: 'Handed over' },
];

function RepairTrackingContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [foundRepair, setFoundRepair] = useState<RepairOrder | null>(
    MOCK_REPAIRS.find(r => r.token.toLowerCase() === initialToken.toLowerCase() || r.phone === initialToken) || null
  );
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialToken) {
      handleSearch(initialToken);
    }
  }, [initialToken]);

  const handleSearch = (query: string) => {
    setHasSearched(true);
    const clean = query.trim().toLowerCase();
    const match = MOCK_REPAIRS.find(
      r => r.token.toLowerCase() === clean || r.phone.toLowerCase() === clean
    );
    setFoundRepair(match || null);
  };

  const getStageIndex = (status: string) => {
    const idx = STAGES.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mb-1">
          <Wrench className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Live Device Repair Tracking
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Enter your job-sheet token number or mobile number to track real-time diagnosis & repair stage.
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(tokenInput);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. REP-24-1001 or 9876543210"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            Track Status
          </button>
        </form>

        {/* Quick Example Tokens */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <span>Try sample tokens:</span>
          <button
            type="button"
            onClick={() => {
              setTokenInput('REP-24-1001');
              handleSearch('REP-24-1001');
            }}
            className="underline text-brand-600 font-semibold"
          >
            REP-24-1001 (In Progress)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setTokenInput('REP-24-1002');
              handleSearch('REP-24-1002');
            }}
            className="underline text-brand-600 font-semibold"
          >
            REP-24-1002 (Ready)
          </button>
        </div>
      </div>

      {/* Tracking Result */}
      {foundRepair ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
          
          {/* Top Token Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Job Sheet Token</span>
              <h2 className="text-xl sm:text-2xl font-black text-brand-700">{foundRepair.token}</h2>
              <div className="text-xs text-slate-500 mt-0.5">{foundRepair.storeName}</div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto bg-brand-50 text-brand-700 border border-brand-200">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              {foundRepair.status === 'ready' ? 'READY FOR PICKUP' : 'REPAIR IN PROGRESS'}
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="py-2">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-6">Live Progress Stages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STAGES.map((stage, idx) => {
                const currentIdx = getStageIndex(foundRepair.status);
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div
                    key={stage.key}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCurrent ? 'bg-white text-brand-600' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold">{stage.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                      {stage.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device & Cost Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Device Details */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device & Issue</h4>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-brand-600" />
                {foundRepair.deviceBrand} {foundRepair.deviceModel}
              </div>
              <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-800">Issue:</span> {foundRepair.issue}
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <User className="w-3.5 h-3.5" />
                Assigned Tech: <span className="font-semibold text-slate-700">{foundRepair.technician}</span>
              </div>
            </div>

            {/* Billing / Cost Details */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimate & Balance</h4>
              <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                <span>Estimated Cost:</span>
                <span className="font-bold text-slate-900">{formatINR(foundRepair.estimatedCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Advance Paid:</span>
                <span className="font-bold text-emerald-600">{formatINR(foundRepair.advancePaid)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Balance to Pay:</span>
                <span className="text-brand-700">{formatINR(foundRepair.estimatedCost - foundRepair.advancePaid)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5" />
                Est. Delivery: <span className="font-semibold text-slate-700">{formatDate(foundRepair.deliveryDate)}</span>
              </div>
            </div>

          </div>

          {/* Activity Log */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Technician Log & Updates</h4>
            <div className="space-y-2.5">
              {foundRepair.timeline.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-brand-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{log.title}</span>
                      <span className="text-slate-400 text-[10px]">{log.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{log.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support CTA */}
          <div className="bg-brand-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-brand-100">
            <div className="text-center sm:text-left">
              <div className="text-xs font-bold text-brand-900">Have questions about your repair?</div>
              <div className="text-[11px] text-brand-700">Call our technician desk directly</div>
            </div>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call Support Desk
            </a>
          </div>

        </div>
      ) : (
        hasSearched && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Job Sheet Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any repair order matching &quot;{tokenInput}&quot;. Please verify the token number from your physical bill slip.
            </p>
          </div>
        )
      )}

    </div>
  );
}

export default function RepairTrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading repair tracker...</div>}>
      <RepairTrackingContent />
    </Suspense>
  );
}

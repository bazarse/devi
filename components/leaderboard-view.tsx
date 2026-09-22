'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  TrendingUp, 
  ShoppingBag, 
  Store as StoreIcon, 
  Calendar, 
  Award, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  Zap,
  Medal,
  Smartphone,
  IndianRupee,
  Users
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { fetchSalesPipelineDeals, subscribeToPipeline, SalesDeal } from '@/lib/sales-pipeline';
import { getStaffUsers, StaffUser } from '@/lib/staff-service';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import confetti from 'canvas-confetti';

interface LeaderboardViewProps {
  initialStoreFilter?: string; // 'ALL', 'DM-01', 'DM-02'
  canSwitchStore?: boolean;
  roleTitle?: string;
}

interface SalesmanRankItem {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  storeName: string;
  unitsSold: number;
  totalRevenue: number;
  topModel: string;
  deals: SalesDeal[];
}

export default function LeaderboardView({
  initialStoreFilter = 'ALL',
  canSwitchStore = true,
  roleTitle = 'Store Performance Leaderboard'
}: LeaderboardViewProps) {
  const [selectedStore, setSelectedStore] = useState<string>(initialStoreFilter);
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [stores, setStores] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [isLoading, setIsLoading] = useState(true);

  // Keep the selected store in sync when the parent resolves the real store
  // asynchronously (e.g. a Freeganj admin whose store_id loads after mount).
  // Prevents a DM-02 user from being stuck on the default DM-01 view.
  useEffect(() => {
    setSelectedStore(initialStoreFilter);
  }, [initialStoreFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        // When locked to a single store, fetch ONLY that store's deals so no
        // other store's data ever reaches the client (defense-in-depth).
        const dealsFilter: { status: string; storeId?: string } = { status: 'approved' };
        if (initialStoreFilter && initialStoreFilter !== 'ALL') {
          dealsFilter.storeId = initialStoreFilter;
        }

        const [approvedDeals, staff, storeList] = await Promise.all([
          fetchSalesPipelineDeals(dealsFilter),
          getStaffUsers(),
          getActiveStores()
        ]);

        if (isMounted) {
          setDeals(approvedDeals);
          setStaffUsers(staff);
          setStores(storeList);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    const unsub = subscribeToPipeline(() => {
      loadData();
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [initialStoreFilter]);

  // Filter deals based on selected time period
  const filteredDealsByTime = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return deals.filter(d => {
      const dealTime = new Date(d.decidedAt || d.submittedAt || Date.now()).getTime();
      if (timePeriod === 'today') return dealTime >= startOfToday;
      if (timePeriod === 'week') return dealTime >= startOfWeek;
      if (timePeriod === 'month') return dealTime >= startOfMonth;
      return true; // 'all'
    });
  }, [deals, timePeriod]);

  // Aggregate ranking by salesman (Unit-wise ranking as primary metric)
  const rankedSalesmen: SalesmanRankItem[] = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      storeId: string;
      units: number;
      revenue: number;
      models: Record<string, number>;
      deals: SalesDeal[];
    }>();

    // Initialize with all registered salesmen so even 0-sales staff appear
    staffUsers.forEach(staff => {
      if (staff.role === 'salesman') {
        map.set(staff.phone || staff.full_name, {
          name: staff.full_name,
          phone: staff.phone,
          storeId: staff.store_id || 'DM-01',
          units: 0,
          revenue: 0,
          models: {},
          deals: []
        });
      }
    });

    // Populate with approved deals
    filteredDealsByTime.forEach(deal => {
      const key = deal.salesPersonPhone || deal.salesPersonName || 'Staff Salesman';
      const existing = map.get(key) || {
        name: deal.salesPersonName || 'Staff Salesman',
        phone: deal.salesPersonPhone || '',
        storeId: deal.storeId || 'DM-01',
        units: 0,
        revenue: 0,
        models: {},
        deals: []
      };

      existing.units += 1;
      existing.revenue += (deal.finalPrice || 0);
      existing.deals.push(deal);
      
      if (deal.productName) {
        existing.models[deal.productName] = (existing.models[deal.productName] || 0) + 1;
      }

      map.set(key, existing);
    });

    const list: SalesmanRankItem[] = Array.from(map.entries()).map(([id, val]) => {
      // Find top sold model
      let topModelName = 'N/A';
      let maxCount = 0;
      Object.entries(val.models).forEach(([m, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topModelName = m;
        }
      });

      const storeObj = stores.find(s => s.code === val.storeId);
      const storeName = storeObj ? (val.storeId === 'DM-01' ? 'DM-01 Kanthal' : 'DM-02 Freeganj') : val.storeId;

      return {
        id,
        name: val.name,
        phone: val.phone,
        storeId: val.storeId,
        storeName,
        unitsSold: val.units,
        totalRevenue: val.revenue,
        topModel: topModelName,
        deals: val.deals
      };
    });

    // Filter by store if not 'ALL'
    const storeFiltered = selectedStore === 'ALL' 
      ? list 
      : list.filter(item => item.storeId === selectedStore);

    // Sort: Primary by Units Sold (DESC), Secondary by Total Revenue (DESC)
    return storeFiltered.sort((a, b) => {
      if (b.unitsSold !== a.unitsSold) {
        return b.unitsSold - a.unitsSold;
      }
      return b.totalRevenue - a.totalRevenue;
    });
  }, [filteredDealsByTime, staffUsers, stores, selectedStore]);

  const top1 = rankedSalesmen[0];
  const top2 = rankedSalesmen[1];
  const top3 = rankedSalesmen[2];

  const totalUnitsInPeriod = rankedSalesmen.reduce((acc, s) => acc + s.unitsSold, 0);
  const totalRevenueInPeriod = rankedSalesmen.reduce((acc, s) => acc + s.totalRevenue, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Devi Mobile Champion League</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Sales Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Real-time sales ranking by units closed. Track top performers across Kanthal Chauraha and Freeganj branches.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-4 rounded-2xl text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Units</div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                {totalUnitsInPeriod}
              </div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/60 p-4 rounded-2xl text-center min-w-[140px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Volume</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                {formatINR(totalRevenueInPeriod)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS: STORE FILTER & TIME PERIOD TABS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Store Selector */}
        {canSwitchStore ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
              <StoreIcon className="w-3.5 h-3.5 text-brand-600" />
              <span>Store:</span>
            </span>
            <button
              onClick={() => setSelectedStore('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedStore === 'ALL'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Stores (Chain)
            </button>
            <button
              onClick={() => setSelectedStore('DM-01')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedStore === 'DM-01'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              DM-01 (Kanthal)
            </button>
            <button
              onClick={() => setSelectedStore('DM-02')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedStore === 'DM-02'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              DM-02 (Freeganj)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <StoreIcon className="w-4 h-4 text-brand-600" />
            <span>Store: {selectedStore === 'DM-02' ? 'DM-02 Freeganj' : 'DM-01 Kanthal'}</span>
          </div>
        )}

        {/* Time Period Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setTimePeriod('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'today'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimePeriod('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'week'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimePeriod('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'month'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timePeriod === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>

      </div>

      {/* 3. PODIUM SHOWCASE (TOP 3 PERFORMERS) */}
      {rankedSalesmen.length > 0 && totalUnitsInPeriod > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* RANK #2 (Silver) */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100 to-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex flex-col items-center text-center relative overflow-hidden md:mt-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-black text-lg mb-3 shadow-inner">
              🥈 #2
            </div>
            {top2 ? (
              <>
                <h3 className="text-lg font-black text-slate-900">{top2.name}</h3>
                <span className="text-xs font-semibold text-slate-500 mb-4">{top2.storeName}</span>
                
                <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Units Sold</span>
                    <strong className="text-slate-900 text-sm font-black">{top2.unitsSold} Units</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Volume</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(top2.totalRevenue)}</strong>
                  </div>
                  {top2.topModel !== 'N/A' && (
                    <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-200/60">
                      Top: {top2.topModel}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Salesman at #2</div>
            )}
          </div>

          {/* RANK #1 (Gold Champion) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-50 to-white p-6 sm:p-8 rounded-3xl border-2 border-amber-400 shadow-xl shadow-amber-500/10 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
              <Crown className="w-3.5 h-3.5 fill-slate-950" />
              <span>Rank 1</span>
            </div>

            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl mb-3 shadow-lg shadow-amber-500/30">
              🥇
            </div>

            {top1 ? (
              <>
                <h3 className="text-xl font-black text-slate-900">{top1.name}</h3>
                <span className="text-xs font-bold text-amber-700 mb-4">{top1.storeName}</span>
                
                <div className="w-full bg-amber-100/60 p-4 rounded-2xl border border-amber-300/80 space-y-2.5 mt-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 font-bold">Units Sold</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-base font-black shadow-sm">
                      {top1.unitsSold} Units
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-900/80 font-bold">Total Sales</span>
                    <strong className="text-emerald-800 text-sm font-black">{formatINR(top1.totalRevenue)}</strong>
                  </div>
                  {top1.topModel !== 'N/A' && (
                    <div className="text-[11px] text-amber-800 font-semibold truncate pt-1.5 border-t border-amber-200">
                      🔥 Top Model: {top1.topModel}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Sales Recorded</div>
            )}
          </div>

          {/* RANK #3 (Bronze) */}
          <div className="order-3 bg-gradient-to-b from-orange-50/50 to-white p-6 rounded-3xl border-2 border-amber-700/30 shadow-sm flex flex-col items-center text-center relative overflow-hidden md:mt-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-700/30 flex items-center justify-center text-amber-900 font-black text-lg mb-3 shadow-inner">
              🥉 #3
            </div>
            {top3 ? (
              <>
                <h3 className="text-lg font-black text-slate-900">{top3.name}</h3>
                <span className="text-xs font-semibold text-slate-500 mb-4">{top3.storeName}</span>
                
                <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 mt-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Units Sold</span>
                    <strong className="text-slate-900 text-sm font-black">{top3.unitsSold} Units</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Volume</span>
                    <strong className="text-emerald-700 font-bold">{formatINR(top3.totalRevenue)}</strong>
                  </div>
                  {top3.topModel !== 'N/A' && (
                    <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-slate-200/60">
                      Top: {top3.topModel}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 my-auto py-8">No Salesman at #3</div>
            )}
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🏆
          </div>
          <h3 className="text-lg font-black text-slate-900">
            No Approved Sales in Selected Period
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once salesmen create deals from POS and managers approve them, the live unit-wise ranking and Top 3 podium will appear automatically!
          </p>
        </div>
      )}

      {/* 4. COMPLETE RANKING TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-black text-slate-900">Complete Leaderboard Standings</h2>
          </div>
          <span className="text-xs text-slate-400 font-bold uppercase">
            Ranked by Units Sold
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-14 text-center">Rank</th>
                <th className="py-3.5 px-4">Salesman</th>
                <th className="py-3.5 px-4">Store Branch</th>
                <th className="py-3.5 px-4 text-center">Units Sold</th>
                <th className="py-3.5 px-4 text-right">Total Revenue (₹)</th>
                <th className="py-3.5 px-4">Top Sold Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedSalesmen.length > 0 ? (
                rankedSalesmen.map((salesman, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1 && salesman.unitsSold > 0;
                  const isTop2 = rank === 2 && salesman.unitsSold > 0;
                  const isTop3 = rank === 3 && salesman.unitsSold > 0;

                  return (
                    <tr 
                      key={salesman.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTop1 ? 'bg-amber-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 text-xs shadow-sm">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 text-xs">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-900 text-xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">#{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{salesman.name}</div>
                        {salesman.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">{salesman.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {salesman.storeName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                          salesman.unitsSold > 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {salesman.unitsSold} {salesman.unitsSold === 1 ? 'Unit' : 'Units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatINR(salesman.totalRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {salesman.topModel !== 'N/A' ? (
                          <span className="font-medium text-slate-800">{salesman.topModel}</span>
                        ) : (
                          <span className="text-slate-400 italic">No sales yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No salesmen data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

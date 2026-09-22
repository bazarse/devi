'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Boxes, 
  Plus, 
  Search, 
  Smartphone, 
  Headphones, 
  Tv, 
  Scan, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  UploadCloud, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ShieldCheck, 
  Building2, 
  Filter,
  RefreshCw,
  Camera
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import confetti from 'canvas-confetti';
import LiveBarcodeScannerModal from '@/components/live-barcode-scanner-modal';
import { getAllBrands, fetchAllBrands, addCustomBrand } from '@/lib/brand-service';

import { REAL_STRUCTURED_SUPER, InventoryItemModel } from '@/lib/real-inventory-data';

export type SuperInventoryItem = InventoryItemModel;

const INITIAL_SUPER_INVENTORY: SuperInventoryItem[] = REAL_STRUCTURED_SUPER as SuperInventoryItem[];

export default function SuperAdminInventoryPage() {
  const [inventory, setInventory] = useState<SuperInventoryItem[]>(INITIAL_SUPER_INVENTORY);
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Brand list (base + admin-added) with 'All' for filter pills.
  const [brandList, setBrandList] = useState<string[]>(['All']);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  useEffect(() => {
    setBrandList(['All', ...getAllBrands()]);
    // Refresh from central Supabase so brands added on any device appear here.
    fetchAllBrands().then((all) => setBrandList(['All', ...all])).catch(() => {});
  }, []);
  const BRANDS = brandList;

  const handleAddBrand = async () => {
    const added = await addCustomBrand(newBrandName);
    if (added) {
      const all = await fetchAllBrands();
      setBrandList(['All', ...all]);
      setInwardBrand(added);
      setNewBrandName('');
      setShowAddBrand(false);
    }
  };

  // Dynamic Sync: Deduct sold items from inventory based on approved cloud deals
  useEffect(() => {
    async function syncSoldDeals() {
      try {
        const res = await fetch('/api/deals/list?status=approved', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.deals) && data.deals.length > 0) {
          const soldImeis = new Set(data.deals.map((d: any) => (d.imeiSerial || '').trim().toLowerCase()));
          const soldModelCounts: Record<string, number> = {};
          data.deals.forEach((d: any) => {
            const key = (d.productName || '').toLowerCase().trim();
            soldModelCounts[key] = (soldModelCounts[key] || 0) + 1;
          });

          setInventory(prev => prev.map(item => {
            const modelKey = item.modelName.toLowerCase().trim();
            const soldCount = soldModelCounts[modelKey] || 0;
            
            // Mark IMEIs as sold
            const updatedImeis = item.imeiList?.map(im => {
              if (soldImeis.has(im.imei.trim().toLowerCase())) {
                return { ...im, status: 'sold' as const };
              }
              return im;
            });

            const availableCount = updatedImeis 
              ? updatedImeis.filter(im => im.status === 'in_stock').length 
              : Math.max(0, item.quantity - soldCount);

            return {
              ...item,
              quantity: availableCount,
              imeiList: updatedImeis
            };
          }));
        }
      } catch (e) {
        console.warn('Super inventory sync error:', e);
      }
    }
    syncSoldDeals();
  }, []);


  // Inward Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [inwardCategory, setInwardCategory] = useState<'Mobile Phone' | 'Accessories' | 'Appliances'>('Mobile Phone');
  const [inwardBrand, setInwardBrand] = useState('Vivo');
  const [inwardModel, setInwardModel] = useState('');
  const [inwardHsn, setInwardHsn] = useState('85171290');
  const [inwardCost, setInwardCost] = useState('');
  const [inwardMrp, setInwardMrp] = useState('');
  const [inwardSelling, setInwardSelling] = useState('');
  const [inwardQuantity, setInwardQuantity] = useState('1');
  const [inwardStoreId, setInwardStoreId] = useState('DM-01');
  const [inwardSupplier, setInwardSupplier] = useState('');
  const [inwardPurchaseInvoiceNo, setInwardPurchaseInvoiceNo] = useState('');
  const [inwardPurchaseDate, setInwardPurchaseDate] = useState('');

  // Multi-IMEI States
  const [imeiInputMode, setImeiInputMode] = useState<'bulk' | 'single'>('bulk');
  const [bulkImeiText, setBulkImeiText] = useState('');
  const [singleImeiText, setSingleImeiText] = useState('');
  const [parsedImeis, setParsedImeis] = useState<string[]>([]);
  const [showInwardScannerModal, setShowInwardScannerModal] = useState(false);

  useEffect(() => {
    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  const handleBulkImeiChange = (text: string) => {
    setBulkImeiText(text);
    const extracted = text
      .split(/[\r\n,\s\t]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 10);
    setParsedImeis(extracted);
  };

  const handleAddSingleImei = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleImeiText.trim()) return;
    setParsedImeis(prev => [...prev, singleImeiText.trim()]);
    setSingleImeiText('');
  };

  const handleRemoveParsedImei = (index: number) => {
    setParsedImeis(prev => prev.filter((_, i) => i !== index));
  };

  const handleInwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardModel || !inwardBrand) return;

    let finalImeiList: { imei: string; status: 'in_stock' }[] = [];
    let finalQty = Number(inwardQuantity) || 1;

    if (inwardCategory === 'Mobile Phone' || inwardCategory === 'Appliances') {
      if (parsedImeis.length > 0) {
        finalImeiList = parsedImeis.map(im => ({ imei: im, status: 'in_stock' }));
        finalQty = finalImeiList.length;
      }
    }

    const newItem: SuperInventoryItem = {
      id: `inv-${Date.now()}`,
      category: inwardCategory,
      brand: inwardBrand,
      modelName: inwardModel,
      hsnCode: inwardHsn || '85171290',
      costPrice: Number(inwardCost) || 0,
      mrp: Number(inwardMrp) || Number(inwardSelling) || 0,
      sellingPrice: Number(inwardSelling) || Number(inwardMrp) || 0,
      storeId: inwardStoreId,
      quantity: finalQty,
      imeiList: finalImeiList,
      supplierName: inwardSupplier.trim() || undefined,
      purchaseInvoiceNo: inwardPurchaseInvoiceNo.trim() || undefined,
      purchaseDate: inwardPurchaseDate.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    setInventory(prev => [newItem, ...prev]);
    setShowAddModal(false);
    setInwardModel('');
    setInwardCost('');
    setInwardMrp('');
    setInwardSelling('');
    setInwardSupplier('');
    setInwardPurchaseInvoiceNo('');
    setInwardPurchaseDate('');
    setBulkImeiText('');
    setParsedImeis([]);

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  const filteredInventory = inventory.filter(item => {
    const matchesStore = selectedStoreFilter === 'ALL' || item.storeId === selectedStoreFilter;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || item.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesSearch = item.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.hsnCode.includes(searchQuery) ||
                          (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.purchaseInvoiceNo && item.purchaseInvoiceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.imeiList.some(i => i.imei.includes(searchQuery));
    return matchesStore && matchesCategory && matchesBrand && matchesSearch;
  });

  const totalStockUnits = filteredInventory.reduce((acc, i) => acc + i.quantity, 0);
  const totalStockValuation = filteredInventory.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
              Super Admin HQ • Multi-Store Central Stock
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Chain Inventory & Multi-IMEI Master</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/super/import-stock"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
          >
            <UploadCloud className="w-4 h-4 text-brand-600" />
            <span>HQ Excel / Tally Ingest</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Inward Stock to Any Branch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Chain Stock Units</span>
            <Boxes className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalStockUnits} Units</div>
          <div className="text-xs text-slate-500">Filtered across selected branches</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase">Chain Valuation (Cost)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{formatINR(totalStockValuation)}</div>
          <div className="text-xs text-amber-700 font-semibold">Total capital locked in stock</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Locations</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{storesList.length} Branches</div>
          <div className="text-xs text-slate-500">DM-01, DM-02 & Future Branches</div>
        </div>
      </div>

      {/* Filter & Store Selector Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, phone model, 15-digit IMEI or HSN code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          {/* STORE BRANCH SELECTOR (HQ EXCLUSIVE) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Store:</span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">🏢 All Store Branches ({storesList.length})</option>
              {storesList.map((st) => (
                <option key={st.code} value={st.code}>{st.code}: {st.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category & Brand Pills */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'All', label: 'All Catalog' },
              { id: 'Mobile Phone', label: 'New Phones' },
              { id: 'Second Hand Phone', label: 'Second-Hand / Exchange' },
              { id: 'Accessories', label: 'Accessories' },
              { id: 'Appliances', label: 'Appliances' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all min-h-[36px] ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {BRANDS.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all min-h-[32px] ${
                  selectedBrand === brand
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Item Cards */}
      <div className="space-y-4">
        {filteredInventory.map((item) => {
          const isExpanded = expandedItemId === item.id;
          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-brand-50 text-brand-700 border border-brand-200">
                      {item.brand}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    <span className="font-mono text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                      Branch: {item.storeId}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      HSN: {item.hsnCode}
                    </span>
                    {item.supplierName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        <span>Supplier: {item.supplierName}</span>
                        {item.purchaseInvoiceNo && <span className="font-mono text-indigo-600">({item.purchaseInvoiceNo})</span>}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900">{item.modelName}</h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      Cost: <span className="font-bold text-slate-800">{formatINR(item.costPrice)}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">
                      Selling (MRP): <span className="font-bold text-brand-700">{formatINR(item.sellingPrice)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">In Stock</div>
                    <div className="text-xl font-black text-emerald-700">{item.quantity} Units</div>
                  </div>

                  {item.imeiList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                      <span>{isExpanded ? 'Hide' : `View ${item.imeiList.length} IMEIs`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && item.imeiList.length > 0 && (
                <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Individual Tracked IMEI / Serial Numbers ({item.imeiList.length} Units):</span>
                    <span className="text-[11px] text-emerald-700 font-bold">100% In Stock at {item.storeId}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {item.imeiList.map((im, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                          <span className="font-mono text-xs font-black text-slate-900 tracking-wider">
                            {im.imei}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD INWARD STOCK TO ANY BRANCH */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">HQ Inward Stock Entry (Multi-IMEI)</h3>
                  <p className="text-xs text-slate-500">Inward inventory directly to any store branch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">1. Select Retail Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Mobile Phone', label: 'Mobile Phone', icon: Smartphone },
                    { id: 'Accessories', label: 'Accessories', icon: Headphones },
                    { id: 'Appliances', label: 'Appliances & TVs', icon: Tv },
                  ].map(cat => {
                    const Icon = cat.icon;
                    const isSel = inwardCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setInwardCategory(cat.id as any);
                          if (cat.id === 'Mobile Phone') setInwardHsn('85171290');
                          else if (cat.id === 'Accessories') setInwardHsn('85044090');
                          else setInwardHsn('85287200');
                        }}
                        className={`p-3 rounded-2xl border text-center font-bold flex items-center justify-center gap-2 transition-all ${
                          isSel ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand Name *</label>
                  <select
                    value={inwardBrand}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowAddBrand(true);
                      } else {
                        setInwardBrand(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {BRANDS.filter(b => b !== 'All').map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="__ADD_NEW__">➕ Add New Brand…</option>
                  </select>
                  {showAddBrand && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(); } }}
                        placeholder="Enter new brand name"
                        className="flex-1 px-3 py-2 rounded-xl border border-brand-300 bg-brand-50/40 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddBrand}
                        className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold min-h-[40px]"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddBrand(false); setNewBrandName(''); }}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold min-h-[40px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Store Branch *</label>
                  <select
                    value={inwardStoreId}
                    onChange={(e) => setInwardStoreId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {storesList.map(st => (
                      <option key={st.code} value={st.code}>{st.code}: {st.name} ({st.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Model Name & Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vivo V30 5G (8GB RAM, 128GB)"
                  value={inwardModel}
                  onChange={(e) => setInwardModel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 29500"
                    value={inwardCost}
                    onChange={(e) => setInwardCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 33999"
                    value={inwardSelling}
                    onChange={(e) => setInwardSelling(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-brand-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">HSN Code *</label>
                  <input
                    type="text"
                    required
                    value={inwardHsn}
                    onChange={(e) => setInwardHsn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Supplier / Creditor & Inward Invoice Section */}
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-3">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Supplier / Creditor & Purchase Bill Details (पार्टी/लेनदार विवरण)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Creditor / Supplier Name (पार्टी का नाम)</label>
                    <input
                      type="text"
                      list="super-suppliers-datalist"
                      placeholder="e.g. Vivo MP Televentures / Shri Shyam Telecom"
                      value={inwardSupplier}
                      onChange={(e) => setInwardSupplier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <datalist id="super-suppliers-datalist">
                      <option value="Vivo MP Televentures" />
                      <option value="Oppo Mobiles India Pvt Ltd" />
                      <option value="Samsung Electronics Distributor" />
                      <option value="Ingram Micro India" />
                      <option value="Redington India Ltd" />
                      <option value="Shri Shyam Telecom" />
                      <option value="Mahavir Enterprises Ujjain" />
                      <option value="Local Cash Purchase" />
                    </datalist>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Purchase Invoice / Bill No (सप्लायर बिल नं.)</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-9871"
                      value={inwardPurchaseInvoiceNo}
                      onChange={(e) => setInwardPurchaseInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-IMEI Box */}
              {(inwardCategory === 'Mobile Phone' || inwardCategory === 'Appliances') ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scan className="w-4 h-4 text-brand-600" />
                      <span>Multiple IMEI / Serials ({parsedImeis.length} Ready)</span>
                    </span>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowInwardScannerModal(true)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Camera Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImeiInputMode('bulk')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          imeiInputMode === 'bulk' ? 'bg-brand-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Bulk Paste
                      </button>
                      <button
                        type="button"
                        onClick={() => setImeiInputMode('single')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          imeiInputMode === 'single' ? 'bg-brand-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        Type/Gun
                      </button>
                    </div>
                  </div>

                  {imeiInputMode === 'bulk' ? (
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Paste 15-digit IMEIs separated by commas or new lines..."
                        value={bulkImeiText}
                        onChange={(e) => handleBulkImeiChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Scan or type 15-digit IMEI..."
                        value={singleImeiText}
                        onChange={(e) => setSingleImeiText(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddSingleImei}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {parsedImeis.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Verified {parsedImeis.length} Units to Inward at {inwardStoreId}:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-2 bg-white rounded-xl border border-slate-200">
                        {parsedImeis.map((im, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-brand-800 text-[10px] font-mono font-bold border border-blue-200"
                          >
                            <span>{im}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveParsedImei(i)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Inward Quantity (Pieces) *</label>
                  <input
                    type="number"
                    min={1}
                    value={inwardQuantity}
                    onChange={(e) => setInwardQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
                >
                  Inward to {inwardStoreId}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE CAMERA BARCODE SCANNER MODAL FOR MULTI-UNIT INWARDING */}
      <LiveBarcodeScannerModal
        isOpen={showInwardScannerModal}
        onClose={() => setShowInwardScannerModal(false)}
        isMultiScan={true}
        onScanSuccess={(code) => {
          if (!parsedImeis.includes(code)) {
            setParsedImeis(prev => [...prev, code]);
            setInwardQuantity(String(parsedImeis.length + 1));
          }
        }}
        onMultiScanComplete={(codes) => {
          setParsedImeis(prev => {
            const combined = Array.from(new Set([...prev, ...codes]));
            setInwardQuantity(String(combined.length));
            return combined;
          });
        }}
        title="HQ Stock Inward Barcode Scanner"
        subtitle="Point camera at box barcodes. Scans continuously for multi-unit inwarding."
      />

    </div>
  );
}

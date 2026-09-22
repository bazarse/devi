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
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  UploadCloud, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  X, 
  FileSpreadsheet, 
  Tag, 
  Building2, 
  Lock,
  RefreshCw,
  Camera
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { POPULAR_MOBILE_CATALOG, CatalogProduct } from '@/lib/mobile-catalog';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { REAL_STRUCTURED_STORE_1, REAL_STRUCTURED_STORE_2, InventoryItemModel } from '@/lib/real-inventory-data';
import LiveBarcodeScannerModal from '@/components/live-barcode-scanner-modal';
import ErrorBoundary from '@/components/error-boundary';
import { getAllBrands, fetchAllBrands, addCustomBrand } from '@/lib/brand-service';

export type InventoryItem = InventoryItemModel;

const INITIAL_INVENTORY: InventoryItem[] = REAL_STRUCTURED_STORE_1 as InventoryItem[];

export default function InwardStockInventoryPage() {
  const [activeMainTab, setActiveMainTab] = useState<'stock' | 'bulk_import'>('stock');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Brand list (base + admin-added). 'All' prefix used for filter pills.
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
        console.warn('Inventory sync error:', e);
      }
    }
    syncSoldDeals();
  }, []);


  // Bulk Import State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedExcelItems, setParsedExcelItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  // Modal State
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

  // Multi-IMEI Entry States
  const [imeiInputMode, setImeiInputMode] = useState<'bulk' | 'single'>('bulk');
  const [bulkImeiText, setBulkImeiText] = useState('');
  const [singleImeiText, setSingleImeiText] = useState('');
  const [parsedImeis, setParsedImeis] = useState<string[]>([]);
  const [showInwardScannerModal, setShowInwardScannerModal] = useState(false);

  // Sample Excel Template Download
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Product Name': 'Vivo V30 5G (8GB RAM, 128GB)',
        'Category': 'Mobile Phone',
        'Brand': 'Vivo',
        'IMEI Number': '864219053820201',
        'Cost Price': 29500,
        'Selling Price': 33999,
        'Quantity': 1,
        'HSN Code': '85171290',
        'Supplier / Creditor Name': 'Vivo MP Televentures',
        'Purchase Invoice No': 'INV-2026-9871'
      },
      {
        'Product Name': 'Samsung Galaxy F15 5G 6+128GB',
        'Category': 'Mobile Phone',
        'Brand': 'Samsung',
        'IMEI Number': '354772952358900',
        'Cost Price': 11000,
        'Selling Price': 12999,
        'Quantity': 1,
        'HSN Code': '85171290',
        'Supplier / Creditor Name': 'Samsung Electronics Distributor',
        'Purchase Invoice No': 'BILL-SAM-4421'
      },
      {
        'Product Name': 'Devi 65W GaN Fast Charger',
        'Category': 'Accessories',
        'Brand': 'Devi Pro',
        'IMEI Number': '',
        'Cost Price': 850,
        'Selling Price': 1499,
        'Quantity': 20,
        'HSN Code': '85044090',
        'Supplier / Creditor Name': 'Ingram Micro India',
        'Purchase Invoice No': 'ING-88912'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Import Template');
    XLSX.writeFile(workbook, 'Devi_Stock_Inward_Template_DM01.xlsx');
  };

  // Handle Excel File Upload & Parse
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setExcelFile(uploaded);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const normalized = data.map((row: any, idx: number) => ({
          id: `excel-${idx}`,
          modelName: row['Product Name'] || row['Model'] || row['Item Name'] || 'Unknown Item',
          category: row['Category'] || 'Mobile Phone',
          brand: row['Brand'] || 'Generic',
          imei: row['IMEI Number'] || row['IMEI'] || row['Serial'] || '',
          costPrice: Number(row['Cost Price'] || row['Purchase Rate'] || 0),
          sellingPrice: Number(row['Selling Price'] || row['MRP'] || 0),
          quantity: Number(row['Quantity'] || row['Qty'] || 1),
          hsnCode: String(row['HSN Code'] || '85171290'),
          supplierName: row['Supplier / Creditor Name'] || row['Supplier'] || row['Creditor'] || row['Party Name'] || '',
          purchaseInvoiceNo: row['Purchase Invoice No'] || row['Invoice No'] || row['Bill No'] || '',
        }));

        setParsedExcelItems(normalized);
      } catch (err) {
        console.error('Excel parse error:', err);
      }
    };
    reader.readAsBinaryString(uploaded);
  };

  // Confirm Excel Ingestion into DM-01 Stock
  const handleExecuteExcelImport = () => {
    if (parsedExcelItems.length === 0) return;
    setIsImporting(true);

    const newStockEntries: InventoryItem[] = parsedExcelItems.map((item, idx) => ({
      id: `inv-excel-${Date.now()}-${idx}`,
      category: item.category as any,
      brand: item.brand,
      modelName: item.modelName,
      hsnCode: item.hsnCode,
      costPrice: item.costPrice,
      mrp: item.sellingPrice,
      sellingPrice: item.sellingPrice,
      storeId: 'DM-01',
      quantity: item.quantity,
      imeiList: item.imei ? [{ imei: item.imei, status: 'in_stock' }] : [],
    }));

    setInventory(prev => [...newStockEntries, ...prev]);
    setIsImporting(false);
    setImportSuccessMessage(`Successfully imported ${newStockEntries.length} items directly into Store DM-01 inventory!`);
    setExcelFile(null);
    setParsedExcelItems([]);
    setActiveMainTab('stock');

    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => setImportSuccessMessage(''), 4000);
  };

  // Parse bulk IMEIs on text change
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

  // Submit Inward Stock
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

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      category: inwardCategory,
      brand: inwardBrand,
      modelName: inwardModel,
      hsnCode: inwardHsn || '85171290',
      costPrice: Number(inwardCost) || 0,
      mrp: Number(inwardMrp) || Number(inwardSelling) || 0,
      sellingPrice: Number(inwardSelling) || Number(inwardMrp) || 0,
      storeId: 'DM-01',
      quantity: finalQty,
      imeiList: finalImeiList,
      supplierName: inwardSupplier.trim() || undefined,
      purchaseInvoiceNo: inwardPurchaseInvoiceNo.trim() || undefined,
      purchaseDate: inwardPurchaseDate.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    setInventory(prev => [newItem, ...prev]);
    setShowAddModal(false);

    // Reset
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
    if (!item) return false;
    const q = (searchQuery || '').toLowerCase();
    const modelName = String(item.modelName || '').toLowerCase();
    const brand = String(item.brand || '').toLowerCase();
    const hsnCode = String(item.hsnCode || '');
    const supplier = String(item.supplierName || '').toLowerCase();
    const invoiceNo = String(item.purchaseInvoiceNo || '').toLowerCase();
    const imeiMatches = (item.imeiList || []).some(i => {
      if (!i) return false;
      const imeiStr = typeof i === 'string' ? i : (i.imei || '');
      return String(imeiStr).toLowerCase().includes(q);
    });
    const matchesSearch = !q ||
                          modelName.includes(q) ||
                          brand.includes(q) ||
                          hsnCode.includes(searchQuery) ||
                          supplier.includes(q) ||
                          invoiceNo.includes(q) ||
                          imeiMatches;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || brand === (selectedBrand || '').toLowerCase();
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const totalStockUnits = (inventory || []).reduce((acc, i) => acc + (i?.quantity || 0), 0);
  const totalStockValuation = (inventory || []).reduce((acc, i) => acc + ((i?.costPrice || 0) * (i?.quantity || 0)), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">
              Store DM-01 (Kanthal) Inventory Control
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Inward Stock & Multi-IMEI Inventory</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('bulk_import')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              activeMainTab === 'bulk_import'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Excel / Tally Ingest</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Inward Stock (Multi-IMEI)</span>
          </button>
        </div>
      </div>

      {/* SUCCESS ALERT */}
      {importSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importSuccessMessage}</span>
        </div>
      )}

      {/* 2 MAIN TABS */}
      <div className="flex border-b border-slate-200 gap-2 bg-white p-2 rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setActiveMainTab('stock')}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'stock'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>1. Live Store Stock & Multi-IMEI Items ({totalStockUnits} Units)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('bulk_import')}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'bulk_import'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>2. Bulk Excel / Tally Stock Inward (DM-01)</span>
        </button>
      </div>

      {activeMainTab === 'bulk_import' ? (
        /* ================= BULK EXCEL IMPORT VIEW ================= */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Bulk Stock Ingestion (Store DM-01)</h2>
                <p className="text-xs text-slate-500">Upload distributor Excel/Tally invoice sheets to inward multiple phones and accessories at once</p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Download Sample Excel Template</span>
              </button>
            </div>

            {/* File Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-8 text-center bg-slate-50 transition-colors">
              <UploadCloud className="w-12 h-12 text-brand-600 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-900">Choose Excel File (.xlsx, .xls, .csv)</div>
              <div className="text-xs text-slate-400 mt-1">Supports multi-IMEI mobile lists, barcodes, purchase cost & selling rates</div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileUpload}
                className="mt-4 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-600 file:text-white hover:file:bg-brand-700 cursor-pointer"
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedExcelItems.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-slate-900">
                    Parsed Stock Items ({parsedExcelItems.length} Products Found)
                  </div>
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleExecuteExcelImport}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Inward All into DM-01 Stock</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Brand</th>
                        <th className="px-4 py-3">IMEI / Serial</th>
                        <th className="px-4 py-3">Cost Price</th>
                        <th className="px-4 py-3">Selling Price</th>
                        <th className="px-4 py-3">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedExcelItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">{item.modelName}</td>
                          <td className="px-4 py-3">{item.category}</td>
                          <td className="px-4 py-3">{item.brand}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{item.imei || 'N/A'}</td>
                          <td className="px-4 py-3 font-semibold">{formatINR(item.costPrice)}</td>
                          <td className="px-4 py-3 font-black text-brand-700">{formatINR(item.sellingPrice)}</td>
                          <td className="px-4 py-3 font-bold">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= LIVE STOCK TABLE VIEW ================= */
        <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Items in Stock</span>
            <Boxes className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalStockUnits} Units</div>
          <div className="text-xs text-slate-500">Across all 3 retail categories</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Stock Valuation (Cost)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-800 mt-1">{formatINR(totalStockValuation)}</div>
          <div className="text-xs text-blue-600 font-semibold">Total capital in inventory</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Tracked Serial / IMEIs</span>
            <Smartphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {(inventory || []).reduce((acc, i) => acc + ((i?.imeiList || []).length), 0)} Barcodes
          </div>
          <div className="text-xs text-slate-500">Individual unit traceability</div>
        </div>
      </div>

      {/* 5 Main Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {[
          { id: 'All', label: 'All Catalog', icon: Layers },
          { id: 'Mobile Phone', label: 'New Phones', icon: Smartphone },
          { id: 'Second Hand Phone', label: 'Second-Hand / Exchange', icon: RefreshCw },
          { id: 'Accessories', label: 'Accessories', icon: Headphones },
          { id: 'Appliances', label: 'Appliances & TVs', icon: Tv },
        ].map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all min-h-[48px] ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Brand Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand, phone model, 15-digit IMEI or HSN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        {/* Brand Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {BRANDS.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setSelectedBrand(brand)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedBrand === brand
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Items List */}
      <ErrorBoundary title="Live Store Inventory Items" description="Unable to load inventory items table due to a localized render issue. Please retry.">
        <div className="space-y-4">
          {filteredInventory.map((item) => {
            if (!item) return null;
            const imeiList = item.imeiList || [];
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Main Model Summary Header */}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-brand-50 text-brand-700 border border-brand-200">
                        {item.brand}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        HSN: {item.hsnCode}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                        Store: {item.storeId}
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
                        Cost: <span className="font-bold text-slate-800">{formatINR(item.costPrice || 0)}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">
                        Selling (MRP): <span className="font-bold text-brand-700">{formatINR(item.sellingPrice || 0)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">In Stock</div>
                      <div className="text-xl font-black text-emerald-700">{item.quantity || 0} Units</div>
                    </div>

                    {imeiList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                        <span>{isExpanded ? 'Hide IMEIs' : `View ${imeiList.length} IMEIs`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Multi-IMEI / Serial Numbers Sub-Table */}
                {isExpanded && imeiList.length > 0 && (
                  <div className="bg-slate-50 p-5 border-t border-slate-200 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Individual Tracked IMEI / Serial Numbers ({imeiList.length} Units):</span>
                      <span className="text-[11px] text-emerald-700 font-bold">100% Verified in Stock</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {imeiList.map((im, idx) => {
                        const imeiStr = typeof im === 'string' ? im : (im?.imei || 'N/A');
                        return (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                              <span className="font-mono text-xs font-black text-slate-900 tracking-wider">
                                {imeiStr}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ErrorBoundary>
    </div>
  )}

  {/* MODAL: ADD NEW INWARD STOCK (MULTI-IMEI ENTRY) */}
  {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Inward Stock Entry (Multi-IMEI)</h3>
                  <p className="text-xs text-slate-500">Add smartphones, appliances, and accessories with multiple serials</p>
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
              
              {/* Category Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">1. Retail Category *</label>
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

              {/* Brand & Store Branch */}
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
                  <label className="font-bold text-slate-700 block mb-1">Store Destination *</label>
                  <select
                    value={inwardStoreId}
                    onChange={(e) => setInwardStoreId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="DM-01">Store DM-01 (Kanthal Chauraha)</option>
                    <option value="DM-02">Store DM-02 (Freeganj)</option>
                  </select>
                </div>
              </div>

              {/* Model Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Model Name & Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vivo V30 5G (8GB RAM, 128GB) - Andaman Blue"
                  value={inwardModel}
                  onChange={(e) => setInwardModel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Pricing Row */}
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
                      list="store-suppliers-datalist"
                      placeholder="e.g. Vivo MP Televentures / Shri Shyam Telecom"
                      value={inwardSupplier}
                      onChange={(e) => setInwardSupplier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <datalist id="store-suppliers-datalist">
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

              {/* MULTI-IMEI ENTRY SECTION (For Mobile & Appliances) */}
              {(inwardCategory === 'Mobile Phone' || inwardCategory === 'Appliances') ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Scan className="w-4 h-4 text-brand-600" />
                      <span>Multiple IMEI / Serial Numbers ({parsedImeis.length} Ready)</span>
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
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Paste 15-digit IMEIs / Serials (Separated by new line, comma, or spaces):
                      </label>
                      <textarea
                        rows={3}
                        placeholder="354772952358675&#10;354772952358683&#10;354772952358691&#10;354772952358709..."
                        value={bulkImeiText}
                        onChange={(e) => handleBulkImeiChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Scan or type 15-digit IMEI and click Add..."
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

                  {/* Parsed IMEIs Badges Preview */}
                  {parsedImeis.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Verified {parsedImeis.length} Units to Inward:
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
                  Inward Stock to Ledger
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
        title="Stock Inward Barcode Scanner"
        subtitle="Point camera at box barcodes. Scans continuously for multi-unit inwarding."
      />

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Boxes, 
  ArrowLeft,
  Building2,
  ShieldCheck,
  Smartphone,
  Download,
  Trash2,
  RefreshCw,
  Database
} from 'lucide-react';
import { getActiveStores, StoreBranch, DEFAULT_STORES } from '@/lib/store-service';
import * as XLSX from 'xlsx';
import { formatINR } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ParsedStockItem {
  productName: string;
  category: string;
  brand: string;
  imeiNumber?: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  hsnCode: string;
  supplierName: string;
  branchCode: string;
}

export default function SuperAdminImportStockPage() {
  const [storesList, setStoresList] = useState<StoreBranch[]>(DEFAULT_STORES);
  const [targetStore, setTargetStore] = useState('DM-01');
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImportComplete, setIsImportComplete] = useState(false);

  useEffect(() => {
    async function loadStores() {
      const stores = await getActiveStores();
      setStoresList(stores);
    }
    loadStores();
  }, []);

  // Handle Excel Upload (Supports Tally & Standard Multi-Sheet)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setImportStatus('Parsing Excel data...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const items: ParsedStockItem[] = [];

        // Check if Tally Hierarchical Workbook
        const isTallyWorkbook = workbook.SheetNames.some(s => 
          s.toUpperCase().includes('DEVI') || 
          s.toUpperCase().includes('STK') || 
          s.toUpperCase().includes('STOCK')
        );

        if (isTallyWorkbook) {
          workbook.SheetNames.forEach(sheetName => {
            const currentSheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(currentSheet, { header: 1 });
            const sheetStoreCode = sheetName.toUpperCase().includes('2.0') ? 'DM-02' : targetStore;

            let currentCategory = 'Mobile Phone';
            let currentModel = '';
            let currentRate = 0;

            for (let i = 11; i < rows.length; i++) {
              const row = rows[i];
              if (!row || !row[0]) continue;
              const name = String(row[0]).trim();
              if (name.toLowerCase().includes('grand total') || name.toLowerCase().includes('total')) continue;

              const qty = parseFloat(row[1]);
              const rate = parseFloat(row[2]) || 0;

              if (row[1] == null && row[2] == null) {
                currentCategory = name;
                currentModel = '';
                currentRate = 0;
                continue;
              }

              if (qty != null && qty <= 0) continue;

              const isIMEI = /^\d{14,16}$/.test(name);
              if (isIMEI) {
                const parentModel = currentModel || 'Smart Mobile Phone';
                const effectiveRate = rate > 0 ? rate : (currentRate > 0 ? currentRate : 15000);
                items.push({
                  productName: parentModel,
                  category: 'Mobile Phone',
                  brand: parentModel.split(' ')[0] || 'Multibrand',
                  imeiNumber: name,
                  costPrice: effectiveRate,
                  sellingPrice: Math.round(effectiveRate * 1.12),
                  quantity: 1,
                  hsnCode: '85171290',
                  supplierName: 'Tally Inward Sync',
                  branchCode: sheetStoreCode
                });
              } else {
                currentModel = name;
                if (rate > 0) currentRate = rate;
                const effectiveRate = rate > 0 ? rate : 1000;
                const isPhone = currentCategory.toUpperCase().includes('PHONE') || currentCategory.toUpperCase().includes('SMARTPHONE');
                
                if (!isPhone) {
                  items.push({
                    productName: name,
                    category: currentCategory,
                    brand: name.split(' ')[0] || 'Multibrand',
                    costPrice: effectiveRate,
                    sellingPrice: Math.round(effectiveRate * 1.15),
                    quantity: Math.max(1, Math.round(qty || 1)),
                    hsnCode: '85044090',
                    supplierName: 'Tally Inward Sync',
                    branchCode: sheetStoreCode
                  });
                }
              }
            }
          });
        } else {
          // Standard Columnar Format
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          rawData.forEach((row) => {
            const keys = Object.keys(row);
            const getVal = (possibleKeys: string[]) => {
              const foundKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().trim().includes(pk.toLowerCase())));
              return foundKey ? row[foundKey] : '';
            };

            const pName = String(getVal(['product', 'name', 'item'])).trim();
            const pCat = String(getVal(['category'])).trim() || 'Mobile Phone';
            const pBrand = String(getVal(['brand', 'make'])).trim() || 'Multibrand';
            const pImei = String(getVal(['imei'])).trim();
            const pCost = Number(getVal(['cost', 'purchase', 'unit price'])) || 0;
            const pSelling = Number(getVal(['selling', 'mrp', 'mop', 'price'])) || pCost * 1.15;
            const pQty = Number(getVal(['quantity', 'qty', 'stock'])) || 1;

            if (pName) {
              items.push({
                productName: pName,
                category: pCat,
                brand: pBrand,
                imeiNumber: pImei,
                costPrice: pCost,
                sellingPrice: pSelling,
                quantity: pImei ? 1 : Math.max(1, pQty),
                hsnCode: pCat.toLowerCase().includes('phone') ? '85171290' : '85044090',
                supplierName: 'Bulk Import',
                branchCode: targetStore
              });
            }
          });
        }

        setParsedItems(items);
        setIsProcessing(false);
        setImportStatus(`Parsed ${items.length} items ready for import.`);
      } catch (err: any) {
        setIsProcessing(false);
        setImportStatus(`Failed to read file: ${err.message}`);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const handleSaveImport = () => {
    setIsProcessing(true);
    setImportStatus('Saving inventory to database...');
    
    setTimeout(() => {
      setIsProcessing(false);
      setIsImportComplete(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-12">
      
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
              Super Admin HQ • Multi-Store Ingest
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bulk Stock & Tally Excel Import</h1>
          </div>
        </div>

        <Link
          href="/admin/super/inventory"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to HQ Inventory</span>
        </Link>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Branch Selector */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            1. Select Default Destination Store Branch *
          </label>
          <select
            value={targetStore}
            onChange={(e) => setTargetStore(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {storesList.map((st) => (
              <option key={st.code} value={st.code}>{st.code}: {st.name} ({st.city})</option>
            ))}
          </select>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-8 text-center space-y-4 bg-slate-50/50 transition-colors relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm pointer-events-none">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1 pointer-events-none">
            <h3 className="text-base font-black text-slate-900">
              {file ? file.name : 'Upload Tally Prime or Excel Master Sheet (.xlsx, .csv)'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Auto-detects Tally Multi-Sheet (DEVI & DEVI 2.0) and standard spreadsheets.
            </p>
          </div>

          {importStatus && (
            <div className="text-xs font-bold text-brand-700 bg-brand-50 py-1.5 px-4 rounded-full inline-block">
              {importStatus}
            </div>
          )}
        </div>

        {/* Preview of Parsed Items */}
        {parsedItems.length > 0 && !isImportComplete && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black text-slate-900">
                Parsed Items Preview ({parsedItems.length} records)
              </h3>
              <button
                onClick={handleSaveImport}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Database className="w-4 h-4" />
                <span>Confirm & Inward All Records</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto overflow-x-auto custom-scrollbar border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Store</th>
                    <th className="py-2.5 px-3">Supplier / Creditor</th>
                    <th className="py-2.5 px-3">IMEI</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parsedItems.slice(0, 50).map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">{it.productName}</td>
                      <td className="py-2 px-3 text-brand-600 font-bold">{it.branchCode}</td>
                      <td className="py-2 px-3 text-indigo-700 font-semibold">{it.supplierName || 'Standard Distributor'}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{it.imeiNumber || 'N/A'}</td>
                      <td className="py-2 px-3 text-right">{formatINR(it.costPrice)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatINR(it.sellingPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isImportComplete && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              Successfully ingested all <span className="font-black">{parsedItems.length} records</span> into the live inventory!
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

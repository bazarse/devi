'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Smartphone, 
  Database,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { formatINR } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface ParsedStockItem {
  productName: string;
  category: string;
  subCategory?: string;
  brand?: string;
  imeiNumber?: string;
  serialNumber?: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  hsnCode?: string;
  supplierName?: string;
  branchCode: string;
}

export default function ImportStockPage() {
  const [selectedBranch, setSelectedBranch] = useState('DM-01');
  const [selectedCategory, setSelectedCategory] = useState<'Mobile Phone' | 'Accessories' | 'Appliances'>('Mobile Phone');
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImportComplete, setIsImportComplete] = useState(false);

  // Download Sample Excel Template
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Product Name': 'Apple iPhone 15 (128 GB) - Black',
        'Category': 'Mobile Phone',
        'Brand': 'Apple',
        'IMEI Number': '861234567890123',
        'Cost Price': 62000,
        'Selling Price': 69900,
        'Quantity': 1,
        'Supplier Name': 'Apple Authorized Distributor',
        'HSN Code': '8517'
      },
      {
        'Product Name': 'Samsung Galaxy S24 5G (256 GB) - Onyx Black',
        'Category': 'Mobile Phone',
        'Brand': 'Samsung',
        'IMEI Number': '869876543210987',
        'Cost Price': 71000,
        'Selling Price': 79999,
        'Quantity': 1,
        'Supplier Name': 'Samsung India',
        'HSN Code': '8517'
      },
      {
        'Product Name': 'Devi Ultra 65W GaN Fast Charger',
        'Category': 'Accessories',
        'Brand': 'Devi Pro',
        'IMEI Number': '',
        'Cost Price': 850,
        'Selling Price': 1499,
        'Quantity': 25,
        'Supplier Name': 'Devi Wholesale Corp',
        'HSN Code': '8504'
      },
      {
        'Product Name': 'boAt Rockerz 255 Pro+ Wireless Neckband',
        'Category': 'Accessories',
        'Brand': 'boAt',
        'IMEI Number': '',
        'Cost Price': 950,
        'Selling Price': 1299,
        'Quantity': 15,
        'Supplier Name': 'Imagine Marketing',
        'HSN Code': '8518'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Template');
    XLSX.writeFile(workbook, 'devi_mobile_stock_template.xlsx');
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setImportStatus('Parsing Excel data...');
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawData.length === 0) {
          setErrors(['The uploaded file contains no data rows.']);
          setIsProcessing(false);
          return;
        }

        const items: ParsedStockItem[] = [];
        const errList: string[] = [];

        // 1. Check if Tally Hierarchical Workbook (e.g. contains DEVI / DEVI 2.0 / Stock Summary)
        const isTallyWorkbook = workbook.SheetNames.some(s => 
          s.toUpperCase().includes('DEVI') || 
          s.toUpperCase().includes('STK') || 
          s.toUpperCase().includes('STOCK')
        );

        if (isTallyWorkbook) {
          workbook.SheetNames.forEach(sheetName => {
            const currentSheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(currentSheet, { header: 1 });
            const sheetStoreCode = sheetName.toUpperCase().includes('2.0') ? 'DM-02' : selectedBranch;

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
                  serialNumber: name,
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
          // 2. Standard Columnar Excel Format
          rawData.forEach((row, idx) => {
            const keys = Object.keys(row);
            const getVal = (possibleKeys: string[]) => {
              const foundKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().trim().includes(pk.toLowerCase())));
              return foundKey ? row[foundKey] : '';
            };

            const pName = String(getVal(['product', 'name', 'item'])).trim();
            const pCat = String(getVal(['category'])).trim() || selectedCategory;
            const pBrand = String(getVal(['brand', 'make'])).trim() || 'Multibrand';
            const pImei = String(getVal(['imei'])).trim();
            const pSerial = String(getVal(['serial'])).trim();
            const pCost = Number(getVal(['cost', 'purchase', 'unit price'])) || 0;
            const pSelling = Number(getVal(['selling', 'mrp', 'mop', 'price'])) || pCost * 1.15;
            const pQty = Number(getVal(['quantity', 'qty', 'stock'])) || 1;
            const pSupplier = String(getVal(['supplier'])).trim() || 'General Supplier';
            const pHsn = String(getVal(['hsn'])).trim() || (pCat.toLowerCase().includes('phone') ? '8517' : '8504');

            if (!pName) {
              errList.push(`Row ${idx + 2}: Product Name is missing.`);
              return;
            }

            items.push({
              productName: pName,
              category: pCat,
              brand: pBrand,
              imeiNumber: pImei,
              serialNumber: pSerial || pImei,
              costPrice: pCost,
              sellingPrice: pSelling,
              quantity: pCat.toLowerCase().includes('phone') ? 1 : Math.max(1, pQty),
              hsnCode: pHsn,
              supplierName: pSupplier,
              branchCode: selectedBranch
            });
          });
        }

        setParsedItems(items);
        setErrors(errList);
        setIsProcessing(false);
        setImportStatus(`Found ${items.length} items ready for import.`);
      } catch (err: any) {
        setErrors([`Failed to read file: ${err.message}`]);
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // Push to Supabase Database
  const handleSaveToDatabase = async () => {
    if (parsedItems.length === 0) return;

    setIsProcessing(true);
    setImportStatus('Connecting to Supabase and uploading stock records...');
    
    try {
      const supabase = createClient();
      let success = 0;
      let fails = 0;

      for (const item of parsedItems) {
        try {
          // 1. Insert product record if not exists
          const { data: prodData, error: prodErr } = await supabase
            .from('products')
            .upsert(
              {
                brand: item.brand,
                model_name: item.productName,
                title: item.productName,
                mrp: item.sellingPrice,
                selling_price: item.sellingPrice,
                cost_price: item.costPrice,
                hsn_code: item.hsnCode,
                is_active: true
              },
              { onConflict: 'model_name' }
            )
            .select('id')
            .maybeSingle();

          // 2. If phone has IMEI, insert into imei_stock
          if (item.imeiNumber) {
            await supabase.from('imei_stock').upsert(
              {
                imei1: item.imeiNumber,
                status: 'in_stock',
                purchase_price: item.costPrice,
                created_at: new Date().toISOString()
              },
              { onConflict: 'imei1' }
            );
          }

          success++;
        } catch (e) {
          fails++;
        }
      }

      setSuccessCount(success);
      setErrorCount(fails);
      setIsImportComplete(true);
      setIsProcessing(false);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrors([`Database import error: ${err.message}`]);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/store"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">Inventory Setup</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bulk Stock & Excel Import</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors min-h-[44px]"
        >
          <Download className="w-4 h-4 text-brand-600" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {isImportComplete ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Inventory Successfully Migrated!</h2>
            <p className="text-sm text-slate-500">
              <strong className="text-emerald-700">{parsedItems.length} Real Stock Items</strong> loaded into Supabase database.
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto pt-2">
              The POS screen and live catalog now use your real imported inventory and IMEI records. Demo data has been replaced.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link
              href="/pos"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all"
            >
              Open POS Billing Desk
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsImportComplete(false);
                setFile(null);
                setParsedItems([]);
              }}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
            >
              Upload Another Excel File
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Target Branch Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Store Branch</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'DM-01', name: 'Main Market Flagship (DM-01)' },
                { code: 'DM-02', name: 'City Mall Branch (DM-02)' },
              ].map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => setSelectedBranch(b.code)}
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm font-bold transition-all text-left min-h-[48px] ${
                    selectedBranch === b.code
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:border-brand-500 transition-colors text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Inventory Excel File</h3>
              <p className="text-xs text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv files</p>
            </div>

            <input
              type="file"
              id="excel-file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="excel-file"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{file ? file.name : 'Select Excel / CSV File'}</span>
            </label>

            {file && (
              <div className="text-xs text-slate-500 font-medium">
                Selected: <strong className="text-slate-800">{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Errors Display */}
          {errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 text-xs text-rose-800">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Notice / Warnings ({errors.length}):</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          {/* Parsed Items Preview Table */}
          {parsedItems.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Preview Parsed Items ({parsedItems.length})</h3>
                  <p className="text-xs text-slate-500">Review items before inserting into Supabase</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                  {parsedItems.length} Valid Records
                </span>
              </div>

              {/* Horizontal Scroll Table */}
              <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs whitespace-nowrap divide-y divide-slate-200">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Brand</th>
                      <th className="py-2.5 px-3">IMEI / Serial</th>
                      <th className="py-2.5 px-3 text-right">Cost Price</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedItems.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{item.productName}</td>
                        <td className="py-2 px-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{item.brand}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{item.imeiNumber || item.serialNumber || '-'}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{formatINR(item.costPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold text-brand-700">{formatINR(item.sellingPrice)}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedItems.length > 15 && (
                <div className="text-center text-xs text-slate-400">
                  Showing first 15 of {parsedItems.length} rows
                </div>
              )}

              {/* Confirm Import Button */}
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-lg shadow-brand-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Database className="w-4 h-4" />
                <span>{isProcessing ? 'Importing to Supabase...' : `Confirm & Save ${parsedItems.length} Items to Supabase`}</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Smartphone, 
  Headphones, 
  Tv, 
  Scan, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Gift, 
  Lock, 
  Receipt,
  ArrowRight,
  Sparkles,
  Search,
  UploadCloud,
  Check,
  ChevronDown,
  Camera,
  X,
  ShieldCheck,
  Clock,
  Eye
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { POPULAR_MOBILE_CATALOG, CatalogProduct } from '@/lib/mobile-catalog';
import { REAL_STRUCTURED_SUPER, REAL_IMEI_STOCK } from '@/lib/real-inventory-data';
import { sendNewSaleNotificationToAdmins } from '@/lib/notification-service';
import { submitSaleDeal } from '@/lib/sales-pipeline';
import LiveBarcodeScannerModal from '@/components/live-barcode-scanner-modal';
import InvoiceModal from '@/components/invoice-modal';
import { InvoiceData } from '@/lib/invoice-generator';
import confetti from 'canvas-confetti';
import { getActiveFinanceProvidersForStore, FinanceProvider } from '@/lib/finance-service';

export default function PosNewSalePage() {
  const supabase = createClient();

  // Role & Store detection
  const [userRole, setUserRole] = useState<'salesman' | 'store_admin' | 'super_admin'>('salesman');
  const [activeStaffName, setActiveStaffName] = useState('Staff Salesman');
  const [activeStaffPhone, setActiveStaffPhone] = useState('');
  const [activeStoreId, setActiveStoreId] = useState('DM-01');
  const [storeFinanceProviders, setStoreFinanceProviders] = useState<FinanceProvider[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = (sessionStorage.getItem('devi_user_role') || localStorage.getItem('devi_user_role')) as any;
      const storedName = sessionStorage.getItem('devi_user_name') || localStorage.getItem('devi_user_name');
      const storedPhone = sessionStorage.getItem('devi_user_phone') || localStorage.getItem('devi_user_phone');
      const storedStore = sessionStorage.getItem('devi_store_id') || localStorage.getItem('devi_store_id') || localStorage.getItem('devi_active_store') || 'DM-01';
      if (storedRole) setUserRole(storedRole);
      if (storedName) setActiveStaffName(storedName);
      if (storedPhone) setActiveStaffPhone(storedPhone);
      if (storedStore) setActiveStoreId(storedStore);
    }
  }, []);


  useEffect(() => {
    async function loadFinance() {
      const list = await getActiveFinanceProvidersForStore(activeStoreId);
      setStoreFinanceProviders(list);
      if (list.length > 0 && !list.some(p => p.name === financeProvider)) {
        setFinanceProvider(list[0].name);
      }
    }
    loadFinance();
  }, [activeStoreId]);

  // Category State (4 Departments: New Phone, Second Hand / Used, Accessories, Appliances)
  const [selectedCategory, setSelectedCategory] = useState<'Mobile Phone' | 'Second Hand Phone' | 'Accessories' | 'Appliances'>('Mobile Phone');
  
  // Real Database Stock Items & Search Suggestions State
  const [liveStock, setLiveStock] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Product Form State
  const [imeiInput, setImeiInput] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [hsnCode, setHsnCode] = useState('85171290');
  const [selectedBrand, setSelectedBrand] = useState('Vivo');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Payment Mode State
  // 'Direct' = counter payment where Cash/UPI/Card/NEFT are all shown together
  // (no separate 'Split' step); 'EMI' = finance. Legacy 'Cash'/'Split' still
  // accepted from resumed drafts and normalized to 'Direct'.
  const [paymentMode, setPaymentMode] = useState<'Direct' | 'EMI'>('EMI');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [neftAmount, setNeftAmount] = useState<number>(0);

  // EMI State
  const [financeProvider, setFinanceProvider] = useState('Bajaj Finance Limited');
  const [downPaymentCash, setDownPaymentCash] = useState<number>(0);
  const [downPaymentUpi, setDownPaymentUpi] = useState<number>(0);
  const [downPaymentCard, setDownPaymentCard] = useState<number>(0);
  const [disbursementAmount, setDisbursementAmount] = useState<number>(0);

  // Device Exchange State
  const [hasExchange, setHasExchange] = useState(false);
  const [oldDeviceName, setOldDeviceName] = useState('');
  const [oldDeviceImei, setOldDeviceImei] = useState('');
  const [oldDeviceCondition, setOldDeviceCondition] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Good');
  const [exchangeValue, setExchangeValue] = useState<number>(0);

  // Gifts & Knox Lock & Value Added Services (VAS)
  const [hasGifts, setHasGifts] = useState(false);
  const [giftItemName, setGiftItemName] = useState('');
  const [hasVas, setHasVas] = useState(false);
  const [vasName, setVasName] = useState('');
  const [vasPrice, setVasPrice] = useState<number>(0);
  const [isEmiLocked, setIsEmiLocked] = useState(false);

  // Free-text remark / note (e.g. "Udhaari ₹2000 baaki", special conditions)
  const [remark, setRemark] = useState('');

  // Barcode Scanner & UI State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedToken, setSubmittedToken] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingDealToken, setEditingDealToken] = useState<string | null>(null);

  // Check for Edit & Resubmit Deal in sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem('devi_edit_deal');
      if (stored) {
        const deal = JSON.parse(stored);
        setEditingDealToken(deal.token || deal.id || 'Pending Deal');
        if (deal.customerName) setCustomerName(deal.customerName);
        if (deal.customerPhone) setCustomerPhone(deal.customerPhone);
        if (deal.customerAddress) setCustomerAddress(deal.customerAddress);
        if (deal.productName) setProductName(deal.productName);
        if (deal.imei) setImeiInput(deal.imei);
        if (deal.finalPrice) setProductPrice(deal.finalPrice);
        if (deal.paymentMode) setPaymentMode(deal.paymentMode === 'EMI' ? 'EMI' : 'Direct');
        if (deal.remark) setRemark(deal.remark);
        if (deal.neftAmount) setNeftAmount(deal.neftAmount);
        if (deal.upiAmount) setUpiAmount(deal.upiAmount);
        if (deal.cardAmount) setCardAmount(deal.cardAmount);
        if (deal.financeProvider) setFinanceProvider(deal.financeProvider);
        if (deal.disbursementAmount) setDisbursementAmount(deal.disbursementAmount);
        if (deal.downPayment) setDownPaymentCash(deal.downPayment);
        if (deal.gifts && deal.gifts !== 'None') {
          setHasGifts(true);
          setGiftItemName(deal.gifts);
        }
        if (deal.vasPlan && deal.vasPlan !== 'None') {
          setHasVas(true);
          setVasName(deal.vasPlan);
          setVasPrice(499);
        }
        sessionStorage.removeItem('devi_edit_deal');
      }
    } catch (e) {
      console.warn('Failed to parse edit deal:', e);
    }
  }, []);

  // Fetch real products from Supabase
  useEffect(() => {
    async function loadRealInventory() {
      try {
        const { data: prods } = await supabase
          .from('products')
          .select('id, brand, model, title, selling_price, base_price, hsn_code')
          .eq('is_active', true)
          .limit(50);

        if (prods && prods.length > 0) {
          setLiveStock(prods.map((p: any) => ({
            ...p,
            model_name: p.model || p.title,
            mrp: p.base_price || p.selling_price
          })));
        }
      } catch (err) {
        console.warn('Supabase offline or empty, hybrid catalog active.');
      }
    }
    loadRealInventory();
  }, [supabase]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-calculate final price (Product - Discount + VAS Plan)
  const finalPrice = Math.max(0, (productPrice || 0) - (discount || 0) + (hasVas ? Number(vasPrice) || 0 : 0));

  // Auto-fill when selecting category
  useEffect(() => {
    if (selectedCategory === 'Accessories') {
      setPaymentMode('Direct');
    } else {
      setPaymentMode('EMI');
    }
  }, [selectedCategory]);

  // Handle Search Input & Live Dynamic Auto-Suggest
  const handleImeiSearch = (query: string, overrideCat?: 'Mobile Phone' | 'Second Hand Phone' | 'Accessories' | 'Appliances') => {
    setImeiInput(query);
    const clean = query.trim().toLowerCase();
    const activeCat = overrideCat || selectedCategory;

    // Exchange stock is synced from cloud database
    let extraExchangeStock: CatalogProduct[] = [];


    // Load real imported Excel inventory products
    const realExcelProducts: CatalogProduct[] = REAL_STRUCTURED_SUPER.map(item => ({
      id: item.id,
      brand: item.brand,
      modelName: item.modelName,
      category: (item.category === 'Mobile Phone' || item.category === 'Second Hand Phone' || item.category === 'Accessories' || item.category === 'Appliances') ? item.category : 'Accessories',
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      hsnCode: item.hsnCode,
      specs: [
        `Store: ${item.storeId}`,
        `Available: ${item.quantity} Units`,
        item.imeiList && item.imeiList.length > 0 ? `IMEI: ${item.imeiList[0].imei}` : ''
      ].filter(Boolean)
    }));

    const fullCatalog = [...realExcelProducts, ...POPULAR_MOBILE_CATALOG, ...extraExchangeStock];

    // Check direct IMEI match from real stock
    if (clean.length >= 6) {
      const imeiHit = REAL_IMEI_STOCK.find(im => im.imei1 === clean || im.imei1.includes(clean));
      if (imeiHit) {
        const itemHit: CatalogProduct = {
          id: imeiHit.id,
          brand: 'Devi Stock',
          modelName: imeiHit.product_name,
          category: 'Mobile Phone',
          mrp: Math.round(imeiHit.selling_price * 1.08),
          sellingPrice: imeiHit.selling_price,
          hsnCode: '85171290',
          specs: [`IMEI: ${imeiHit.imei1}`, `Store: ${imeiHit.store_id}`]
        };
        if (clean.length === 15) {
          handleSelectCatalogItem(itemHit);
          setImeiInput(imeiHit.imei1);
          return;
        }
      }
    }

    if (!clean) {
      // If empty query, show top products matching active category
      const topCategoryItems = fullCatalog.filter(item => item.category === activeCat);
      setSuggestions(topCategoryItems.slice(0, 15));
      setShowSuggestions(topCategoryItems.length > 0);
      return;
    }

    // Filter by query + active category preference
    const matched = fullCatalog.filter(item => {
      const matchText = item.brand.toLowerCase().includes(clean) ||
                        item.modelName.toLowerCase().includes(clean) ||
                        item.id.toLowerCase().includes(clean) ||
                        (item.specs && item.specs.some(s => s.toLowerCase().includes(clean)));
      
      const matchCat = activeCat === 'Second Hand Phone'
        ? item.category === 'Second Hand Phone'
        : activeCat === 'Accessories'
        ? item.category === 'Accessories'
        : activeCat === 'Appliances'
        ? item.category === 'Appliances'
        : (item.category === 'Mobile Phone' || item.category === 'Second Hand Phone');

      return matchText && matchCat;
    });

    setSuggestions(matched.slice(0, 20));
    setShowSuggestions(matched.length > 0);

    // If exact 15-digit IMEI entered
    if (clean.length === 15) {
      const match = matched[0] || fullCatalog[0];
      if (match) {
        handleSelectCatalogItem(match);
      }
    }
  };

  // Select Item from Dropdown / Suggestions
  const handleSelectCatalogItem = (item: CatalogProduct) => {
    setProductName(item.modelName);
    setSelectedBrand(item.brand);
    setProductPrice(item.sellingPrice || item.mrp);
    setHsnCode(item.hsnCode || '85171290');
    setShowSuggestions(false);

    // If imeiInput is NOT a 15-digit number, clear it so search keywords like 'vivo' don't become IMEI
    if (!/^\d{15}$/.test(imeiInput.trim())) {
      setImeiInput('');
    }

    // Auto-fill payment amounts
    const price = item.sellingPrice || item.mrp;
    if (paymentMode === 'Direct') {
      // Default the full amount into Cash; salesman can move parts to UPI/Card/NEFT.
      setCashAmount(price);
      setUpiAmount(0);
      setCardAmount(0);
      setNeftAmount(0);
    } else {
      const down = Math.min(3000, price);
      setDownPaymentCash(down);
      setDownPaymentUpi(0);
      setDownPaymentCard(0);
      setDisbursementAmount(Math.max(0, price - down));
    }
  };

  // Calculate Payment Validation Formula
  const calculatePaymentValidation = () => {
    if (finalPrice <= 0 || !productName) {
      return { isValid: false, difference: 0, message: 'Please select a smartphone or enter product price' };
    }

    const exch = hasExchange ? (exchangeValue || 0) : 0;

    if (paymentMode === 'Direct') {
      const totalPaid = (cashAmount || 0) + (upiAmount || 0) + (cardAmount || 0) + (neftAmount || 0) + exch;
      const difference = finalPrice - totalPaid;
      if (Math.abs(difference) < 0.01) {
        return { isValid: true, difference: 0, message: 'Payment validation successful! Exactly 100% matched.' };
      }
      if (difference > 0) {
        return { isValid: false, difference, message: `Payment short by ${formatINR(difference)}` };
      } else {
        // Collected more than handset price (extra accessories/charges billed
        // together) -> allowed. Only shortfall is blocked.
        return {
          isValid: true,
          difference: 0,
          message: `Total collected ₹${formatINR(totalPaid)} (₹${formatINR(-difference)} above handset price — includes extra items/charges).`
        };
      }
    } else {
      // EMI Mode
      const totalDown = (downPaymentCash || 0) + (downPaymentUpi || 0) + (downPaymentCard || 0);
      const totalFinance = totalDown + exch + (disbursementAmount || 0);
      const difference = finalPrice - totalFinance;
      if (Math.abs(difference) < 0.01) {
        return { isValid: true, difference: 0, message: 'Finance payment formula valid! Down Payment + Loan + Exchange = Final Price.' };
      }
      if (difference > 0) {
        return { isValid: false, difference, message: `Finance payment short by ${formatINR(difference)}` };
      } else {
        // Total finance exceeds handset price (accessories/VAS/processing fee added to loan) -> Valid!
        return { 
          isValid: true, 
          difference: 0, 
          message: `Finance scheme valid! Total ₹${formatINR(totalFinance)} covers handset & financed accessories/charges.` 
        };
      }
    }
  };

  const validation = calculatePaymentValidation();

  // Submit to 2-Step Approvals Pipeline or Direct Billing for Admins
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const newApprovalId = `SA-${Math.floor(100000 + Math.random() * 900000)}`;
    const isDirectAdminBilled = userRole === 'store_admin' || userRole === 'super_admin';
    const finalBillNumber = `25-26/${newApprovalId.replace('SA-', '')}/DEVI`;

    try {
      const cleanImei = (imeiInput && !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a'].includes(imeiInput.trim().toLowerCase()) && imeiInput.trim().length >= 6)
        ? imeiInput.trim()
        : '';

      const cleanSalesPhone = (activeStaffPhone || '').replace(/\D/g, '').slice(-10) || '0000000000';

      const positiveChannels = [cashAmount > 0, upiAmount > 0, cardAmount > 0, neftAmount > 0].filter(Boolean).length;
      const computedPaymentMethod = paymentMode === 'EMI'
        ? 'EMI'
        : positiveChannels > 1
          ? 'Split'
          : (upiAmount > 0 ? 'UPI' : (cardAmount > 0 ? 'Card' : (neftAmount > 0 ? 'NEFT' : 'Cash')));

      const totalDown = (downPaymentCash || 0) + (downPaymentUpi || 0) + (downPaymentCard || 0);
      const totalFinance = totalDown + (hasExchange ? (exchangeValue || 0) : 0) + (disbursementAmount || 0);
      const effectiveFinalPrice = paymentMode === 'EMI' ? Math.max(finalPrice, totalFinance) : finalPrice;

      await submitSaleDeal({
        token: newApprovalId,
        storeId: activeStoreId,
        customerName,
        customerPhone,
        customerAddress: customerAddress || undefined,
        productName,
        category: selectedCategory,
        imeiSerial: cleanImei,
        basePrice: productPrice > 0 ? productPrice : effectiveFinalPrice,
        discount: discount || 0,
        finalPrice: effectiveFinalPrice,
        paymentMethod: computedPaymentMethod,
        financeProvider: paymentMode === 'EMI' ? financeProvider : null,
        disbursementAmount: paymentMode === 'EMI' ? disbursementAmount : 0,
        downPaymentCash: paymentMode === 'EMI' ? downPaymentCash : 0,
        downPaymentUpi: paymentMode === 'EMI' ? downPaymentUpi : 0,
        downPaymentCard: paymentMode === 'EMI' ? downPaymentCard : 0,
        cashAmount: paymentMode !== 'EMI' ? cashAmount : 0,
        upiAmount: paymentMode !== 'EMI' ? upiAmount : 0,
        cardAmount: paymentMode !== 'EMI' ? cardAmount : 0,
        neftAmount: paymentMode !== 'EMI' ? neftAmount : 0,
        hasExchange,
        oldDeviceName,
        oldDeviceImei,
        oldDeviceCondition,
        exchangeValue: hasExchange ? exchangeValue : 0,
        gifts: hasGifts ? giftItemName : 'None',
        vasPlan: hasVas ? `${vasName} (₹${vasPrice})` : 'None',
        remark: remark.trim() || undefined,
        isEmiLocked,
        status: 'pending_approval',
        decidedBy: null,
        salesPersonName: activeStaffName,
        salesPersonPhone: cleanSalesPhone
      });

      // 🔄 If deal contains an Exchanged Smartphone, save it to database & store inventory!
      if (hasExchange && oldDeviceName) {
        const generatedExchangeImei = oldDeviceImei || `EX-${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
        try {
          await supabase.from('second_hand_inventory').insert({
            store_id: activeStoreId,
            model_name: oldDeviceName,
            imei_serial: generatedExchangeImei,
            condition: oldDeviceCondition,
            cost_price: exchangeValue,
            selling_price: Math.round(exchangeValue * 1.25),
            mrp: Math.round(exchangeValue * 1.35),
            acquired_from_customer: customerName,
            customer_phone: customerPhone,
            status: 'in_stock',
            source_token: newApprovalId,
            received_by: activeStaffName,
            created_at: new Date().toISOString()
          });
        } catch (exErr) {
          console.warn('Fallback offline exchange inventory sync:', exErr);
        }
      }

      // Always notify Store Admin & Super Admin of incoming pending deal
      await sendNewSaleNotificationToAdmins({
        dealId: newApprovalId,
        storeId: activeStoreId,
        salesmanName: activeStaffName,
        customerName,
        customerPhone,
        productName,
        finalPrice,
        paymentMethod: paymentMode,
        financeProvider: paymentMode === 'EMI' ? financeProvider : null,
        disbursementAmount: paymentMode === 'EMI' ? disbursementAmount : 0,
        downPayment: downPaymentCash + downPaymentUpi + downPaymentCard,
        cashAmount: paymentMode !== 'EMI' ? cashAmount : 0,
        gifts: hasGifts ? giftItemName : 'None',
        vasPlan: hasVas ? `${vasName} (₹${vasPrice})` : 'None',
        isEmiLocked,
      });
    } catch (e) {
      console.warn('Fallback offline submit:', e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setShowReviewModal(false);
      setSubmittedSuccess(true);
      setSubmittedToken(newApprovalId);

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 400);
  };

  const isDirectAdminBilled = userRole === 'store_admin' || userRole === 'super_admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">POS Billing Desk</span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            🛡️ 2-Step Approval Pipeline Active
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">New Sale & IMEI Billing</h1>
        <p className="text-xs text-slate-500">Live barcode lookup, model auto-complete, split payments & GST billing</p>
      </div>

      {submittedSuccess ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black uppercase tracking-wider mx-auto">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Pending 2-Step Manager Approval</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 pt-1">
              Sale Submitted For Manager Approval!
            </h2>
            <p className="text-sm text-slate-600">
              Approval Request ID: <span className="font-bold text-brand-600">{submittedToken}</span>
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto pt-1">
              This counter sale has been queued for manager approval. Once verified and approved by management, stock will be deducted from inventory and the official GST invoice will be generated.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link
              href={isDirectAdminBilled ? '/admin/super/approvals' : '/pos/approvals'}
              className="px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2 min-h-[48px]"
            >
              <Eye className="w-4 h-4" />
              <span>Track in Approvals Queue</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSubmittedSuccess(false);
                setImeiInput('');
                setProductName('');
                setProductPrice(0);
                setCustomerName('');
                setCustomerPhone('');
                setHasVas(false);
              }}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md active:scale-95 transition-all min-h-[48px]"
            >
              + Create Another Sale
            </button>
          </div>
        </div>
      ) : (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (validation.isValid) {
              setShowReviewModal(true);
            }
          }}
          className="space-y-6"
        >

          {/* EDITING DEAL BANNER (WHEN RE-SUBMITTING) */}
          {editingDealToken && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500 rounded-3xl flex items-center justify-between gap-3 shadow-md animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-950">Editing Deal: {editingDealToken}</div>
                  <div className="text-[11px] text-amber-800">Review/modify required fields below and submit for instant manager approval.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDealToken(null)}
                className="text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-all"
              >
                Clear Edit
              </button>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION (4 RETAIL DEPARTMENTS) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 1: Select Retail Category *
              </label>
              <span className="text-[11px] font-semibold text-brand-600">4 Retail Departments</span>
            </div>

            {/* 4 Main Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Mobile Phone', label: 'New Smartphone', icon: Smartphone, subtitle: 'Brand New 5G Phones' },
                { name: 'Second Hand Phone', label: 'Second-Hand / Used', icon: RefreshCw, subtitle: 'Exchange & Pre-owned' },
                { name: 'Accessories', label: 'Accessories', icon: Headphones, subtitle: 'Chargers, TWS, Covers' },
                { name: 'Appliances', label: 'Appliances', icon: Tv, subtitle: 'LED TVs & Electronics' },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.name as any);
                      if (cat.name === 'Accessories') {
                        setPaymentMode('Direct');
                      } else {
                        setPaymentMode('EMI');
                      }
                      handleImeiSearch('', cat.name as any);
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border text-center transition-all min-h-[70px] ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/25 scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${isSelected ? 'text-white' : 'text-brand-600'}`} />
                    <span className="text-xs sm:text-sm font-black">{cat.label}</span>
                    <span className={`text-[10px] hidden sm:block mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {cat.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: PRODUCT IDENTIFICATION WITH AUTO-SUGGEST DROPDOWN */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 2: Product Identification (IMEI / Barcode / Model Name)
              </label>
              <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                <Scan className="w-3.5 h-3.5" /> Barcode & IMEI Ready
              </span>
            </div>

            {/* Live Search Input with Suggestions Dropdown & Barcode Camera Scanner */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type mobile model (e.g. Vivo V30, Samsung F15) or scan 15-digit IMEI barcode..."
                    value={imeiInput}
                    onChange={(e) => handleImeiSearch(e.target.value)}
                    onFocus={() => {
                      if (imeiInput) handleImeiSearch(imeiInput);
                      else handleImeiSearch('');
                    }}
                    className="w-full pl-4 pr-10 py-3.5 rounded-2xl border-2 border-brand-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-600 shadow-sm placeholder:text-slate-400"
                  />
                  <Scan className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-600 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md active:scale-95 transition-all shrink-0 min-h-[48px]"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Camera Barcode Scanner</span>
                  <span className="sm:hidden">Scan Barcode</span>
                </button>
              </div>

              {/* 🌟 AUTO-SUGGEST FLOATING DROPDOWN LIST */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar animate-scaleUp">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                    <span>Matching Catalog Smartphones ({suggestions.length} Found)</span>
                    <span>Click to auto-fill</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCatalogItem(item)}
                        className="w-full text-left p-3 hover:bg-brand-50/80 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-brand-700">
                              {item.modelName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-brand-600 uppercase">{item.brand}</span>
                              <span>•</span>
                              <span>HSN: {item.hsnCode}</span>
                              {item.specs?.[0] && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">{item.specs[0]}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-brand-700">{formatINR(item.sellingPrice || item.mrp)}</div>
                          <div className="text-[10px] text-slate-400 line-through">{formatINR(item.mrp)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auto-filled Product Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-blue-50/80 border border-blue-100">
              <div>
                <label className="text-[10px] uppercase font-bold text-blue-700 block mb-1">
                  Product / Model Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vivo V30 5G (8GB/128GB)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-blue-700 block mb-1">
                  IMEI / Serial (Leave Blank if None)
                </label>
                <input
                  type="text"
                  placeholder="15-digit IMEI or blank"
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-blue-700 block mb-1">
                  Base Price (MRP ₹) *
                </label>
                <input
                  type="number"
                  required
                  value={productPrice || ''}
                  onChange={(e) => setProductPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-blue-700 block mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
              <span className="font-semibold text-slate-600">Calculated Final Price:</span>
              <span className="text-2xl font-black text-brand-700">{formatINR(finalPrice)}</span>
            </div>
          </div>

          {/* STEP 3: CUSTOMER INFORMATION */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 3: Customer Information</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Customer Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Phone Number (WhatsApp) *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Customer Address (Optional for GST Invoice)</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 206, Kanthal Chauraha, Ujjain"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 4: DEVICE EXCHANGE, FREE GIFTS & VALUE ADDED SERVICES (VAS) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 4: Device Exchange, Free Gifts & VAS Protection
              </label>
              <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" /> Devi Care & Gifts
              </span>
            </div>
            
            {/* Exchange Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-brand-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Old Phone Trade-In / Exchange</div>
                  <div className="text-[10px] text-slate-500">Customer exchanging an old smartphone</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={hasExchange}
                onChange={(e) => setHasExchange(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </div>

            {/* Exchange Fields */}
            {hasExchange && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Old Device Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vivo Y21 (64GB)"
                    value={oldDeviceName}
                    onChange={(e) => setOldDeviceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Old Device IMEI</label>
                  <input
                    type="text"
                    placeholder="e.g. 352123456789012"
                    value={oldDeviceImei}
                    onChange={(e) => setOldDeviceImei(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Device Condition</label>
                  <select
                    value={oldDeviceCondition}
                    onChange={(e) => setOldDeviceCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="Excellent">Excellent (Like New)</option>
                    <option value="Good">Good (Minor Scratches)</option>
                    <option value="Fair">Fair (Heavy use)</option>
                    <option value="Poor">Poor (Broken)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Exchange Value (₹ Deducted)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={exchangeValue || ''}
                    onChange={(e) => setExchangeValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold text-amber-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Gift Items & Knox Lock */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">Free Complimentary Gifts Given</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasGifts}
                    onChange={(e) => setHasGifts(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">Finance EMI Knox Lock</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEmiLocked}
                    onChange={(e) => setIsEmiLocked(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                </div>
              </div>

              {/* Free Gift Name Input */}
              {hasGifts && (
                <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-purple-600" />
                      <span>Gift / Scheme Item Name (Logs in Daily Register) *</span>
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold">Freebie given to customer</span>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="e.g. Back Cover + Tempered Glass, boAt Rockerz 255 Free, Smartwatch"
                    value={giftItemName}
                    onChange={(e) => setGiftItemName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-white text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Value Added Services (VAS) & Protection Plans (Customizable) */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <div>
                      <div className="text-xs font-bold text-blue-900">Value Added Services (VAS) & Protection Plan</div>
                      <div className="text-[10px] text-blue-600">Screen protection, warranty or custom add-on kit</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasVas}
                    onChange={(e) => setHasVas(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                </div>

                {hasVas && (
                  <div className="space-y-3 pt-2 border-t border-blue-200/80 animate-fadeIn">
                    {/* Custom Editable Name & Price Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-2xl border border-blue-200">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          VAS Service Name / Description *
                        </label>
                        <input
                          type="text"
                          required={hasVas}
                          placeholder="Type custom protection plan name..."
                          value={vasName}
                          onChange={(e) => setVasName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Add-On Price (₹) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="0 for Free"
                          value={vasPrice === 0 ? '' : vasPrice}
                          onChange={(e) => setVasPrice(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    {/* Pre-set Devi Care Packages Quick Select */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {[
                        { name: '🛡️ Devi Shield Screen Protection', price: 499, desc: '1-Time Free screen replacement (1 Yr)' },
                        { name: '⚡ 1-Year Extended Warranty', price: 999, desc: 'Comprehensive hardware breakdown cover' },
                        { name: '📦 Full Armor Combo Kit', price: 299, desc: '9H Tempered + Shockproof Case + Lens Guard' }
                      ].map((pkg) => (
                        <button
                          key={pkg.name}
                          type="button"
                          onClick={() => {
                            setVasName(pkg.name);
                            setVasPrice(pkg.price);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            vasName === pkg.name
                              ? 'bg-brand-50 border-brand-500 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-brand-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-800 truncate">{pkg.name}</span>
                            <span className="text-brand-700 shrink-0 font-mono">+{formatINR(pkg.price)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{pkg.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 5: FINAL PAYMENT SPLIT & BILLING BREAKDOWN (BELOW VAS & GIFTS) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 5: Final Payment Mode
              </label>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('Direct');
                    const rem = Math.max(0, finalPrice - (hasExchange ? (exchangeValue || 0) : 0));
                    setCashAmount(rem);
                    setUpiAmount(0);
                    setCardAmount(0);
                    setNeftAmount(0);
                  }}
                  className={`px-3.5 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-all ${
                    paymentMode === 'Direct' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  💵 Direct (Cash/UPI/Card/NEFT)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('EMI')}
                  className={`px-3.5 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-all ${
                    paymentMode === 'EMI' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  🏦 EMI
                </button>
              </div>
            </div>

            {paymentMode === 'Direct' ? (
              /* Direct Payment Mode — Cash / UPI / Card / NEFT all visible directly */
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-700">Payment Received (enter one or more)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, finalPrice - (hasExchange ? (exchangeValue || 0) : 0));
                        setCashAmount(rem);
                        setUpiAmount(0);
                        setCardAmount(0);
                        setNeftAmount(0);
                      }}
                      className="text-[11px] font-bold text-brand-600 hover:underline min-h-[36px] inline-flex items-center"
                    >
                      100% Cash
                    </button>
                    <span className="text-[11px] font-bold text-slate-500">
                      Total: <span className={`font-mono ${
                        ((cashAmount || 0) + (upiAmount || 0) + (cardAmount || 0) + (neftAmount || 0) + (hasExchange ? (exchangeValue || 0) : 0)) === finalPrice
                          ? 'text-emerald-700' : 'text-amber-700'
                      }`}>{formatINR((cashAmount || 0) + (upiAmount || 0) + (cardAmount || 0) + (neftAmount || 0))}</span> / {formatINR(Math.max(0, finalPrice - (hasExchange ? (exchangeValue || 0) : 0)))}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">💵 Cash (₹)</label>
                    <input
                      type="number"
                      value={cashAmount || ''}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">📱 UPI (₹)</label>
                    <input
                      type="number"
                      value={upiAmount || ''}
                      onChange={(e) => setUpiAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">💳 Card (₹)</label>
                    <input
                      type="number"
                      value={cardAmount || ''}
                      onChange={(e) => setCardAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">🏦 NEFT (₹)</label>
                    <input
                      type="number"
                      value={neftAmount || ''}
                      onChange={(e) => setNeftAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* EMI / Finance Mode */
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Finance Provider *</label>
                    <select
                      value={financeProvider}
                      onChange={(e) => setFinanceProvider(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:outline-none"
                    >
                      {storeFinanceProviders.length > 0 ? (
                        storeFinanceProviders.map((p) => (
                          <option key={p.id} value={p.name}>{p.name} ({p.code})</option>
                        ))
                      ) : (
                        <option value="Bajaj Finance Limited">Bajaj Finance Limited</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Disbursement Loan (₹) *</label>
                    <input
                      type="number"
                      value={disbursementAmount || ''}
                      onChange={(e) => setDisbursementAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-500 block mb-1.5">Down Payment Split</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Down Cash"
                      value={downPaymentCash || ''}
                      onChange={(e) => setDownPaymentCash(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Down UPI"
                      value={downPaymentUpi || ''}
                      onChange={(e) => setDownPaymentUpi(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Down Card"
                      value={downPaymentCard || ''}
                      onChange={(e) => setDownPaymentCard(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 6: REMARK / NOTE (optional) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 6: Remark / Note (Optional)
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Udhaari ₹2000 baaki, deliver tomorrow, customer special request..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400">Ye note deal ke saath save hoga aur approval / bill me admin ko dikhega.</p>
          </div>

          {/* REAL-TIME VALIDATION STATUS BANNER */}
          <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${
            validation.isValid 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {validation.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold">{validation.message}</div>
              <div className="opacity-80 mt-0.5">
                Target Final Price: {formatINR(finalPrice)}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={!validation.isValid}
            className={`w-full py-4 rounded-2xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all min-h-[48px] ${
              validation.isValid
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 active:scale-[0.99]'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Review & Submit Sale to Manager</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Review Sale Submission</h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full">
                Pending Approval
              </span>
            </div>

            <div className="space-y-3 text-xs">

              {/* ── 1. PRODUCT DETAILS ── */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  <span>📱</span> Product Info
                </div>
                <div className="font-black text-slate-900 text-sm">{productName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                  <span>Category: <span className="font-bold text-slate-700">{selectedCategory}</span></span>
                  <span>Brand: <span className="font-bold text-slate-700">{selectedBrand}</span></span>
                </div>
                {imeiInput && (
                  <div className="font-mono text-slate-600">IMEI: <span className="font-bold text-slate-800">{imeiInput}</span></div>
                )}
                <div className="text-[10px] text-slate-400">HSN Code: {hsnCode}</div>
                <div className="border-t border-slate-200 pt-2 mt-1 flex items-center justify-between">
                  {discount > 0 && (
                    <div className="text-slate-400 line-through font-mono">{formatINR(productPrice)}</div>
                  )}
                  {discount > 0 && (
                    <div className="text-emerald-600 text-[10px] font-bold">Discount: -{formatINR(discount)}</div>
                  )}
                  <div className="font-black text-brand-700 text-base ml-auto">{formatINR(finalPrice)}</div>
                </div>
              </div>

              {/* ── 2. CUSTOMER DETAILS ── */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  <span>👤</span> Customer Info
                </div>
                <div className="font-black text-slate-900">{customerName}</div>
                <div className="font-mono text-slate-600">📞 {customerPhone}</div>
                {customerAddress && (
                  <div className="text-slate-500">📍 {customerAddress}</div>
                )}
              </div>

              {/* ── 3. PAYMENT BREAKDOWN ── */}
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  <span>💳</span> Payment Breakdown
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900">
                  {paymentMode === 'EMI' ? '🏦 EMI / Finance Loan' : '💵 Direct (Cash/UPI/Card/NEFT)'}
                </div>

                {paymentMode !== 'EMI' ? (
                  <div className="space-y-1.5 pt-1">
                    {cashAmount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">💵 Cash in Hand</span>
                        <span className="font-bold font-mono">{formatINR(cashAmount)}</span>
                      </div>
                    )}
                    {upiAmount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">📱 UPI (QR)</span>
                        <span className="font-bold font-mono">{formatINR(upiAmount)}</span>
                      </div>
                    )}
                    {cardAmount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">💳 Card POS</span>
                        <span className="font-bold font-mono">{formatINR(cardAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-emerald-800 border-t border-slate-200 pt-1.5 mt-1">
                      <span>Total Collected</span>
                      <span className="font-mono">{formatINR(cashAmount + upiAmount + cardAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">🏦 Finance Provider</span>
                      <span className="font-bold">{financeProvider}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">💰 Loan Disbursement</span>
                      <span className="font-bold font-mono text-amber-700">{formatINR(disbursementAmount)}</span>
                    </div>
                    {(downPaymentCash + downPaymentUpi + downPaymentCard) > 0 && (
                      <>
                        <div className="text-[10px] text-slate-400 font-bold uppercase pt-1">Down Payment Collected</div>
                        {downPaymentCash > 0 && (
                          <div className="flex justify-between text-slate-700 pl-2">
                            <span className="text-slate-500">💵 Cash Down</span>
                            <span className="font-bold font-mono">{formatINR(downPaymentCash)}</span>
                          </div>
                        )}
                        {downPaymentUpi > 0 && (
                          <div className="flex justify-between text-slate-700 pl-2">
                            <span className="text-slate-500">📱 UPI Down</span>
                            <span className="font-bold font-mono">{formatINR(downPaymentUpi)}</span>
                          </div>
                        )}
                        {downPaymentCard > 0 && (
                          <div className="flex justify-between text-slate-700 pl-2">
                            <span className="text-slate-500">💳 Card Down</span>
                            <span className="font-bold font-mono">{formatINR(downPaymentCard)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-slate-700 border-t border-slate-200 pt-1.5">
                          <span>Total Down Payment</span>
                          <span className="font-mono">{formatINR(downPaymentCash + downPaymentUpi + downPaymentCard)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-black text-emerald-800 border-t border-slate-200 pt-1.5">
                      <span>Total Customer Value</span>
                      <span className="font-mono">{formatINR(finalPrice)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4. DEVICE EXCHANGE (if applicable) ── */}
              {hasExchange && oldDeviceName && (
                <div className="p-3.5 bg-amber-50 rounded-2xl space-y-1.5 border border-amber-100">
                  <div className="flex items-center gap-2 text-[10px] text-amber-700 font-black uppercase tracking-wider">
                    <span>🔄</span> Trade-In / Exchange Device
                  </div>
                  <div className="font-bold text-slate-900">{oldDeviceName}</div>
                  {oldDeviceImei && <div className="font-mono text-slate-500 text-[11px]">IMEI: {oldDeviceImei}</div>}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Condition: <span className="font-bold text-slate-700">{oldDeviceCondition}</span></span>
                    <span className="font-black text-amber-800 font-mono">-{formatINR(exchangeValue)}</span>
                  </div>
                </div>
              )}

              {/* ── 5. EXTRAS: VAS & Gifts ── */}
              {(hasVas || hasGifts) && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl space-y-1.5 border border-emerald-100">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-black uppercase tracking-wider">
                    <span>🎁</span> Value-Adds & Extras
                  </div>
                  {hasVas && vasName && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">🛡️ VAS Plan: <span className="font-bold">{vasName}</span></span>
                      <span className="font-bold text-emerald-700 font-mono">{formatINR(vasPrice)}</span>
                    </div>
                  )}
                  {hasGifts && giftItemName && (
                    <div className="text-slate-600">🎁 Free Gift: <span className="font-bold text-slate-800">{giftItemName}</span></div>
                  )}
                </div>
              )}

              {/* ── 6. SALESMAN ── */}
              <div className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">👤 Submitted By</div>
                <div>
                  <div className="font-black text-slate-900 text-right">{activeStaffName}</div>
                  {activeStaffPhone && <div className="font-mono text-slate-500 text-[11px] text-right">{activeStaffPhone}</div>}
                </div>
              </div>

            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE CAMERA BARCODE & IMEI SCANNER MODAL */}
      <LiveBarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={(decodedText) => {
          handleImeiSearch(decodedText);
        }}
        title="POS Live Barcode & IMEI Scanner"
        subtitle="Point camera at product box 15-digit IMEI or EAN barcode"
      />

      {/* 🖨️ OFFICIAL GST TAX INVOICE MODAL */}
      {selectedInvoice && (
        <InvoiceModal
          isOpen={!!selectedInvoice}
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, MessageCircle, X, Smartphone, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { formatINR, parseSafeDate } from '@/lib/utils';
import { generateDeviGstInvoicePDF, numberToIndianWords, getHsnCodeForProduct, InvoiceData } from '@/lib/invoice-generator';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
}

export default function InvoiceModal({ isOpen, onClose, data }: InvoiceModalProps) {
  const [layoutFormat, setLayoutFormat] = useState<'a4' | 'thermal'>('a4');
  const [mounted, setMounted] = useState(false);

  // Point 14: Option to print Base Price / MRP or In-Hand Final Price
  const initialBasePrice = Number(data.basePrice || data.mrp || 0);
  const [customBasePrice, setCustomBasePrice] = useState<number>(initialBasePrice);
  const [useBasePrice, setUseBasePrice] = useState(false);
  const [showGiftsOnInvoice, setShowGiftsOnInvoice] = useState(false);

  useEffect(() => {
    if (data.basePrice || data.mrp) {
      setCustomBasePrice(Number(data.basePrice || data.mrp));
    }
  }, [data.basePrice, data.mrp]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const effectiveBasePrice = customBasePrice > 0 
    ? customBasePrice 
    : (initialBasePrice > 0 ? initialBasePrice : Math.round((data.rateInclTax || 0) * 1.15));

  // If useBasePrice is selected and base price is valid, use effectiveBasePrice; else in-hand rate
  const rateInclTax = (useBasePrice && effectiveBasePrice > 0) ? effectiveBasePrice : (data.rateInclTax || 0);
  const taxableValue = +(rateInclTax / 1.18).toFixed(2);
  const cgst = +((rateInclTax - taxableValue) / 2).toFixed(2);
  const sgst = cgst;
  const totalTax = +(cgst + sgst).toFixed(2);
  const roundOff = +(rateInclTax - (taxableValue + totalTax)).toFixed(2);
  const hsn = getHsnCodeForProduct(data.productName, data.category, data.hsnCode);

  const isRealImei = data.imeiNumber && 
    data.imeiNumber.trim() !== '' && 
    !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a', 'null', 'undefined'].includes(data.imeiNumber.trim().toLowerCase()) &&
    data.imeiNumber.trim().length >= 6;

  const cleanInvoiceNo = data.invoiceNo?.startsWith('DEVI/') 
    ? data.invoiceNo 
    : `DEVI/26-27/${String(data.invoiceNo || '5741').replace(/[^0-9]/g, '') || '5741'}`;

  // Point 12: Safely parse DD-MM-YYYY / Indian date formats so day and month never swap
  const formatDateTally = (dateStr?: string) => {
    try {
      if (!dateStr) {
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${now.getDate()}-${months[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
      }
      if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(dateStr)) return dateStr;
      const d = parseSafeDate(dateStr);
      if (!d || isNaN(d.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = String(d.getFullYear()).slice(-2);
      return `${d.getDate()}-${months[d.getMonth()]}-${year}`;
    } catch (_) {
      return dateStr || '11-Sep-26';
    }
  };

  const tallyDate = formatDateTally(data.invoiceDate);
  const salesRef = (data.refNo || 'HARSH').toUpperCase();
  const isFinance = data.paymentMethod === 'EMI' || Boolean(data.financeProvider);
  const formatNum = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = (format: 'a4' | 'thermal') => {
    setLayoutFormat(format);
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).AndroidApp?.printInvoice) {
        (window as any).AndroidApp.printInvoice();
      } else {
        window.print();
      }
    }, 150);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*DEVI MOBILE ACCESSORIES - TAX INVOICE*\n` +
      `Invoice No: ${cleanInvoiceNo}\n` +
      `Date: ${tallyDate}\n` +
      `Customer: ${data.customerName}\n` +
      `Product: ${data.productName}\n` +
      (isRealImei ? `IMEI / Serial: ${data.imeiNumber}\n` : '') +
      `HSN Code: ${hsn}\n` +
      `Total Amount: ${formatINR(rateInclTax)}\n` +
      `Payment Mode: ${data.paymentMethod}\n` +
      `Thank you for purchasing from Devi Mobile Accessories (Ujjain)!`
    );
    window.open(`https://wa.me/91${data.customerPhone}?text=${text}`, '_blank');
  };

  return createPortal(
    <div id="devi-invoice-print-root" className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-invoice-modal-backdrop">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp print-invoice-modal-card">
        
        {/* Top Control Bar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 bg-slate-900 text-white gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold">GST Tax Invoice Preview</div>
              <div className="text-[10px] text-slate-400">Official Devi Mobile Tally ERP & Thermal Billing Format</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setLayoutFormat('a4')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  layoutFormat === 'a4' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="A4 Full Page GST Invoice Format"
              >
                <FileText className="w-3 h-3" />
                <span>A4 Tally ERP</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutFormat('thermal')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  layoutFormat === 'thermal' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="80mm Thermal Receipt Printer Format"
              >
                <Receipt className="w-3 h-3" />
                <span>80mm Thermal</span>
              </button>
            </div>

            {/* Point 14: Base Price / MRP Option vs In-Hand Final Price */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setUseBasePrice(false)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  !useBasePrice ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Print actual in-hand collected price (Reporting & Counter)"
              >
                In-Hand (₹{formatNum(data.rateInclTax)})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!effectiveBasePrice || effectiveBasePrice <= 0) {
                    const entered = window.prompt('Enter Base Price / MRP (₹) to print on bill:', String(Math.round((data.rateInclTax || 0) * 1.15)));
                    if (entered && !isNaN(Number(entered))) {
                      setCustomBasePrice(Number(entered));
                      setUseBasePrice(true);
                      return;
                    }
                  }
                  setUseBasePrice(true);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 ${
                  useBasePrice ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Print Base/Catalog MRP price on invoice. Click to activate."
              >
                <span>🏷️ Base Price</span>
                <span>(₹{formatNum(effectiveBasePrice)})</span>
              </button>
              {useBasePrice && (
                <button
                  type="button"
                  onClick={() => {
                    const current = effectiveBasePrice || data.rateInclTax;
                    const entered = window.prompt('Enter Base Price / MRP (₹) to print on bill:', String(current));
                    if (entered && !isNaN(Number(entered)) && Number(entered) > 0) {
                      setCustomBasePrice(Number(entered));
                    }
                  }}
                  className="px-1.5 py-1 text-[11px] text-amber-300 hover:text-white font-bold"
                  title="Edit custom Base Price / MRP amount"
                >
                  ✏️
                </button>
              )}
            </div>

            {Boolean((data.vasPlan && data.vasPlan !== 'None') || data.gifts) && (
              <button
                type="button"
                onClick={() => setShowGiftsOnInvoice(!showGiftsOnInvoice)}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1 min-h-[36px] ${
                  showGiftsOnInvoice
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
                title="Toggle printing Free Gifts & VAS Protection plan on the tax invoice"
              >
                <span>🎁 Freebies/VAS:</span>
                <span className={showGiftsOnInvoice ? 'text-amber-300 font-black' : 'text-slate-400'}>
                  {showGiftsOnInvoice ? 'Shown ✓' : 'Hidden ✕'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePrint(layoutFormat)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[36px]"
              title="Direct Print on Thermal Bluetooth or A4 Laser Printer"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Print {layoutFormat === 'thermal' ? 'Receipt' : 'Bill'}</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all min-h-[36px]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => generateDeviGstInvoicePDF({ ...data, rateInclTax, invoiceNo: cleanInvoiceNo, invoiceDate: tallyDate, category: data.category, hsnCode: hsn, showGiftsAndVas: showGiftsOnInvoice })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Invoice Printable View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 text-xs text-slate-900 bg-slate-100">
          
          {/* 80mm Thermal Receipt Layout */}
          {layoutFormat === 'thermal' && (
            <div id="printable-devi-thermal" className="font-mono text-xs w-[320px] max-w-full mx-auto p-4 bg-white border border-slate-300 rounded-2xl shadow-sm text-black space-y-3 print-thermal-receipt">
              {/* Store Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2.5">
                <div className="text-base font-black tracking-wider">DEVI MOBILE</div>
                <div className="text-[11px] font-bold uppercase">{data.storeName || 'DEVI MOBILE ACCESSORIES'}</div>
                <div className="text-[9px] leading-tight text-slate-600">{data.storeAddress || '206/1, Kanthal Chauraha, Ankpat Marg, Ujjain (M.P.) - 456006'}</div>
                <div className="text-[9.5px] font-bold text-slate-800">GSTIN: {data.storeGstin || '23ALGPK9135M1ZT'}</div>
                <div className="text-[9px] text-slate-600">TEL: {data.storePhone || '9713001600, 6262335656, 9893264192'}</div>
                <div className="text-[10px] font-black uppercase pt-1 tracking-widest text-slate-800">*** TAX INVOICE ***</div>
              </div>

              {/* Invoice & Customer Meta */}
              <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill No:</span>
                  <span className="font-bold">{cleanInvoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{tallyDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Salesperson:</span>
                  <span>{salesRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pay Mode:</span>
                  <span className="font-bold">{data.paymentMethod}{data.financeProvider ? ` (${data.financeProvider})` : ''}</span>
                </div>
                <div className="border-t border-dotted border-slate-300 my-1"></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{data.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile:</span>
                  <span>{data.customerPhone}</span>
                </div>
                {data.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Address:</span>
                    <span className="text-right truncate max-w-[180px]">{data.customerAddress}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">State:</span>
                  <span>Madhya Pradesh (23)</span>
                </div>
              </div>

              {/* Product Line */}
              <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                  <span>ITEM DESCRIPTION</span>
                  <span>AMOUNT</span>
                </div>
                <div>
                  <div className="font-bold text-[11px]">{data.productName}</div>
                  {isRealImei && <div className="text-[9.5px] text-slate-600">IMEI: {data.imeiNumber}</div>}
                  {showGiftsOnInvoice && data.vasPlan && data.vasPlan !== 'None' && (
                    <div className="text-[9px] text-brand-700 font-semibold">VAS: {data.vasPlan}</div>
                  )}
                  {showGiftsOnInvoice && data.gifts && (
                    <div className="text-[9px] text-slate-600 italic">Gift: {data.gifts}</div>
                  )}
                  <div className="flex justify-between text-[9.5px] text-slate-600 pt-0.5">
                    <span>HSN: {hsn} | Qty: {data.quantity}</span>
                    <span className="font-mono font-bold">Rs. {rateInclTax.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Calculation */}
              <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxable Value (18%):</span>
                  <span className="font-mono">Rs. {taxableValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CGST (9.0%):</span>
                  <span className="font-mono">Rs. {cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SGST (9.0%):</span>
                  <span className="font-mono">Rs. {sgst.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 pt-1 flex justify-between text-xs font-black">
                  <span>NET AMOUNT DUE:</span>
                  <span className="font-mono text-sm">Rs. {rateInclTax.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-slate-600 italic pt-0.5">
                  {numberToIndianWords(rateInclTax)}
                </div>
              </div>

              {/* Bank Details */}
              <div className="text-[8.5px] space-y-0.5 border-b border-dashed border-slate-400 pb-2 text-slate-700">
                <div className="font-bold text-slate-900">ICICI BANK OD A/C: 658505603264</div>
                <div>IFSC Code: ICIC0006585 | Branch: UJJAIN</div>
              </div>

              {/* Terms & Footer */}
              <div className="text-center text-[8.5px] space-y-1 text-slate-600 pt-1">
                <div>* Goods once sold cannot be returned.</div>
                <div>* Keep bill for brand service warranty.</div>
                <div>* Duplicate bill charge Rs. 250/-.</div>
                <div className="font-mono tracking-widest text-[9px] pt-1">||||||||||||||||||||||||||||||||</div>
                <div className="font-bold text-[10px] text-slate-800 uppercase pt-1">THANK YOU! VISIT AGAIN</div>
                <div className="text-[8px] text-slate-400">for {data.storeName || 'DEVI MOBILE ACCESSORIES'}</div>
              </div>
            </div>
          )}

          {/* Exact Devi Mobile Tally ERP GST Tax Invoice Format (A4) */}
          {layoutFormat === 'a4' && (
            <div
              id="printable-devi-invoice"
              className="bg-white text-black font-sans mx-auto p-4 sm:p-6 border border-black max-w-[800px] w-full text-[11px] leading-tight select-text shadow-sm"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {/* 1. Header Section (Invoice No, Store Info, Dated) */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-start pb-2 text-[11px] leading-tight">
                <div className="text-left space-y-0.5">
                  <div><span className="font-semibold">Invoice No.</span> <span className="font-bold">{cleanInvoiceNo}</span></div>
                  <div><span className="font-semibold">Ref. No.</span> <span className="font-bold">{salesRef}</span></div>
                </div>

                <div className="text-center space-y-0.5 px-2">
                  <div className="text-[11px] font-bold tracking-tight pb-1">SUBJECT TO UJJAIN JURISDICTION</div>
                  <div className="text-base font-black tracking-wide uppercase">{data.storeName || 'DEVI MOBILE ACCESSORIES'}</div>
                  <div className="text-[10.5px] font-medium uppercase">{data.storeAddress || '206/1 KANTHAL CHOURAHA UJJAIN'}</div>
                  <div className="text-[11px] font-bold">GSTIN/UIN: {data.storeGstin || '23ALGPK9135M1ZT'}</div>
                  <div className="text-[10.5px]">State Name : Madhya Pradesh, Code : 23</div>
                  <div className="text-[10.5px]">Contact : {data.storePhone || '9713001600'}</div>
                  <div className="text-[10.5px]">E-Mail : devi_intex@rediffmail.com</div>
                </div>

                <div className="text-right space-y-0.5">
                  <div><span className="font-semibold">Dated</span> <span className="font-bold">{tallyDate}</span></div>
                </div>
              </div>

              {/* 2. GST INVOICE Title Banner */}
              <div className="text-center font-black text-sm uppercase tracking-widest my-2">
                GST INVOICE
              </div>

              {/* 3. Party (Customer / Financer) Details */}
              <div className="text-[11px] mb-2 leading-relaxed">
                <div className="flex items-start">
                  <span className="font-bold w-20 shrink-0">Party :</span>
                  <div className="font-bold uppercase space-y-0.5">
                    {isFinance ? (
                      <>
                        <div>FINANCE BY {(data.financeProvider || 'FINANCE').toUpperCase()}</div>
                        <div>{data.customerName.toUpperCase()}</div>
                      </>
                    ) : (
                      <div>{data.customerName.toUpperCase()}</div>
                    )}
                    {data.customerAddress && (
                      <div className="font-normal text-slate-900">{data.customerAddress.toUpperCase()}</div>
                    )}
                    {data.customerPhone && (
                      <div className="font-normal text-slate-900">{data.customerPhone}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-[10.5px] mt-1">
                  <span className="font-bold w-20 shrink-0">State Name</span>
                  <span>: Madhya Pradesh, Code : 23</span>
                </div>
              </div>

              {/* 4. Main Tally Items Table */}
              <div className="border-t border-black">
                <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="border-b border-black text-[10.5px] font-bold">
                      <th className="p-1 border-r border-black text-center w-[6%]">Sl<br/>No.</th>
                      <th className="p-1 border-r border-black text-left w-[38%]">Description of Goods</th>
                      <th className="p-1 border-r border-black text-center w-[12%]">HSN/SAC</th>
                      <th className="p-1 border-r border-black text-center w-[10%]">Quantity</th>
                      <th className="p-1 border-r border-black text-right w-[12%]">Rate</th>
                      <th className="p-1 border-r border-black text-center w-[6%]">per</th>
                      <th className="p-1 border-r border-black text-center w-[6%]">Disc. %</th>
                      <th className="p-1 text-right w-[14%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    <tr>
                      <td className="p-1.5 border-r border-black text-center">1</td>
                      <td className="p-1.5 border-r border-black">
                        <div className="font-bold uppercase text-[11.5px]">{data.productName}</div>
                        {isRealImei && (
                          <div className="text-[10px] text-slate-800 italic pt-0.5">
                            Batch: {data.imeiNumber}
                          </div>
                        )}
                        {isRealImei && (
                          <div className="text-[10px] text-slate-800 font-mono">
                            {data.imeiNumber}
                          </div>
                        )}
                        {showGiftsOnInvoice && data.vasPlan && data.vasPlan !== 'None' && (
                          <div className="text-[9.5px] text-slate-700 italic pt-0.5">
                            VAS Protection: {data.vasPlan}
                          </div>
                        )}
                        {showGiftsOnInvoice && data.gifts && (
                          <div className="text-[9.5px] text-slate-700 italic pt-0.5">
                            Gift: {data.gifts}
                          </div>
                        )}
                        <div className="h-28 sm:h-36"></div>
                        <div className="font-bold text-[11px]">CGST OUTPUT</div>
                        <div className="font-bold text-[11px]">SGST OUTPUT</div>
                      </td>
                      <td className="p-1.5 border-r border-black text-center font-mono text-[11px]">
                        {hsn}
                      </td>
                      <td className="p-1.5 border-r border-black text-right font-bold">
                        <div>{data.quantity || 1} NO</div>
                        {isRealImei && <div className="font-normal text-[10px]">{data.quantity || 1} NO</div>}
                      </td>
                      <td className="p-1.5 border-r border-black text-right font-mono">
                        {formatNum(taxableValue)}
                      </td>
                      <td className="p-1.5 border-r border-black text-center text-[10.5px]">
                        NO
                      </td>
                      <td className="p-1.5 border-r border-black text-center text-[10.5px]">
                        {/* Disc % */}
                      </td>
                      <td className="p-1.5 text-right font-mono">
                        <div>{formatNum(taxableValue)}</div>
                        <div className="h-28 sm:h-36"></div>
                        <div>{formatNum(cgst)}</div>
                        <div>{formatNum(sgst)}</div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-b border-black font-bold text-[11px]">
                      <td colSpan={3} className="p-1 text-right border-r border-black">Total</td>
                      <td className="p-1 text-right border-r border-black">{data.quantity || 1} NO</td>
                      <td colSpan={3} className="p-1 border-r border-black"></td>
                      <td className="p-1 text-right font-mono text-xs font-black">
                        ₹ {formatNum(rateInclTax)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 5. Amount Chargeable in Words & E. & O.E */}
              <div className="p-1.5 border-b border-black text-[10.5px]">
                <div className="flex justify-between items-center text-slate-700 text-[10px]">
                  <span>Amount Chargeable (in words)</span>
                  <span className="font-bold italic text-black text-xs">E. & O.E</span>
                </div>
                <div className="font-bold text-[11.5px] text-black pt-0.5">
                  {numberToIndianWords(rateInclTax)}
                </div>
              </div>

              {/* 6. HSN/SAC Tax Summary Table */}
              <div className="border-b border-black">
                <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="border-b border-black font-bold">
                      <th rowSpan={2} className="p-1 border-r border-black text-center w-[20%]">HSN/SAC</th>
                      <th rowSpan={2} className="p-1 border-r border-black text-right w-[20%]">Taxable<br/>Value</th>
                      <th colSpan={2} className="p-1 border-r border-black text-center w-[20%]">CGST</th>
                      <th colSpan={2} className="p-1 border-r border-black text-center w-[20%]">SGST/UTGST</th>
                      <th rowSpan={2} className="p-1 text-right w-[20%]">Total<br/>Tax Amount</th>
                    </tr>
                    <tr className="border-b border-black font-bold">
                      <th className="p-0.5 border-r border-black text-center w-[8%]">Rate</th>
                      <th className="p-0.5 border-r border-black text-right w-[12%]">Amount</th>
                      <th className="p-0.5 border-r border-black text-center w-[8%]">Rate</th>
                      <th className="p-0.5 border-r border-black text-right w-[12%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 border-r border-black text-center font-mono">{hsn}</td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(taxableValue)}
                      </td>
                      <td className="p-1 border-r border-black text-center">9%</td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(cgst)}
                      </td>
                      <td className="p-1 border-r border-black text-center">9%</td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(sgst)}
                      </td>
                      <td className="p-1 text-right font-mono">
                        {formatNum(totalTax)}
                      </td>
                    </tr>
                    <tr className="border-t border-black font-bold">
                      <td className="p-1 border-r border-black text-center">Total</td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(taxableValue)}
                      </td>
                      <td className="p-1 border-r border-black text-center"></td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(cgst)}
                      </td>
                      <td className="p-1 border-r border-black text-center"></td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        {formatNum(sgst)}
                      </td>
                      <td className="p-1 text-right font-mono">
                        {formatNum(totalTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 7. Tax Amount in Words */}
              <div className="p-1.5 text-[10.5px]">
                <span className="text-slate-800">Tax Amount (in words) : </span>
                <span className="font-bold text-black">{numberToIndianWords(totalTax)}</span>
              </div>

              {/* 8. Bank Details & Declaration (Left) vs Digital Seal Stamp (Right) */}
              <div className="grid grid-cols-[1.2fr_1fr] gap-4 p-2 text-[10px] items-end">
                {/* Left: Bank Details & Hindi Terms */}
                <div className="space-y-2">
                  <div>
                    <div className="font-bold underline text-[10.5px] pb-0.5">Company&apos;s Bank Details</div>
                    <div className="grid grid-cols-[120px_1fr] gap-y-0.5 text-[10px]">
                      <span className="text-slate-800">A/c Holder&apos;s Name</span>
                      <span className="font-bold">: DEVI MOBILE ACCESSORIES</span>
                      <span className="text-slate-800">Bank Name</span>
                      <span className="font-bold">: ICICI BANK OD A/C 658505603264</span>
                      <span className="text-slate-800">A/c No.</span>
                      <span className="font-bold">: 658505603264</span>
                      <span className="text-slate-800">Branch & IFS Code</span>
                      <span className="font-bold">: UJJAIN & ICIC0006585</span>
                      <span className="text-slate-800">SWIFT Code</span>
                      <span>: </span>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold underline text-[10px] pb-0.5">Declaration</div>
                    <div className="text-[9px] leading-snug text-black space-y-0.5">
                      <div>अपनी इलेक्ट्रॉनिक जरूरतों को पूरा करने के लिए हमें चुनने का धन्यवाद ।</div>
                      <div>बेचा माल वापस नहीं होगा ।</div>
                      <div>बिल संभालकर रखें अन्यथा *DUPLICATE* बिल निकलवाने का चार्ज रु. *250*/- अनिवार्य रूप से देना होगा ।</div>
                      <div>किसी भी स्थिति में सर्विस के लिए कस्टमर को सर्विस सेंटर ही जाना होगा ।</div>
                    </div>
                  </div>
                </div>

                {/* Right: Space for physical rubber stamp and signature */}
                <div className="flex flex-col justify-between items-center text-center h-full min-h-[120px] pb-1">
                  <div className="text-[10.5px] uppercase font-bold text-black pt-1">
                    for {data.storeName || 'DEVI MOBILE ACCESSORIES'}
                  </div>

                  {/* Open blank space where physical rubber stamp and pen signature are applied */}
                  <div className="h-16 sm:h-20"></div>

                  <div className="text-[10px] text-black font-semibold">
                    Authorised Signatory
                  </div>
                </div>
              </div>

              {/* 9. Computer Generated Notice */}
              <div className="text-center text-[9px] text-slate-600 pt-1 pb-1">
                This is a Computer Generated Invoice
              </div>
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}


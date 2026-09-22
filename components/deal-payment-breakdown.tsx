'use client';

import React from 'react';
import { formatINR } from '@/lib/utils';
import { SalesDeal } from '@/lib/sales-pipeline';
import { Gift, Repeat, ShieldCheck, Banknote, StickyNote } from 'lucide-react';

/**
 * Full, unambiguous payment + deal breakdown used on approval screens so the
 * admin sees EXACTLY how a deal is composed before approving:
 * Cash / UPI / Card / NEFT, Down payment split, Loan disbursement, Discount,
 * Exchange, Gift, VAS. Renders only the rows that actually have a value.
 */
export default function DealPaymentBreakdown({ deal }: { deal: SalesDeal }) {
  const cash = Number(deal.cashAmount) || 0;
  const upi = Number(deal.upiAmount) || 0;
  const card = Number(deal.cardAmount) || 0;
  const neft = Number((deal as any).neftAmount) || 0;

  const dpCash = Number(deal.downPaymentCash) || 0;
  const dpUpi = Number(deal.downPaymentUpi) || 0;
  const dpCard = Number(deal.downPaymentCard) || 0;
  const downTotal = dpCash + dpUpi + dpCard;

  const disbursement = Number(deal.disbursementAmount) || 0;
  const discount = Number(deal.discount) || 0;
  const exchange = Number(deal.exchangeValue) || 0;

  const isEmi = (deal.paymentMethod || '').toUpperCase() === 'EMI';

  const Row = ({ label, value, strong = false, accent }: { label: string; value: string; strong?: boolean; accent?: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${strong ? 'font-black text-slate-900' : 'font-bold'} ${accent || 'text-slate-800'}`}>{value}</span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
        <Banknote className="w-4 h-4 text-brand-600" />
        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Full Payment Breakdown</span>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white uppercase">{deal.paymentMethod || 'Cash'}</span>
      </div>

      <Row label="Final Billed Price" value={formatINR(deal.finalPrice || 0)} strong accent="text-brand-700" />
      {discount > 0 && <Row label="Discount Given" value={`- ${formatINR(discount)}`} accent="text-rose-700" />}

      {/* Direct payment modes (non-EMI or partial) */}
      {cash > 0 && <Row label="Cash" value={formatINR(cash)} />}
      {upi > 0 && <Row label="UPI" value={formatINR(upi)} />}
      {card > 0 && <Row label="Card" value={formatINR(card)} />}
      {neft > 0 && <Row label="NEFT / Bank Transfer" value={formatINR(neft)} />}

      {/* EMI / finance block */}
      {isEmi && (
        <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
          <Row label="Finance Partner" value={deal.financeProvider || 'Finance / Loan'} accent="text-indigo-700" />
          {disbursement > 0 && <Row label="Loan Disbursement" value={formatINR(disbursement)} accent="text-amber-800" />}
          {downTotal > 0 && (
            <>
              <Row label="Down Payment (Total)" value={formatINR(downTotal)} strong />
              {dpCash > 0 && <Row label="• Down — Cash" value={formatINR(dpCash)} />}
              {dpUpi > 0 && <Row label="• Down — UPI" value={formatINR(dpUpi)} />}
              {dpCard > 0 && <Row label="• Down — Card" value={formatINR(dpCard)} />}
            </>
          )}
        </div>
      )}

      {/* Extras */}
      {(exchange > 0 || (deal.gifts && deal.gifts !== 'None') || (deal.vasPlan && deal.vasPlan !== 'None')) && (
        <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
          {exchange > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1"><Repeat className="w-3.5 h-3.5 text-indigo-600" /> Old Device Exchange</span>
              <span className="font-bold text-indigo-700">
                {deal.oldDeviceName ? `${deal.oldDeviceName} • ` : ''}{formatINR(exchange)}
              </span>
            </div>
          )}
          {deal.gifts && deal.gifts !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-purple-600" /> Gift</span>
              <span className="font-bold text-purple-700">{Array.isArray(deal.gifts) ? deal.gifts.join(', ') : String(deal.gifts)}</span>
            </div>
          )}
          {deal.vasPlan && deal.vasPlan !== 'None' && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> VAS Protection</span>
              <span className="font-bold text-emerald-700">{deal.vasPlan}</span>
            </div>
          )}
        </div>
      )}

      {/* Remark / note */}
      {deal.remark && String(deal.remark).trim() && (
        <div className="pt-2 mt-1 border-t border-slate-200">
          <div className="flex items-start gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Remark</span>
              <span className="font-semibold text-slate-800">{deal.remark}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

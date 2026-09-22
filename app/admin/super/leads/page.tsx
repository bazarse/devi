'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, 
  Plus, 
  Phone, 
  User, 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Flame, 
  TrendingUp,
  MessageSquare,
  Search,
  ChevronRight,
  X,
  Building2,
  Filter,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { 
  CustomerLead, 
  fetchCloudLeads, 
  saveNewLead, 
  updateLeadStatus, 
  deleteLead, 
  subscribeToLeads 
} from '@/lib/leads-service';
import confetti from 'canvas-confetti';

export default function SuperAdminLeadsPage() {
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [inwardStore, setInwardStore] = useState('DM-01');
  const [salesmanName, setSalesmanName] = useState('Prince Verma');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [modelName, setModelName] = useState('');
  const [category, setCategory] = useState('Mobile Phone');
  const [budget, setBudget] = useState('');
  const [expectedDate, setExpectedDate] = useState('Tomorrow');
  const [leadStatus, setLeadStatus] = useState<CustomerLead['status']>('Hot Lead');
  const [notes, setNotes] = useState('');

  const loadLeads = async () => {
    const list = await fetchCloudLeads(selectedStore);
    setLeads(list);
  };

  useEffect(() => {
    loadLeads();
    const unsub = subscribeToLeads(() => {
      loadLeads();
    });
    return unsub;
  }, [selectedStore]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !modelName) return;

    await saveNewLead({
      storeId: inwardStore,

      storeName: inwardStore === 'DM-01' ? 'Devi Mobile (Kanthal)' : 'Devi Mobile 2.0 (Freeganj)',
      salesmanName: inwardStore === 'DM-01' ? 'Prince Verma' : 'Manav Sharma',
      salesmanPhone: inwardStore === 'DM-01' ? '9926598700' : '7828915933',
      customerName: custName,
      customerPhone: custPhone,
      interestedModel: modelName,
      category,
      budget: Number(budget) || 0,
      expectedDate,
      status: leadStatus,
      notes
    });

    setShowAddModal(false);
    setCustName('');
    setCustPhone('');
    setModelName('');
    setBudget('');
    setNotes('');

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  const filteredLeads = leads.filter(l => {
    const matchesStore = selectedStore === 'ALL' || l.storeId === selectedStore;
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q ||
      (l.customerName || '').toLowerCase().includes(q) ||
      (l.customerPhone || '').includes(q) ||
      (l.interestedModel || '').toLowerCase().includes(q) ||
      (l.salesmanName || '').toLowerCase().includes(q);
    return matchesStore && matchesStatus && matchesSearch;
  });

  const totalCount = filteredLeads.length;
  const hotCount = filteredLeads.filter(l => l.status === 'Hot Lead').length;
  const warmCount = filteredLeads.filter(l => l.status === 'Warm Lead').length;
  const followUpCount = filteredLeads.filter(l => l.status === 'Follow Up').length;
  const convertedCount = filteredLeads.filter(l => l.status === 'Converted').length;
  const totalPipelinePotential = filteredLeads.reduce((acc, l) => acc + (l.budget || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Super Admin HQ • Multi-Branch CRM</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Store-Wise Customer Leads</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Store Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Building2 className="w-4 h-4 text-slate-500 ml-1" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL">🏢 All Branches (Chain View)</option>
              <option value="DM-01">📍 Store DM-01 (Kanthal Flagship)</option>
              <option value="DM-02">📍 Store DM-02 (Freeganj 2.0)</option>
            </select>
          </div>

          {/* Add Lead Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Leads</div>
          <div className="text-xl font-black text-slate-900">{totalCount} Prospects</div>
          <div className="text-[10px] text-slate-500">{selectedStore === 'ALL' ? 'Chain-wide' : selectedStore}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-rose-50/60 to-white">
          <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-600" /> Hot Leads
          </div>
          <div className="text-xl font-black text-rose-700">{hotCount} Deals</div>
          <div className="text-[10px] text-rose-600 font-semibold">Immediate buyers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Warm Leads
          </div>
          <div className="text-xl font-black text-amber-700">{warmCount} Deals</div>
          <div className="text-[10px] text-slate-400">Comparing options</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Follow Ups
          </div>
          <div className="text-xl font-black text-blue-800">{followUpCount} Active</div>
          <div className="text-[10px] text-slate-400">Salary / Callbacks</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Converted
          </div>
          <div className="text-xl font-black text-emerald-700">{convertedCount} Bills</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Closed sales</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-purple-50/60 to-white">
          <div className="text-[10px] font-bold text-purple-700 uppercase">Pipeline Value</div>
          <div className="text-xl font-black text-purple-800">{formatINR(totalPipelinePotential)}</div>
          <div className="text-[10px] text-slate-400">Target potential</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search lead by customer, phone, phone model or salesman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {(['All', 'Hot Lead', 'Warm Lead', 'Follow Up', 'Converted', 'Lost'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List Cards Grid */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">No Chain Leads Logged Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Jab bhi kisi bhi branch (DM-01 ya DM-02) me koi customer enquiry log hogi, wo yaha live dikhegi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Top: Store Tag & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold">
                      {lead.storeId}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{lead.token}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    lead.status === 'Hot Lead' 
                      ? 'bg-rose-100 text-rose-700' 
                      : lead.status === 'Warm Lead'
                      ? 'bg-amber-100 text-amber-700'
                      : lead.status === 'Converted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : lead.status === 'Lost'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {lead.status}
                  </span>
                </div>

                {/* Customer & Product */}
                <div>
                  <h3 className="text-base font-black text-slate-900">{lead.customerName}</h3>
                  <div className="text-xs font-bold text-brand-700 flex items-center gap-1 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{lead.interestedModel}</span>
                  </div>
                </div>

                {/* Budget & Timeline */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Buy</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {lead.expectedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget</span>
                    <span className="font-black text-emerald-700">{formatINR(lead.budget)}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Salesman: <span className="font-bold text-slate-800">{lead.salesmanName}</span></span>
                    <span className="text-slate-400 text-[10px]">{lead.createdAt}</span>
                  </div>
                </div>

                {/* Notes */}
                {lead.notes && (
                  <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-800">Note: </span>{lead.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/91${lead.customerPhone}?text=${encodeURIComponent(`Hello ${lead.customerName}, this is HQ Management from Devi Mobile. Regarding your inquiry for ${lead.interestedModel}, we have best price and 0% EMI offers today. Let us know when you can visit our store!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${lead.customerPhone}`}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-brand-600" />
                    <span>Call</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => deleteLead(lead.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Update Quick Select */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Status:</span>
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 text-[11px] focus:outline-none"
                  >
                    <option value="Hot Lead">🔥 Hot Lead</option>
                    <option value="Warm Lead">⚡ Warm Lead</option>
                    <option value="Follow Up">⏳ Follow Up</option>
                    <option value="Converted">🎉 Converted (Billed)</option>
                    <option value="Lost">❌ Lost</option>
                  </select>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Customer Prospect Lead</h3>
                  <p className="text-xs text-slate-500">Add walk-in or phone customer inquiry into CRM</p>
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

            <form onSubmit={handleAddLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Branch *</label>
                  <select
                    value={inwardStore}
                    onChange={(e) => setInwardStore(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none"
                  >
                    <option value="DM-01">DM-01 (Kanthal Flagship)</option>
                    <option value="DM-02">DM-02 (Freeganj 2.0)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lead Urgency *</label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold bg-white focus:outline-none"
                  >
                    <option value="Hot Lead">🔥 Hot Lead (Buying Today/Tomorrow)</option>
                    <option value="Warm Lead">⚡ Warm Lead (Deciding model)</option>
                    <option value="Follow Up">⏳ Follow Up (Price/Salary check)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Rathore"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile..."
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Interested Phone Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vivo V30 5G / iPhone 15"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Approx Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expected Purchase Date</label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow Evening / This Sunday"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Requirement</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wants 0% Bajaj EMI with 2000 cash discount or free back cover"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:outline-none"
                />
              </div>

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
                  Save Lead to CRM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

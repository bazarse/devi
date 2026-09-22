/**
 * Tier 2 - Feature 5 Boundary: Mandatory Rejection Reason
 * Tests unicode, emojis, long strings, escape quotes, and whitespace rejection reasons.
 */

const { describe, it, assert, assertEqual, assertThrowsAsync } = require('../helpers/test-harness');
const { MockSupabase } = require('../helpers/mock-supabase');
const { SimulatedApi } = require('../helpers/simulated-api');
const FIXTURES = require('../helpers/fixtures');

describe('Tier 2 - Feature 5 Boundary: Mandatory Rejection Reason', () => {
  let db;
  let api;

  beforeEach(() => {
    db = new MockSupabase();
    api = new SimulatedApi(db);
  });

  it('F5-B1: Rejection reason with leading and trailing spaces is trimmed cleanly upon persist', async () => {
    const rawReason = '   Customer changed mind and walked out   ';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 10000, storeId: 'DM-01' });

    const rej = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: rawReason
    });

    assertEqual(rej.rejectionReason, 'Customer changed mind and walked out');
  });

  it('F5-B2: Extremely long rejection reason (500+ characters) persists without truncation', async () => {
    const longReason = 'A'.repeat(500) + ' Detailed manager audit report notes';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 20000, storeId: 'DM-01' });

    const rej = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: longReason
    });

    assertEqual(rej.rejectionReason.length, longReason.length);
  });

  it('F5-B3: Rejection reason with Hindi Unicode characters persists accurately', async () => {
    const hindiReason = 'ग्राहक के पास आवश्यक दस्तावेज नहीं हैं (आधार कार्ड सत्यापन विफल)';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 15000, storeId: 'DM-01' });

    const rej = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: hindiReason
    });

    assertEqual(rej.rejectionReason, hindiReason);
  });

  it('F5-B4: Rejection reason containing quotes and special symbols persists cleanly without escaping errors', async () => {
    const complexReason = 'Manager said: "Customer\'s credit rating is < 650 & rejected by Bajaj / DMI"';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 25000, storeId: 'DM-01' });

    const rej = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: complexReason
    });

    assertEqual(rej.rejectionReason, complexReason);
  });

  it('F5-B5: Newlines and tabs in rejection reason are handled without breaking JSON serialization', async () => {
    const multilineReason = 'Point 1: Price too low\nPoint 2: Missing accessories\t[Urgent]';
    const res = await api.submitDeal({ productName: 'Phone', finalPrice: 30000, storeId: 'DM-01' });

    const rej = await api.performDealAction({
      dealId: res.dealId,
      action: 'reject',
      decidedBy: 'Admin',
      rejectionReason: multilineReason
    });

    assertEqual(rej.rejectionReason, multilineReason);
  });
});

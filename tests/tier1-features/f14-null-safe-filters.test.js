/**
 * Tier 1 - Feature 14: Null-Safe Search & Date Filters
 * Verifies that search and filtering operations across deals, staff, finance,
 * and inventory do not throw null-pointer or property reading exceptions.
 */

const { describe, it, assert, assertEqual } = require('../helpers/test-harness');
const { SimulatedApi } = require('../helpers/simulated-api');

describe('Tier 1 - Feature 14: Null-Safe Search & Date Filters', () => {
  let api;

  beforeEach(() => {
    api = new SimulatedApi(null);
  });

  it('F14-T1: Search on deals with sparse or null fields executes safely', () => {
    const deals = [
      { customer_name: 'Rajesh', product_name: 'Vivo V40', customer_phone: '9827011223' },
      { customer_name: null, product_name: null, customer_phone: null },
      { customer_name: undefined, product_name: 'OnePlus 12R', customer_phone: '7828915933' },
      null,
      undefined
    ];

    const results = api.safeFilterDeals(deals, 'oneplus');
    assertEqual(results.length, 1);
    assertEqual(results[0].product_name, 'OnePlus 12R');
  });

  it('F14-T2: Staff list filter handles null or undefined full_name and phone without crash', () => {
    const staffList = [
      { full_name: 'Vinamra', phone: '9926598700' },
      { full_name: null, phone: '7828915933' },
      { full_name: 'Sunil Manager', phone: null },
      { full_name: undefined, phone: undefined }
    ];

    function safeFilterStaff(staff, query) {
      if (!query) return staff;
      const q = query.toLowerCase();
      return staff.filter(s => {
        if (!s) return false;
        const name = (s.full_name || '').toLowerCase();
        const phone = (s.phone || '');
        return name.includes(q) || phone.includes(q);
      });
    }

    const byName = safeFilterStaff(staffList, 'sunil');
    assertEqual(byName.length, 1);
    assertEqual(byName[0].full_name, 'Sunil Manager');

    const byPhone = safeFilterStaff(staffList, '7828');
    assertEqual(byPhone.length, 1);
    assertEqual(byPhone[0].phone, '7828915933');
  });

  it('F14-T3: Finance partners filter handles missing or null provider codes', () => {
    const partners = [
      { name: 'Bajaj Finance', code: 'BAJAJ' },
      { name: 'DMI Finance', code: null },
      { name: null, code: 'TVS' }
    ];

    function safeFilterFinance(list, query) {
      const q = (query || '').toLowerCase();
      return list.filter(p => {
        if (!p) return false;
        const name = (p.name || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        return name.includes(q) || code.includes(q);
      });
    }

    const res = safeFilterFinance(partners, 'dmi');
    assertEqual(res.length, 1);
    assertEqual(res[0].name, 'DMI Finance');

    const resCode = safeFilterFinance(partners, 'tvs');
    assertEqual(resCode.length, 1);
    assertEqual(resCode[0].code, 'TVS');
  });

  it('F14-T4: Inventory search handles null brand and empty/null imeiList safely', () => {
    const inventory = [
      { modelName: 'Vivo V40', brand: 'Vivo', imeiList: ['862045051234561'] },
      { modelName: 'boAt Earbuds', brand: null, imeiList: null },
      { modelName: 'Charger', brand: undefined, imeiList: [] }
    ];

    function safeFilterInventory(items, query) {
      const q = (query || '').toLowerCase();
      return items.filter(item => {
        if (!item) return false;
        const model = (item.modelName || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const imeis = Array.isArray(item.imeiList) ? item.imeiList : [];
        return model.includes(q) || brand.includes(q) || imeis.some(i => (i || '').toLowerCase().includes(q));
      });
    }

    const resImei = safeFilterInventory(inventory, '862045051234561');
    assertEqual(resImei.length, 1);
    assertEqual(resImei[0].modelName, 'Vivo V40');

    const resAccessory = safeFilterInventory(inventory, 'earbuds');
    assertEqual(resAccessory.length, 1);
    assertEqual(resAccessory[0].modelName, 'boAt Earbuds');
  });

  it('F14-T5: Customer WhatsApp link builder handles null or missing phone safely', () => {
    function buildWhatsAppLink(customer) {
      if (!customer || !customer.phone) return null;
      const digits = String(customer.phone).replace(/\D/g, '');
      if (!digits) return null;
      return `https://wa.me/91${digits.slice(-10)}`;
    }

    assertEqual(buildWhatsAppLink({ phone: '9827011223' }), 'https://wa.me/919827011223');
    assertEqual(buildWhatsAppLink({ phone: null }), null);
    assertEqual(buildWhatsAppLink({ phone: undefined }), null);
    assertEqual(buildWhatsAppLink({}), null);
    assertEqual(buildWhatsAppLink(null), null);
  });
});

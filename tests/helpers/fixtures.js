/**
 * Devi Mobile POS - Test Fixtures
 * Standardized data fixtures for E2E tests across Tiers 1-4.
 */

const FIXTURES = {
  STORES: {
    DM01: {
      id: '3be59f85-2859-476c-b402-31c552a83146',
      code: 'DM-01',
      name: 'DEVI MOBILE ACCESSORIES (Kanthal Chauraha)',
      address: '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006',
      gstin: '23ALGPK9135M1ZT',
      phone: '9713001600'
    },
    DM02: {
      id: '7705c16a-2e91-4ef5-93bc-00084848db6a',
      code: 'DM-02',
      name: 'DEVI MOBILE 2.0 (Freeganj)',
      address: 'Shop 4, Madhav Club Road, Freeganj, Ujjain 456010',
      gstin: '23ALGPK9135M1ZT',
      phone: '6262335656'
    }
  },

  STAFF: {
    SALESMAN_1: {
      id: 'ab77c1e4-0746-4507-8fae-a7ab0a260ca8',
      name: 'Vinamra (Counter)',
      phone: '9926598700',
      role: 'salesman',
      storeId: 'DM-01'
    },
    SALESMAN_2: {
      id: '10251ff2-720f-417d-97f9-7e85080c8124',
      name: 'Rohit Sharma',
      phone: '7828915933',
      role: 'salesman',
      storeId: 'DM-02'
    },
    STORE_ADMIN: {
      id: 'aa6b5456-1d7f-4f87-8c8c-283a23d4e593',
      name: 'Sunil Manager',
      phone: '9893264192',
      role: 'store_admin',
      storeId: 'DM-01'
    },
    SUPER_ADMIN: {
      id: 'ca750241-055e-43a4-9a6e-13da57a9110a',
      name: 'Dilip Kishnani (Super Admin HQ)',
      phone: '9826012345',
      role: 'super_admin',
      storeId: 'ALL'
    }
  },

  PRODUCTS: {
    VIVO_V40: {
      name: 'Vivo V40 5G (8GB/128GB)',
      category: 'Mobile Phone',
      hsnCode: '85171290',
      mrp: 36999,
      sellingPrice: 34999,
      costPrice: 31000
    },
    ONEPLUS_12R: {
      name: 'OnePlus 12R 5G (8GB/128GB)',
      category: 'Mobile Phone',
      hsnCode: '85171290',
      mrp: 42999,
      sellingPrice: 39999,
      costPrice: 36000
    },
    SAMSUNG_A55: {
      name: 'Samsung Galaxy A55 5G',
      category: 'Mobile Phone',
      hsnCode: '85171290',
      mrp: 41999,
      sellingPrice: 38999,
      costPrice: 35000
    },
    BOAT_EARBUDS: {
      name: 'boAt Airdopes 141',
      category: 'Accessories',
      hsnCode: '85183000',
      mrp: 2990,
      sellingPrice: 1299,
      costPrice: 850
    },
    CHARGER_65W: {
      name: 'Devi SuperFast 65W GaN Charger',
      category: 'Accessories',
      hsnCode: '85044090',
      mrp: 1999,
      sellingPrice: 999,
      costPrice: 450
    }
  },

  IMEIS: {
    IN_STOCK_1: '862045051234561',
    IN_STOCK_2: '862045051234562',
    IN_STOCK_3: '862045051234563',
    IN_STOCK_4: '862045051234564',
    IN_STOCK_5: '862045051234565',
    ALREADY_SOLD: '862045059999999',
    EXCHANGE_OLD_DEVICE: '354772091234567'
  },

  CUSTOMERS: {
    VIP_RAJESH: {
      name: 'Rajesh Gupta',
      phone: '9827011223',
      address: '15 Freeganj Main Rd, Ujjain',
      primaryStoreId: 'DM-01'
    },
    WALK_IN: {
      name: 'Amit Kumar',
      phone: '9425098765',
      address: 'Village Tarana, Dist Ujjain',
      primaryStoreId: 'DM-01'
    }
  },

  VALID_REASONS: [
    'Price discount exceeds store margin limit',
    'Customer documents unverified for finance approval',
    'Old device exchange valuation mismatch upon inspection',
    'Selected IMEI damaged or reserved for another order',
    'Down payment cash not received at cashier desk'
  ]
};

module.exports = FIXTURES;

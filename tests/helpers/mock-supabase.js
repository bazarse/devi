/**
 * Devi Mobile POS - In-Memory Supabase Mock
 * Simulates PostgreSQL / Supabase table operations, queries, and constraints.
 */

class MockSupabase {
  constructor() {
    this.tables = {
      sales_approvals: [],
      imei_stock: [],
      store_inventory: [],
      device_exchanges: [],
      customers: [],
      leads: [],
      stores: [],
      profiles: []
    };
    this.seedDefaultData();
  }

  seedDefaultData() {
    // Seed stores
    this.tables.stores = [
      {
        id: '3be59f85-2859-476c-b402-31c552a83146',
        code: 'DM-01',
        name: 'DEVI MOBILE ACCESSORIES (Kanthal Chauraha)'
      },
      {
        id: '7705c16a-2e91-4ef5-93bc-00084848db6a',
        code: 'DM-02',
        name: 'DEVI MOBILE 2.0 (Freeganj)'
      }
    ];

    // Seed sample IMEI stock
    this.tables.imei_stock = [
      {
        id: 'e1000000-0000-0000-0000-000000000001',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        model_name: 'Vivo V40 5G (8GB/128GB)',
        imei1: '862045051234561',
        status: 'in_stock',
        sold_invoice_id: null,
        sold_at: null
      },
      {
        id: 'e1000000-0000-0000-0000-000000000002',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        model_name: 'OnePlus 12R 5G (8GB/128GB)',
        imei1: '862045051234562',
        status: 'in_stock',
        sold_invoice_id: null,
        sold_at: null
      },
      {
        id: 'e1000000-0000-0000-0000-000000000003',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        model_name: 'Samsung Galaxy A55 5G',
        imei1: '862045051234563',
        status: 'in_stock',
        sold_invoice_id: null,
        sold_at: null
      },
      {
        id: 'e1000000-0000-0000-0000-000000000004',
        store_id: '7705c16a-2e91-4ef5-93bc-00084848db6a',
        model_name: 'Vivo V40 5G (8GB/128GB)',
        imei1: '862045051234564',
        status: 'in_stock',
        sold_invoice_id: null,
        sold_at: null
      },
      {
        id: 'e1000000-0000-0000-0000-000000000005',
        store_id: '7705c16a-2e91-4ef5-93bc-00084848db6a',
        model_name: 'Samsung Galaxy A55 5G',
        imei1: '862045051234565',
        status: 'in_stock',
        sold_invoice_id: null,
        sold_at: null
      },
      {
        id: 'e1000000-0000-0000-0000-000000000099',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        model_name: 'Vivo V30 5G',
        imei1: '862045059999999',
        status: 'sold',
        sold_invoice_id: 'd9999999-0000-0000-0000-000000000099',
        sold_at: '2026-09-01T10:00:00Z'
      }
    ];

    // Seed general store inventory (non-serialized stock)
    this.tables.store_inventory = [
      {
        id: 'inv-001',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        product_name: 'boAt Airdopes 141',
        category: 'Accessories',
        quantity: 25
      },
      {
        id: 'inv-002',
        store_id: '3be59f85-2859-476c-b402-31c552a83146',
        product_name: 'Devi SuperFast 65W GaN Charger',
        category: 'Accessories',
        quantity: 40
      }
    ];
  }

  from(tableName) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    return new MockQueryBuilder(this, tableName);
  }

  reset() {
    this.tables = {
      sales_approvals: [],
      imei_stock: [],
      store_inventory: [],
      device_exchanges: [],
      customers: [],
      leads: [],
      stores: [],
      profiles: []
    };
    this.seedDefaultData();
  }
}

class MockQueryBuilder {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
    this.filters = [];
    this.selectColumns = '*';
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.pendingOperation = null; // 'insert', 'update', 'delete', 'select'
    this.payload = null;
    this.orderClause = null;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    if (!this.pendingOperation) {
      this.pendingOperation = 'select';
    }
    return this;
  }

  insert(recordOrRecords) {
    this.pendingOperation = 'insert';
    this.payload = recordOrRecords;
    return this;
  }

  update(updatePayload) {
    this.pendingOperation = 'update';
    this.payload = updatePayload;
    return this;
  }

  delete() {
    this.pendingOperation = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push(row => row[column] === value);
    return this;
  }

  neq(column, value) {
    this.filters.push(row => row[column] !== value);
    return this;
  }

  in(column, values) {
    this.filters.push(row => values.includes(row[column]));
    return this;
  }

  gte(column, value) {
    this.filters.push(row => row[column] >= value);
    return this;
  }

  lte(column, value) {
    this.filters.push(row => row[column] <= value);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderClause = { column, ascending };
    return this;
  }

  single() {
    this.isSingle = true;
    return this._execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this._execute();
  }

  then(resolve, reject) {
    const promise = this._execute();
    return promise.then(resolve, reject);
  }

  async _execute() {
    const table = this.db.tables[this.tableName];

    if (this.pendingOperation === 'insert') {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];

      for (const rec of records) {
        const id = rec.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newRecord = {
          id,
          created_at: rec.created_at || new Date().toISOString(),
          updated_at: rec.updated_at || new Date().toISOString(),
          ...rec
        };
        table.push(newRecord);
        inserted.push(newRecord);
      }

      if (this.isSingle || (!Array.isArray(this.payload) && !this.isMaybeSingle)) {
        return { data: inserted[0], error: null };
      }
      return { data: inserted, error: null };
    }

    if (this.pendingOperation === 'update') {
      let matched = table.filter(row => this.filters.every(f => f(row)));
      for (const row of matched) {
        Object.assign(row, this.payload, { updated_at: this.payload.updated_at || new Date().toISOString() });
      }

      if (this.isSingle) {
        if (matched.length === 0) return { data: null, error: new Error('No rows found') };
        return { data: matched[0], error: null };
      }
      if (this.isMaybeSingle) {
        return { data: matched[0] || null, error: null };
      }
      return { data: matched, error: null };
    }

    if (this.pendingOperation === 'delete') {
      const remaining = [];
      const deleted = [];
      for (const row of table) {
        if (this.filters.every(f => f(row))) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }
      this.db.tables[this.tableName] = remaining;
      return { data: deleted, error: null };
    }

    // Default: select
    let results = table.filter(row => this.filters.every(f => f(row)));

    if (this.orderClause) {
      const { column, ascending } = this.orderClause;
      results.sort((a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
    }

    if (this.isSingle) {
      if (results.length === 0) return { data: null, error: new Error('Row not found') };
      return { data: results[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: results[0] || null, error: null };
    }

    return { data: results, error: null };
  }
}

module.exports = {
  MockSupabase
};

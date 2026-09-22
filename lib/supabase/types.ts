export type UserRole = 'super_admin' | 'store_admin' | 'salesman' | 'technician' | 'customer';

export type StockStatus = 'in_stock' | 'sold' | 'in_transfer' | 'defective' | 'returned';

export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

export type RepairStatus = 'received' | 'diagnosing' | 'waiting_parts' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

export type DeviceCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Follow_Up' | 'Converted' | 'Not_Interested';

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  whatsapp?: string;
  gstin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  store_id?: string;
  passcode?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stores?: Store;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id?: string;
  title: string;
  brand: string;
  model?: string;
  description?: string;
  hsn_code: string;
  barcode?: string;
  base_price: number;
  selling_price: number;
  min_selling_price: number;
  image_url?: string;
  is_serialized: boolean;
  is_active: boolean;
  created_at: string;
  categories?: Category;
}

export interface ImeiStock {
  id: string;
  imei1: string;
  imei2?: string;
  serial_number?: string;
  product_id: string;
  store_id: string;
  color?: string;
  storage?: string;
  purchase_price: number;
  selling_price: number;
  status: StockStatus;
  sold_at?: string;
  sold_invoice_id?: string;
  created_at: string;
  products?: Product;
  stores?: Store;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  primary_store_id?: string;
  credit_balance: number;
  total_spent: number;
  created_at: string;
}

export interface SalesApproval {
  id: string;
  store_id: string;
  sales_person_id: string;
  sales_person_name: string;
  sales_person_phone?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  product_id?: string;
  product_name: string;
  category: string;
  sub_category?: string;
  imei_serial?: string;
  hsn_code?: string;
  barcode?: string;
  product_price: number;
  discount: number;
  discount_reason?: string;
  final_price: number;
  payment_method: string; // 'Cash' | 'EMI'
  cash_method?: string; // 'UPI' | 'Cash' | 'Card'
  cash_amount: number;
  upi_amount: number;
  card_amount: number;
  finance_provider?: string;
  down_payment_cash: number;
  down_payment_upi: number;
  down_payment_card: number;
  disbursement_amount: number;
  has_device_exchange: boolean;
  device_name?: string;
  device_imei?: string;
  device_condition?: DeviceCondition;
  device_exchange_amount: number;
  is_gift: boolean;
  gifts: Array<{ name: string }>;
  is_emi_locked: boolean;
  vas_details?: string;
  vas_amount: number;
  status: ApprovalStatus;
  rejection_reason?: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoice {
  id: string;
  store_id: string;
  invoice_number: string;
  sale_approval_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  customer_gstin?: string;
  final_amount: number;
  base_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  discount: number;
  payment_method: string;
  cash_amount: number;
  upi_amount: number;
  card_amount: number;
  disbursement_amount: number;
  exchange_amount: number;
  is_fast_bill: boolean;
  created_by?: string;
  created_at: string;
}

export interface RepairOrder {
  id: string;
  token_number: string;
  store_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  imei_or_serial?: string;
  passcode_pattern?: string;
  issue_description: string;
  device_condition_notes?: string;
  photos: string[];
  estimated_cost: number;
  advance_paid: number;
  final_cost: number;
  status: RepairStatus;
  assigned_technician_id?: string;
  delivery_date?: string;
  technician_remarks?: string;
  created_at: string;
  updated_at: string;
  stores?: Store;
}

export interface Lead {
  id: string;
  store_id: string;
  sales_person_id: string;
  customer_name: string;
  customer_phone: string;
  interest_category: string;
  product_of_interest?: string;
  budget?: number;
  status: LeadStatus;
  follow_up_date?: string;
  notes?: string;
  created_at: string;
}

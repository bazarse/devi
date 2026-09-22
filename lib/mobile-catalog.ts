export interface CatalogProduct {
  id: string;
  brand: string;
  modelName: string;
  category: 'Mobile Phone' | 'Second Hand Phone' | 'Accessories' | 'Appliances';
  mrp: number;
  sellingPrice: number;
  hsnCode: string;
  specs: string[];
}

export const POPULAR_MOBILE_CATALOG: CatalogProduct[] = [
  // --- VIVO SMARTPHONES ---
  {
    id: 'vivo-v30',
    brand: 'Vivo',
    modelName: 'Vivo V30 5G (8GB RAM, 128GB) - Classic Black / Peacock Green',
    category: 'Mobile Phone',
    mrp: 35999,
    sellingPrice: 33999,
    hsnCode: '85171290',
    specs: ['Snapdragon 7 Gen 3', '50MP Studio Aura Light', '5000mAh', '80W FlashCharge']
  },
  {
    id: 'vivo-v30-pro',
    brand: 'Vivo',
    modelName: 'Vivo V30 Pro 5G (12GB RAM, 512GB) - Andaman Blue',
    category: 'Mobile Phone',
    mrp: 49999,
    sellingPrice: 46999,
    hsnCode: '85171290',
    specs: ['ZEISS Triple 50MP Camera', 'Dimensity 8200', '120Hz 3D Curved AMOLED']
  },
  {
    id: 'vivo-t3-5g',
    brand: 'Vivo',
    modelName: 'Vivo T3 5G (8GB RAM, 128GB) - Cosmic Blue',
    category: 'Mobile Phone',
    mrp: 22999,
    sellingPrice: 19999,
    hsnCode: '85171290',
    specs: ['Dimensity 7200 5G', '50MP Sony OIS', '120Hz AMOLED', '5000mAh']
  },
  {
    id: 'vivo-y200-5g',
    brand: 'Vivo',
    modelName: 'Vivo Y200 5G (8GB RAM, 128GB) - Desert Gold',
    category: 'Mobile Phone',
    mrp: 24999,
    sellingPrice: 21999,
    hsnCode: '85171290',
    specs: ['Smart Aura Light', '64MP OIS Anti-Shake', '44W FlashCharge']
  },
  {
    id: 'vivo-y28-5g',
    brand: 'Vivo',
    modelName: 'Vivo Y28 5G (6GB RAM, 128GB) - Glitter Aqua',
    category: 'Mobile Phone',
    mrp: 17999,
    sellingPrice: 15499,
    hsnCode: '85171290',
    specs: ['Dimensity 6020 5G', '50MP Dual Camera', '5000mAh']
  },
  {
    id: 'vivo-y56-5g',
    brand: 'Vivo',
    modelName: 'Vivo Y56 5G (8GB RAM, 128GB) - Orange Shimmer',
    category: 'Mobile Phone',
    mrp: 19999,
    sellingPrice: 16999,
    hsnCode: '85171290',
    specs: ['50MP Night Camera', '5000mAh Battery', '18W Fast Charge']
  },
  {
    id: 'vivo-x100',
    brand: 'Vivo',
    modelName: 'Vivo X100 5G (12GB RAM, 256GB) - Stargaze Blue',
    category: 'Mobile Phone',
    mrp: 69999,
    sellingPrice: 63999,
    hsnCode: '85171290',
    specs: ['ZEISS APO Telephoto', 'Dimensity 9300', '120W Dual-Cell']
  },

  // --- OPPO SMARTPHONES ---
  {
    id: 'oppo-a5-pro',
    brand: 'OPPO',
    modelName: 'OPPO A5 PRO 5G (8GB RAM, 128GB) - Starry Black',
    category: 'Mobile Phone',
    mrp: 19999,
    sellingPrice: 17280,
    hsnCode: '85171290',
    specs: ['50MP AI Portrait', '5000mAh Battery', '33W SUPERVOOC']
  },
  {
    id: 'oppo-reno11-pro',
    brand: 'OPPO',
    modelName: 'OPPO Reno11 Pro 5G (12GB RAM, 256GB) - Pearl White',
    category: 'Mobile Phone',
    mrp: 44999,
    sellingPrice: 39999,
    hsnCode: '85171290',
    specs: ['32MP Telephoto Portrait', '80W SUPERVOOC', 'Curved OLED']
  },
  {
    id: 'oppo-f25-pro',
    brand: 'OPPO',
    modelName: 'OPPO F25 Pro 5G (8GB RAM, 128GB) - Lava Red',
    category: 'Mobile Phone',
    mrp: 28999,
    sellingPrice: 23999,
    hsnCode: '85171290',
    specs: ['64MP Ultra-Clear Triple', 'IP65 Water Resistant', '67W Flash']
  },

  // --- SAMSUNG SMARTPHONES ---
  {
    id: 'samsung-f15-5g',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy F15 5G 6+128GB E156 - Ash Black',
    category: 'Mobile Phone',
    mrp: 14999,
    sellingPrice: 12999,
    hsnCode: '85171290',
    specs: ['6000mAh Monster Battery', 'Super AMOLED 90Hz', '50MP Triple']
  },
  {
    id: 'samsung-s24-ultra',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy S24 Ultra 5G (12GB, 256GB) - Titanium Gray',
    category: 'Mobile Phone',
    mrp: 134999,
    sellingPrice: 129999,
    hsnCode: '85171290',
    specs: ['Galaxy AI', '200MP Quad Telephoto', 'Snapdragon 8 Gen 3', 'S-Pen']
  },
  {
    id: 'samsung-s24',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy S24 5G (8GB, 128GB) - Onyx Black',
    category: 'Mobile Phone',
    mrp: 79999,
    sellingPrice: 74999,
    hsnCode: '85171290',
    specs: ['Galaxy AI Enabled', '50MP Triple Camera', '4000mAh']
  },
  {
    id: 'samsung-a55-5g',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy A55 5G (8GB, 128GB) - Awesome Iceblue',
    category: 'Mobile Phone',
    mrp: 42999,
    sellingPrice: 39999,
    hsnCode: '85171290',
    specs: ['Metal Frame Design', 'IP67 Rating', '50MP OIS', '5000mAh']
  },
  {
    id: 'samsung-a35-5g',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy A35 5G (8GB, 128GB) - Awesome Navy',
    category: 'Mobile Phone',
    mrp: 33999,
    sellingPrice: 30999,
    hsnCode: '85171290',
    specs: ['Super AMOLED 120Hz', '50MP OIS', 'Knox Vault Security']
  },
  {
    id: 'samsung-a15-5g',
    brand: 'Samsung',
    modelName: 'Samsung Galaxy A15 5G (6GB, 128GB) - Blue Black',
    category: 'Mobile Phone',
    mrp: 19499,
    sellingPrice: 17499,
    hsnCode: '85171290',
    specs: ['FHD+ Super AMOLED', '50MP Triple Camera', '5000mAh']
  },

  // --- APPLE IPHONE ---
  {
    id: 'apple-iphone-15',
    brand: 'Apple',
    modelName: 'Apple iPhone 15 (128 GB) - Black / Blue / Green',
    category: 'Mobile Phone',
    mrp: 79900,
    sellingPrice: 69900,
    hsnCode: '85171290',
    specs: ['Dynamic Island', '48MP Main Camera', 'A16 Bionic', 'USB-C']
  },
  {
    id: 'apple-iphone-15-pro-max',
    brand: 'Apple',
    modelName: 'Apple iPhone 15 Pro Max (256 GB) - Natural Titanium',
    category: 'Mobile Phone',
    mrp: 159900,
    sellingPrice: 148900,
    hsnCode: '85171290',
    specs: ['Titanium Frame', 'A17 Pro Chip', '5x Telephoto Optical Zoom']
  },
  {
    id: 'apple-iphone-13',
    brand: 'Apple',
    modelName: 'Apple iPhone 13 (128 GB) - Midnight',
    category: 'Mobile Phone',
    mrp: 59900,
    sellingPrice: 52999,
    hsnCode: '85171290',
    specs: ['A15 Bionic Chip', 'Super Retina XDR', 'Dual 12MP Camera']
  },

  // --- ONEPLUS ---
  {
    id: 'oneplus-12r',
    brand: 'OnePlus',
    modelName: 'OnePlus 12R 5G (8GB RAM, 128GB) - Cool Blue',
    category: 'Mobile Phone',
    mrp: 39999,
    sellingPrice: 38500,
    hsnCode: '85171290',
    specs: ['Snapdragon 8 Gen 2', '100W SUPERVOOC', '5500mAh Battery']
  },
  {
    id: 'oneplus-nord-ce4',
    brand: 'OnePlus',
    modelName: 'OnePlus Nord CE 4 5G (8GB RAM, 128GB) - Celadon Marble',
    category: 'Mobile Phone',
    mrp: 24999,
    sellingPrice: 22999,
    hsnCode: '85171290',
    specs: ['Snapdragon 7 Gen 3', '100W Fast Charging', '5500mAh']
  },

  // --- REALME & XIAOMI ---
  {
    id: 'realme-12-pro-plus',
    brand: 'Realme',
    modelName: 'Realme 12 Pro+ 5G (8GB RAM, 128GB) - Submarine Blue',
    category: 'Mobile Phone',
    mrp: 34999,
    sellingPrice: 29999,
    hsnCode: '85171290',
    specs: ['64MP Periscope Portrait', '120Hz Curved AMOLED', '67W SUPERVOOC']
  },
  {
    id: 'redmi-note-13-pro-plus',
    brand: 'Xiaomi',
    modelName: 'Redmi Note 13 Pro+ 5G (8GB RAM, 256GB) - Fusion Purple',
    category: 'Mobile Phone',
    mrp: 33999,
    sellingPrice: 30999,
    hsnCode: '85171290',
    specs: ['200MP OIS Camera', 'IP68 Rating', '120W HyperCharge']
  },

  // --- SECOND HAND / EXCHANGE PRE-OWNED PHONES ---
  {
    id: 'sh-vivo-y21',
    brand: 'Vivo (Used)',
    modelName: 'Vivo Y21 (4GB RAM, 64GB) - Diamond Glow [Exchange Stock]',
    category: 'Second Hand Phone',
    mrp: 13990,
    sellingPrice: 5499,
    hsnCode: '85171290',
    specs: ['Grade A (Good Condition)', 'Exchanged from DM-01 Customer', '7-Day Testing Warranty']
  },
  {
    id: 'sh-iphone-12',
    brand: 'Apple (Used)',
    modelName: 'Apple iPhone 12 (128GB) - Blue [Pre-owned Exchange]',
    category: 'Second Hand Phone',
    mrp: 59900,
    sellingPrice: 24999,
    hsnCode: '85171290',
    specs: ['Grade A+ (Like New)', 'Battery Health 87%', 'Original Box Available']
  },
  {
    id: 'sh-samsung-a52s',
    brand: 'Samsung (Used)',
    modelName: 'Samsung Galaxy A52s 5G (6GB/128GB) - Awesome Mint [Exchange]',
    category: 'Second Hand Phone',
    mrp: 35999,
    sellingPrice: 11499,
    hsnCode: '85171290',
    specs: ['Grade B (Minor Scratches)', 'Snapdragon 778G 5G', '120Hz Super AMOLED']
  },
  {
    id: 'sh-oneplus-nord-ce2',
    brand: 'OnePlus (Used)',
    modelName: 'OnePlus Nord CE 2 5G (8GB/128GB) - Bahama Blue [Exchange]',
    category: 'Second Hand Phone',
    mrp: 24999,
    sellingPrice: 9999,
    hsnCode: '85171290',
    specs: ['Grade A (Good Condition)', 'Dimensity 900', '65W SuperVOOC Tested']
  },

  // --- ACCESSORIES ---
  {
    id: 'devi-65w-gan',
    brand: 'Devi Pro',
    modelName: 'Devi Ultra 65W GaN Fast Charger (Type-C + USB-A)',
    category: 'Accessories',
    mrp: 2499,
    sellingPrice: 1499,
    hsnCode: '85044090',
    specs: ['GaN III Fast Technology', 'PD 3.0 Supported', '6 Months Warranty']
  },
  {
    id: 'boat-rockerz-255-pro',
    brand: 'boAt',
    modelName: 'boAt Rockerz 255 Pro+ Wireless Neckband',
    category: 'Accessories',
    mrp: 3990,
    sellingPrice: 1299,
    hsnCode: '85183000',
    specs: ['40 Hours Playback', 'ASAP Fast Charge', 'IPX7 Water Resistant']
  },
  {
    id: 'tempered-glass-pro',
    brand: 'Devi Armor',
    modelName: '9D Super D+ Full Tempered Glass Screen Guard',
    category: 'Accessories',
    mrp: 499,
    sellingPrice: 199,
    hsnCode: '70071900',
    specs: ['Edge-to-Edge Protection', 'Oleophobic Coating', 'Bubble Free']
  }
];

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatINR } from './utils';

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  refNo?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  partyName?: string; // e.g. BAJAJ FINANCE LIMITED or Customer Name
  productName: string;
  category?: string;
  hsnCode?: string;
  imeiNumber: string;
  quantity: number;
  rateInclTax: number;
  basePrice?: number;
  mrp?: number;
  paymentMethod: string;
  financeProvider?: string;
  storeName?: string;
  storeAddress?: string;
  storeGstin?: string;
  storePhone?: string;
  gifts?: string;
  vasPlan?: string;
  showGiftsAndVas?: boolean;
}

/**
 * Resolves standard GST HSN code according to product category and item name.
 * - 85171290: Smartphones / Mobile Handsets
 * - 85044090: Adapters, Fast Chargers, Power Supplies
 * - 85183000: Headphones, Earphones, TWS Earbuds, Neckbands, Speakers
 * - 85176290: Smartwatches, Fitness Bands, Wearables
 * - 85076000: Lithium-ion Batteries, Power Banks
 * - 85235100: Memory Cards, SD Cards, Pen Drives, SSDs
 * - 39269099: Protective Covers, Silicone Cases, Back Covers
 * - 70071900: Tempered Glass Screen Protectors
 * - 85444290: USB Cables, Type-C Cables, Lightning Cords
 * - 85287200: Smart TVs, LED Televisions, Display Monitors
 * - 85177090: General Telephone / Mobile Parts & Accessories
 */
export function getHsnCodeForProduct(productName?: string, category?: string, explicitHsn?: string): string {
  if (explicitHsn && explicitHsn.trim() && explicitHsn.trim() !== '85171290') {
    return explicitHsn.trim();
  }

  const name = (productName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // Glass / Screen Protector
  if (name.includes('tempered') || name.includes('glass') || name.includes('screen guard') || name.includes('protector')) {
    return '70071900';
  }

  // Cover / Case / Pouch
  if (name.includes('cover') || name.includes('case') || name.includes('pouch') || name.includes('bumper')) {
    return '39269099';
  }

  // Cable
  if (name.includes('cable') || name.includes('cord') || name.includes('type-c') || name.includes('lightning') || name.includes('usb-c')) {
    return '85444290';
  }

  // Charger / Adapter
  if (name.includes('charger') || name.includes('adapter') || name.includes('power adapter')) {
    return '85044090';
  }

  // Audio / Earbuds / Headphones
  if (name.includes('bud') || name.includes('airpod') || name.includes('earphone') || name.includes('headphone') || name.includes('neckband') || name.includes('speaker') || name.includes('audio') || name.includes('tws')) {
    return '85183000';
  }

  // Smartwatch / Wearable
  if (name.includes('watch') || name.includes('band') || name.includes('smartwatch')) {
    return '85176290';
  }

  // Power bank / Battery
  if (name.includes('power bank') || name.includes('powerbank') || name.includes('battery')) {
    return '85076000';
  }

  // Memory / Storage
  if (name.includes('card') || name.includes('sd') || name.includes('pendrive') || name.includes('flash drive')) {
    return '85235100';
  }

  // Appliances / TV
  if (cat.includes('appliance') || name.includes('tv') || name.includes('led') || name.includes('television')) {
    return '85287200';
  }

  // Accessories category fallback
  if (cat.includes('accessor')) {
    return '85177090';
  }

  // Handsets / Smartphones / Second Hand Phones default
  return '85171290';
}

// Convert Number to Indian Words
export function numberToIndianWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'INR Zero Only';

  function inWords(nStr: string): string {
    if (nStr.length > 9) return 'overflow';
    const match = ('000000000' + nStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';
    let str = '';
    str += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[match[1][0] as any] + ' ' + a[match[1][1] as any]) + 'Crore ' : '';
    str += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[match[2][0] as any] + ' ' + a[match[2][1] as any]) + 'Lakh ' : '';
    str += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[match[3][0] as any] + ' ' + a[match[3][1] as any]) + 'Thousand ' : '';
    str += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[match[4][0] as any] + ' ' + a[match[4][1] as any]) + 'Hundred ' : '';
    str += Number(match[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(match[5])] || b[match[5][0] as any] + ' ' + a[match[5][1] as any]) : '';
    return str.trim();
  }

  const integerWords = inWords(n.toString());
  const paise = Math.round((num - n) * 100);
  let paiseWords = '';
  if (paise > 0) {
    paiseWords = ` and ${inWords(paise.toString())} Paise`;
  }

  return `INR ${integerWords}${paiseWords} Only`;
}

export function generate80mmThermalReceiptText(inv: InvoiceData): string {
  const rateInclTax = inv.rateInclTax || 0;
  const taxableValue = +(rateInclTax / 1.18).toFixed(2);
  const cgst = +((rateInclTax - taxableValue) / 2).toFixed(2);
  const sgst = cgst;
  const totalTax = +(cgst + sgst).toFixed(2);
  const roundOff = +(rateInclTax - (taxableValue + totalTax)).toFixed(2);
  const gstin = inv.storeGstin || '23ALGPK9135M1ZT';
  const hsn = getHsnCodeForProduct(inv.productName, inv.category, inv.hsnCode);

  const divider = '------------------------------------------\n';
  const doubleDivider = '==========================================\n';

  let text = '';
  text += '           DEVI MOBILE ACCESSORIES         \n';
  text += '   206/1 Kanthal Chauraha, Ankpat Marg     \n';
  text += '            Ujjain (M.P.) - 456006         \n';
  text += `          GSTIN/UIN: ${gstin}      \n`;
  text += '         Phone: 9713001600, 9893264192     \n';
  text += doubleDivider;
  text += '             RETAIL TAX INVOICE           \n';
  text += doubleDivider;
  text += `Invoice No: ${inv.invoiceNo}\n`;
  text += `Date      : ${inv.invoiceDate}\n`;
  text += `Sales Ref : ${inv.refNo || 'STAFF'}\n`;
  text += `Pay Mode  : ${inv.paymentMethod}${inv.financeProvider ? ` (${inv.financeProvider})` : ''}\n`;
  text += divider;
  text += `Customer  : ${inv.customerName}\n`;
  text += `Phone     : ${inv.customerPhone}\n`;
  if (inv.customerAddress) {
    text += `Address   : ${inv.customerAddress}\n`;
  }
  text += divider;
  text += 'ITEM DESCRIPTION         HSN      QTY    AMOUNT\n';
  text += divider;
  text += `${inv.productName}\n`;
  if (inv.imeiNumber && inv.imeiNumber.length >= 6) {
    text += `  IMEI: ${inv.imeiNumber}\n`;
  }
  if (inv.showGiftsAndVas && inv.vasPlan && inv.vasPlan !== 'None') {
    text += `  VAS: ${inv.vasPlan}\n`;
  }
  if (inv.showGiftsAndVas && inv.gifts) {
    text += `  Gift: ${inv.gifts}\n`;
  }
  text += `                         ${hsn}    ${inv.quantity}   ${rateInclTax.toFixed(2)}\n`;
  text += divider;
  text += `Taxable Value (18%):               Rs. ${taxableValue.toFixed(2)}\n`;
  text += `CGST (9%)          :               Rs. ${cgst.toFixed(2)}\n`;
  text += `SGST (9%)          :               Rs. ${sgst.toFixed(2)}\n`;
  if (Math.abs(roundOff) > 0) {
    text += `Round Off          :               Rs. ${roundOff.toFixed(2)}\n`;
  }
  text += doubleDivider;
  text += `NET AMOUNT PAYABLE :               Rs. ${rateInclTax.toFixed(2)}\n`;
  text += doubleDivider;
  text += `(${numberToIndianWords(rateInclTax)})\n\n`;
  text += 'Declaration & Terms of Sale:\n';
  text += '1. Goods once sold will not be returned.\n';
  text += '2. Please retain bill for brand warranty.\n';
  text += '3. Duplicate bill fee: Rs. 250/-.\n';
  text += '------------------------------------------\n';
  text += '      *** THANK YOU - VISIT AGAIN ***     \n';
  text += '------------------------------------------\n';
  return text;
}

// Generate Official Devi Mobile GST Tax Invoice PDF
export function generateDeviGstInvoicePDF(inv: InvoiceData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Calculations
  const rateInclTax = inv.rateInclTax || 0;
  const taxableValue = +(rateInclTax / 1.18).toFixed(2);
  const cgst = +((rateInclTax - taxableValue) / 2).toFixed(2);
  const sgst = cgst;
  const totalTax = +(cgst + sgst).toFixed(2);
  const roundOff = +(rateInclTax - (taxableValue + totalTax)).toFixed(2);

  const gstin = inv.storeGstin || '23ALGPK9135M1ZT';
  const hsn = getHsnCodeForProduct(inv.productName, inv.category, inv.hsnCode);

  // 1. Top Jurisdiction Bar
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('SUBJECT TO UJJAIN JURISDICTION', 14, 10);
  doc.text('TAX INVOICE', 180, 10, { align: 'right' });

  // Outer Border
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.rect(14, 12, 182, 272);

  // 2. Store Header Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(inv.storeName || 'DEVI MOBILE ACCESSORIES', 18, 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.storeAddress || '206/1, KANTHAL CHAURAHA, ANKPAT MARG, UJJAIN 456006', 18, 25);
  doc.text(`CONTACT: ${inv.storePhone || '9713001600, 6262335656, 9893264192'}`, 18, 29);
  doc.text(`GSTIN/UIN: ${gstin}   |   State: Madhya Pradesh (Code: 23)`, 18, 33);
  doc.text('E-Mail: devi_intex@rediffmail.com', 18, 37);

  // Right Header Invoice Meta Box
  doc.line(125, 12, 125, 41);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', 128, 18);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.invoiceNo, 155, 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Dated:', 128, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.invoiceDate, 155, 25);

  doc.setFont('helvetica', 'bold');
  doc.text('Sales Ref:', 128, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.refNo || 'STAFF', 155, 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Mode:', 128, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.paymentMethod, 155, 38);

  doc.line(14, 41, 196, 41);

  // 3. Buyer / Customer Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Buyer (Bill to):', 18, 46);
  if (inv.financeProvider && inv.paymentMethod === 'EMI') {
    doc.text(`Party: ${inv.financeProvider.toUpperCase()}`, 18, 51);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer: ${inv.customerName}`, 18, 56);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(inv.customerName, 18, 51);
  }
  doc.text(`Phone: ${inv.customerPhone}`, 18, 61);
  if (inv.customerAddress) {
    doc.text(`Address: ${inv.customerAddress}`, 18, 66);
  }
  doc.text('State: Madhya Pradesh, Code: 23', 18, 71);

  doc.line(14, 75, 196, 75);

  const isRealImei = inv.imeiNumber && 
    inv.imeiNumber.trim() !== '' && 
    !['vivo', 'oppo', 'samsung', 'realme', 'none', 'na', 'n/a', 'null', 'undefined'].includes(inv.imeiNumber.trim().toLowerCase()) &&
    inv.imeiNumber.trim().length >= 6;

  const itemDescription = `${inv.productName}${isRealImei ? `\nBatch: ${inv.imeiNumber}\n${inv.imeiNumber}` : ''}${inv.showGiftsAndVas && inv.vasPlan && inv.vasPlan !== 'None' ? `\nVAS Protection: ${inv.vasPlan}` : ''}${inv.showGiftsAndVas && inv.gifts ? `\nGift: ${inv.gifts}` : ''}\n\nCGST OUTPUT\nSGST OUTPUT`;

  // 4. Product Table (Matching Tally Columns)
  (doc as any).autoTable({
    startY: 77,
    margin: { left: 14, right: 14 },
    head: [['Sl No.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
    body: [
      [
        '1',
        itemDescription,
        hsn,
        `${inv.quantity || 1} NO${isRealImei ? `\n${inv.quantity || 1} NO` : ''}`,
        taxableValue.toFixed(2),
        'NO',
        '',
        `${taxableValue.toFixed(2)}\n\n${cgst.toFixed(2)}\n${sgst.toFixed(2)}`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
  });

  const tableFinalY = (doc as any).lastAutoTable.finalY;

  // Total Row under items table
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.2);
  doc.line(14, tableFinalY, 196, tableFinalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total', 85, tableFinalY + 4, { align: 'right' });
  doc.text(`${inv.quantity || 1} NO`, 115, tableFinalY + 4, { align: 'right' });
  doc.text(`INR ${rateInclTax.toFixed(2)}`, 192, tableFinalY + 4, { align: 'right' });
  doc.line(14, tableFinalY + 6, 196, tableFinalY + 6);

  // 5. In Words Box
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Chargeable (in words)', 16, tableFinalY + 10);
  doc.setFont('helvetica', 'italic');
  doc.text('E. & O.E', 192, tableFinalY + 10, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(numberToIndianWords(rateInclTax), 16, tableFinalY + 14);
  doc.line(14, tableFinalY + 16, 196, tableFinalY + 16);

  // 6. GST Tax Breakdown Table
  (doc as any).autoTable({
    startY: tableFinalY + 18,
    margin: { left: 14, right: 14 },
    head: [['HSN/SAC', 'Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Tax Amount']],
    body: [
      [
        hsn,
        taxableValue.toFixed(2),
        '9%',
        cgst.toFixed(2),
        '9%',
        sgst.toFixed(2),
        totalTax.toFixed(2)
      ],
      [
        'Total',
        taxableValue.toFixed(2),
        '',
        cgst.toFixed(2),
        '',
        sgst.toFixed(2),
        totalTax.toFixed(2)
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
  });

  const taxTableY = (doc as any).lastAutoTable.finalY + 3;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tax Amount (in words) : ${numberToIndianWords(totalTax)}`, 16, taxTableY);

  // 7. Company Bank Details & Declaration (Left) vs Stamp (Right)
  const bottomY = taxTableY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("Company's Bank Details", 16, bottomY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text("A/c Holder's Name : DEVI MOBILE ACCESSORIES", 16, bottomY + 4);
  doc.text("Bank Name        : ICICI BANK OD A/C 658505603264", 16, bottomY + 8);
  doc.text("A/c No.          : 658505603264", 16, bottomY + 12);
  doc.text("Branch & IFS Code: UJJAIN & ICIC0006585", 16, bottomY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Declaration', 16, bottomY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('1. Thank you for choosing DEVI MOBILE for your electronics needs!', 16, bottomY + 26);
  doc.text('2. Goods once sold will not be returned.', 16, bottomY + 30);
  doc.text('3. Keep bill safe. Duplicate bill charge Rs. 250/- mandatory.', 16, bottomY + 34);
  doc.text('4. In any case customer must visit authorized brand service center.', 16, bottomY + 38);

  // Right Side: Space for physical rubber stamp & signatory
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('for DEVI MOBILE ACCESSORIES', 155, bottomY + 6, { align: 'center' });
  // Blank space for manual rubber stamp & signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorised Signatory', 155, bottomY + 36, { align: 'center' });

  // Footer Computer Generated
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a Computer Generated Invoice', 105, 280, { align: 'center' });

  // Save PDF
  doc.save(`Devi_Invoice_${inv.invoiceNo.replace(/[\/\\]/g, '_')}.pdf`);
}

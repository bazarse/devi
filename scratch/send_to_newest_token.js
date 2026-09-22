const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../lib/firebase-service-account.json'));

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  app = getApps()[0];
}

const messaging = getMessaging(app);
const newestToken = 'fxHQOl-jRSmnaFGYMo2AJc:APA91bEsZppKCOp5GMgxfLyg4osgprfVWh1v6OGf-TfTy3A5y9bdTxp5qbO-0Oh0byUHcCbXYNC5AsMt46fWD5eMdp2xwT_IDL2WqK3tP7KfOnwztcCo8-g';

// Send with data payload containing dealId to trigger DeviMessagingService
const message = {
  token: newestToken,
  data: {
    title: '🚨 Pending Deal Approval • ₹1,44,900',
    dealId: '752acf4e-070a-409c-9247-4e1b8b5043c2',
    productName: 'Apple iPhone 16 Pro Max (256GB)',
    finalPrice: '1,44,900',
    customerName: 'Dilip Bhai (VIP HQ)',
    customerPhone: '9893264192',
    storeId: 'DM-01 (Kanthal)',
    salesPersonName: 'Prince Verma',
    paymentMethod: 'EMI (Bajaj Finserv)',
    url: '/admin/super/approvals'
  },
  android: {
    priority: 'high'
  }
};

console.log('Dispatching live demo push to newest APK token...');

messaging.send(message)
  .then((response) => {
    console.log('✅ DEMO DELIVERED SUCCESSFULLY TO NEW APK! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

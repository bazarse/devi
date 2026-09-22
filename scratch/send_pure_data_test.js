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
const token = 'f23GkRp6QOOkSKkDilJDEi:APA91bFnSXWtUg5LzR3_CYgBBSqowXs-3w_aybRGa8jwIBCqyqnmNZHvBJLg6wOTccFQo_KQv2uAtZeLHGzB2PxqIAz-eRytaXUWoRy52WLOhCfigEP4d4c';

// DATA-ONLY payload to force Android OS to execute DeviMessagingService.java
const message = {
  token: token,
  data: {
    dealId: '3ce02dfa-d35a-4f63-bd5e-b2a38734771b',
    productName: 'Apple iPhone 15 Pro Max (256GB)',
    finalPrice: '1,39,900',
    customerName: 'Dilip Bhai (HQ Flagship)',
    customerPhone: '9893264192',
    storeId: 'DM-01',
    salesPersonName: 'Prince Verma',
    paymentMethod: 'EMI (Bajaj Finserv)',
    url: '/admin/super/approvals'
  },
  android: {
    priority: 'high'
  }
};

console.log('Sending PURE DATA message to invoke DeviMessagingService with native action buttons...');

messaging.send(message)
  .then((response) => {
    console.log('✅ PURE DATA MESSAGE SENT! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ Send error:', error);
  });

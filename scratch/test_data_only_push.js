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
const newToken = 'e8pX_je1RpCR0J6z5kaA_q:APA91bEq32YUlbovtzoJ3J2z0ZbdetnikHMSGYgbY2U9PcF6v1JP4X91ZZ6TQy0ngq8fDz0-tqQypCgoQdDnjwFgoYGdDZtz9iWa-FxtLGwqG-a_xtlslwQ';

// DATA-ONLY message so Android wakes up DeviMessagingService and draws custom action buttons!
const message = {
  token: newToken,
  data: {
    title: '🚨 Pending Deal Approval • ₹1,24,900',
    dealId: '14a9d5b0-a96b-4b30-8479-b42bbfb523aa',
    productName: 'Apple iPhone 15 Pro (256GB)',
    finalPrice: '1,24,900',
    customerName: 'Dilip Kishnani (HQ Live Demo)',
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

console.log('Sending DATA-ONLY push to trigger DeviMessagingService with native action buttons...');

messaging.send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Data-only push dispatched. Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

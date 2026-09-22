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
const token = 'cGCDhyYDQzKu69ogU9pxqk:APA91bEpPw-4D_Kc1A82hKaRJNp8Jg4b0xYcrt9OW1x_UpBBoMsIfB4GPvxdLb4I-svI8SBUvKskZpunu9uZr1RVkvdtXIT2WIxC-ERt3Kn6o1Bi2RbqDWQ';

const message = {
  token: token,
  notification: {
    title: '🚨 Pending Deal Approval • ₹1,19,999',
    body: '📱 Samsung Galaxy S24 Ultra 5G\n🏪 Store: DM-01 (Kanthal) | Staff: Prince Verma\n👤 Customer: Dilip Bhai (VIP Demo)\n👉 Tap to View, Approve or Reject'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: '339d8d89-7064-46c9-95c2-088e14488db0',
    type: 'deal_alert',
    productName: 'Samsung Galaxy S24 Ultra 5G',
    finalPrice: '119999',
    customerName: 'Dilip Bhai (VIP Demo)',
    customerPhone: '9893264192',
    storeId: 'DM-01',
    salesPersonName: 'Prince Verma',
    paymentMethod: 'EMI (Bajaj Finserv)'
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      priority: 'high',
      channelId: 'devi_deals',
      defaultSound: true,
      defaultVibrateTimings: true
    }
  }
};

messaging.send(message)
  .then((response) => {
    console.log('✅ DEMO NOTIFICATION SENT! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

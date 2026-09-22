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
    title: '🚨 Pending Deal Approval • ₹34,999',
    body: '📱 Vivo V30 Pro 5G (512GB) | Store: DM-01 (Kanthal)\n👤 Customer: Rahul Joshi | Staff: Aakash\n👉 Tap to View, Approve or Reject'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: 'deal-vivo-v30-pro',
    type: 'deal_alert',
    productName: 'Vivo V30 Pro 5G',
    customerName: 'Rahul Joshi',
    finalPrice: '34999',
    storeId: 'DM-01'
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

console.log('Sending clean professional deal alert to Dilip Bhai...');

messaging.send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Clean Deal Alert Delivered. Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

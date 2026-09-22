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
    title: '🚨 New Deal: ₹34,999 - Vivo V30 Pro (512GB)',
    body: 'Aakash (Kanthal DM-01) ne Rahul Joshi ke liye deal submit ki. Payment: EMI (Bajaj)'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: 'deal-live-vivo-30',
    type: 'deal_alert'
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

console.log('Sending salesman deal notification to Dilip Bhai...');

messaging.send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Salesman Deal Alert Delivered. Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

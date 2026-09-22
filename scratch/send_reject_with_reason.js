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
const token = 'ee8KEc_XT-GTFK8pI5iC49:APA91bHQQbKccGsLXaUsIYJyLq9rklbb0ZG5qz0rP21S9hL6y8P-hTsEsCr2lQ1vutNXkBrIooqF4r5sESzDfycmIClHcDPSDXupeVu5gyG2qya_B8Oyx8E';

const message = {
  token: token,
  notification: {
    title: '⚠️ Deal Rejected • OnePlus 12R (256GB)',
    body: '❌ Rejected by HQ: "CIBIL Score low (610). Bajaj Finance 0-downpayment loan not approved. Ask customer for 35% Cash Down Payment."\n🏪 Store: DM-01 | Staff: Prince Verma\n👉 Tap to review rejection or edit deal'
  },
  data: {
    url: '/admin/super/approvals?tab=rejected',
    dealId: 'rej-demo-102',
    type: 'deal_rejected',
    productName: 'OnePlus 12R (256GB)',
    finalPrice: '39,999',
    customerName: 'Dilip Bhai',
    storeId: 'DM-01',
    salesPersonName: 'Prince Verma',
    rejectionReason: 'CIBIL Score low (610). Bajaj Finance 0-downpayment loan not approved. Ask customer for 35% Cash Down Payment.'
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      priority: 'high',
      channelId: 'devi_deals',
      icon: 'ic_stat_devi',
      defaultSound: true,
      defaultVibrateTimings: true
    }
  }
};

console.log('Sending Deal Rejected with reason push notification...');

messaging.send(message)
  .then((response) => {
    console.log('✅ REJECT NOTIFICATION WITH REASON DELIVERED! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Error:', error);
  });

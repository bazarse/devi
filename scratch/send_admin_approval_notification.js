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
    title: '✅ Sale Approved & GST Bill Generated',
    body: '📱 Vivo X100 Pro 5G • ₹89,999 (Cash)\n🏪 Store DM-01 | Staff: Prince Verma\n👤 Customer: Dilip Bhai | 🧾 Bill: 25-26/3c065c/DEVI\n📦 IMEI Deducted from Inventory'
  },
  data: {
    url: '/admin/super/approvals?tab=approved',
    dealId: '3c065cf9-07b0-4c6b-afaf-f4cf61d4f554',
    type: 'deal_approved_confirmation',
    billNumber: '25-26/3c065c/DEVI'
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

messaging.send(message)
  .then((response) => {
    console.log('✅ SUPER ADMIN APPROVAL NOTIFICATION SENT! Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ Push error:', error);
  });

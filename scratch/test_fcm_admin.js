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
    title: '👋 Hello Dilip Bhai!',
    body: 'Devi Mobile: Hello Dilip Bhai, yeh doosra live test confirmation notification hai!'
  },
  data: {
    url: '/admin/super/approvals',
    dealId: 'test-direct-123'
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

console.log('Sending message to Google Firebase FCM v1 API...');

messaging.send(message)
  .then((response) => {
    console.log('✅ SUCCESS! Message sent to Google FCM. Message ID:', response);
  })
  .catch((error) => {
    console.error('❌ FCM Send Error:', error);
  });

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
const isFirebaseConfigured = fs.existsSync(serviceAccountPath);

if (!admin.apps.length && isFirebaseConfigured) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (!isFirebaseConfigured) {
  console.warn('[Firebase] firebase-service-account.json이 없어 비활성화됩니다.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotifications(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  if (!isFirebaseConfigured) {
    console.warn('[Firebase] 푸시 알림 미설정 상태 — 발송을 건너뜁니다.');
    return { successCount: 0, failureCount: tokens.length, failedTokens: tokens };
  }

  const response = await admin.messaging().sendEachForMulticast(message);

  const failedTokens: string[] = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      failedTokens.push(tokens[idx]);
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
}

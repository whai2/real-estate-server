import admin from 'firebase-admin';

const isFirebaseConfigured =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== 'your-firebase-project-id';

if (!admin.apps.length && isFirebaseConfigured) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
} else if (!isFirebaseConfigured) {
  console.warn('[Firebase] 설정이 없어 푸시 알림이 비활성화됩니다.');
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

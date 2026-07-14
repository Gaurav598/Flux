import {PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import api from '../config/api';

const LAST_NOTIF_ID_KEY = 'last_notification_id';
let pollingInterval: ReturnType<typeof setInterval> | null = null;

const getNotificationId = (remoteMessage: any): number | null => {
  const rawId = remoteMessage?.data?.notificationId;
  if (!rawId) {
    return null;
  }
  const parsed = parseInt(String(rawId), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const markLastSeenIfNewer = async (notificationId: number | null) => {
  if (!notificationId) {
    return;
  }
  const lastSeenId = await AsyncStorage.getItem(LAST_NOTIF_ID_KEY);
  const lastId = lastSeenId ? parseInt(lastSeenId, 10) : 0;
  if (notificationId > lastId) {
    await AsyncStorage.setItem(LAST_NOTIF_ID_KEY, notificationId.toString());
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.log('Notification permission request failed:', error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    try {
      await messaging().registerDeviceForRemoteMessages();
    } catch {
      // Some platforms/devices may already be registered.
    }

    const token = await messaging().getToken();
    return token || null;
  } catch (error) {
    console.log('Failed to get FCM token:', error);
    return null;
  }
};

export const setupNotificationListeners = (
  onNotification: (notification: any) => void,
  onNotificationOpened: (notification: any) => void,
): (() => void) => {
  const handleIncoming = async (
    remoteMessage: any,
    callback: (notification: any) => void,
  ) => {
    try {
      await markLastSeenIfNewer(getNotificationId(remoteMessage));
    } catch {}
    callback(remoteMessage);
  };

  const foregroundUnsubscribe = messaging().onMessage(async remoteMessage => {
    await handleIncoming(remoteMessage, onNotification);
  });

  const openedUnsubscribe = messaging().onNotificationOpenedApp(
    async remoteMessage => {
      await handleIncoming(remoteMessage, onNotificationOpened);
    },
  );

  messaging()
    .getInitialNotification()
    .then(async remoteMessage => {
      if (remoteMessage) {
        await handleIncoming(remoteMessage, onNotificationOpened);
      }
    })
    .catch(() => {});

  const tokenRefreshUnsubscribe = messaging().onTokenRefresh(async newToken => {
    try {
      await api.post('/user/fcm-token', {fcmToken: newToken});
    } catch {
      // Token refresh can happen before auth/session restore.
    }
  });

  const pollNotifications = async () => {
    try {
      const response = await api.get('/notifications/unread');
      const notifications = response.data;
      if (Array.isArray(notifications) && notifications.length > 0) {
        const lastSeenId = await AsyncStorage.getItem(LAST_NOTIF_ID_KEY);
        const lastId = lastSeenId ? parseInt(lastSeenId, 10) : 0;

        for (const notif of notifications) {
          const notifType = String(notif.type || "").toUpperCase();
          if (notif.id > lastId) {
            if (notifType === "OTP_READY" || notifType === "RIDER_ARRIVED") {
              continue;
            }
            onNotification({
              notification: {
                title: notif.title,
                body: notif.message,
              },
              data: {
                type: notif.type,
                bookingId: notif.bookingId?.toString() || '',
                notificationId: String(notif.id),
              },
            });
          }
        }

        const maxId = Math.max(...notifications.map((n: any) => n.id));
        if (maxId > lastId) {
          await AsyncStorage.setItem(LAST_NOTIF_ID_KEY, maxId.toString());
        }
      }
    } catch {
      // Silently fail - user might not be authenticated yet.
    }
  };

  pollNotifications();
  pollingInterval = setInterval(pollNotifications, 10000);

  return () => {
    foregroundUnsubscribe();
    openedUnsubscribe();
    tokenRefreshUnsubscribe();

    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
};

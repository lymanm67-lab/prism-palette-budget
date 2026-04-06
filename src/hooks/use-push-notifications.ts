import { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// Lazy import to avoid issues in web context
let PushNotifications: any = null;

export function usePushNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const initialize = useCallback(async () => {
    if (!isNative) return;

    try {
      const { PushNotifications: PN } = await import('@capacitor/push-notifications');
      PushNotifications = PN;

      const permResult = await PushNotifications.checkPermissions();

      if (permResult.receive === 'prompt') {
        const reqResult = await PushNotifications.requestPermissions();
        if (reqResult.receive !== 'granted') return;
      } else if (permResult.receive !== 'granted') {
        return;
      }

      setPermissionGranted(true);

      await PushNotifications.register();

      PushNotifications.addListener('registration', (t: { value: string }) => {
        setToken(t.value);
        console.log('[Push] Token:', t.value);
        // TODO: Save token to profiles table for server-side push delivery
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        console.error('[Push] Registration error:', err);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('[Push] Received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('[Push] Action:', action);
      });
    } catch (err) {
      console.warn('[Push] Not available:', err);
    }
  }, [isNative]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { isNative, permissionGranted, token, initialize };
}

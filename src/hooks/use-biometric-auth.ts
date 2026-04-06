import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_ENABLED_KEY = 'prism_biometric_enabled';

export function useBiometricAuth() {
  const isNative = Capacitor.isNativePlatform();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(
    () => localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true'
  );

  const checkAvailability = useCallback(async () => {
    if (!isNative) return false;
    try {
      // Use Capacitor's native biometric APIs when available
      // For now, we detect platform capability
      const platform = Capacitor.getPlatform();
      const available = platform === 'ios' || platform === 'android';
      setBiometricAvailable(available);
      return available;
    } catch {
      return false;
    }
  }, [isNative]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isNative || !biometricEnabled) return true;
    try {
      // Haptic feedback on auth prompt
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });

      // In production, this would call a native biometric plugin
      // e.g. @capacitor-community/biometric-auth or @aparajita/capacitor-biometric-auth
      // For now, we mark as authenticated
      setIsLocked(false);
      return true;
    } catch {
      return false;
    }
  }, [isNative, biometricEnabled]);

  const enableBiometric = useCallback((enabled: boolean) => {
    setBiometricEnabled(enabled);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
  }, []);

  const lock = useCallback(() => {
    if (biometricEnabled && isNative) {
      setIsLocked(true);
    }
  }, [biometricEnabled, isNative]);

  return {
    isNative,
    isLocked,
    biometricAvailable,
    biometricEnabled,
    checkAvailability,
    authenticate,
    enableBiometric,
    lock,
  };
}

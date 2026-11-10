import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Device security (docs/01-PROJE-DOKUMANI.md §6.11): fingerprint / face unlock with the
 * device PIN as the fallback, and FLAG_SECURE (no screenshots, a blank app-switcher card).
 */
export interface LockSupport {
  /** The phone can check a fingerprint or face, or at least has a screen lock. */
  available: boolean;
  biometric: boolean;
  /** Why the lock cannot be used, in plain words. */
  reason?: string;
}

export async function lockSupport(): Promise<LockSupport> {
  const [hardware, enrolled, level] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);
  const biometric = hardware && enrolled;
  const deviceLock = level !== LocalAuthentication.SecurityLevel.NONE;
  return {
    available: biometric || deviceLock,
    biometric,
    reason:
      biometric || deviceLock
        ? undefined
        : 'Telefonda ekran kilidi (PIN, desen, parmak izi) yok. Önce telefon ayarlarından bir kilit tanımla.',
  };
}

/** Asks for a fingerprint / face, or the device PIN. */
export async function unlock(prompt = 'Yatırım Takip kilidini aç'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Vazgeç',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function setScreenProtection(on: boolean): Promise<void> {
  if (on) await ScreenCapture.preventScreenCaptureAsync('settings');
  else await ScreenCapture.allowScreenCaptureAsync('settings');
}

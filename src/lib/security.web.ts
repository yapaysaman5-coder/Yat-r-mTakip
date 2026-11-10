import type { LockSupport } from './security';

/** Web preview: there is no device lock; the lock screen can still be tried with a button. */
export async function lockSupport(): Promise<LockSupport> {
  return { available: true, biometric: false };
}

export async function unlock(): Promise<boolean> {
  return true;
}

export async function setScreenProtection(): Promise<void> {}

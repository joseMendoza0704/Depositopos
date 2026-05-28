import { registerPlugin } from '@capacitor/core';

const BackgroundLocation = registerPlugin('BackgroundLocation');

/**
 * Starts native background location tracking.
 * This uses an Android Foreground Service with FusedLocationProvider
 * so GPS tracking continues even when:
 * - Screen is off
 * - App is in background  
 * - App is removed from recent apps
 * 
 * @param {string} entregaId - Firestore document ID of the active delivery
 * @param {string} clienteNombre - Customer name (shown in notification)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function startBackgroundTracking(entregaId, clienteNombre) {
  const isNative = window.Capacitor?.isNativePlatform?.();

  if (!isNative) {
    console.log('Background tracking only available on native platform');
    return { success: false, message: 'Not a native platform' };
  }

  try {
    const result = await BackgroundLocation.startTracking({
      entregaId,
      clienteNombre,
    });
    console.log('Background tracking started:', result);
    return result;
  } catch (error) {
    console.error('Error starting background tracking:', error);
    throw error;
  }
}

/**
 * Stops the native background location tracking service.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function stopBackgroundTracking() {
  const isNative = window.Capacitor?.isNativePlatform?.();

  if (!isNative) {
    return { success: false, message: 'Not a native platform' };
  }

  try {
    const result = await BackgroundLocation.stopTracking();
    console.log('Background tracking stopped:', result);
    return result;
  } catch (error) {
    console.error('Error stopping background tracking:', error);
    throw error;
  }
}

/**
 * Check if background tracking is currently running.
 * @returns {Promise<{isTracking: boolean}>}
 */
export async function isBackgroundTracking() {
  const isNative = window.Capacitor?.isNativePlatform?.();

  if (!isNative) {
    return { isTracking: false };
  }

  try {
    return await BackgroundLocation.isTracking();
  } catch (error) {
    console.error('Error checking tracking status:', error);
    return { isTracking: false };
  }
}

export default BackgroundLocation;

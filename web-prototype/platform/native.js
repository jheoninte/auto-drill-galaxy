import { Capacitor, registerPlugin } from '@capacitor/core';

export function createNativeProvider() {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AutoDrillNative')) return null;
  return registerPlugin('AutoDrillNative');
}

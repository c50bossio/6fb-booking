// Capacitor Haptics fallback for web
export const Haptics = {
  async impact(style: any) {
    // Fallback for web - use Web Vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },
  
  async notification(type: any) {
    // Fallback for web
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }
};

export const ImpactStyle = {
  Heavy: 'heavy',
  Medium: 'medium',
  Light: 'light'
};

export const NotificationType = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};
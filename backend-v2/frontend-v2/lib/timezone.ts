// Timezone utilities for booking system

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseAPIDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const formatTimeWithTimezone = (time: string, showTimezone: boolean = true): string => {
  if (showTimezone) {
    return `${time} ${getTimezoneDisplayName()}`;
  }
  return time;
};

export const getTimezoneDisplayName = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getTimezoneAbbreviation = (): string => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const shortName = new Intl.DateTimeFormat('en', {
    timeZoneName: 'short',
    timeZone: timezone,
  }).formatToParts().find(part => part.type === 'timeZoneName')?.value;
  
  return shortName || timezone.split('/').pop() || 'UTC';
};

export const getFriendlyDateLabel = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (formatDateForAPI(date) === formatDateForAPI(today)) {
    return 'Today';
  } else if (formatDateForAPI(date) === formatDateForAPI(tomorrow)) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDateForAPI(date) === formatDateForAPI(today);
};

export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForAPI(date) === formatDateForAPI(tomorrow);
};
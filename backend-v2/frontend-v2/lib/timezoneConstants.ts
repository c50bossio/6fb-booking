/**
 * Common timezones with their display names and metadata
 */

export interface TimezoneOption {
  value: string // IANA timezone identifier
  label: string // Display name
  offset: string // UTC offset (e.g., "-08:00")
  abbrev: string // Abbreviation (e.g., "PST")
  region: string // Geographic region
}

// Most common US timezones
export const US_TIMEZONES: TimezoneOption[] = [
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (Los Angeles)',
    offset: '-08:00',
    abbrev: 'PST',
    region: 'US',
  },
  {
    value: 'America/Denver',
    label: 'Mountain Time (Denver)',
    offset: '-07:00',
    abbrev: 'MST',
    region: 'US',
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (Chicago)',
    offset: '-06:00',
    abbrev: 'CST',
    region: 'US',
  },
  {
    value: 'America/New_York',
    label: 'Eastern Time (New York)',
    offset: '-05:00',
    abbrev: 'EST',
    region: 'US',
  },
  {
    value: 'America/Phoenix',
    label: 'Arizona Time (Phoenix)',
    offset: '-07:00',
    abbrev: 'MST',
    region: 'US',
  },
  {
    value: 'America/Anchorage',
    label: 'Alaska Time (Anchorage)',
    offset: '-09:00',
    abbrev: 'AKST',
    region: 'US',
  },
  {
    value: 'Pacific/Honolulu',
    label: 'Hawaii Time (Honolulu)',
    offset: '-10:00',
    abbrev: 'HST',
    region: 'US',
  },
]

// Major global timezones
export const GLOBAL_TIMEZONES: TimezoneOption[] = [
  // Europe
  {
    value: 'Europe/London',
    label: 'London (GMT/BST)',
    offset: '+00:00',
    abbrev: 'GMT',
    region: 'Europe',
  },
  {
    value: 'Europe/Paris',
    label: 'Paris (CET/CEST)',
    offset: '+01:00',
    abbrev: 'CET',
    region: 'Europe',
  },
  {
    value: 'Europe/Berlin',
    label: 'Berlin (CET/CEST)',
    offset: '+01:00',
    abbrev: 'CET',
    region: 'Europe',
  },
  {
    value: 'Europe/Moscow',
    label: 'Moscow (MSK)',
    offset: '+03:00',
    abbrev: 'MSK',
    region: 'Europe',
  },
  // Asia
  {
    value: 'Asia/Dubai',
    label: 'Dubai (GST)',
    offset: '+04:00',
    abbrev: 'GST',
    region: 'Asia',
  },
  {
    value: 'Asia/Kolkata',
    label: 'India (IST)',
    offset: '+05:30',
    abbrev: 'IST',
    region: 'Asia',
  },
  {
    value: 'Asia/Shanghai',
    label: 'China (CST)',
    offset: '+08:00',
    abbrev: 'CST',
    region: 'Asia',
  },
  {
    value: 'Asia/Tokyo',
    label: 'Tokyo (JST)',
    offset: '+09:00',
    abbrev: 'JST',
    region: 'Asia',
  },
  {
    value: 'Asia/Seoul',
    label: 'Seoul (KST)',
    offset: '+09:00',
    abbrev: 'KST',
    region: 'Asia',
  },
  // Australia & Pacific
  {
    value: 'Australia/Sydney',
    label: 'Sydney (AEDT)',
    offset: '+11:00',
    abbrev: 'AEDT',
    region: 'Australia',
  },
  {
    value: 'Australia/Melbourne',
    label: 'Melbourne (AEDT)',
    offset: '+11:00',
    abbrev: 'AEDT',
    region: 'Australia',
  },
  {
    value: 'Pacific/Auckland',
    label: 'Auckland (NZDT)',
    offset: '+13:00',
    abbrev: 'NZDT',
    region: 'Pacific',
  },
  // Americas (non-US)
  {
    value: 'America/Toronto',
    label: 'Toronto (EST/EDT)',
    offset: '-05:00',
    abbrev: 'EST',
    region: 'Americas',
  },
  {
    value: 'America/Vancouver',
    label: 'Vancouver (PST/PDT)',
    offset: '-08:00',
    abbrev: 'PST',
    region: 'Americas',
  },
  {
    value: 'America/Mexico_City',
    label: 'Mexico City (CST)',
    offset: '-06:00',
    abbrev: 'CST',
    region: 'Americas',
  },
  {
    value: 'America/Sao_Paulo',
    label: 'São Paulo (BRT)',
    offset: '-03:00',
    abbrev: 'BRT',
    region: 'Americas',
  },
  {
    value: 'America/Buenos_Aires',
    label: 'Buenos Aires (ART)',
    offset: '-03:00',
    abbrev: 'ART',
    region: 'Americas',
  },
]

// All timezones combined
export const ALL_TIMEZONES: TimezoneOption[] = [
  ...US_TIMEZONES,
  ...GLOBAL_TIMEZONES,
]

// Group timezones by region
export const TIMEZONES_BY_REGION = {
  US: US_TIMEZONES,
  Europe: GLOBAL_TIMEZONES.filter(tz => tz.region === 'Europe'),
  Asia: GLOBAL_TIMEZONES.filter(tz => tz.region === 'Asia'),
  Australia: GLOBAL_TIMEZONES.filter(tz => tz.region === 'Australia'),
  Pacific: GLOBAL_TIMEZONES.filter(tz => tz.region === 'Pacific'),
  Americas: GLOBAL_TIMEZONES.filter(tz => tz.region === 'Americas'),
}

// Timezone abbreviation mappings (for parsing)
export const TIMEZONE_ABBREV_MAP: Record<string, string[]> = {
  PST: ['America/Los_Angeles', 'America/Vancouver'],
  PDT: ['America/Los_Angeles', 'America/Vancouver'],
  MST: ['America/Denver', 'America/Phoenix'],
  MDT: ['America/Denver'],
  CST: ['America/Chicago', 'America/Mexico_City', 'Asia/Shanghai'],
  CDT: ['America/Chicago'],
  EST: ['America/New_York', 'America/Toronto'],
  EDT: ['America/New_York', 'America/Toronto'],
  GMT: ['Europe/London'],
  BST: ['Europe/London'],
  CET: ['Europe/Paris', 'Europe/Berlin'],
  CEST: ['Europe/Paris', 'Europe/Berlin'],
  JST: ['Asia/Tokyo'],
  KST: ['Asia/Seoul'],
  IST: ['Asia/Kolkata'],
  AEDT: ['Australia/Sydney', 'Australia/Melbourne'],
  AEST: ['Australia/Sydney', 'Australia/Melbourne'],
}

// Helper function to find timezone by abbreviation
export function getTimezoneByAbbrev(abbrev: string): string | null {
  const timezones = TIMEZONE_ABBREV_MAP[abbrev.toUpperCase()]
  return timezones ? timezones[0] : null
}

// Helper function to get timezone option by value
export function getTimezoneOption(value: string): TimezoneOption | undefined {
  return ALL_TIMEZONES.find(tz => tz.value === value)
}

// Helper function to search timezones
export function searchTimezones(query: string): TimezoneOption[] {
  const lowercaseQuery = query.toLowerCase()
  return ALL_TIMEZONES.filter(
    tz =>
      tz.value.toLowerCase().includes(lowercaseQuery) ||
      tz.label.toLowerCase().includes(lowercaseQuery) ||
      tz.abbrev.toLowerCase().includes(lowercaseQuery)
  )
}

// Default timezone (UTC)
export const DEFAULT_TIMEZONE: TimezoneOption = {
  value: 'UTC',
  label: 'Coordinated Universal Time (UTC)',
  offset: '+00:00',
  abbrev: 'UTC',
  region: 'Global',
}

// Common timezone groups for quick selection
export const TIMEZONE_GROUPS = [
  {
    label: 'United States',
    timezones: US_TIMEZONES,
  },
  {
    label: 'Europe',
    timezones: TIMEZONES_BY_REGION.Europe,
  },
  {
    label: 'Asia',
    timezones: TIMEZONES_BY_REGION.Asia,
  },
  {
    label: 'Australia & Pacific',
    timezones: [...TIMEZONES_BY_REGION.Australia, ...TIMEZONES_BY_REGION.Pacific],
  },
  {
    label: 'Americas',
    timezones: TIMEZONES_BY_REGION.Americas,
  },
]
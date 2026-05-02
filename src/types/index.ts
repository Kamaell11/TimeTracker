export type Country = 'PL' | 'NO' | 'UK' | 'DE';

export type EmploymentType =
  | 'pl_employment'
  | 'pl_contract'
  | 'pl_b2b_linear'
  | 'pl_b2b_scale'
  | 'pl_b2b_lump'
  | 'no_employee'
  | 'no_self_employed'
  | 'uk_employee'
  | 'uk_self_employed'
  | 'de_employee';

export type Language = 'en' | 'pl';

export type Currency = 'PLN' | 'NOK' | 'GBP' | 'EUR' | 'USD';

export interface UserSettings {
  country: Country;
  employmentType: EmploymentType;
  hourlyRate: number;
  currency: Currency;
  language: Language;
  b2bZusType?: 'preferential' | 'full';
  b2bLumpRate?: number;
  taxReliefEnabled?: boolean;
  useCustomTax?: boolean;
  customTaxPercent?: number;
  noBasicRate?: number;
  noHolidaySupplementPct?: number;
  noKongensTilleggHours?: number;
  autoBreakEnabled?: boolean;
  autoBreakThresholdHours?: number;
  autoBreakMinutes?: number;
  reminderEnabled?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
}

export interface WorkSession {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  note?: string;
  manualEntry?: boolean;
  holidayMode?: boolean;
}

export interface TaxBreakdown {
  gross: number;
  socialContributions: number;
  healthInsurance: number;
  taxBase: number;
  incomeTax: number;
  net: number;
  currency: Currency;
  extraLines?: { label: string; amount: number }[];
}

export const COUNTRY_DEFAULTS: Record<Country, { currency: Currency; employmentType: EmploymentType }> = {
  PL: { currency: 'PLN', employmentType: 'pl_employment' },
  NO: { currency: 'NOK', employmentType: 'no_employee' },
  UK: { currency: 'GBP', employmentType: 'uk_employee' },
  DE: { currency: 'EUR', employmentType: 'de_employee' },
};

export const COUNTRY_EMPLOYMENT_TYPES: Record<Country, EmploymentType[]> = {
  PL: ['pl_employment', 'pl_contract', 'pl_b2b_linear', 'pl_b2b_scale', 'pl_b2b_lump'],
  NO: ['no_employee', 'no_self_employed'],
  UK: ['uk_employee', 'uk_self_employed'],
  DE: ['de_employee'],
};

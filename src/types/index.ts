export type EmploymentType =
  | 'employment'
  | 'contract'
  | 'b2b_linear'
  | 'b2b_scale'
  | 'b2b_lump';

export type Language = 'en' | 'pl';

export type Currency = 'PLN' | 'EUR' | 'GBP' | 'USD';

export interface UserSettings {
  employmentType: EmploymentType;
  hourlyRate: number;
  currency: Currency;
  language: Language;
  b2bZusType?: 'preferential' | 'full';
  b2bLumpRate?: number;
  taxReliefEnabled?: boolean;
}

export interface WorkSession {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  note?: string;
  manualEntry?: boolean;
}

export interface TaxBreakdown {
  gross: number;
  zusEmployee: number;
  healthInsurance: number;
  taxBase: number;
  incomeTax: number;
  net: number;
  currency: Currency;
}

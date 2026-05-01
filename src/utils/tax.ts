import { EmploymentType, TaxBreakdown, UserSettings } from '../types';

const TAX_FREE_ANNUAL = 30000;
const TAX_THRESHOLD_ANNUAL = 120000;
const TAX_RATE_LOW = 0.12;
const TAX_RATE_HIGH = 0.32;
const TAX_RATE_LINEAR = 0.19;

const ZUS_PREFERENTIAL_MONTHLY = 400;
const ZUS_FULL_MONTHLY = 1773;

function calcEmployment(gross: number, taxReliefEnabled = true): TaxBreakdown {
  const zusEmployee = gross * (0.0976 + 0.015 + 0.0245);
  const healthInsuranceBase = gross - zusEmployee;
  const healthInsurance = healthInsuranceBase * 0.09;
  const costOfEarnings = 250;
  const taxDeductibleHealth = healthInsuranceBase * 0.0775;

  const annualGross = gross * 12;
  const taxBase = Math.max(0, healthInsuranceBase - costOfEarnings - (taxReliefEnabled ? TAX_FREE_ANNUAL / 12 : 0));

  let incomeTax: number;
  const annualBase = taxBase * 12;
  if (annualBase <= TAX_THRESHOLD_ANNUAL) {
    incomeTax = taxBase * TAX_RATE_LOW - taxDeductibleHealth;
  } else {
    const lowPart = (TAX_THRESHOLD_ANNUAL / 12) * TAX_RATE_LOW;
    const highPart = (taxBase - TAX_THRESHOLD_ANNUAL / 12) * TAX_RATE_HIGH;
    incomeTax = lowPart + highPart - taxDeductibleHealth;
  }
  incomeTax = Math.max(0, incomeTax);

  const net = gross - zusEmployee - healthInsurance - incomeTax;
  return { gross, zusEmployee, healthInsurance, taxBase, incomeTax, net, currency: 'PLN' };
}

function calcContract(gross: number): TaxBreakdown {
  const zusEmployee = gross * (0.0976 + 0.015 + 0.0245);
  const healthInsuranceBase = gross - zusEmployee;
  const healthInsurance = healthInsuranceBase * 0.09;
  const costOfEarnings = healthInsuranceBase * 0.2;
  const taxDeductibleHealth = healthInsuranceBase * 0.0775;
  const taxBase = Math.max(0, healthInsuranceBase - costOfEarnings);
  const incomeTax = Math.max(0, taxBase * TAX_RATE_LOW - taxDeductibleHealth);
  const net = gross - zusEmployee - healthInsurance - incomeTax;
  return { gross, zusEmployee, healthInsurance, taxBase, incomeTax, net, currency: 'PLN' };
}

function calcB2bLinear(gross: number, zusType: 'preferential' | 'full' = 'full'): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? ZUS_PREFERENTIAL_MONTHLY : ZUS_FULL_MONTHLY;
  const healthInsurance = gross * 0.049;
  const taxBase = Math.max(0, gross - zusEmployee);
  const incomeTax = taxBase * TAX_RATE_LINEAR;
  const net = gross - zusEmployee - healthInsurance - incomeTax;
  return { gross, zusEmployee, healthInsurance, taxBase, incomeTax, net, currency: 'PLN' };
}

function calcB2bScale(gross: number, zusType: 'preferential' | 'full' = 'full', taxReliefEnabled = true): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? ZUS_PREFERENTIAL_MONTHLY : ZUS_FULL_MONTHLY;
  const healthInsurance = gross * 0.09;
  const taxDeductibleHealth = gross * 0.0775;
  const taxBase = Math.max(0, gross - zusEmployee - (taxReliefEnabled ? TAX_FREE_ANNUAL / 12 : 0));
  let incomeTax: number;
  if (taxBase * 12 <= TAX_THRESHOLD_ANNUAL) {
    incomeTax = Math.max(0, taxBase * TAX_RATE_LOW - taxDeductibleHealth);
  } else {
    const lowPart = (TAX_THRESHOLD_ANNUAL / 12) * TAX_RATE_LOW;
    const highPart = (taxBase - TAX_THRESHOLD_ANNUAL / 12) * TAX_RATE_HIGH;
    incomeTax = Math.max(0, lowPart + highPart - taxDeductibleHealth);
  }
  const net = gross - zusEmployee - healthInsurance - incomeTax;
  return { gross, zusEmployee, healthInsurance, taxBase, incomeTax, net, currency: 'PLN' };
}

function calcB2bLump(gross: number, lumpRate: number, zusType: 'preferential' | 'full' = 'full'): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? ZUS_PREFERENTIAL_MONTHLY : ZUS_FULL_MONTHLY;
  let healthInsurance: number;
  if (gross <= 60000 / 12) healthInsurance = 461.66;
  else if (gross <= 300000 / 12) healthInsurance = 769.43;
  else healthInsurance = 1384.97;
  const taxBase = gross;
  const incomeTax = taxBase * lumpRate;
  const net = gross - zusEmployee - healthInsurance - incomeTax;
  return { gross, zusEmployee, healthInsurance, taxBase, incomeTax, net, currency: 'PLN' };
}

export function calculateTax(gross: number, settings: UserSettings): TaxBreakdown {
  const { employmentType, b2bZusType = 'full', b2bLumpRate = 0.12, taxReliefEnabled = true } = settings;

  switch (employmentType) {
    case 'employment':
      return calcEmployment(gross, taxReliefEnabled);
    case 'contract':
      return calcContract(gross);
    case 'b2b_linear':
      return calcB2bLinear(gross, b2bZusType);
    case 'b2b_scale':
      return calcB2bScale(gross, b2bZusType, taxReliefEnabled);
    case 'b2b_lump':
      return calcB2bLump(gross, b2bLumpRate, b2bZusType);
    default:
      return calcEmployment(gross, taxReliefEnabled);
  }
}

export function hoursToGross(hours: number, hourlyRate: number): number {
  return hours * hourlyRate;
}

export function msToHours(ms: number): number {
  return ms / 1000 / 3600;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

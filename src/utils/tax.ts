import { Currency, TaxBreakdown, UserSettings } from '../types';

// ─── Poland ───────────────────────────────────────────────────────────────────

function calcPlEmployment(gross: number, taxReliefEnabled = true): TaxBreakdown {
  const zusEmployee = gross * (0.0976 + 0.015 + 0.0245);
  const healthBase = gross - zusEmployee;
  const healthInsurance = healthBase * 0.09;
  const taxDeductibleHealth = healthBase * 0.0775;
  const costOfEarnings = 250;
  const relief = taxReliefEnabled ? 30000 / 12 : 0;
  const taxBase = Math.max(0, healthBase - costOfEarnings - relief);
  const annualBase = taxBase * 12;
  let incomeTax: number;
  if (annualBase <= 120000) {
    incomeTax = taxBase * 0.12 - taxDeductibleHealth;
  } else {
    incomeTax = (120000 / 12) * 0.12 + (taxBase - 120000 / 12) * 0.32 - taxDeductibleHealth;
  }
  incomeTax = Math.max(0, incomeTax);
  return {
    gross, socialContributions: zusEmployee, healthInsurance, taxBase, incomeTax,
    net: gross - zusEmployee - healthInsurance - incomeTax, currency: 'PLN',
  };
}

function calcPlContract(gross: number): TaxBreakdown {
  const zusEmployee = gross * (0.0976 + 0.015 + 0.0245);
  const healthBase = gross - zusEmployee;
  const healthInsurance = healthBase * 0.09;
  const costOfEarnings = healthBase * 0.2;
  const taxDeductibleHealth = healthBase * 0.0775;
  const taxBase = Math.max(0, healthBase - costOfEarnings);
  const incomeTax = Math.max(0, taxBase * 0.12 - taxDeductibleHealth);
  return {
    gross, socialContributions: zusEmployee, healthInsurance, taxBase, incomeTax,
    net: gross - zusEmployee - healthInsurance - incomeTax, currency: 'PLN',
  };
}

function calcPlB2bLinear(gross: number, zusType: 'preferential' | 'full' = 'full'): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? 400 : 1773;
  const healthInsurance = gross * 0.049;
  const taxBase = Math.max(0, gross - zusEmployee);
  const incomeTax = taxBase * 0.19;
  return {
    gross, socialContributions: zusEmployee, healthInsurance, taxBase, incomeTax,
    net: gross - zusEmployee - healthInsurance - incomeTax, currency: 'PLN',
  };
}

function calcPlB2bScale(gross: number, zusType: 'preferential' | 'full' = 'full', taxReliefEnabled = true): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? 400 : 1773;
  const healthInsurance = gross * 0.09;
  const taxDeductibleHealth = gross * 0.0775;
  const relief = taxReliefEnabled ? 30000 / 12 : 0;
  const taxBase = Math.max(0, gross - zusEmployee - relief);
  let incomeTax: number;
  if (taxBase * 12 <= 120000) {
    incomeTax = Math.max(0, taxBase * 0.12 - taxDeductibleHealth);
  } else {
    incomeTax = Math.max(0, (120000 / 12) * 0.12 + (taxBase - 120000 / 12) * 0.32 - taxDeductibleHealth);
  }
  return {
    gross, socialContributions: zusEmployee, healthInsurance, taxBase, incomeTax,
    net: gross - zusEmployee - healthInsurance - incomeTax, currency: 'PLN',
  };
}

function calcPlB2bLump(gross: number, lumpRate: number, zusType: 'preferential' | 'full' = 'full'): TaxBreakdown {
  const zusEmployee = zusType === 'preferential' ? 400 : 1773;
  const healthInsurance = gross <= 5000 ? 461.66 : gross <= 25000 ? 769.43 : 1384.97;
  const incomeTax = gross * lumpRate;
  return {
    gross, socialContributions: zusEmployee, healthInsurance, taxBase: gross, incomeTax,
    net: gross - zusEmployee - healthInsurance - incomeTax, currency: 'PLN',
  };
}

// ─── Norway ───────────────────────────────────────────────────────────────────

function calcTrinnskatt(taxableAnnual: number): number {
  let tax = 0;
  if (taxableAnnual > 237900) tax += (Math.min(taxableAnnual, 671100) - 237900) * 0.017;
  if (taxableAnnual > 671100) tax += (Math.min(taxableAnnual, 1092150) - 671100) * 0.04;
  if (taxableAnnual > 1092150) tax += (Math.min(taxableAnnual, 2174350) - 1092150) * 0.136;
  if (taxableAnnual > 2174350) tax += (taxableAnnual - 2174350) * 0.166;
  return tax;
}

function calcNoEmployee(gross: number): TaxBreakdown {
  const annual = gross * 12;
  const minstefradrag = Math.min(annual * 0.46, 92000);
  const personfradrag = 108550;
  const taxableAnnual = Math.max(0, annual - minstefradrag - personfradrag);
  const ordinaryTax = taxableAnnual * 0.22;
  const trinnskatt = calcTrinnskatt(taxableAnnual);
  const trygdeavgift = Math.max(0, annual - 99650) * 0.077;
  const totalTax = (ordinaryTax + trinnskatt + trygdeavgift) / 12;
  return {
    gross, socialContributions: trygdeavgift / 12, healthInsurance: 0,
    taxBase: taxableAnnual / 12,
    incomeTax: (ordinaryTax + trinnskatt) / 12,
    net: gross - totalTax, currency: 'NOK',
    extraLines: [{ label: 'Trinnskatt', amount: trinnskatt / 12 }],
  };
}

function calcNoSelfEmployed(gross: number): TaxBreakdown {
  const annual = gross * 12;
  const personfradrag = 108550;
  const taxableAnnual = Math.max(0, annual - personfradrag);
  const ordinaryTax = taxableAnnual * 0.22;
  const trinnskatt = calcTrinnskatt(taxableAnnual);
  const trygdeavgift = Math.max(0, annual - 99650) * 0.077;
  const socialContributions = annual * 0.109;
  const totalTax = (ordinaryTax + trinnskatt + trygdeavgift + socialContributions) / 12;
  return {
    gross, socialContributions: (trygdeavgift + socialContributions) / 12, healthInsurance: 0,
    taxBase: taxableAnnual / 12,
    incomeTax: (ordinaryTax + trinnskatt) / 12,
    net: gross - totalTax, currency: 'NOK',
  };
}

// ─── United Kingdom ───────────────────────────────────────────────────────────

function calcUkIncomeTax(annual: number): number {
  const taxable = Math.max(0, annual - 12570);
  if (taxable <= 37700) return taxable * 0.2;
  if (taxable <= 125140 - 12570) return 37700 * 0.2 + (taxable - 37700) * 0.4;
  return 37700 * 0.2 + (112570 - 37700) * 0.4 + (taxable - 112570) * 0.45;
}

function calcUkEmployee(gross: number): TaxBreakdown {
  const annual = gross * 12;
  const incomeTax = calcUkIncomeTax(annual);
  let ni = 0;
  if (annual > 12570) {
    ni += Math.min(annual - 12570, 37700) * 0.08;
    if (annual > 50270) ni += (annual - 50270) * 0.02;
  }
  const totalTax = (incomeTax + ni) / 12;
  return {
    gross, socialContributions: ni / 12, healthInsurance: 0,
    taxBase: Math.max(0, annual - 12570) / 12,
    incomeTax: incomeTax / 12,
    net: gross - totalTax, currency: 'GBP',
  };
}

function calcUkSelfEmployed(gross: number): TaxBreakdown {
  const annual = gross * 12;
  const incomeTax = calcUkIncomeTax(annual);
  const class2 = annual > 6725 ? 163.8 : 0;
  let class4 = 0;
  if (annual > 12570) {
    class4 += Math.min(annual - 12570, 37700) * 0.08;
    if (annual > 50270) class4 += (annual - 50270) * 0.02;
  }
  const totalNI = class2 + class4;
  const totalTax = (incomeTax + totalNI) / 12;
  return {
    gross, socialContributions: totalNI / 12, healthInsurance: 0,
    taxBase: Math.max(0, annual - 12570) / 12,
    incomeTax: incomeTax / 12,
    net: gross - totalTax, currency: 'GBP',
  };
}

// ─── Germany ──────────────────────────────────────────────────────────────────

function calcDeEmployee(gross: number): TaxBreakdown {
  const annual = gross * 12;
  const pension = annual * 0.093;
  const unemployment = annual * 0.013;
  const health = annual * 0.0855;
  const longTermCare = annual * 0.018;
  const socialContributions = pension + unemployment + health + longTermCare;
  const taxableAnnual = Math.max(0, annual - socialContributions - 12096);
  let incomeTax = 0;
  if (taxableAnnual > 0 && taxableAnnual <= 68429) {
    const avgRate = 0.14 + (taxableAnnual / 68429) * 0.28;
    incomeTax = taxableAnnual * avgRate;
  } else if (taxableAnnual <= 277825) {
    incomeTax = 68429 * 0.28 + (taxableAnnual - 68429) * 0.42;
  } else {
    incomeTax = 68429 * 0.28 + (277825 - 68429) * 0.42 + (taxableAnnual - 277825) * 0.45;
  }
  const solZ = incomeTax > 16956 ? incomeTax * 0.055 : 0;
  const totalDeductions = (socialContributions + incomeTax + solZ) / 12;
  return {
    gross, socialContributions: socialContributions / 12, healthInsurance: health / 12,
    taxBase: taxableAnnual / 12,
    incomeTax: (incomeTax + solZ) / 12,
    net: gross - totalDeductions, currency: 'EUR',
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

function calcCustomTax(gross: number, taxPercent: number, currency: Currency): TaxBreakdown {
  const incomeTax = gross * (taxPercent / 100);
  return {
    gross, socialContributions: 0, healthInsurance: 0,
    taxBase: gross, incomeTax,
    net: gross - incomeTax, currency,
  };
}

export function calculateTax(gross: number, settings: UserSettings): TaxBreakdown {
  if (settings.useCustomTax && settings.customTaxPercent != null) {
    return calcCustomTax(gross, settings.customTaxPercent, settings.currency);
  }
  const { employmentType, b2bZusType = 'full', b2bLumpRate = 0.12, taxReliefEnabled = true } = settings;
  switch (employmentType) {
    case 'pl_employment': return calcPlEmployment(gross, taxReliefEnabled);
    case 'pl_contract':   return calcPlContract(gross);
    case 'pl_b2b_linear': return calcPlB2bLinear(gross, b2bZusType);
    case 'pl_b2b_scale':  return calcPlB2bScale(gross, b2bZusType, taxReliefEnabled);
    case 'pl_b2b_lump':   return calcPlB2bLump(gross, b2bLumpRate, b2bZusType);
    case 'no_employee':       return calcNoEmployee(gross);
    case 'no_self_employed':  return calcNoSelfEmployed(gross);
    case 'uk_employee':       return calcUkEmployee(gross);
    case 'uk_self_employed':  return calcUkSelfEmployed(gross);
    case 'de_employee':       return calcDeEmployee(gross);
    default: return calcPlEmployment(gross, taxReliefEnabled);
  }
}

export function hoursToGross(hours: number, hourlyRate: number): number {
  return hours * hourlyRate;
}

export interface HolidayPayBreakdown {
  regularPay: number;
  holidaySupplement: number;
  kongensTillegg: number;
  breakDeductionHours: number;
  totalGross: number;
  effectiveHours: number;
}

export function calculateHolidayPay(
  workedHours: number,
  fullRate: number,
  basicRate: number,
  supplementPct: number,
  kongensTilleggHours: number,
  breakThresholdHours = 12,
  breakMinutes = 30,
): HolidayPayBreakdown {
  const breakDeductionHours = workedHours >= breakThresholdHours ? breakMinutes / 60 : 0;
  const paidHours = workedHours - breakDeductionHours;
  const regularPay = paidHours * fullRate;
  const holidaySupplement = paidHours * basicRate * (supplementPct / 100);
  const kongensTillegg = kongensTilleggHours * basicRate;
  const totalGross = regularPay + holidaySupplement + kongensTillegg;
  const effectiveHours = paidHours + (holidaySupplement + kongensTillegg) / fullRate;
  return { regularPay, holidaySupplement, kongensTillegg, breakDeductionHours, totalGross, effectiveHours };
}

export function msToHours(ms: number): number {
  return ms / 1000 / 3600;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

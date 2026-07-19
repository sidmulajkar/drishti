import type { SectorProfile } from '../schema'

export const PROFILE: SectorProfile = {
  id: 'dairy',
  name: 'Dairy Farming',
  icon: '🥛',
  description:
    'Small-to-medium dairy enterprises dependent on cooperative milk procurement, fodder availability, and animal health. Revenue peaks during the Oct-Mar flush season when milk yield rises 20-35% above baseline.',

  seasonalMultipliers: [
    1.15, // Jan  — flush tail
    1.10, // Feb  — flush tail
    1.05, // Mar  — transition
    0.90, // Apr  — lean onset
    0.80, // May  — peak heat stress
    0.75, // Jun  — monsoon lean
    0.80, // Jul  — monsoon lean
    0.85, // Aug  — recovery begins
    0.95, // Sep  — pre-flush
    1.15, // Oct  — flush onset
    1.20, // Nov  — flush peak
    1.25, // Dec  — flush peak
  ],

  costStructure: [
    {
      name: 'Cattle feed & fodder',
      percentageOfRevenue: 0.65,
      volatility: 'high',
      researchBasis: {
        source: 'IBEF Dairy Sector Report 2025',
        specificFinding:
          'Feed costs constitute 55-75% of total dairy farming expenses; green fodder and concentrates are the primary cost drivers.',
        indiaValidation: 'NDDB cooperative member cost breakdowns confirm 60-70% feed share in Gujarat, Maharashtra.',
        limitations: 'Urban peri-urban farms may have lower feed costs due to agro-waste access.',
      },
    },
    {
      name: 'Veterinary & healthcare',
      percentageOfRevenue: 0.06,
      volatility: 'medium',
      researchBasis: {
        source: 'NABARD All India Rural Financial Inclusion Survey 2021-22',
        specificFinding:
          'Veterinary expenditure ranges 5-8% of revenue, with spikes during disease outbreaks (foot-and-mouth, mastitis).',
        indiaValidation: 'NABARD survey of 100,000+ rural households across 29 states.',
        limitations: 'Does not account for government-subsidized veterinary camps.',
      },
    },
    {
      name: 'Labour (family + hired)',
      percentageOfRevenue: 0.17,
      volatility: 'low',
      researchBasis: {
        source: 'NDDB Dairy Cooperative Statistics 2024',
        specificFinding:
          'Labour constitutes 15-20% of dairy operating costs; family labour is under-reported in smallholder operations.',
        indiaValidation: 'NDDB Annual Report 2023-24, cooperative-level cost data.',
        limitations: 'Family labour opportunity cost is typically excluded from smallholder accounting.',
      },
    },
  ],

  revenueStructure: {
    primarySource: 'Cooperative milk procurement sales',
    paymentCycle: 'Monthly, typically 10th-15th via bank transfer',
    creditComponent: 0,
    researchBasis: {
      source: 'NDDB & AMUL Cooperative Procurement Model',
      specificFinding:
        'Cooperative dairies pay farmers within 7-15 days of milk collection; credit component is near zero as procurement is against daily quality-tested quantity.',
      indiaValidation: 'NDDB operates 18,000+ village-level collection centres across 22 states.',
      limitations: 'Small private dairies may delay payments 15-30 days.',
    },
  },

  signalRelevance: [
    {
      signal: 'fodder_price',
      weight: 0.30,
      reason:
        'Fodder is the single largest cost item (55-75% of revenue). A 20% spike in green fodder prices during drought directly compresses margins.',
    },
    {
      signal: 'thi',
      weight: 0.25,
      reason:
        'Temperature-Humidity Index above 75 reduces milk yield 10-25% (heat stress). Peak impact May-Jun during the lean season.',
    },
    {
      signal: 'dscr',
      weight: 0.20,
      reason:
        'Dairy loans ( milch animal purchase, shed construction) carry 12-18% interest; DSCR < 1.0 signals inability to service debt from milk income.',
    },
    {
      signal: 'milk_yield',
      weight: 0.15,
      reason:
        'Per-animal yield is the primary revenue driver. Declining yield (below 4 litres/cow/day) signals health or feed issues.',
    },
    {
      signal: 'nach_bounce',
      weight: 0.10,
      reason:
        'NACH bounce on dairy loan EMI is a lagging indicator of cash stress, typically appearing 2-3 months after fodder price spikes.',
    },
  ],

  riskThresholds: {
    cashRunwayCritical: 1.5,
    dscrWarning: 1.0,
    savingsFloorCritical: 0.5,
    recoveryRateWarning: 0.70,
  },

  riskFactors: [
    'Fodder price volatility (drought, flood damage to green fodder)',
    'Heat stress reducing milk yield 10-25% during summer',
    'Animal disease outbreaks (FMD, mastitis, brucellosis)',
    'Cooperative payment delays in cash-strapped dairies',
    'Feed adulteration affecting animal health and yield',
    'Water scarcity affecting both animal health and fodder growth',
  ],

  avgMonthlyRevenue: [16000, 25000],
  avgMonthlyExpenses: [10000, 18000],
  avgLoanOutstanding: [50000, 200000],
  avgSavingsBalance: [10000, 50000],

  dpiConfig: {
    upiPenetration: 0.30,
    nachRelevance: 0.80,
    mgnregaCorrelation: 0.30,
    commodityPriceSensitivity: 0.90,
  },
}

import type { SectorProfile } from '../schema'

export const PROFILE: SectorProfile = {
  id: 'mgnrega_wages',
  name: 'MGNREGA Wage Workers',
  icon: '👷',
  description:
    'Households dependent on Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA) person-day wages as primary or supplementary income. Income is highly seasonal (monsoon-driven), government-disbursed via DBT, and subject to demand-supply mismatch at the block level.',

  seasonalMultipliers: [
    0.70, // Jan  — lean (post-monsoon, limited work)
    0.65, // Feb  — deepest lean
    0.70, // Mar  — lean, pre-kharif preparation
    0.80, // Apr  — summer work begins (water conservation, trenching)
    1.00, // May  — pre-monsoon work increases
    1.30, // Jun  — monsoon peak (watershed, ridge-to-valley)
    1.45, // Jul  — monsoon peak (highest demand)
    1.50, // Aug  — monsoon peak (highest demand)
    1.35, // Sep  — monsoon tail
    0.80, // Oct  — post-monsoon, kharif harvest competes
    0.65, // Nov  — lean
    0.60, // Dec  — deepest lean (cold, limited outdoor work)
  ],

  costStructure: [
    {
      name: 'Tools & personal protective equipment',
      percentageOfRevenue: 0.04,
      volatility: 'low',
      researchBasis: {
        source: 'NABARD MGNREGA Impact Assessment Report 2024',
        specificFinding:
          'Worker-level costs are minimal (5-10% of wages) — primarily personal tools (spade, basket), transport, and food during work. MGNREGA provides tools at worksite but quality is poor.',
        indiaValidation: 'NABARD study across 200 blocks in 100 districts.',
        limitations: 'Does not include opportunity cost of time away from agriculture.',
      },
    },
    {
      name: 'Transport to worksite',
      percentageOfRevenue: 0.05,
      volatility: 'low',
      researchBasis: {
        source: 'Ministry of Rural Development — MGNREGA Sameeksha II 2023',
        specificFinding:
          'Average transport cost is 3-8% of daily wage (INR 15-40 per trip). Workers within 2km walk; beyond that, transport cost becomes significant.',
        indiaValidation: 'MoRD synthesis of 70+ research studies on MGNREGA.',
        limitations: 'Rural transport infrastructure varies enormously by state.',
      },
    },
  ],

  revenueStructure: {
    primarySource: 'MGNREGA person-day wages disbursed via DBT to Aadhaar-linked bank accounts',
    paymentCycle: 'Monthly (within 15 days of work completion, per MGNREGA Act mandate)',
    creditComponent: 0,
    researchBasis: {
      source: 'Ministry of Rural Development — MGNREGA Dashboard 2025',
      specificFinding:
        'Wages are government-guaranteed (INR 229-323/day by state, averaged INR 264/day in 2024-25). Payment is via PFMS → bank/post office → Aadhaar-linked DBT. Credit component is zero by design.',
      indiaValidation: 'MoRD MIS data: 5.97 crore active workers in 2024-25, 237 crore person-days generated.',
      limitations: 'Payment delays (average 12-20 days beyond mandate) create cash flow gaps despite zero credit.',
    },
  },

  signalRelevance: [
    {
      signal: 'mgnrega_demand',
      weight: 0.40,
      reason:
        'Block-level person-day demand is the primary income indicator. High demand signals both opportunity (more work available) and distress (agricultural failure pushing people to MGNREGA).',
    },
    {
      signal: 'spi',
      weight: 0.30,
      reason:
        'Standardized Precipitation Index drives MGNREGA demand. Drought (SPI < -1.0) triggers massive demand spikes as agriculture fails, while normal monsoon (SPI 0 to 1) reduces MGNREGA dependency.',
    },
    {
      signal: 'upi_velocity',
      weight: 0.15,
      reason:
        'UPI transaction velocity for MGNREGA workers reflects both payment receipt (DBT inflow) and consumption patterns. Declining velocity after payment cycle signals distress.',
    },
    {
      signal: 'nach_bounce',
      weight: 0.15,
      reason:
        'NACH bounce on any existing loan (KCC, SHG, personal) is critical because MGNREGA workers have minimal income sources. A single EMI bounce can cascade into debt trap.',
    },
  ],

  riskThresholds: {
    cashRunwayCritical: 2.0,
    dscrWarning: 1.0,
    savingsFloorCritical: 1.0,
    recoveryRateWarning: 1.0,
  },

  riskFactors: [
    'Payment delays beyond MGNREGA Act mandate (15 days) — average 12-20 day delay nationwide',
    'Demand-supply mismatch: fewer person-days demanded than requested (MoRD 2024: avg 42 days/household vs 100 mandated)',
    'Aadhaar-linked DBT failures (biometric mismatch, bank account dormancy)',
    'State-level fiscal stress delaying wage disbursement (Bihar, Jharkhand, UP)',
    'Corruption in muster rolls — phantom workers reducing real allocation',
    'Climate-driven demand spikes overwhelming limited budgets during drought years',
  ],

  avgMonthlyRevenue: [5000, 15000],
  avgMonthlyExpenses: [4000, 12000],
  avgLoanOutstanding: [10000, 50000],
  avgSavingsBalance: [5000, 20000],

  dpiConfig: {
    upiPenetration: 0.20,
    nachRelevance: 0.50,
    mgnregaCorrelation: 0.90,
    commodityPriceSensitivity: 0.30,
  },
}

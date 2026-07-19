import type { SectorProfile } from '../schema'

export const PROFILE: SectorProfile = {
  id: 'rural_retail',
  name: 'Rural Retail (Kirana)',
  icon: '🏪',
  description:
    'Village-level general stores (kirana) serving daily household needs. Revenue is a mix of cash and udhaar (credit sales to regular customers). Inventory turnover and credit recovery rate are the critical health indicators.',

  seasonalMultipliers: [
    1.05, // Jan  — post-harvest spending
    1.00, // Feb  — baseline
    1.00, // Mar  — baseline
    1.00, // Apr  — baseline
    0.95, // May  — pre-monsoon lean
    0.85, // Jun  — monsoon lean (poor road access, low footfall)
    0.80, // Jul  — monsoon trough
    0.90, // Aug  — recovery begins
    1.00, // Sep  — pre-festival stocking
    1.20, // Oct  — festival peak (Navratri, Dussehra)
    1.25, // Nov  — festival peak (Diwali, Bhai Dooj)
    1.10, // Dec  — wedding season spending
  ],

  costStructure: [
    {
      name: 'Inventory / wholesale purchase',
      percentageOfRevenue: 0.75,
      volatility: 'medium',
      researchBasis: {
        source: 'IBEF Retail & Consumer Durables Report 2025',
        specificFinding:
          'Inventory procurement constitutes 70-80% of kirana operating costs. Wholesale purchase cycles are 7-15 days for fast-moving goods.',
        indiaValidation: 'Kirana stores account for ~80% of Indian retail (DIPP/PIB 2024).',
        limitations: 'Excludes own-label or home-manufactured goods.',
      },
    },
    {
      name: 'Shop rent / own premises cost',
      percentageOfRevenue: 0.08,
      volatility: 'low',
      researchBasis: {
        source: 'CRISIL SME Retail Survey 2023',
        specificFinding:
          'Rent or opportunity cost of owned premises is 5-10% of revenue for rural kirana shops; urban locations may reach 12-15%.',
        indiaValidation: 'CRISIL study of 5,000+ kirana outlets across Tier 2-3 towns.',
        limitations: 'Owned premises may under-report true cost.',
      },
    },
    {
      name: 'Helper / part-time labour',
      percentageOfRevenue: 0.06,
      volatility: 'low',
      researchBasis: {
        source: 'NABARD Rural Non-Farm Sector Survey 2022',
        specificFinding:
          '5-8% of kirana revenue goes to part-time helpers; most shops are single-person or family-operated during off-peak.',
        indiaValidation: 'NABARD survey covering rural retail across 200+ districts.',
        limitations: 'Family labour not included in expense accounting.',
      },
    },
  ],

  revenueStructure: {
    primarySource: 'Mixed cash + udhaar (credit) sales to village consumers',
    paymentCycle: 'Daily cash collection, weekly/monthly credit settlement',
    creditComponent: 0.40,
    researchBasis: {
      source: 'Industry practice — udhaar recovery pattern data & CGAP Udhaar Research 2024',
      specificFinding:
        'Udhaar (credit sales) constitutes 40-90% of rural kirana revenue. Recovery rate varies 55-85% depending on community trust networks and economic cycles.',
      indiaValidation: 'CGAP field studies in Uttar Pradesh, Bihar, Rajasthan confirm 60-80% credit share in rural retail.',
      limitations: 'Urban kirana stores have lower credit share (20-30%).',
    },
  },

  signalRelevance: [
    {
      signal: 'recovery_rate',
      weight: 0.30,
      reason:
        'Udhaar recovery rate is the single most predictive metric for kirana survival. Below 55% recovery means the shop is effectively funding household consumption of defaulting customers.',
    },
    {
      signal: 'credit_sales_ratio',
      weight: 0.25,
      reason:
        'High credit ratio (>80%) signals either economic distress (customers cannot pay cash) or poor credit discipline. Both compress working capital.',
    },
    {
      signal: 'wholesale_index',
      weight: 0.20,
      reason:
        'Wholesale price index changes directly impact procurement costs. Kirana margins are thin (10-20%); a 10% wholesale spike can eliminate profitability.',
    },
    {
      signal: 'upi_velocity',
      weight: 0.15,
      reason:
        'Declining UPI transaction count signals reduced footfall or customer economic distress. UPI adoption is growing in rural India (NPCI 2025: ~35% rural penetration).',
    },
    {
      signal: 'nach_bounce',
      weight: 0.10,
      reason:
        'NACH bounce on shop working capital loan EMI signals cash flow mismatch between credit sales and wholesale payment obligations.',
    },
  ],

  riskThresholds: {
    cashRunwayCritical: 1.0,
    dscrWarning: 1.0,
    savingsFloorCritical: 0.5,
    recoveryRateWarning: 0.55,
  },

  riskFactors: [
    'Udhaar default cascade — one large defaulter can trigger chain reaction in close-knit communities',
    'Inventory shrinkage and expiry (FMCG, perishables)',
    'Wholesale price inflation compressing thin margins',
    'Competition from e-commerce and mobile-based ordering (JioMart, Amazon Fresh)',
    'Seasonal demand swings tied to harvest cycles and festivals',
    'Road access disruption during monsoon reducing footfall',
  ],

  avgMonthlyRevenue: [15000, 50000],
  avgMonthlyExpenses: [12000, 40000],
  avgLoanOutstanding: [30000, 150000],
  avgSavingsBalance: [10000, 40000],

  dpiConfig: {
    upiPenetration: 0.45,
    nachRelevance: 0.90,
    mgnregaCorrelation: 0.40,
    commodityPriceSensitivity: 0.70,
  },
}

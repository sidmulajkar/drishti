import type { SectorProfile } from '../schema'

export const PROFILE: SectorProfile = {
  id: 'agriculture',
  name: 'Agriculture (Crop Farming)',
  icon: '🌾',
  description:
    'Smallholder crop farmers dependent on kharif (monsoon) and rabi (winter) harvest cycles. Revenue is highly seasonal — arriving in 2-3 large lumps per year — while expenses are spread continuously. This mismatch creates acute cash flow stress between harvests.',

  seasonalMultipliers: [
    0.80, // Jan  — rabi growing, no harvest
    0.75, // Feb  — rabi growing, leanest cash flow
    1.15, // Mar  — rabi harvest begins (wheat, mustard, gram)
    1.25, // Apr  — rabi harvest peak
    1.10, // May  — rabi harvest tail, pre-kharif
    0.85, // Jun  — kharif sowing (expense heavy, no income)
    0.70, // Jul  — kharif growing, maximum cash stress
    0.75, // Aug  — kharif growing, early crop damage risk
    1.00, // Sep  — kharif early harvest ( pulses, oilseeds)
    1.30, // Oct  — kharif harvest peak (paddy, maize)
    1.40, // Nov  — kharif harvest peak, market arrival
    1.05, // Dec  — kharif tail, rabi sowing begins
  ],

  costStructure: [
    {
      name: 'Fertilizers & soil amendments',
      percentageOfRevenue: 0.23,
      volatility: 'medium',
      researchBasis: {
        source: 'IBEF Agriculture & Food Processing Report 2025',
        specificFinding:
          'Fertilizer costs (urea, DAP, MOP) constitute 20-25% of cultivation cost. Government subsidy covers ~50% of MRP but black-market diversion inflates effective price.',
        indiaValidation: 'IBEF citing Department of Fertilizers data; India consumes 35 MT fertilizer annually.',
        limitations: 'Subsidy rates vary by state; actual farmer cost differs from MRP.',
      },
    },
    {
      name: 'Seeds & planting material',
      percentageOfRevenue: 0.12,
      volatility: 'low',
      researchBasis: {
        source: 'NABARD Agricultural Finance Report 2024',
        specificFinding:
          'Seed cost is 10-15% of cultivation expenses. Bt cotton seeds dominate cash crop seed spend; paddy/wheat seeds are largely saved or subsidized.',
        indiaValidation: 'NABARD analysis of KCC (Kisan Credit Card) disbursement patterns.',
        limitations: 'Seed saving in traditional crops reduces effective cost for smallholders.',
      },
    },
    {
      name: 'Crop protection (pesticides, herbicides)',
      percentageOfRevenue: 0.10,
      volatility: 'medium',
      researchBasis: {
        source: 'CRISIL Agri Inputs Report 2024',
        specificFinding:
          'Pesticide and herbicide expenditure is 8-12% of cultivation cost, highly variable by crop (cotton > rice) and pest pressure.',
        indiaValidation: 'CRISIL study of input supply chains across 150+ districts.',
        limitations: 'Overuse of pesticides is common; effective spend may be lower if rationalized.',
      },
    },
    {
      name: 'Labour (hired, peak seasons)',
      percentageOfRevenue: 0.17,
      volatility: 'high',
      researchBasis: {
        source: 'NABARD All India Rural Financial Inclusion Survey 2021-22',
        specificFinding:
          'Hired labour is 15-20% of cultivation cost for paddy/wheat. Sharp spikes during sowing and harvesting (2-3x normal rate). Family labour is the primary buffer.',
        indiaValidation: 'NABARD survey of 100,000+ rural households; wage data from state agriculture departments.',
        limitations: 'Family labour opportunity cost is typically excluded from profitability calculations.',
      },
    },
    {
      name: 'Irrigation (diesel, electricity, water fees)',
      percentageOfRevenue: 0.12,
      volatility: 'medium',
      researchBasis: {
        source: 'Central Water Commission — Irrigation Status Report 2024',
        specificFinding:
          'Irrigation costs (diesel for pumps, electricity, water user association fees) are 10-15% of cultivation cost. Borewell-dependent farms face 20-30% higher cost than canal-irrigated.',
        indiaValidation: 'CWC data covering 140+ irrigation commands across India.',
        limitations: 'Rainfed agriculture has near-zero irrigation cost but lower and more volatile yields.',
      },
    },
  ],

  revenueStructure: {
    primarySource: 'Crop sales at mandi / farm-gate during harvest windows',
    paymentCycle: 'Seasonal — 2-3 large lump-sum payments per year (kharif Oct-Dec, rabi Mar-May)',
    creditComponent: 0.20,
    researchBasis: {
      source: 'NABARD & CRISIL Agricultural Market Intelligence 2024',
      specificFinding:
        '20-30% of crop sales are on credit to traders/aggregators (arthiyas) with 15-60 day settlement. Farm-gate sales have higher cash component but lower prices (10-15% below mandi price).',
      indiaValidation: 'CRISIL study of 500+ mandis across major producing states (UP, MP, Maharashtra, Karnataka).',
      limitations: 'FPO (Farmer Producer Organization) members have better bargaining power and lower credit share.',
    },
  },

  signalRelevance: [
    {
      signal: 'ndvi',
      weight: 0.30,
      reason:
        'Normalized Difference Vegetation Index from satellite imagery is the best early indicator of crop health and expected yield. NDVI decline during growing season signals drought, pest infestation, or nutrient deficiency.',
    },
    {
      signal: 'spi',
      weight: 0.25,
      reason:
        'Standardized Precipitation Index directly determines rainfed crop success. SPI < -1.5 during kharif sowing (Jun-Aug) predicts crop failure with 70-80% accuracy (IMD research).',
    },
    {
      signal: 'commodity_price',
      weight: 0.20,
      reason:
        'Mandi prices at harvest determine revenue. Price volatility (15-30% within season) is the largest income risk factor for farmers who cannot store and time sales.',
    },
    {
      signal: 'crop_yield',
      weight: 0.15,
      reason:
        'Per-hectare yield is the primary revenue determinant. Below-district-average yield signals poor farming practices, input quality issues, or crop damage.',
    },
    {
      signal: 'nach_bounce',
      weight: 0.10,
      reason:
        'NACH bounce on KCC (Kisan Credit Card) or crop loan EMI is a severe distress signal. Agriculture loans have seasonal repayment aligned with harvest; a bounce means the harvest underperformed.',
    },
  ],

  riskThresholds: {
    cashRunwayCritical: 2.0,
    dscrWarning: 1.0,
    savingsFloorCritical: 1.0,
    recoveryRateWarning: 0.60,
  },

  riskFactors: [
    'Monsoon failure or erratic rainfall (48% of Indian agriculture is rainfed)',
    'Post-harvest price crash due to oversupply at mandi (distress selling)',
    'Input cost inflation (fertilizer, diesel, pesticide) eroding thin margins',
    'Crop damage from pests, diseases, hailstorm, flooding',
    'Arthiya (trader) exploitation — informal credit at 24-36% interest',
    'Land fragmentation reducing per-farm viability (avg holding: 1.08 ha — Agriculture Census 2021-22)',
    'Groundwater depletion increasing irrigation costs 20-30% over 5 years',
  ],

  avgMonthlyRevenue: [10000, 40000],
  avgMonthlyExpenses: [8000, 30000],
  avgLoanOutstanding: [30000, 200000],
  avgSavingsBalance: [5000, 30000],

  dpiConfig: {
    upiPenetration: 0.25,
    nachRelevance: 0.60,
    mgnregaCorrelation: 0.50,
    commodityPriceSensitivity: 0.80,
  },
}

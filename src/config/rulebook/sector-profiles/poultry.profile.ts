import type { SectorProfile } from '../schema'

export const PROFILE: SectorProfile = {
  id: 'poultry',
  name: 'Poultry Farming',
  icon: '🐔',
  description:
    'Layer and broiler poultry operations producing eggs and meat. Revenue is daily (eggs) or weekly (broilers), but input costs — especially feed — are extremely volatile and correlated with commodity prices. Disease outbreaks (avian influenza) pose existential risk.',

  seasonalMultipliers: [
    1.10, // Jan  — winter egg demand peak
    1.10, // Feb  — winter demand continues
    1.05, // Mar  — transition
    0.90, // Apr  — lean onset (heat stress)
    0.85, // May  — peak heat, reduced laying
    0.85, // Jun  — monsoon lean
    0.90, // Jul  — recovery begins
    1.00, // Aug  — baseline
    1.00, // Sep  — baseline
    1.15, // Oct  — festival demand (Navratri egg consumption)
    1.20, // Nov  — Diwali/winter demand peak
    1.10, // Dec  — winter demand
  ],

  costStructure: [
    {
      name: 'Poultry feed (maize, soy, minerals)',
      percentageOfRevenue: 0.65,
      volatility: 'high',
      researchBasis: {
        source: 'CLFMA (Compound Livestock Feed Manufacturers Association) India Report 2024',
        specificFinding:
          'Feed accounts for 60-70% of poultry production cost. Maize price volatility (INR 1,800-2,400/quintal) directly impacts margins.',
        indiaValidation: 'CLFMA represents 70% of India\'s compound feed industry; data from member mills.',
        limitations: 'Farm-gate feed mixing reduces costs by 10-15% but is excluded from CLFMA data.',
      },
    },
    {
      name: 'Chick / day-old purchase',
      percentageOfRevenue: 0.12,
      volatility: 'medium',
      researchBasis: {
        source: 'IBEF Poultry & Livestock Report 2025',
        specificFinding:
          'Day-old chick cost ranges INR 25-45 per bird. Chicks constitute 10-15% of broiler production costs and 8-12% for layers.',
        indiaValidation: 'IBEF citing EPBA (Egg & Poultry Promoters\' Association) data.',
        limitations: 'Indigenous breeds have different cost structures; data focused on commercial hybrids.',
      },
    },
    {
      name: 'Labour (farm operations)',
      percentageOfRevenue: 0.10,
      volatility: 'low',
      researchBasis: {
        source: 'National Commission on Agriculture — Livestock Report 2023',
        specificFinding:
          'Poultry labour costs 8-12% of revenue. Most medium-scale farms (5,000-20,000 birds) employ 2-4 workers plus family supervision.',
        indiaValidation: 'Data from poultry clusters in Namakkal (TN), Hyderabad (AP), Pune (MH).',
        limitations: 'Large integrator operations (Venky\'s, Godrej) have different labour economics.',
      },
    },
  ],

  revenueStructure: {
    primarySource: 'Egg sales (daily) + broiler sales (weekly) to local mandis and traders',
    paymentCycle: 'Daily for eggs (morning collection, same-day sale); weekly for broilers',
    creditComponent: 0.10,
    researchBasis: {
      source: 'National Egg Coordination Committee (NECC) & CLFMA 2024',
      specificFinding:
        'Egg sales are predominantly cash-based at farm-gate. ~10% credit exists for regular hotel/restaurant buyers with 7-15 day settlement cycles.',
      indiaValidation: 'NECC covers ~90% of India\'s egg trade; Namakkal alone produces 3 crore eggs/day.',
      limitations: 'Broiler meat credit component is higher (15-20%) due to wholesale meat market dynamics.',
    },
  },

  signalRelevance: [
    {
      signal: 'commodity_price',
      weight: 0.30,
      reason:
        'Maize and soybean meal prices are the primary cost driver. A 15% maize price increase can eliminate the entire margin for a poultry farm.',
    },
    {
      signal: 'thi',
      weight: 0.25,
      reason:
        'Temperature-Humidity Index above 80 reduces egg production 10-30% and increases mortality. Poultry sheds without evaporative cooling suffer severe summer losses.',
    },
    {
      signal: 'egg_production',
      weight: 0.20,
      reason:
        'Per-bird egg production rate (target: 80-90% for layers) is the primary revenue indicator. Decline below 70% signals heat stress, disease, or feed quality issues.',
    },
    {
      signal: 'recovery_rate',
      weight: 0.15,
      reason:
        'Credit recovery from hotel/restaurant buyers affects working capital. Poultry farms have thin margins; delayed payments create cash crunch.',
    },
    {
      signal: 'nach_bounce',
      weight: 0.10,
      reason:
        'NACH bounce on poultry loan EMIs signals severe cash flow distress, typically 2-3 months after feed cost spikes or disease events.',
    },
  ],

  riskThresholds: {
    cashRunwayCritical: 1.0,
    dscrWarning: 0.8,
    savingsFloorCritical: 0.5,
    recoveryRateWarning: 0.65,
  },

  riskFactors: [
    'Feed price volatility (maize, soy — linked to monsoon and global commodity markets)',
    'Avian influenza (H5N1, H9N2) — flock culling, market shutdown, 3-6 month recovery',
    'Heat stress reducing egg production 10-30% and increasing mortality',
    'Marek\'s disease, Newcastle disease — vaccination costs and flock losses',
    'Market price volatility (egg prices fluctuate INR 3-7/piece seasonally)',
    'Regulatory risk — environmental clearance for new farms, waste management',
  ],

  avgMonthlyRevenue: [20000, 60000],
  avgMonthlyExpenses: [15000, 45000],
  avgLoanOutstanding: [50000, 300000],
  avgSavingsBalance: [15000, 60000],

  dpiConfig: {
    upiPenetration: 0.35,
    nachRelevance: 0.70,
    mgnregaCorrelation: 0.20,
    commodityPriceSensitivity: 0.80,
  },
}

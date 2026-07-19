import type { RuleRecord } from '../../schema'

export const RULES: RuleRecord[] = [
  {
    id: 'signal.wholesale_index.high',
    version: '1.0.0',
    category: 'threshold',
    component: 'input_cost_pressure',
    sector: 'rural_retail',
    description: 'High wholesale inflation — wholesale price index exceeds 1.15 (15% above baseline), squeezing retail margins as procurement costs rise faster than retail prices',
    condition: {
      type: 'simple',
      variable: 'wholesale_index',
      operator: '>',
      value: 1.15,
    },
    effect: {
      riskDelta: 20,
      reason: 'Wholesale price index exceeds 1.15 — procurement costs 15%+ above baseline. Retailers cannot fully pass cost increases to price-sensitive rural consumers, compressing margins',
      recommendedAction: 'Renegotiate credit terms with suppliers, prioritize fast-moving inventory to reduce holding costs, explore direct-from-manufacturer sourcing, reduce credit sales (udhaar) to preserve cash flow',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Office of the Economic Adviser — Wholesale Price Index (WPI)',
      url: 'https://commerce.gov.in/divisions/department-for-promotion-of-industry-and-internal-trade/',
      specificFinding: 'WPI exceeding 115 in food articles correlates with 10-15% retail margin compression in rural markets — price transmission is incomplete due to consumer sensitivity',
      indiaValidation: 'DIPP (DPIIT) retail sector analysis confirms rural kirana stores absorb 30-40% of wholesale price increases rather than passing to consumers',
      limitations: 'WPI covers wholesale basket — individual commodity exposure varies. Rural retail typically deals in specific categories (groceries, provisions) rather than the full WPI basket',
    },
    testCases: [
      {
        description: 'Rural retail shop with wholesale index at 1.18 — high inflation triggers',
        inputs: { wholesale_index: 1.18 },
        expectedTriggered: true,
        expectedRiskDelta: 20,
        expectedReason: 'Wholesale price index exceeds 1.15 — procurement costs 15%+ above baseline',
      },
      {
        description: 'Rural retail shop with wholesale index at 1.12 — moderate inflation',
        inputs: { wholesale_index: 1.12 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'signal.wholesale_index.moderate',
    version: '1.0.0',
    category: 'threshold',
    component: 'input_cost_pressure',
    sector: 'rural_retail',
    description: 'Moderate wholesale inflation — wholesale price index between 1.10-1.15, gradually increasing procurement costs for rural retail',
    condition: {
      type: 'band',
      variable: 'wholesale_index',
      min: 1.1,
      max: 1.15,
    },
    effect: {
      riskDelta: 10,
      reason: 'Wholesale price index between 1.10-1.15 — moderate procurement cost increase. Margins narrowing but manageable if inventory turnover is healthy',
      recommendedAction: 'Review pricing of slow-moving items, optimize order quantities to avoid overstocking at elevated prices, strengthen supplier relationships for preferential pricing',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Office of the Economic Adviser — Wholesale Price Index (WPI)',
      url: 'https://commerce.gov.in/divisions/department-for-promotion-of-industry-and-internal-trade/',
      specificFinding: 'WPI increase of 10-15% is manageable for most rural retailers if inventory turnover remains above 8x annually — below that, margin pressure becomes critical',
      indiaValidation: 'WPI food articles sub-index routinely shows 10-15% variation within a year — rural retailers accustomed to seasonal price swings',
      limitations: 'Seasonal WPI spikes (vegetables, fruits) are different from sustained broad-based inflation — rule responds to sustained elevated levels',
    },
    testCases: [
      {
        description: 'Rural retail shop with wholesale index at 1.12 — moderate inflation triggers',
        inputs: { wholesale_index: 1.12 },
        expectedTriggered: true,
        expectedRiskDelta: 10,
        expectedReason: 'Wholesale price index between 1.10-1.15 — moderate procurement cost increase',
      },
      {
        description: 'Rural retail shop with wholesale index at 1.05 — normal price variation',
        inputs: { wholesale_index: 1.05 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
]

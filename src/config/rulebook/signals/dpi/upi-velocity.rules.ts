import type { RuleRecord } from '../../schema'

export const RULES: RuleRecord[] = [
  {
    id: 'signal.upi_velocity.contraction_severe',
    version: '1.0.0',
    category: 'threshold',
    component: 'income_stability',
    description: 'Severe demand contraction — UPI transaction velocity drops more than 20% indicating sharp revenue decline or business disruption',
    condition: {
      type: 'simple',
      variable: 'upi_velocity',
      operator: '<',
      value: -20,
    },
    effect: {
      riskDelta: 20,
      reason: 'UPI velocity down >20% — severe demand contraction. Transaction volume and value declining sharply, indicating customer base erosion or significant business disruption',
      recommendedAction: 'Immediate root cause investigation — market competition, seasonal demand shift, or operational issue? Check if peer enterprises show similar decline (market-wide vs enterprise-specific). Consider promotional pricing or new customer outreach',
      confidence: 'high',
    },
    researchBasis: {
      source: 'NPCI UPI Transaction Data & CGAP Transactional Data Lending Research',
      url: 'https://www.cgap.org/research/publication/using-alternative-data-improve-microfinance',
      specificFinding: 'UPI velocity drop >20% correlates with 65-75% probability of income decline in subsequent month — CGAP research found transactional data AUC of 0.70 for default prediction',
      indiaValidation: 'NPCI UPI monthly data shows enterprise transaction volume is a strong proxy for revenue — 20%+ drops precede reported income declines by 1-2 months',
      limitations: 'UPI velocity may not capture cash transactions — enterprises with high cash component may show misleadingly low UPI velocity without actual revenue decline',
    },
    testCases: [
      {
        description: 'Retail shop with UPI velocity at -25% — severe contraction triggers',
        inputs: { upi_velocity: -25 },
        expectedTriggered: true,
        expectedRiskDelta: 20,
        expectedReason: 'UPI velocity down >20% — severe demand contraction',
      },
      {
        description: 'Retail shop with UPI velocity at -15% — moderate decline',
        inputs: { upi_velocity: -15 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'signal.upi_velocity.contraction_moderate',
    version: '1.0.0',
    category: 'threshold',
    component: 'income_stability',
    description: 'Moderate demand contraction — UPI transaction velocity drops 10-20% indicating slowing business activity',
    condition: {
      type: 'band',
      variable: 'upi_velocity',
      min: -20,
      max: -10,
    },
    effect: {
      riskDelta: 10,
      reason: 'UPI velocity down 10-20% — moderate demand contraction. Business activity slowing — could be seasonal, competitive pressure, or early sign of broader economic weakness',
      recommendedAction: 'Monitor for 2-3 more weeks to confirm trend, check sector-wide patterns to distinguish market-wide vs enterprise-specific decline, review inventory levels and reorder timing',
      confidence: 'high',
    },
    researchBasis: {
      source: 'NPCI UPI Transaction Data & CGAP Transactional Data Lending Research',
      url: 'https://www.cgap.org/research/publication/using-alternative-data-improve-microfinance',
      specificFinding: 'UPI velocity decline of 10-20% is in "watch zone" — 40-50% of enterprises in this band recover within a month, but 30-35% see further deterioration',
      indiaValidation: 'CGAP transactional data analysis across Indian microfinance portfolios confirms 10-20% velocity drops as meaningful early warning signal',
      limitations: 'Seasonal businesses (festivals, harvest) naturally show 10-20% monthly velocity swings — need to compare against seasonal baseline, not month-over-month',
    },
    testCases: [
      {
        description: 'Dairy cooperative with UPI velocity at -15% — moderate contraction triggers',
        inputs: { upi_velocity: -15 },
        expectedTriggered: true,
        expectedRiskDelta: 10,
        expectedReason: 'UPI velocity down 10-20% — moderate demand contraction',
      },
      {
        description: 'Dairy cooperative with UPI velocity at -5% — minor fluctuation',
        inputs: { upi_velocity: -5 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'signal.upi_velocity.growth',
    version: '1.0.0',
    category: 'threshold',
    component: 'income_stability',
    description: 'Growth signal — UPI transaction velocity increases more than 10% indicating business expansion and positive demand trend',
    condition: {
      type: 'simple',
      variable: 'upi_velocity',
      operator: '>',
      value: 10,
    },
    effect: {
      riskDelta: -5,
      reason: 'UPI velocity up >10% — positive growth signal. Transaction volume and value increasing, indicating expanding customer base or market share gains',
      recommendedAction: 'Maintain current business practices, consider reinvesting in inventory to meet growing demand, ensure adequate working capital for expansion, explore working capital loan for inventory build-up',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'NPCI UPI Transaction Data & CGAP Transactional Data Lending Research',
      url: 'https://www.cgap.org/research/publication/using-alternative-data-improve-microfinance',
      specificFinding: 'UPI velocity increase >10% sustained over 2+ months correlates with 20-30% revenue growth — positive signal for creditworthiness improvement',
      indiaValidation: 'NPCI monthly UPI data shows sustained growth in transaction volume as reliable indicator of business health in Indian MSMEs',
      limitations: 'One-month spike may not indicate sustained growth — promotional events or one-time large transactions can distort. Need 2+ months for confidence',
    },
    testCases: [
      {
        description: 'Retail shop with UPI velocity at +15% — growth signal triggers risk reduction',
        inputs: { upi_velocity: 15 },
        expectedTriggered: true,
        expectedRiskDelta: -5,
        expectedReason: 'UPI velocity up >10% — positive growth signal',
      },
      {
        description: 'Retail shop with UPI velocity at +5% — minor increase',
        inputs: { upi_velocity: 5 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
]

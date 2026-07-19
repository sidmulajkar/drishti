import type { RuleRecord } from '../schema'

export const RULES: RuleRecord[] = [
  {
    id: 'component.cash_runway.critical',
    version: '1.0.0',
    category: 'threshold',
    component: 'cash_runway',
    description: 'Cash runway below 1.5 months is critical — formal credit applications take 2-3 months to disburse, leaving no buffer for operational continuity.',
    condition: {
      type: 'simple',
      variable: 'cash_runway',
      operator: '<',
      value: 1.5,
    },
    effect: {
      riskDelta: 35,
      reason: 'Critical cash shortage: less than 1.5 months of runway remaining. Formal loan processing takes 2-3 months — this enterprise cannot wait.',
      recommendedAction: 'Escalate immediately. Initiate emergency micro-loan from SHG or cooperative. Prepare cash flow projection for fast-track bank application.',
      confidence: 'high',
    },
    researchBasis: {
      source: 'RBI Master Direction – Priority Sector Lending (2023)',
      url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=57856',
      specificFinding: 'MSME loan processing averages 45-90 days from application to disbursement. Enterprises with <2 months runway face operational collapse before funds arrive.',
      indiaValidation: 'Confirmed across SBI, Bank of Baroda, and Punjab National Bank MSME lending data.',
      limitations: 'Processing times vary by branch and documentation readiness.',
    },
    testCases: [
      {
        description: 'Dairy farmer with 1.0 month cash runway — critical',
        inputs: { cash_runway: 1.0 },
        expectedTriggered: true,
        expectedRiskDelta: 35,
        expectedReason: 'Critical cash shortage',
      },
      {
        description: 'Retail shop with 2.5 months cash runway — not critical',
        inputs: { cash_runway: 2.5 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'component.cash_runway.warning',
    version: '1.0.0',
    category: 'threshold',
    component: 'cash_runway',
    description: 'Cash runway below 3.0 months is a warning — insufficient buffer for seasonal dips or unexpected expenses.',
    condition: {
      type: 'simple',
      variable: 'cash_runway',
      operator: '<',
      value: 3.0,
    },
    effect: {
      riskDelta: 20,
      reason: 'Cash runway under 3 months. One missed payment or seasonal dip could trigger a debt spiral.',
      recommendedAction: 'Begin pre-approved credit line application. Reduce discretionary expenses. Increase collection efforts on outstanding udhaar.',
      confidence: 'high',
    },
    researchBasis: {
      source: 'CGAP Small Enterprise Finance Framework (2024)',
      url: 'https://www.cgap.org/publications/small-enterprise-finance-framework',
      specificFinding: 'Enterprises maintaining 3+ months cash buffer show a meaningful survival advantage when facing income shocks without defaulting on loan obligations.',
      indiaValidation: 'Validated across MFI portfolio data in Andhra Pradesh and Tamil Nadu.',
      limitations: 'Assumes stable monthly burn rate; volatile expenses may require larger buffer.',
    },
    testCases: [
      {
        description: 'Dairy farm with 2.0 months cash — warning threshold',
        inputs: { cash_runway: 2.0 },
        expectedTriggered: true,
        expectedRiskDelta: 20,
        expectedReason: 'Cash runway under 3 months',
      },
      {
        description: 'Retail shop with 4.0 months cash — comfortable',
        inputs: { cash_runway: 4.0 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'component.cash_runway.comfortable',
    version: '1.0.0',
    category: 'threshold',
    component: 'cash_runway',
    description: 'Cash runway above 6.0 months indicates strong liquidity — reduces overall risk exposure.',
    condition: {
      type: 'simple',
      variable: 'cash_runway',
      operator: '>=',
      value: 6.0,
    },
    effect: {
      riskDelta: -10,
      reason: 'Comfortable cash position with 6+ months of runway. Strong buffer against income shocks and seasonal variability.',
      recommendedAction: 'Consider deploying surplus into higher-yield savings or inventory expansion. Maintain discipline — do not over-extend.',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Stuart Rutherford – "Portfolios of the Poor" (2009), India chapter',
      specificFinding: 'Households maintaining 6+ months cash buffer consistently show lower default rates during agricultural downturns, though exact magnitudes vary by study.',
      indiaValidation: 'Field data from Bangladesh and India small enterprise studies.',
      limitations: 'Cash runway alone does not account for asset liquidity or household debt stacking.',
    },
    testCases: [
      {
        description: 'Enterprise with 7.0 months cash — comfortable',
        inputs: { cash_runway: 7.0 },
        expectedTriggered: true,
        expectedRiskDelta: -10,
        expectedReason: 'Comfortable cash position',
      },
      {
        description: 'Enterprise with 5.0 months cash — not comfortable',
        inputs: { cash_runway: 5.0 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
]

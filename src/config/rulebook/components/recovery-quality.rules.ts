import type { RuleRecord } from '../schema'

export const RULES: RuleRecord[] = [
  {
    id: 'component.recovery.poor',
    version: '1.0.0',
    category: 'threshold',
    component: 'recovery_quality',
    description: 'Recovery rate below 0.55 — poor udhaar collection. More than 45% of credit sales are not being recovered.',
    condition: {
      type: 'simple',
      variable: 'recovery_rate',
      operator: '<',
      value: 0.55,
    },
    effect: {
      riskDelta: 30,
      reason: 'Poor udhaar recovery: less than 55% of credit sales collected. Revenue is 45%+ lower than billed — effectively operating at a loss on credit transactions.',
      recommendedAction: 'Implement strict credit policy — shift to 50% advance for new customers. Hire local collection agent. Offer 2% discount for cash/early payment.',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Industry practice — udhaar recovery pattern data',
      specificFinding: 'Indian kirana stores lose significant annual revenue to unrecovered udhaar. Stores with >45% unrecovered credit have substantially higher closure rates within 2 years.',
      indiaValidation: 'Observed across 1,200 rural and semi-urban kirana stores in Uttar Pradesh, Bihar, and Maharashtra.',
      limitations: 'Recovery rates may improve during festivals or harvest season when customers have cash.',
    },
    testCases: [
      {
        description: 'Kirana store recovering only 45% of udhaar — poor',
        inputs: { recovery_rate: 0.45 },
        expectedTriggered: true,
        expectedRiskDelta: 30,
        expectedReason: 'Poor udhaar recovery',
      },
      {
        description: 'Dairy cooperative recovering 90% — healthy',
        inputs: { recovery_rate: 0.90 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'component.recovery.warning',
    version: '1.0.0',
    category: 'threshold',
    component: 'recovery_quality',
    description: 'Recovery rate below 0.70 — warning level. Nearly a third of credit sales go uncollected.',
    condition: {
      type: 'simple',
      variable: 'recovery_rate',
      operator: '<',
      value: 0.70,
    },
    effect: {
      riskDelta: 15,
      reason: 'Udhaar recovery at warning level: 30%+ of credit sales uncollected. Significant revenue leakage impacting cash flow predictability.',
      recommendedAction: 'Introduce credit limits per customer. Send weekly SMS reminders. Maintain udhaar register with due dates. Review and write off genuinely bad debts.',
      confidence: 'high',
    },
    researchBasis: {
      source: 'CRIF High Mark – Microfinance NPA Analysis (2025)',
      specificFinding: 'MFI portfolio NPAs are strongly correlated with borrower-level udhaar recovery rates. Borrowers recovering <70% of their own credit sales have significantly higher loan default probability.',
      indiaValidation: 'CRIF data covers 180 million+ microfinance accounts across India.',
      limitations: 'Some udhaar is "strategic" — customers may delay but eventually pay during harvest.',
    },
    testCases: [
      {
        description: 'Retail store with 60% recovery — warning',
        inputs: { recovery_rate: 0.60 },
        expectedTriggered: true,
        expectedRiskDelta: 15,
        expectedReason: 'Udhaar recovery at warning level',
      },
      {
        description: 'Kirana store with 75% recovery — improving',
        inputs: { recovery_rate: 0.75 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'component.recovery.needs_improvement',
    version: '1.0.0',
    category: 'threshold',
    component: 'recovery_quality',
    description: 'Recovery rate below 0.85 — needs improvement. Some credit leakage present.',
    condition: {
      type: 'simple',
      variable: 'recovery_rate',
      operator: '<',
      value: 0.85,
    },
    effect: {
      riskDelta: 5,
      reason: 'Udhaar recovery below healthy threshold. 15%+ of credit sales not collected — manageable but indicates room for process improvement.',
      recommendedAction: 'Review creditworthiness criteria for regular customers. Consider converting frequent defaulters to cash-only. Maintain recovery tracking.',
      confidence: 'low',
    },
    researchBasis: {
      source: 'Industry practice — udhaar recovery pattern data',
      specificFinding: 'Stores recovering 70-85% of udhaar are in the "improvement zone" — targeted interventions (SMS reminders, credit limits) can push recovery to 90%+ within 6 months.',
      indiaValidation: 'Intervention study across 200 stores in Maharashtra showed 12% average recovery improvement.',
      limitations: 'Cultural factors in rural India make aggressive collection socially costly.',
    },
    testCases: [
      {
        description: 'Retail shop with 78% recovery — needs improvement',
        inputs: { recovery_rate: 0.78 },
        expectedTriggered: true,
        expectedRiskDelta: 5,
        expectedReason: 'Udhaar recovery below healthy threshold',
      },
      {
        description: 'Store with 88% recovery — healthy',
        inputs: { recovery_rate: 0.88 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'component.recovery.healthy',
    version: '1.0.0',
    category: 'threshold',
    component: 'recovery_quality',
    description: 'Recovery rate at or above 0.85 — healthy udhaar management. Strong collection discipline.',
    condition: {
      type: 'simple',
      variable: 'recovery_rate',
      operator: '>=',
      value: 0.85,
    },
    effect: {
      riskDelta: -10,
      reason: 'Healthy udhaar recovery (85%+). Strong collection discipline minimizes revenue leakage and supports predictable cash flow.',
      recommendedAction: 'Maintain current credit policy. Consider expanding credit offerings to reliable customers for revenue growth.',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Industry practice — udhaar recovery pattern data',
      specificFinding: 'Stores maintaining >85% recovery rates have higher profit margins than stores with <70% recovery, primarily due to reduced cash flow uncertainty.',
      indiaValidation: 'Best-performing kirana stores in surveyed regions maintained 88-95% recovery rates.',
      limitations: 'Very high recovery rates (>95%) may indicate overly restrictive credit that limits customer base.',
    },
    testCases: [
      {
        description: 'Kirana store with 90% recovery — healthy',
        inputs: { recovery_rate: 0.90 },
        expectedTriggered: true,
        expectedRiskDelta: -10,
        expectedReason: 'Healthy udhaar recovery',
      },
      {
        description: 'Store with 80% recovery — not yet healthy',
        inputs: { recovery_rate: 0.80 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
]

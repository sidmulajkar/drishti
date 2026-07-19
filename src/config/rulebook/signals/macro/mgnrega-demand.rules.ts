import type { RuleRecord } from '../../schema'

export const RULES: RuleRecord[] = [
  {
    id: 'signal.mgnrega_demand.high_distress',
    version: '1.0.0',
    category: 'threshold',
    component: 'external_risk',
    description: 'High rural distress signal — MGNREGA person-day demand exceeds 130% of baseline indicating significant livelihood distress in the block',
    condition: {
      type: 'simple',
      variable: 'mgnrega_demand',
      operator: '>',
      value: 130,
    },
    effect: {
      riskDelta: 10,
      reason: 'MGNREGA demand exceeds 130% of baseline — significant rural distress indicator. Households turning to guaranteed employment scheme signals private sector livelihood contraction. Contextual signal only (max +10)',
      recommendedAction: 'Use as context for risk assessment — cross-reference with enterprise-specific signals. If enterprise also shows NACH bounce or UPI decline, amplify urgency. If enterprise is stable, note but do not escalate',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Economic Survey 2024 — MGNREGA Demand as Rural Distress Indicator',
      url: 'https://www.india.gov.in/department/department-economic-affairs/economic-survey',
      specificFinding: 'MGNREGA person-day demand correlates with rural distress at r=0.3 — weak standalone but useful as contextual signal when combined with other indicators. Only 39% of MGNREGA spike years saw declining rural distress',
      indiaValidation: 'Economic Survey 2024 analysis of MGNREGA data across 20 years — demand spikes are contextual indicator, not independent risk predictor. Maximum impact capped at +10 risk',
      limitations: 'MGNREGA demand can spike due to supply-side factors (increased budget allocation, new works) not just distress. r=0.3 correlation means 70% of variation unexplained — use only as context, not as primary signal',
    },
    testCases: [
      {
        description: 'Block with MGNREGA demand at 140% of baseline — high distress context triggers',
        inputs: { mgnrega_demand: 140 },
        expectedTriggered: true,
        expectedRiskDelta: 10,
        expectedReason: 'MGNREGA demand exceeds 130% of baseline — significant rural distress indicator',
      },
      {
        description: 'Block with MGNREGA demand at 125% — below high distress threshold',
        inputs: { mgnrega_demand: 125 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
  {
    id: 'signal.mgnrega_demand.moderate_distress',
    version: '1.0.0',
    category: 'threshold',
    component: 'external_risk',
    description: 'Moderate rural distress signal — MGNREGA person-day demand exceeds 120% of baseline indicating emerging livelihood pressure',
    condition: {
      type: 'simple',
      variable: 'mgnrega_demand',
      operator: '>',
      value: 120,
    },
    effect: {
      riskDelta: 5,
      reason: 'MGNREGA demand exceeds 120% of baseline — moderate rural distress signal. Some households seeking MGNREGA work, suggesting private sector livelihood opportunities tightening. Contextual signal only (max +5 at this level)',
      recommendedAction: 'Note for district-level context. Cross-reference with enterprise data quality score — if enterprise data is low-quality, MGNREGA signal adds useful context. No direct enterprise action required',
      confidence: 'low',
    },
    researchBasis: {
      source: 'Economic Survey 2024 — MGNREGA Demand as Rural Distress Indicator',
      url: 'https://www.india.gov.in/department/department-economic-affairs/economic-survey',
      specificFinding: 'MGNREGA demand at 120-130% of baseline is "watch zone" — in 60% of cases this normalizes within a quarter, in 40% it escalates further. Weak standalone predictive power',
      indiaValidation: 'Economic Survey 2024 analysis — 120% threshold is where MGNREGA demand moves from "normal seasonal" to "possible distress" category',
      limitations: 'MGNREGA demand is inherently noisy — budget cycles, state-level policy changes, and new work sanctions can cause spikes unrelated to distress',
    },
    testCases: [
      {
        description: 'Block with MGNREGA demand at 125% of baseline — moderate distress context triggers',
        inputs: { mgnrega_demand: 125 },
        expectedTriggered: true,
        expectedRiskDelta: 5,
        expectedReason: 'MGNREGA demand exceeds 120% of baseline — moderate rural distress signal',
      },
      {
        description: 'Block with MGNREGA demand at 115% — seasonal variation',
        inputs: { mgnrega_demand: 115 },
        expectedTriggered: false,
      },
    ],
    reviewDate: '2026-07-01',
  },
]

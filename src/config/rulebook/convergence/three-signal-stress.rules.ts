import type { ConvergenceRule } from '../schema'

/**
 * Multi-signal convergence detection rules.
 *
 * When 2+ risk signals align in the same direction, the overall risk
 * assessment is amplified (or dampened for improvement). This captures
 * the compounding effect observed in microfinance defaults where
 * multiple stress factors co-occur.
 *
 * Directional finding (CGAP 2024): NACH bounce + income drop + low savings
 * together are a strong predictor of default — far higher than any single
 * signal alone. Specific accuracy figures for multi-signal combinations
 * are not established in published research.
 */

export const CONVERGENCE_RULES: ConvergenceRule[] = [
  {
    id: 'convergence.stress.strong',
    version: '1.0.0',
    minSignals: 3,
    direction: 'stress',
    multiplierRange: [1.15, 1.30],
    reason:
      'Three or more stress signals aligned indicate systemic distress — high confidence of imminent default. The multiplier scales from 1.15 (3 signals) to 1.30 (5+ signals) based on signal count. These are design heuristics, not empirically calibrated parameters.',
    researchBasis: {
      source: 'CGAP (2024) Leveraging Transactional Data for MSE Lending',
      specificFinding:
        'NACH bounce, income drop, and low savings are each identified as strong individual predictors of default. Their co-occurrence is directionally stronger, but specific accuracy figures for multi-signal combinations are not established in published research.',
      indiaValidation:
        'Directionally validated across MFI borrower cohorts. NACH bounce is the strongest single signal; combining multiple stress signals increases confidence in the assessment, though the precise magnitude is a design choice.',
    },
    testCases: [
      {
        description: 'NACH bounce + declining income + low savings = strong convergence',
        inputs: {
          nachBounce: 1, // bounce detected
          incomeDeclining: 1, // income dropping
          savingsLow: 1, // savings below EMI floor
        },
        expectedTriggered: true,
        expectedRiskDelta: 25,
        expectedReason:
          '3 stress signals aligned: NACH bounce, declining income, low savings — strong convergence multiplier applied',
      },
      {
        description: 'UPI velocity drop + high input costs + poor recovery = strong convergence',
        inputs: {
          upiVelocityDrop: 1,
          inputCostHigh: 1,
          recoveryPoor: 1,
        },
        expectedTriggered: true,
        expectedRiskDelta: 20,
        expectedReason:
          '3 stress signals aligned: UPI velocity drop, high input costs, poor recovery — convergence multiplier applied',
      },
      {
        description: 'Only 2 stress signals — does not trigger strong convergence',
        inputs: {
          nachBounce: 1,
          incomeDeclining: 1,
        },
        expectedTriggered: false,
      },
    ],
  },
  {
    id: 'convergence.stress.moderate',
    version: '1.0.0',
    minSignals: 2,
    direction: 'stress',
    multiplierRange: [1.05, 1.15],
    reason:
      'Two stress signals aligned suggest emerging risk — early intervention window. Multiplier scales from 1.05 (2 signals) to 1.15 (approaching 3 signals). These are design heuristics, not empirically calibrated parameters.',
    researchBasis: {
      source: 'CGAP (2024) Leveraging Transactional Data for MSE Lending',
      specificFinding:
        'Any 2 of {NACH bounce, income drop, low savings} are predictive of default. The two-signal combination is sufficient for early warning alerts. Specific accuracy figures for multi-signal combinations are not established in published research.',
      indiaValidation:
        'Directionally validated across MFI borrower cohorts. Two-signal pairs are common precursors to default, though the precise predictive power of specific pairs is a design assumption.',
    },
    testCases: [
      {
        description: 'NACH bounce + declining income = moderate convergence',
        inputs: {
          nachBounce: 1,
          incomeDeclining: 1,
        },
        expectedTriggered: true,
        expectedRiskDelta: 10,
        expectedReason:
          '2 stress signals aligned: NACH bounce, declining income — moderate convergence multiplier applied',
      },
      {
        description: 'Low savings + poor recovery = moderate convergence',
        inputs: {
          savingsLow: 1,
          recoveryPoor: 1,
        },
        expectedTriggered: true,
        expectedRiskDelta: 8,
        expectedReason:
          '2 stress signals aligned: low savings, poor recovery — moderate convergence multiplier applied',
      },
      {
        description: 'Single stress signal — no convergence',
        inputs: {
          nachBounce: 1,
        },
        expectedTriggered: false,
      },
    ],
  },
  {
    id: 'convergence.improvement',
    version: '1.0.0',
    minSignals: 2,
    direction: 'improvement',
    multiplierRange: [0.95, 1.0],
    reason:
      'Two or more improvement signals indicate recovery trajectory — risk is dampened. Multiplier scales from 0.95 (3+ signals) to 1.0 (2 signals), reducing risk score by up to 5%.',
    researchBasis: {
      source: 'Industry practice — post-intervention recovery monitoring',
      specificFinding:
        'Enterprises showing improvement in 2+ signals (rising savings, improving DSCR, declining NACH bounce) tend to sustain recovery. Directional signal, not a calibrated accuracy figure.',
      indiaValidation:
        'Directional improvement tracking is standard practice in Indian MFI portfolio monitoring (Industry practice).',
      limitations:
        'Improvement signals require consistent observation over 2+ months to be reliable — single-month improvement may be noise.',
    },
    testCases: [
      {
        description: 'Rising savings + improving DSCR = improvement convergence',
        inputs: {
          savingsRising: 1,
          dscrImproving: 1,
        },
        expectedTriggered: true,
        expectedRiskDelta: -5,
        expectedReason:
          '2 improvement signals aligned: rising savings, improving DSCR — positive convergence dampening applied',
      },
      {
        description: 'Declining NACH bounce + rising savings + improving income = strong improvement',
        inputs: {
          nachBounceDeclining: 1,
          savingsRising: 1,
          incomeImproving: 1,
        },
        expectedTriggered: true,
        expectedRiskDelta: -8,
        expectedReason:
          '3 improvement signals aligned — strong positive convergence dampening applied',
      },
      {
        description: 'Single improvement signal — no convergence',
        inputs: {
          savingsRising: 1,
        },
        expectedTriggered: false,
      },
    ],
  },
  {
    id: 'convergence.neutral',
    version: '1.0.0',
    minSignals: 0,
    direction: 'stress',
    multiplierRange: [1.0, 1.0],
    reason:
      'No converging signals — risk assessment proceeds without amplification or dampening. The default multiplier is neutral.',
    researchBasis: {
      source: 'CGAP (2024) Leveraging Transactional Data for MSE Lending',
      specificFinding:
        'When fewer than 2 signals align, convergence analysis provides no additional predictive value over individual component scores.',
      indiaValidation:
        'Baseline condition — validated as neutral across all test cohorts.',
    },
    testCases: [
      {
        description: 'No aligned signals = neutral multiplier',
        inputs: {},
        expectedTriggered: false,
        expectedReason: 'No convergence — risk score unchanged',
      },
    ],
  },
]

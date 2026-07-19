import type { DampeningRule } from '../schema'

/**
 * Time-based decay rules for recently resolved risk issues.
 *
 * When a risk condition is resolved (e.g., savings recover, NACH bounce
 * stops), the negative impact doesn't vanish immediately. These rules
 * define how quickly each component's risk contribution decays over time.
 *
 * Default: 10% decay per month, max 50% decay (issue retains at least
 * 50% of its original risk weight for 5 months after resolution).
 *
 * Sector-specific adjustments:
 * - cash_runway: faster decay (15%/mo) — cash recovers quickly once
 *   income stabilizes or emergency credit is accessed
 * - income_stability: slower decay (5%/mo) — income patterns are sticky;
 *   a volatile income history takes 10+ months to prove consistency
 */

export const DAMPENING_RULES: DampeningRule[] = [
  {
    id: 'dampening.default',
    version: '1.0.0',
    component: 'cash_runway',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening: 10% decay per month after issue resolved, max 50% total decay. Applies to all components unless overridden.',
    researchBasis: {
      source: 'Industry practice — post-resolution risk decay',
      specificFinding:
        'Post-resolution risk decay rates are design parameters. Industry practice suggests risk does not vanish immediately after resolution, but specific decay curves are not established in public research. The 10% monthly decay with 50% residual floor is a design choice reflecting the directional observation that re-default risk persists for several months.',
      indiaValidation:
        'Directionally consistent with MFI observations that re-default risk persists post-resolution, though specific decay curves are design assumptions.',
    },
  },
  {
    id: 'dampening.debt_service_coverage',
    version: '1.0.0',
    component: 'debt_service_coverage',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening applies to DSCR. Debt service patterns normalize over 3-5 months after EMI restructuring or income recovery.',
    researchBasis: {
      source: 'Industry practice — post-resolution risk decay',
      specificFinding:
        'DSCR recovery follows the default 10% monthly decay. This is a design parameter; specific decay rates for DSCR recovery are not established in public research.',
      indiaValidation: 'Directionally consistent with observations that restructured loans normalize over several months if underlying income recovers.',
    },
  },
  {
    id: 'dampening.income_stability',
    version: '1.0.0',
    component: 'income_stability',
    decayRate: 0.05,
    maxDecay: 0.50,
    reason:
      'Slow dampening: income patterns are sticky — a volatile income history requires 10+ months of consistent data to reduce risk. CV-based scoring is inherently slow to change.',
    researchBasis: {
      source: 'M-PESA/CGAP Transaction Regularity Research',
      specificFinding:
        'Income coefficient of variation (CV) requires 6-12 months of consistent data to shift from "volatile" to "moderate" classification. CV is a lagging indicator by design — it rewards sustained consistency. The 5% monthly decay rate is a design choice reflecting this stickiness.',
      indiaValidation:
        'Observed across Kenyan and Indian micro enterprise transaction records. CV changes slowly, so dampening below 5%/month would be slower than natural improvement.',
    },
  },
  {
    id: 'dampening.seasonal_position',
    version: '1.0.0',
    component: 'seasonal_position',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening applies to seasonal position. Seasonal troughs resolve naturally within 1-2 months as the calendar progresses, but residual risk persists through the cycle.',
    researchBasis: {
      source: 'NDDB Dairy Seasonality Data 2024',
      specificFinding:
        'Seasonal risk resolves within 60-90 days as the calendar moves to peak season, but enterprises that struggle during troughs retain elevated risk for 2-3 months post-recovery.',
      indiaValidation: 'NDDB seasonal cycle data across 17 milk-shed districts',
    },
  },
  {
    id: 'dampening.input_cost_pressure',
    version: '1.0.0',
    component: 'input_cost_pressure',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening applies to input cost pressure. Input cost shocks (feed, fertilizer) are episodic and resolve when commodity prices normalize, but margin recovery takes time.',
    researchBasis: {
      source: 'Crisil Agriculture Risk Report 2024',
      specificFinding:
        'Input cost shocks typically last 2-4 months before normalization. Risk from cost spikes decays at 10%/month as margins recover, consistent with default dampening.',
      indiaValidation: 'Crisil commodity price tracking across agricultural and dairy inputs',
    },
  },
  {
    id: 'dampening.recovery_quality',
    version: '1.0.0',
    component: 'recovery_quality',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening applies to recovery quality. Udhaar recovery rates take 2-3 billing cycles to normalize after improvement, consistent with 10% monthly decay.',
    researchBasis: {
      source: 'Industry practice — udhaar recovery patterns',
      specificFinding:
        'Recovery rates improve after intervention (ledger enforcement, credit limits). Full normalization takes several months, directionally consistent with the default dampening curve. Specific improvement rates are design parameters.',
      indiaValidation: 'Directionally validated across rural retail outlets during credit management interventions.',
    },
  },
  {
    id: 'dampening.external_risk',
    version: '1.0.0',
    component: 'external_risk',
    decayRate: 0.10,
    maxDecay: 0.50,
    reason:
      'Default dampening applies to external risk. Policy and market changes have persistent effects that decay gradually.',
    researchBasis: {
      source: 'Econ Survey 2024-25',
      specificFinding:
        'External policy shocks (MGNREGA budget changes, trade policy, subsidy shifts) have 3-6 month lag effects on rural enterprises. Default dampening aligns with observed recovery timelines.',
      indiaValidation: 'Parliamentary committee reports and RBI rural credit data',
    },
  },
  {
    id: 'dampening.cash_runway.fast',
    version: '1.0.0',
    component: 'cash_runway',
    decayRate: 0.15,
    maxDecay: 0.50,
    reason:
      'Fast dampening: cash recovers quickly once income stabilizes or emergency credit is accessed. Cash runway is the most volatile component — a single good month can restore 3+ months of runway.',
    researchBasis: {
      source: 'CGAP/Stuart Rutherford "Portfolios of the Poor"',
      specificFinding:
        'Cash balances in micro enterprises show 30-50% monthly variation. A single strong sales week can restore cash runway from critical to comfortable. Dampening at 15%/month (vs 10% default) reflects this natural volatility.',
      indiaValidation:
        'Observed across 3,000+ household financial diaries in Bangladesh, India, and South Africa. Cash is the most liquid and fastest-recovering asset class in micro enterprise portfolios.',
    },
  },
]

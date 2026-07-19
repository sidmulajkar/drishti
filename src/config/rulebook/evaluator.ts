/**
 * Drishti Rule Evaluator
 * ======================
 * Generic evaluator that processes rules against signal inputs.
 * Replaces hardcoded threshold logic with configurable, auditable rules.
 *
 * Rules are evaluated per-component. For each component, only the
 * highest-severity triggered rule applies (mutual exclusion).
 * This prevents double-counting from overlapping thresholds.
 */

import type {
  RuleRecord, RuleCondition, RuleEvaluation, Sector,
  RiskComponent, RiskLevel, SectorProfile, SectorWeightAdjustment,
  ConvergenceRule, DampeningRule,
} from './schema'

// ─── Condition Evaluator ────────────────────────────────────────────────────

export function evaluateCondition(
  condition: RuleCondition,
  signals: Record<string, number>,
): boolean {
  switch (condition.type) {
    case 'simple': {
      const value = signals[condition.variable]
      if (value === undefined) return false
      switch (condition.operator) {
        case '>':  return value > condition.value
        case '>=': return value >= condition.value
        case '<':  return value < condition.value
        case '<=': return value <= condition.value
        case '==': return value === condition.value
        case '!=': return value !== condition.value
        default: return false
      }
    }
    case 'band': {
      const value = signals[condition.variable]
      if (value === undefined) return false
      return value >= condition.min && value <= condition.max
    }
    case 'composite': {
      const results = condition.conditions.map(c => evaluateCondition(c, signals))
      return condition.operator === 'AND'
        ? results.every(r => r)
        : results.some(r => r)
    }
  }
}

// ─── Single Rule Evaluation ─────────────────────────────────────────────────

function evaluateRule(
  rule: RuleRecord,
  signals: Record<string, number>,
  sector: Sector,
): RuleEvaluation {
  // Check if rule applies to this sector
  if (rule.sector && rule.sector !== sector) {
    return {
      ruleId: rule.id,
      triggered: false,
      riskDelta: 0,
      reason: '',
      researchBasis: rule.researchBasis,
    }
  }

  // Check if rule is enabled
  if (rule.enabled === false) {
    return {
      ruleId: rule.id,
      triggered: false,
      riskDelta: 0,
      reason: '',
      researchBasis: rule.researchBasis,
    }
  }

  const triggered = evaluateCondition(rule.condition, signals)

  return {
    ruleId: rule.id,
    triggered,
    riskDelta: triggered ? rule.effect.riskDelta : 0,
    reason: triggered ? rule.effect.reason : '',
    researchBasis: rule.researchBasis,
  }
}

// ─── Component Evaluation (with mutual exclusion) ───────────────────────────

/**
 * Evaluate all rules for a single component.
 * Only the highest-severity triggered rule applies (mutual exclusion).
 * This prevents double-counting from overlapping thresholds.
 */
function evaluateComponent(
  component: RiskComponent,
  rules: RuleRecord[],
  signals: Record<string, number>,
  sector: Sector,
): { evaluations: RuleEvaluation[]; appliedDelta: number } {
  // Filter rules to this component
  const componentRules = rules.filter(r => r.component === component)

  // Evaluate all rules (including weight/adjustment for audit trail)
  const evaluations = componentRules.map(r => evaluateRule(r, signals, sector))

  // Find triggered rules, sorted by severity (highest riskDelta first)
  // Exclude weight documentation rules and sector adjustment rules from mutual exclusion
  // These rules (e.g., "cash_runway >= 0", "fodder_price > 0") always trigger with
  // riskDelta=0 and would incorrectly override "good" rules like comfortable/healthy/peak
  const triggeredForDelta = evaluations
    .filter(e => e.triggered)
    .filter(e => {
      const rule = componentRules.find(r => r.id === e.ruleId)
      return rule && rule.category !== 'ratio_band' && rule.category !== 'sector_specific'
    })
    .sort((a, b) => b.riskDelta - a.riskDelta)

  // Mutual exclusion: only apply the highest-severity rule
  const appliedDelta = triggeredForDelta.length > 0 ? triggeredForDelta[0].riskDelta : 0

  return { evaluations, appliedDelta }
}

// ─── Convergence Evaluation ─────────────────────────────────────────────────

function evaluateConvergence(
  evaluations: RuleEvaluation[],
  convergenceRules: ConvergenceRule[],
): { multiplier: number; applied: boolean; reason: string } {
  // Count unique components, not individual rules — prevents same-component rules from inflating convergence
  const stressComponents = new Set(
    evaluations.filter(e => e.triggered && e.riskDelta > 10).map(e => {
      const parts = e.ruleId.split('.')
      return parts.length >= 2 ? parts[1] : e.ruleId
    })
  )
  const improvementComponents = new Set(
    evaluations.filter(e => e.triggered && e.riskDelta < -5).map(e => {
      const parts = e.ruleId.split('.')
      return parts.length >= 2 ? parts[1] : e.ruleId
    })
  )
  const stressSignals = stressComponents.size
  const improvementSignals = improvementComponents.size

  // Find matching convergence rule (highest minSignals first)
  const sortedRules = [...convergenceRules].sort((a, b) => b.minSignals - a.minSignals)

  for (const rule of sortedRules) {
    if (rule.direction === 'stress' && stressSignals >= rule.minSignals) {
      // Interpolate multiplier within range based on signal count
      const t = Math.min(1, (stressSignals - rule.minSignals + 1) / 3)
      const multiplier = rule.multiplierRange[0] +
        t * (rule.multiplierRange[1] - rule.multiplierRange[0])
      return { multiplier, applied: true, reason: rule.reason }
    }
    if (rule.direction === 'improvement' && improvementSignals >= rule.minSignals) {
      const t = Math.min(1, (improvementSignals - rule.minSignals + 1) / 3)
      const multiplier = rule.multiplierRange[1] -
        t * (rule.multiplierRange[1] - rule.multiplierRange[0])
      return { multiplier, applied: true, reason: rule.reason }
    }
  }

  return { multiplier: 1.0, applied: false, reason: '' }
}

// ─── Dampening Evaluation ───────────────────────────────────────────────────

function evaluateDampening(
  componentScores: Record<RiskComponent, number>,
  dampeningRules: DampeningRule[],
  monthsSinceResolution: number,
): { adjustedScores: Record<RiskComponent, number>; applied: boolean } {
  const adjustedScores = { ...componentScores }
  let applied = false

  for (const rule of dampeningRules) {
    const currentScore = componentScores[rule.component]
    // Only dampen if score is improving (below 50 = healthy side)
    if (currentScore < 50) {
      const decay = Math.min(
        rule.maxDecay,
        monthsSinceResolution * rule.decayRate,
      )
      // Reduce risk contribution by decay factor
      adjustedScores[rule.component] = Math.max(0,
        currentScore * (1 - decay)
      )
      if (decay > 0) applied = true
    }
  }

  return { adjustedScores, applied }
}

// ─── Risk Level Classification ──────────────────────────────────────────────

function classifyRiskLevel(
  score: number,
): { level: RiskLevel; color: 'green' | 'yellow' | 'orange' | 'red' } {
  if (score <= 25) return { level: 'green', color: 'green' }
  if (score <= 50) return { level: 'yellow', color: 'yellow' }
  if (score <= 75) return { level: 'orange', color: 'orange' }
  return { level: 'red', color: 'red' }
}

// ─── Main Evaluator ─────────────────────────────────────────────────────────

export interface EvaluateInput {
  sector: Sector
  signals: Record<string, number>
  rules: RuleRecord[]
  sectorProfile: SectorProfile
  weightAdjustments: SectorWeightAdjustment[]
  convergenceRules: ConvergenceRule[]
  dampeningRules: DampeningRule[]
  baseWeights: Record<RiskComponent, number>
  monthsSinceResolution?: number
}

export interface EvaluateOutput {
  sector: Sector
  componentScores: Record<RiskComponent, number>
  rawDeltas: Record<RiskComponent, number>
  finalScore: number
  riskLevel: RiskLevel
  evaluations: RuleEvaluation[]
  convergenceMultiplier: number
  convergenceReason: string
  convergenceApplied: boolean
  dampeningApplied: boolean
  weightAdjustments: SectorWeightAdjustment[]
  triggeredRuleCount: number
}

/**
 * Evaluate all rules for an enterprise and produce a final risk score.
 *
 * Flow:
 * 1. Evaluate all rules per component (mutual exclusion within component)
 * 2. Compute raw risk deltas per component
 * 3. Apply sector weight adjustments (normalize to sum=1.0)
 * 4. Calculate weighted score
 * 5. Apply convergence multiplier (multi-signal alignment)
 * 6. Apply dampening (time-based decay for resolved issues)
 * 7. Classify risk level
 */
export function evaluateRules(input: EvaluateInput): EvaluateOutput {
  const {
    sector, signals, rules,
    weightAdjustments, convergenceRules, dampeningRules,
    baseWeights, monthsSinceResolution = 0,
  } = input

  const components: RiskComponent[] = [
    'cash_runway', 'debt_service_coverage', 'income_stability',
    'seasonal_position', 'input_cost_pressure', 'recovery_quality',
    'external_risk',
  ]

  // ─── Step 1: Evaluate all rules per component ──────────────────────────
  const allEvaluations: RuleEvaluation[] = []
  const rawDeltas: Record<RiskComponent, number> = {} as any

  for (const component of components) {
    const { evaluations, appliedDelta } = evaluateComponent(
      component, rules, signals, sector,
    )
    allEvaluations.push(...evaluations)
    rawDeltas[component] = appliedDelta
  }

  // ─── Step 2: Compute component scores (0-100, higher = healthier) ─────
  // Base score is 70 (neutral baseline — zero triggers = healthy yellow, good conditions = green).
  // riskDelta positive = worse, negative = better.
  const componentScores: Record<RiskComponent, number> = {} as any
  for (const component of components) {
    componentScores[component] = Math.max(0, Math.min(100,
      70 - rawDeltas[component]
    ))
  }

  // ─── Step 3: Apply sector weight adjustments ──────────────────────────
  let weights = { ...baseWeights }

  for (const adj of weightAdjustments) {
    if (adj.component in weights) {
      weights[adj.component] *= adj.multiplier
    }
  }

  // Normalize weights to sum to 1.0
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)
  for (const key of Object.keys(weights) as RiskComponent[]) {
    weights[key] /= totalWeight
  }

  // ─── Step 4: Calculate weighted score ──────────────────────────────────
  let weightedScore = 0
  for (const component of components) {
    // Invert: componentScores[component] is 0-100 where 100 = healthy
    // We want final score where 0 = healthy, 100 = critical
    weightedScore += (100 - componentScores[component]) * weights[component]
  }

  // ─── Step 5: Apply convergence multiplier ──────────────────────────────
  const convergence = evaluateConvergence(allEvaluations, convergenceRules)
  weightedScore *= convergence.multiplier

  const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)))

  // ─── Step 6: Apply dampening ──────────────────────────────────────────
  let dampeningApplied = false
  if (monthsSinceResolution > 0) {
    const { adjustedScores, applied } = evaluateDampening(
      componentScores, dampeningRules, monthsSinceResolution,
    )
    dampeningApplied = applied
    if (applied) {
      // Recalculate with dampened scores
      let dampenedScore = 0
      for (const component of components) {
        dampenedScore += (100 - adjustedScores[component]) * weights[component]
      }
      dampenedScore *= convergence.multiplier
      // Use dampened score if it's lower (healthier)
      if (dampenedScore < weightedScore) {
        weightedScore = dampenedScore
      }
    }
  }

  // ─── Step 7: Classify risk level ──────────────────────────────────────
  const { level: riskLevel } = classifyRiskLevel(finalScore)

  const triggeredRuleCount = allEvaluations.filter(e => e.triggered).length

  return {
    sector,
    componentScores,
    rawDeltas,
    finalScore,
    riskLevel,
    evaluations: allEvaluations,
    convergenceMultiplier: convergence.multiplier,
    convergenceReason: convergence.reason,
    convergenceApplied: convergence.applied,
    dampeningApplied,
    weightAdjustments,
    triggeredRuleCount,
  }
}

// ─── Signal Normalization Helpers ───────────────────────────────────────────

/**
 * Normalize enterprise financial data into rule-consumable signals.
 * This bridges between the Enterprise/CashFlowRecord types and the
 * rulebook's signal-based evaluation.
 */
export function normalizeSignals(params: {
  cashRunway: number
  dscr: number
  incomeCV: number
  recoveryRate: number
  creditSalesRatio: number
  savingsRatio: number
  nachBounceRate: number
  upiVelocityDelta: number
  mgnregaDemandSpike: number
  commodityPriceRatio: number
  fodderPriceRatio: number
  wholesaleIndexRatio: number
  thiIndex: number
  spiIndex: number
  ndviIndex: number
  seasonalMultiplier: number
  milkYield?: number
  eggProduction?: number
  cropYield?: number
  inventoryTurnover?: number
}): Record<string, number> {
  return {
    cash_runway: params.cashRunway,
    dscr: params.dscr,
    income_cv: params.incomeCV,
    recovery_rate: params.recoveryRate,
    credit_sales_ratio: params.creditSalesRatio,
    savings_ratio: params.savingsRatio,
    nach_bounce: params.nachBounceRate,
    upi_velocity: params.upiVelocityDelta,
    mgnrega_demand: params.mgnregaDemandSpike,
    commodity_price: params.commodityPriceRatio,
    fodder_price: params.fodderPriceRatio,
    wholesale_index: params.wholesaleIndexRatio,
    thi: params.thiIndex,
    spi: params.spiIndex,
    ndvi: params.ndviIndex,
    seasonal_multiplier: params.seasonalMultiplier,
    ...(params.milkYield !== undefined && { milk_yield: params.milkYield }),
    ...(params.eggProduction !== undefined && { egg_production: params.eggProduction }),
    ...(params.cropYield !== undefined && { crop_yield: params.cropYield }),
    ...(params.inventoryTurnover !== undefined && { inventory_turnover: params.inventoryTurnover }),
  }
}

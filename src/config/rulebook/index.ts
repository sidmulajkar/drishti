/**
 * Drishti Rulebook — Master Index
 * ================================
 * Central registry that imports all rules, profiles, and configuration.
 * Single import point: `import { rulebook } from '../config/rulebook'`
 *
 * This file is the ONLY place that knows about all rule files.
 * Adding a new rule = create the .rules.ts file + add one import here.
 */

import type { Rulebook, RuleRecord, SectorProfile, Sector, RiskComponent, SectorWeightAdjustment } from './schema'

// ─── Signal Rules ───────────────────────────────────────────────────────────
import { RULES as thiHeatStress } from './signals/climate/thi-heat-stress.rules'
import { RULES as spiDrought } from './signals/climate/spi-drought.rules'
import { RULES as ndviCrop } from './signals/climate/ndvi-crop.rules'
import { RULES as dairyFeedCost } from './signals/commodity/dairy-feed-cost.rules'
import { RULES as retailWholesaleIndex } from './signals/commodity/retail-wholesale-index.rules'
import { RULES as nachBounce } from './signals/dpi/nach-bounce.rules'
import { RULES as upiVelocity } from './signals/dpi/upi-velocity.rules'
import { RULES as mgnregaDemand } from './signals/macro/mgnrega-demand.rules'

// ─── Component Rules ────────────────────────────────────────────────────────
import { RULES as cashRunwayRules } from './components/cash-runway.rules'
import { RULES as debtServiceCoverageRules } from './components/debt-service-coverage.rules'
import { RULES as incomeStabilityRules } from './components/income-stability.rules'
import { RULES as seasonalPositionRules } from './components/seasonal-position.rules'
import { RULES as inputCostPressureRules } from './components/input-cost-pressure.rules'
import { RULES as recoveryQualityRules } from './components/recovery-quality.rules'
import { RULES as externalRiskRules } from './components/external-risk.rules'

// ─── Weight Rules ───────────────────────────────────────────────────────────
import { BASE_WEIGHTS, WEIGHT_RULES } from './weights/base-weights.rules'
import { SECTOR_ADJUSTMENTS, ADJUSTMENT_RULES } from './weights/sector-adjustments.rules'

// ─── Convergence Rules ──────────────────────────────────────────────────────
import { CONVERGENCE_RULES } from './convergence/three-signal-stress.rules'
import { DAMPENING_RULES } from './convergence/dampening-rules.rules'

// ─── Sector Profiles ────────────────────────────────────────────────────────
import { PROFILE as dairyProfile } from './sector-profiles/dairy.profile'
import { PROFILE as retailProfile } from './sector-profiles/retail.profile'
import { PROFILE as poultryProfile } from './sector-profiles/poultry.profile'
import { PROFILE as mgnregaProfile } from './sector-profiles/mgnrega.profile'
import { PROFILE as agricultureProfile } from './sector-profiles/agriculture.profile'

// ─── Assemble All Rules ─────────────────────────────────────────────────────

const ALL_RULES: RuleRecord[] = [
  // Climate signals
  ...thiHeatStress,
  ...spiDrought,
  ...ndviCrop,
  // Commodity signals
  ...dairyFeedCost,
  ...retailWholesaleIndex,
  // DPI signals
  ...nachBounce,
  ...upiVelocity,
  // Macro signals
  ...mgnregaDemand,
  // Component rules
  ...cashRunwayRules,
  ...debtServiceCoverageRules,
  ...incomeStabilityRules,
  ...seasonalPositionRules,
  ...inputCostPressureRules,
  ...recoveryQualityRules,
  ...externalRiskRules,
  // Weight rules (documentation)
  ...WEIGHT_RULES,
  ...ADJUSTMENT_RULES,
]

const ALL_SECTOR_PROFILES: SectorProfile[] = [
  dairyProfile,
  retailProfile,
  poultryProfile,
  mgnregaProfile,
  agricultureProfile,
]

// ─── Master Rulebook ────────────────────────────────────────────────────────

export const rulebook: Rulebook = {
  version: '1.1.0',
  lastUpdated: '2026-07-19',
  changelog: [
    {
      version: '1.1.0',
      date: '2026-07-19',
      summary: 'Fixed DPI simulation math bugs, added rulebook governance metadata',
      changes: [
        'Fixed UPI velocity calculation: was comparing identical time windows (both slice(-1)), now compares latest month vs trailing average',
        'Fixed Mandi prices formula: non-dairy sectors were dividing monthlyRevenue by base², producing absurd values (+41522391%). Now uses seasonal price factor directly',
        'Fixed convergence detection: capped score at 100, all 4 signals now included in convergence filter',
        'Added SIMULATED labels to all DPI signal sources in the engine',
        'Added RulebookChangelogEntry type for version tracking and review scheduling',
      ],
      reviewStatus: 'validated',
      nextReviewDate: '2026-10-19',
    },
    {
      version: '1.0.0',
      date: '2026-07-17',
      summary: 'Initial rulebook: 50+ rules, 5 sector profiles, evaluator, validator',
      changes: [
        '25 signal rules across climate, commodity, DPI, and macro categories',
        '25 component rules across 7 risk components',
        'Base weights + 5 sector-specific adjustments with normalization',
        'Convergence (3-signal stress) and dampening rules',
        '5 sector profiles: dairy, retail, poultry, MGNREGA, agriculture',
      ],
      reviewStatus: 'validated',
      nextReviewDate: '2026-10-17',
    },
  ],
  rules: ALL_RULES,
  sectorProfiles: ALL_SECTOR_PROFILES,
  convergenceRules: CONVERGENCE_RULES,
  dampeningRules: DAMPENING_RULES,
  baseWeights: BASE_WEIGHTS,
  riskLevelThresholds: {
    green: [0, 25],
    yellow: [26, 50],
    orange: [51, 75],
    red: [76, 100],
  },
}

// ─── Convenience Accessors ──────────────────────────────────────────────────

/** Get all rules, optionally filtered by sector and/or component */
export function getRules(sector?: Sector, component?: RiskComponent): RuleRecord[] {
  return rulebook.rules.filter(r => {
    if (sector && r.sector && r.sector !== sector) return false
    if (component && r.component !== component) return false
    return true
  })
}

/** Get sector profile by ID */
export function getSectorProfile(sector: Sector): SectorProfile | undefined {
  return rulebook.sectorProfiles.find(p => p.id === sector)
}

/** Get weight adjustments for a sector */
export function getWeightAdjustments(sector: Sector): SectorWeightAdjustment[] {
  return SECTOR_ADJUSTMENTS[sector] || []
}

/** Get all enabled rules (for audit/export) */
export function getEnabledRules(): RuleRecord[] {
  return rulebook.rules.filter(r => r.enabled !== false)
}

/** Get rules by category */
export function getRulesByCategory(category: RuleRecord['category']): RuleRecord[] {
  return rulebook.rules.filter(r => r.category === category)
}

/** Get rule count summary */
export function getRulebookStats(): {
  totalRules: number
  enabledRules: number
  byComponent: Record<RiskComponent, number>
  byCategory: Record<string, number>
  sectorProfiles: number
  convergenceRules: number
  dampeningRules: number
} {
  const enabled = getEnabledRules()
  const byComponent: Record<string, number> = {}
  const byCategory: Record<string, number> = {}

  for (const rule of enabled) {
    byComponent[rule.component] = (byComponent[rule.component] || 0) + 1
    byCategory[rule.category] = (byCategory[rule.category] || 0) + 1
  }

  return {
    totalRules: rulebook.rules.length,
    enabledRules: enabled.length,
    byComponent: byComponent as Record<RiskComponent, number>,
    byCategory,
    sectorProfiles: rulebook.sectorProfiles.length,
    convergenceRules: rulebook.convergenceRules.length,
    dampeningRules: rulebook.dampeningRules.length,
  }
}

// Re-export everything consumers need
export { BASE_WEIGHTS } from './weights/base-weights.rules'
export { SECTOR_ADJUSTMENTS } from './weights/sector-adjustments.rules'
export { CONVERGENCE_RULES } from './convergence/three-signal-stress.rules'
export { DAMPENING_RULES } from './convergence/dampening-rules.rules'
export { evaluateRules, normalizeSignals } from './evaluator'
export type { EvaluateInput, EvaluateOutput } from './evaluator'
export type {
  RuleRecord, RuleCondition, RuleEvaluation, Sector, SectorProfile,
  SectorWeightAdjustment, ConvergenceRule, DampeningRule, RiskComponent,
  RiskLevel, DataConfidence, SignalType, RuleCategory, ResearchBasis,
  TestCase, RuleEffect, EvaluationResult, RulebookChangelogEntry,
} from './schema'

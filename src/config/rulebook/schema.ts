/**
 * Drishti Rulebook Schema
 * =======================
 * TypeScript definitions for all risk engine rules, sector profiles,
 * and governance metadata. Every rule has provenance, test cases,
 * and a review date — no black boxes.
 *
 * 6 Rule Categories:
 * 1. Threshold — binary on/off based on signal value vs breakpoint
 * 2. Ratio Band — continuous score within a [min, max] range
 * 3. Seasonal Calendar — month-indexed multipliers
 * 4. Convergence — multi-signal alignment amplification
 * 5. Sector-Specific — sector-only rules with unique conditions
 * 6. Dampening — time-based decay for recently resolved issues
 */

// ─── Core Types ─────────────────────────────────────────────────────────────

/** Supported sectors — expanded from 2 to 5 for full spec */
export type Sector = 'dairy' | 'rural_retail' | 'poultry' | 'mgnrega_wages' | 'agriculture'

/** Rule categories */
export type RuleCategory = 'threshold' | 'ratio_band' | 'seasonal_calendar' | 'convergence' | 'sector_specific' | 'dampening'

/** Risk components mapped to the 7-component engine */
export type RiskComponent =
  | 'cash_runway'
  | 'debt_service_coverage'
  | 'income_stability'
  | 'seasonal_position'
  | 'input_cost_pressure'
  | 'recovery_quality'
  | 'external_risk'

/** Risk levels for output classification */
export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red'

/** Confidence levels for data quality */
export type DataConfidence = 'high' | 'medium' | 'low'

/** Signal types from DPI / external sources */
export type SignalType =
  | 'thi'              // Temperature-Humidity Index
  | 'spi'              // Standardized Precipitation Index
  | 'ndvi'             // Normalized Difference Vegetation Index
  | 'nach_bounce'      // NACH mandate bounce rate
  | 'upi_velocity'     // UPI transaction velocity
  | 'mgnrega_demand'   // MGNREGA person-day demand
  | 'commodity_price'  // Mandi / commodity price
  | 'fodder_price'     // Fodder / feed price
  | 'wholesale_index'  // Wholesale price index
  | 'credit_sales_ratio' // Udhaar / credit sales ratio
  | 'recovery_rate'    // Udhaar recovery rate
  | 'income_cv'        // Coefficient of Variation of income
  | 'cash_runway'      // Months of cash remaining
  | 'dscr'             // Debt Service Coverage Ratio
  | 'savings_ratio'    // Savings / EMI ratio
  | 'inventory_turnover' // Inventory turnover rate
  | 'egg_production'   // Egg production rate (poultry)
  | 'milk_yield'       // Milk yield per animal
  | 'crop_yield'       // Crop yield per hectare
  | 'seasonal_multiplier' // Sector seasonal multiplier (0-1.5)

// ─── Research Provenance ────────────────────────────────────────────────────

/** Research backing for every rule — no orphan thresholds */
export interface ResearchBasis {
  source: string             // "IBEF Dairy Report 2025"
  url?: string               // Optional URL to source
  specificFinding: string    // "Heat stress reduces yield 10-25%"
  indiaValidation?: string  // "Confirmed via NDDB Gujarat data"
  limitations?: string      // "Limited to organized cooperative sector"
}

// ─── Test Cases ─────────────────────────────────────────────────────────────

/** Declarative test case for rule validation */
export interface TestCase {
  description: string        // "Dairy farm in Jun with THI > 80"
  inputs: Record<string, number>
  expectedTriggered: boolean
  expectedRiskDelta?: number
  expectedReason?: string
}

// ─── Rule Conditions ────────────────────────────────────────────────────────

/** Simple threshold condition: variable OP value */
export interface SimpleCondition {
  type: 'simple'
  variable: SignalType
  operator: '>' | '>=' | '<' | '<=' | '==' | '!='
  value: number
}

/** Band condition: min <= variable <= max */
export interface BandCondition {
  type: 'band'
  variable: SignalType
  min: number
  max: number
}

/** Composite condition: all sub-conditions must be true */
export interface CompositeCondition {
  type: 'composite'
  operator: 'AND' | 'OR'
  conditions: (SimpleCondition | BandCondition)[]
}

export type RuleCondition = SimpleCondition | BandCondition | CompositeCondition

// ─── Rule Effects ───────────────────────────────────────────────────────────

/** What happens when a rule triggers */
export interface RuleEffect {
  riskDelta: number          // Add to risk score (positive = worse)
  reason: string             // Human-readable explanation
  recommendedAction: string  // What to do about it
  confidence?: DataConfidence
}

// ─── Rule Record ────────────────────────────────────────────────────────────

/** A single rule — the atomic unit of the risk engine */
export interface RuleRecord {
  id: string                 // e.g., "signal.thi.heat_stress.dairy"
  version: string            // e.g., "1.0.0"
  category: RuleCategory
  component: RiskComponent   // Which of the 7 components this affects
  sector?: Sector            // undefined = applies to all sectors
  description: string        // Human-readable summary
  condition: RuleCondition
  effect: RuleEffect
  researchBasis: ResearchBasis
  testCases: TestCase[]
  reviewDate: string         // "2026-01-01" — when to re-validate
  enabled?: boolean          // Default true
}

// ─── Sector Weight Adjustments ──────────────────────────────────────────────

/** How a sector adjusts the base weights */
export interface SectorWeightAdjustment {
  component: RiskComponent
  multiplier: number         // 1.5 = 50% more important, 0.5 = 50% less
  reason: string             // Why this sector emphasizes this component
  researchBasis: ResearchBasis
}

// ─── Sector Profile ─────────────────────────────────────────────────────────

/** Complete sector definition — cost structure, revenue, signals, seasonality */
export interface SectorProfile {
  id: Sector
  name: string
  icon: string
  description: string

  // Seasonal calendar (12 multipliers, Jan-Dec)
  seasonalMultipliers: number[]

  // Cost structure
  costStructure: {
    name: string
    percentageOfRevenue: number  // 0-1
    volatility: 'low' | 'medium' | 'high'
    researchBasis: ResearchBasis
  }[]

  // Revenue structure
  revenueStructure: {
    primarySource: string        // "Cooperative milk sales"
    paymentCycle: string         // "Monthly, 15th"
    creditComponent: number      // 0-1: % of revenue on credit
    researchBasis: ResearchBasis
  }

  // Signal relevance (which signals matter most for this sector)
  signalRelevance: {
    signal: SignalType
    weight: number               // 0-1: relative importance
    reason: string
  }[]

  // Risk thresholds specific to this sector
  riskThresholds: {
    cashRunwayCritical: number   // months
    dscrWarning: number
    savingsFloorCritical: number // ratio
    recoveryRateWarning: number  // 0-1
  }

  // Key risk factors
  riskFactors: string[]

  // Average ranges for mock data generation
  avgMonthlyRevenue: [number, number]  // [min, max]
  avgMonthlyExpenses: [number, number]
  avgLoanOutstanding: [number, number]
  avgSavingsBalance: [number, number]

  // DPI signal configuration
  dpiConfig: {
    upiPenetration: number       // 0-1: % of transactions via UPI
    nachRelevance: number        // 0-1: how much NACH bounce matters
    mgnregaCorrelation: number   // 0-1: correlation with rural distress
    commodityPriceSensitivity: number // 0-1: how much input costs matter
  }
}

// ─── Convergence Rules ──────────────────────────────────────────────────────

/** Multi-signal convergence detection rule */
export interface ConvergenceRule {
  id: string
  version: string
  minSignals: number           // Minimum signals that must align
  direction: 'stress' | 'improvement'
  multiplierRange: [number, number] // [min, max] multiplier
  reason: string
  researchBasis: ResearchBasis
  testCases: TestCase[]
}

// ─── Dampening Rules ────────────────────────────────────────────────────────

/** Time-based decay for recently resolved issues */
export interface DampeningRule {
  id: string
  version: string
  component: RiskComponent
  decayRate: number            // Per-month decay (0.1 = 10% per month)
  maxDecay: number             // Maximum total decay (0-1)
  reason: string
  researchBasis: ResearchBasis
}

// ─── Evaluator Output ───────────────────────────────────────────────────────

/** Result of evaluating a single rule */
export interface RuleEvaluation {
  ruleId: string
  triggered: boolean
  riskDelta: number
  reason: string
  researchBasis: ResearchBasis
}

/** Complete evaluation result for all rules */
export interface EvaluationResult {
  sector: Sector
  evaluations: RuleEvaluation[]
  componentScores: Record<RiskComponent, number>
  finalScore: number
  riskLevel: RiskLevel
  weightAdjustments: SectorWeightAdjustment[]
  convergenceApplied: boolean
  dampeningApplied: boolean
}

// ─── Master Rulebook ────────────────────────────────────────────────────────

/** Governance entry for rulebook version tracking */
export interface RulebookChangelogEntry {
  version: string
  date: string
  summary: string
  changes: string[]
  reviewStatus: 'pending' | 'validated' | 'outdated'
  nextReviewDate: string
}

/** Complete rulebook — all rules, profiles, and configuration */
export interface Rulebook {
  version: string
  lastUpdated: string
  changelog: RulebookChangelogEntry[]
  rules: RuleRecord[]
  sectorProfiles: SectorProfile[]
  convergenceRules: ConvergenceRule[]
  dampeningRules: DampeningRule[]
  baseWeights: Record<RiskComponent, number>
  riskLevelThresholds: {
    green: [number, number]    // [min, max]
    yellow: [number, number]
    orange: [number, number]
    red: [number, number]
  }
}

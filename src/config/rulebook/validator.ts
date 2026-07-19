/**
 * Drishti Rulebook Validator
 * ==========================
 * Validates rulebook integrity: schema compliance, test case execution,
 * research provenance completeness, and cross-rule consistency.
 *
 * Run in development to catch rule errors before they affect scoring.
 * In production, runs once at startup and logs results.
 */

import { rulebook } from './index'
import { evaluateCondition } from './evaluator'
import type { RuleRecord, TestCase, RiskComponent } from './schema'

// ─── Validation Result Types ────────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  summary: {
    totalRules: number
    validRules: number
    testCasesRun: number
    testCasesPassed: number
    sectorsValidated: number
    componentsValidated: number
  }
}

export interface ValidationError {
  ruleId: string
  type: 'schema' | 'test_case' | 'research' | 'consistency'
  message: string
  details?: string
}

export interface ValidationWarning {
  ruleId: string
  type: 'review_overdue' | 'missing_test' | 'weak_research' | 'overlap'
  message: string
}

// ─── Schema Validation ──────────────────────────────────────────────────────

function validateRuleSchema(rule: RuleRecord): ValidationError[] {
  const errors: ValidationError[] = []

  if (!rule.id || rule.id.length < 5) {
    errors.push({ ruleId: rule.id || 'unknown', type: 'schema', message: 'Rule ID too short or missing' })
  }

  if (!rule.version || !/^\d+\.\d+\.\d+$/.test(rule.version)) {
    errors.push({ ruleId: rule.id, type: 'schema', message: `Invalid version format: "${rule.version}"` })
  }

  if (!rule.description || rule.description.length < 20) {
    errors.push({ ruleId: rule.id, type: 'schema', message: 'Description too short (min 20 chars)' })
  }

  if (!rule.condition) {
    errors.push({ ruleId: rule.id, type: 'schema', message: 'Missing condition' })
  }

  if (!rule.effect) {
    errors.push({ ruleId: rule.id, type: 'schema', message: 'Missing effect' })
  } else {
    if (typeof rule.effect.riskDelta !== 'number') {
      errors.push({ ruleId: rule.id, type: 'schema', message: 'riskDelta must be a number' })
    }
    if (!rule.effect.reason || rule.effect.reason.length < 10) {
      errors.push({ ruleId: rule.id, type: 'schema', message: 'Reason too short (min 10 chars)' })
    }
    if (!rule.effect.recommendedAction || rule.effect.recommendedAction.length < 10) {
      errors.push({ ruleId: rule.id, type: 'schema', message: 'recommendedAction too short (min 10 chars)' })
    }
  }

  if (!rule.researchBasis) {
    errors.push({ ruleId: rule.id, type: 'research', message: 'Missing researchBasis' })
  } else {
    if (!rule.researchBasis.source) {
      errors.push({ ruleId: rule.id, type: 'research', message: 'researchBasis.source is empty' })
    }
    if (!rule.researchBasis.specificFinding) {
      errors.push({ ruleId: rule.id, type: 'research', message: 'researchBasis.specificFinding is empty' })
    }
  }

  if (!rule.reviewDate) {
    errors.push({ ruleId: rule.id, type: 'schema', message: 'Missing reviewDate' })
  }

  return errors
}

// ─── Test Case Execution ────────────────────────────────────────────────────

function executeTestCase(rule: RuleRecord, tc: TestCase): boolean {
  // Build signals from test inputs
  const signals: Record<string, number> = { ...tc.inputs }
  return evaluateCondition(rule.condition, signals) === tc.expectedTriggered
}

// ─── Cross-Rule Consistency ─────────────────────────────────────────────────

function checkOverlappingRules(rules: RuleRecord[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  // Group by component
  const byComponent = new Map<RiskComponent, RuleRecord[]>()
  for (const rule of rules) {
    const existing = byComponent.get(rule.component) || []
    existing.push(rule)
    byComponent.set(rule.component, existing)
  }

  // Check for overlapping simple conditions within same component
  for (const [component, compRules] of byComponent) {
    const simpleRules = compRules.filter(r => r.condition.type === 'simple' && r.sector === undefined)
    for (let i = 0; i < simpleRules.length; i++) {
      for (let j = i + 1; j < simpleRules.length; j++) {
        const a = simpleRules[i]
        const b = simpleRules[j]
        const ca = a.condition.type === 'simple' ? a.condition : null
        const cb = b.condition.type === 'simple' ? b.condition : null
        if (ca && cb && ca.variable === cb.variable && ca.operator === cb.operator) {
          warnings.push({
            ruleId: a.id,
            type: 'overlap',
            message: `Rules "${a.id}" and "${b.id}" both apply ${ca.operator} on ${ca.variable} in component ${component}. Mutual exclusion will handle this, but consider merging.`,
          })
        }
      }
    }
  }

  return warnings
}

// ─── Main Validator ─────────────────────────────────────────────────────────

export function validateRulebook(): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let testCasesRun = 0
  let testCasesPassed = 0

  const rules = rulebook.rules
  const validRules = new Set<string>()

  // ─── Step 1: Validate each rule's schema ──────────────────────────────
  for (const rule of rules) {
    const ruleErrors = validateRuleSchema(rule)
    if (ruleErrors.length === 0) {
      validRules.add(rule.id)
    }
    errors.push(...ruleErrors)
  }

  // ─── Step 2: Run test cases ───────────────────────────────────────────
  for (const rule of rules) {
    if (!rule.testCases || rule.testCases.length === 0) {
      warnings.push({
        ruleId: rule.id,
        type: 'missing_test',
        message: 'No test cases defined',
      })
      continue
    }

    for (const tc of rule.testCases) {
      testCasesRun++
      try {
        const passed = executeTestCase(rule, tc)
        if (passed) {
          testCasesPassed++
        } else {
          errors.push({
            ruleId: rule.id,
            type: 'test_case',
            message: `Test case failed: "${tc.description}"`,
            details: `Expected triggered=${tc.expectedTriggered}, inputs=${JSON.stringify(tc.inputs)}`,
          })
        }
      } catch (err) {
        errors.push({
          ruleId: rule.id,
          type: 'test_case',
          message: `Test case error: "${tc.description}"`,
          details: String(err),
        })
      }
    }
  }

  // ─── Step 3: Check review dates ───────────────────────────────────────
  const now = new Date()
  for (const rule of rules) {
    if (rule.reviewDate) {
      const reviewDate = new Date(rule.reviewDate)
      if (reviewDate < now) {
        warnings.push({
          ruleId: rule.id,
          type: 'review_overdue',
          message: `Review date ${rule.reviewDate} has passed`,
        })
      }
    }
  }

  // ─── Step 4: Cross-rule consistency ───────────────────────────────────
  const overlapWarnings = checkOverlappingRules(rules)
  warnings.push(...overlapWarnings)

  // ─── Step 5: Validate sector profiles ─────────────────────────────────
  const sectorsValidated = rulebook.sectorProfiles.length
  for (const profile of rulebook.sectorProfiles) {
    if (profile.seasonalMultipliers.length !== 12) {
      errors.push({
        ruleId: `profile.${profile.id}`,
        type: 'schema',
        message: `Seasonal multipliers must have 12 values, got ${profile.seasonalMultipliers.length}`,
      })
    }
    const sum = profile.seasonalMultipliers.reduce((s, v) => s + v, 0)
    if (sum < 10 || sum > 14) {
      warnings.push({
        ruleId: `profile.${profile.id}`,
        type: 'weak_research',
        message: `Seasonal multipliers sum to ${sum.toFixed(2)} (expected ~12)`,
      })
    }
  }

  // ─── Step 6: Validate weight normalization ────────────────────────────
  const weightSum = Object.values(rulebook.baseWeights).reduce((s, w) => s + w, 0)
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push({
      ruleId: 'weights.base',
      type: 'consistency',
      message: `Base weights sum to ${weightSum.toFixed(3)}, expected 1.0`,
    })
  }

  const componentsValidated = new Set(rules.map(r => r.component)).size

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRules: rules.length,
      validRules: validRules.size,
      testCasesRun,
      testCasesPassed,
      sectorsValidated,
      componentsValidated,
    },
  }
}

// ─── Pretty Print ───────────────────────────────────────────────────────────

export function printValidationResult(result: ValidationResult): void {
  console.log('\n═══════════════════════════════════════════════')
  console.log('  DRISHTI RULEBOOK VALIDATION REPORT')
  console.log('═══════════════════════════════════════════════\n')

  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`)

  console.log('Summary:')
  console.log(`  Total rules:        ${result.summary.totalRules}`)
  console.log(`  Valid rules:        ${result.summary.validRules}`)
  console.log(`  Test cases run:     ${result.summary.testCasesRun}`)
  console.log(`  Test cases passed:  ${result.summary.testCasesPassed}`)
  console.log(`  Sectors validated:  ${result.summary.sectorsValidated}`)
  console.log(`  Components:         ${result.summary.componentsValidated}`)

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`)
    for (const err of result.errors) {
      console.log(`  ❌ [${err.type}] ${err.ruleId}: ${err.message}`)
      if (err.details) console.log(`     ${err.details}`)
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`)
    for (const warn of result.warnings) {
      console.log(`  ⚠️  [${warn.type}] ${warn.ruleId}: ${warn.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════\n')
}

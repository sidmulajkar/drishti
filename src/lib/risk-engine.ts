/**
 * Drishti Risk Engine
 * ===================
 * Transparent, explainable risk scoring for rural micro enterprises.
 * Now powered by the rulebook — every threshold, weight, and multiplier
 * is a documented, versioned, testable rule with research provenance.
 *
 * Every score has a reason. Every reason has a number. No black boxes.
 */

import type { Enterprise, CashFlowRecord, RiskScore, Sector, DataConfidence, DPISignalBundle, DPISignal, SavingsFloor, PeerRelativeContext, ActionableSuggestion } from '../types'
import { SECTOR_CONFIGS } from '../types'
import { evaluateRules, normalizeSignals, getSectorProfile, getWeightAdjustments } from '../config/rulebook'
import { rulebook } from '../config/rulebook'

// ─── Data Quality Score ──────────────────────────────────────────────────────
// Based on CGAP (2024): transactional data alone has predictive power
// comparable to credit history (AUC ~0.70). More data = higher confidence.
// Source: CGAP "Leveraging Transactional Data for MSE Lending" (March 2024)

function computeDataQualityScore(
  cashflows: CashFlowRecord[],
  enterprise: Enterprise,
): { score: number; confidence: DataConfidence; explanation: string } {
  let score = 0

  const monthsOfData = cashflows.length
  if (monthsOfData >= 9) score += 40
  else if (monthsOfData >= 6) score += 30
  else if (monthsOfData >= 3) score += 20
  else if (monthsOfData >= 1) score += 10

  const totalTransactions = cashflows.reduce((s, c) => {
    let count = 0
    if (c.inflow > 0) count++
    if (c.outflow > 0) count++
    if (c.udhaarGiven > 0) count++
    if (c.udhaarCollected > 0) count++
    return s + count
  }, 0)
  const avgTransactionsPerMonth = monthsOfData > 0 ? totalTransactions / monthsOfData : 0
  if (avgTransactionsPerMonth >= 4) score += 30
  else if (avgTransactionsPerMonth >= 3) score += 22
  else if (avgTransactionsPerMonth >= 2) score += 15
  else if (avgTransactionsPerMonth >= 1) score += 8

  const monthsWithBoth = cashflows.filter(c => c.inflow > 0 && c.outflow > 0).length
  const consistencyRatio = monthsOfData > 0 ? monthsWithBoth / monthsOfData : 0
  score += Math.round(consistencyRatio * 20)

  if (enterprise.savingsBalance > 0) score += 3
  if (enterprise.loanOutstanding > 0) score += 3
  if (enterprise.emiAmount > 0) score += 2
  if (enterprise.onboardingDate) score += 2

  score = Math.min(100, score)

  let confidence: DataConfidence
  if (score >= 70) confidence = 'high'
  else if (score >= 40) confidence = 'medium'
  else confidence = 'low'

  const explanation = confidence === 'high'
    ? `Strong data profile (${monthsOfData} months, ${Math.round(avgTransactionsPerMonth)} txns/mo). Risk assessment is reliable.`
    : confidence === 'medium'
    ? `Moderate data profile (${monthsOfData} months). Risk assessment has some uncertainty.`
    : `Limited data (${monthsOfData} months). Risk scores should be validated by field officer.`

  return { score, confidence, explanation }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function recentAvg(arr: number[], n: number): number {
  return mean(arr.slice(-n))
}

function olderAvg(arr: number[], n: number): number {
  return arr.length >= n * 2 ? mean(arr.slice(-n * 2, -n)) : mean(arr.slice(0, -n))
}

// ─── DPI Signal Simulation ──────────────────────────────────────────────────

const SECTOR_UPI_PENETRATION: Record<Sector, number> = {
  dairy: 0.30,
  rural_retail: 0.45,
  poultry: 0.35,
  mgnrega_wages: 0.20,
  agriculture: 0.25,
}

export function simulateDPISignals(
  enterprise: Enterprise,
  cashflows: CashFlowRecord[],
  risk: RiskScore,
): DPISignalBundle {
  const recentCFs = cashflows.slice(-6)
  const avgInflow = mean(recentCFs.map(c => c.inflow))
  const dscr = enterprise.emiAmount > 0 && avgInflow > enterprise.monthlyExpenses
    ? (avgInflow - enterprise.monthlyExpenses) / enterprise.emiAmount
    : avgInflow > enterprise.monthlyExpenses ? 2.0 : 0.5

  // UPI Velocity: Compare recent month vs trailing 3-month average
  // Real DPI access: via Account Aggregator framework (38% coverage urban, ~20% rural)
  // Simulated here using cashflow trends as proxy for transaction volume
  const penetration = SECTOR_UPI_PENETRATION[enterprise.sector]
  const recentInflows = recentCFs.map(c => c.inflow)
  const trailingAvg = recentInflows.length >= 4
    ? mean(recentInflows.slice(0, -1))
    : avgInflow
  const latestMonth = recentInflows[recentInflows.length - 1] || avgInflow
  const velocityRatio = trailingAvg > 0 ? latestMonth / trailingAvg : 1.0

  const upiValue = Math.round(Math.max(0, Math.min(100,
    50 + (velocityRatio - 1.0) * 150
  )))
  const upiDelta = Math.round((velocityRatio - 1.0) * 100)

  const upiSignal: DPISignal = {
    strength: upiDelta < -20 ? 'strong' : upiDelta < -10 ? 'moderate' : upiDelta < -5 ? 'weak' : 'none',
    value: upiValue,
    delta: upiDelta,
    source: `NPCI UPI velocity (sector avg ${Math.round(penetration * 100)}% adoption, simulated)`,
    detail: velocityRatio < 0.8
      ? `Recent transaction volume ${Math.abs(upiDelta)}% below trailing average — possible demand contraction`
      : velocityRatio > 1.2
      ? `Recent transaction volume ${upiDelta}% above trailing average — strong demand`
      : 'UPI transaction volume stable within normal range',
  }

  const bounceProbability = dscr < 0.5 ? 0.45 : dscr < 1.0 ? 0.25 : dscr < 1.25 ? 0.12 : 0.05
  const nachBounceRate = Math.round(bounceProbability * 100)
  const nachValue = Math.round(Math.max(0, Math.min(100, 100 - nachBounceRate * 2.5)))

  const nachSignal: DPISignal = {
    strength: nachBounceRate > 30 ? 'strong' : nachBounceRate > 15 ? 'moderate' : nachBounceRate > 8 ? 'weak' : 'none',
    value: nachValue,
    delta: -nachBounceRate,
    source: 'NPCI NACH mandate data (simulated from DSCR)',
    detail: nachBounceRate > 30
      ? `${nachBounceRate}% estimated bounce rate — critical liquidity stress signal`
      : nachBounceRate > 15
      ? `${nachBounceRate}% estimated bounce rate — moderate concern`
      : nachBounceRate > 8
      ? `${nachBounceRate}% estimated bounce rate — within normal range`
      : 'Low bounce rate — healthy payment behavior',
  }

  const mgnregaSpike = risk.seasonalScore < 50 ? 1.3 : 1.0
  const mgnregaValue = Math.round(Math.max(0, Math.min(100,
    50 + (mgnregaSpike - 1.0) * 100
  )))
  const mgnregaSignal: DPISignal = {
    strength: mgnregaSpike > 1.2 ? 'moderate' : mgnregaSpike > 1.1 ? 'weak' : 'none',
    value: mgnregaValue,
    delta: Math.round((mgnregaSpike - 1.0) * 100),
    source: 'MGNREGA demand (simulated from seasonal score)',
    detail: mgnregaSpike > 1.2
      ? `Seasonal income stress indicator elevated ${Math.round((mgnregaSpike - 1) * 100)}% — possible labor market pressure (simulated)`
      : 'MGNREGA demand within normal range',
  }

  // Mandi/Commodity Prices: Simulated seasonal price vs baseline
  // Real DPI access: Agmarknet/eNAM free API (data.gov.in) — daily updates, 25+ commodities
  // For dairy: fodder price ratio. For retail: wholesale price index. For agriculture: input cost ratio.
  const now = new Date()
  const monthIdx = now.getMonth()
  const seasonalPriceFactor = enterprise.sector === 'dairy'
    ? (monthIdx >= 3 && monthIdx <= 5 ? 1.15 : monthIdx >= 9 || monthIdx <= 2 ? 0.95 : 1.0)
    : enterprise.sector === 'agriculture'
    ? (monthIdx >= 0 && monthIdx <= 2 ? 1.20 : monthIdx >= 5 && monthIdx <= 7 ? 0.85 : 1.0)
    : (monthIdx >= 5 && monthIdx <= 7 ? 1.10 : monthIdx >= 9 && monthIdx <= 10 ? 0.90 : 1.0)
  // priceVsMSP = current price / baseline price (ratio around 1.0)
  const priceVsMSP = seasonalPriceFactor
  const mandiValue = Math.round(Math.max(0, Math.min(100,
    50 + (1 - priceVsMSP) * 100
  )))
  const mandiSignal: DPISignal = {
    strength: priceVsMSP > 1.15 ? 'strong' : priceVsMSP > 1.05 ? 'moderate' : priceVsMSP < 0.95 ? 'weak' : 'none',
    value: mandiValue,
    delta: Math.round((priceVsMSP - 1.0) * 100),
    source: enterprise.sector === 'dairy' ? 'Agmarknet fodder prices (simulated)' : 'Agmarknet/eNAM mandi data (simulated)',
    detail: priceVsMSP > 1.15
      ? `Input costs ${Math.round((priceVsMSP - 1) * 100)}% above seasonal baseline — margin pressure`
      : priceVsMSP < 0.95
      ? `Input costs ${Math.abs(Math.round((priceVsMSP - 1) * 100))}% below baseline — favorable`
      : 'Input costs within seasonal normal range',
  }

  // Convergence detection: multiple signals showing stress = higher confidence
  const allSignals = [upiSignal, nachSignal, mgnregaSignal, mandiSignal]
  const stressSignals = allSignals
    .filter(s => s.strength === 'strong' || (s.strength === 'moderate' && (s.delta < -10 || s.delta > 10))).length
  const improvementSignals = allSignals
    .filter(s => s.strength === 'none' && s.delta > 5).length

  let convergenceScore = 40
  let convergenceDirection: 'none' | 'stress' | 'improvement' = 'none'

  if (stressSignals >= 3) {
    convergenceScore = Math.min(100, 85 + stressSignals * 5)
    convergenceDirection = 'stress'
  } else if (stressSignals >= 2) {
    convergenceScore = Math.min(100, 60 + stressSignals * 10)
    convergenceDirection = 'stress'
  } else if (improvementSignals >= 2) {
    convergenceScore = Math.min(100, 60 + improvementSignals * 10)
    convergenceDirection = 'improvement'
  }

  return {
    upiVelocity: upiSignal,
    nachBounce: nachSignal,
    mgnrega: mgnregaSignal,
    mandiPrices: mandiSignal,
    convergenceScore,
    convergenceDirection,
  }
}

export function getConvergenceMultiplier(bundle: DPISignalBundle): number {
  if (bundle.convergenceDirection === 'stress' && bundle.convergenceScore > 70) {
    return 1.15 + (bundle.convergenceScore - 70) * 0.005
  }
  return 1.0
}

// ─── Household Viability ────────────────────────────────────────────────────

export interface HouseholdViability {
  totalMonthlyDebtService: number
  totalHouseholdIncome: number
  totalMonthlyObligations: number
  trueDisposableIncome: number
  householdRiskScore: number
  debtBreakdown: {
    formal: number
    shgInternal: number
    traderCredit: number
    cooperative: number
    informal: number
  }
}

export function calculateHouseholdViability(
  enterprise: Enterprise,
  averageNetCashFlow: number,
): HouseholdViability | null {
  const hc = enterprise.householdContext
  if (!hc) return null

  const totalMonthlyDebtService =
    hc.formalLoanEmi +
    hc.shgInternalLoan +
    hc.traderCreditMonthly +
    hc.cooperativeAdvanceEmi +
    hc.informalLoanEmi

  const totalHouseholdIncome =
    Math.max(0, averageNetCashFlow) +
    hc.spouseIncome +
    hc.otherHouseholdIncome

  const totalMonthlyObligations =
    hc.householdExpenses +
    totalMonthlyDebtService

  const trueDisposableIncome = totalHouseholdIncome - totalMonthlyObligations

  let householdRiskScore = 0
  if (totalMonthlyObligations > 0) {
    const disposableRatio = trueDisposableIncome / totalMonthlyObligations
    if (disposableRatio < 0) {
      householdRiskScore = Math.min(100, 80 + Math.abs(disposableRatio) * 50)
    } else if (disposableRatio < 0.10) {
      householdRiskScore = 50 + (0.10 - disposableRatio) * 300
    } else if (disposableRatio < 0.20) {
      householdRiskScore = 25 + (0.20 - disposableRatio) * 250
    } else {
      householdRiskScore = Math.max(0, 25 - disposableRatio * 25)
    }
  }

  const incomeEarners = (hc.spouseIncome > 0 ? 1 : 0) + 1
  const dependencyRatio = hc.dependents / Math.max(1, incomeEarners)
  if (dependencyRatio > 2) {
    householdRiskScore = Math.min(100, householdRiskScore + (dependencyRatio - 2) * 10)
  }

  return {
    totalMonthlyDebtService,
    totalHouseholdIncome,
    totalMonthlyObligations,
    trueDisposableIncome,
    householdRiskScore: Math.round(householdRiskScore),
    debtBreakdown: {
      formal: hc.formalLoanEmi,
      shgInternal: hc.shgInternalLoan,
      traderCredit: hc.traderCreditMonthly,
      cooperative: hc.cooperativeAdvanceEmi,
      informal: hc.informalLoanEmi,
    },
  }
}

// ─── Savings Floor ──────────────────────────────────────────────────────────

export function computeSavingsFloor(
  enterprise: Enterprise,
  householdViability: ReturnType<typeof calculateHouseholdViability>,
): SavingsFloor {
  const totalMonthlyBurn = householdViability
    ? householdViability.totalMonthlyObligations
    : enterprise.monthlyExpenses + enterprise.emiAmount

  const totalDebtService = householdViability
    ? householdViability.totalMonthlyDebtService
    : enterprise.emiAmount

  const monthsOfDebtCover = totalMonthlyBurn > 0
    ? enterprise.savingsBalance / totalMonthlyBurn
    : enterprise.savingsBalance > 0 ? 99 : 0

  const ratio = totalDebtService > 0
    ? enterprise.savingsBalance / totalDebtService
    : enterprise.savingsBalance > 0 ? 99 : 0

  const dailyBurn = totalMonthlyBurn / 30
  const bufferDays = dailyBurn > 0 ? Math.round(enterprise.savingsBalance / dailyBurn) : 999

  // Use sector-specific thresholds from rulebook if available
  const sectorProfile = getSectorProfile(enterprise.sector)
  const criticalThreshold = sectorProfile?.riskThresholds.savingsFloorCritical ?? 0.5

  let status: SavingsFloor['status']
  if (ratio < criticalThreshold) status = 'critical'
  else if (ratio < 1.0) status = 'alert'
  else if (ratio < 3.0) status = 'caution'
  else status = 'healthy'

  return { ratio: Math.round(ratio * 100) / 100, monthsOfDebtCover: Math.round(monthsOfDebtCover * 10) / 10, status, bufferDays }
}

// ─── Peer-Relative Context ──────────────────────────────────────────────────

export function computePeerRelativeContext(
  enterprise: Enterprise,
  allEnterprises: Enterprise[],
  allRiskScores: Map<string, RiskScore>,
): PeerRelativeContext | null {
  const sectorPeers = allEnterprises.filter(e => e.sector === enterprise.sector)
  if (sectorPeers.length < 3) return null

  const peerScores = sectorPeers
    .map(e => allRiskScores.get(e.id))
    .filter((r): r is RiskScore => r !== undefined)
    .map(r => r.finalScore)

  if (peerScores.length < 3) return null

  const sorted = [...peerScores].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const enterpriseRisk = allRiskScores.get(enterprise.id)
  if (!enterpriseRisk) return null

  const worseCount = sorted.filter(s => s > enterpriseRisk.finalScore).length
  const percentile = Math.round((worseCount / sorted.length) * 100)

  const now = new Date()
  const monthIdx = now.getMonth()
  const sectorConfig = SECTOR_CONFIGS[enterprise.sector]
  const seasonalMultiplier = sectorConfig.monthlyMultipliers[monthIdx]
  const isSectorTrough = seasonalMultiplier < 0.85

  const distressIsIdiosyncratic = enterpriseRisk.riskLevel === 'red' && percentile < 30 && !isSectorTrough
  const distressIsSeasonal = isSectorTrough && percentile < 50

  let recoveryMonth = -1
  for (let i = 0; i < 12; i++) {
    const checkMonth = (monthIdx + i) % 12
    if (sectorConfig.monthlyMultipliers[checkMonth] > 0.95) {
      recoveryMonth = checkMonth
      break
    }
  }
  const nowDate = new Date()
  const recoveryDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + (recoveryMonth > monthIdx ? recoveryMonth - monthIdx : 12 - monthIdx + recoveryMonth), 1)
  const expectedRecoveryMonth = `${recoveryDate.getFullYear()}-${String(recoveryDate.getMonth() + 1).padStart(2, '0')}`

  return {
    sectorPercentile: percentile,
    sectorMedianScore: median,
    distressIsIdiosyncratic,
    distressIsSeasonal,
    expectedRecoveryMonth,
    peerCount: sectorPeers.length,
  }
}

// ─── Actionable Suggestions ─────────────────────────────────────────────────

export function computeActionableSuggestions(
  enterprise: Enterprise,
  risk: RiskScore,
  savingsFloor: SavingsFloor,
  householdViability: ReturnType<typeof calculateHouseholdViability>,
  forecasts: { month: string; predictedNet: number }[],
  recentCashflows?: CashFlowRecord[],
): ActionableSuggestion[] {
  const suggestions: ActionableSuggestion[] = []
  let suggestionIdx = 0
  const makeId = () => `sug-${enterprise.id}-${suggestionIdx++}`

  let actualRecoveryRate = 0.85
  if (recentCashflows && recentCashflows.length > 0) {
    const totalGiven = recentCashflows.reduce((s, c) => s + c.udhaarGiven, 0)
    const totalCollected = recentCashflows.reduce((s, c) => s + c.udhaarCollected, 0)
    if (totalGiven > 0) actualRecoveryRate = totalCollected / totalGiven
  }

  if (savingsFloor.status === 'critical') {
    const gap = enterprise.emiAmount - enterprise.savingsBalance
    suggestions.push({
      id: makeId(),
      category: 'savings',
      urgency: 'immediate',
      title: `Savings buffer critically low: ${savingsFloor.monthsOfDebtCover} months of EMI cover`,
      detail: `₹${enterprise.savingsBalance.toLocaleString('en-IN')} savings vs ₹${enterprise.emiAmount.toLocaleString('en-IN')} EMI. Need ₹${gap.toLocaleString('en-IN')} more to reach 1 month buffer.`,
      institution: enterprise.shgId ? `Contact ${enterprise.shgId.toUpperCase()} for emergency savings push` : 'Start weekly ₹500 savings chit',
      amount: gap,
      deadline: 'This week',
      consequenceIfIgnored: `At current burn rate, savings depleted in ${savingsFloor.bufferDays} days. First missed EMI triggers penalty + credit score damage.`,
      potentialImpact: `Reaching 1-month buffer (₹${enterprise.emiAmount.toLocaleString('en-IN')}) extends survival by ${Math.round(30 * (enterprise.emiAmount / Math.max(1, enterprise.monthlyExpenses + enterprise.emiAmount)))} days`,
    })
  } else if (savingsFloor.status === 'alert') {
    suggestions.push({
      id: makeId(),
      category: 'savings',
      urgency: 'this_week',
      title: `Savings below 1-month EMI buffer: ${savingsFloor.monthsOfDebtCover}x cover`,
      detail: `₹${enterprise.savingsBalance.toLocaleString('en-IN')} savings covers ${savingsFloor.monthsOfDebtCover} months of ₹${enterprise.emiAmount.toLocaleString('en-IN')} EMI. Target: 3-month buffer.`,
      institution: `SHG weekly meeting — commit ₹500/week savings increase`,
      amount: Math.round(enterprise.emiAmount * 0.5),
      deadline: 'Within 2 weeks',
      consequenceIfIgnored: 'Any unexpected expense (medical, repair) pushes into EMI default territory.',
      potentialImpact: 'Building a 3-month savings buffer provides a financial cushion against income shocks (Rutherford et al. 2009, Portfolios of the Poor)',
    })
  }

  if (householdViability && householdViability.trueDisposableIncome < 0) {
    const deficit = Math.abs(householdViability.trueDisposableIncome)
    const largestInvisible = Math.max(
      householdViability.debtBreakdown.shgInternal,
      householdViability.debtBreakdown.traderCredit,
      householdViability.debtBreakdown.informal,
    )
    let largestLabel = 'informal'
    if (largestInvisible === householdViability.debtBreakdown.shgInternal) largestLabel = 'SHG internal'
    else if (largestInvisible === householdViability.debtBreakdown.traderCredit) largestLabel = 'trader credit'

    suggestions.push({
      id: makeId(),
      category: 'household',
      urgency: 'immediate',
      title: `Household deficit: ₹${deficit.toLocaleString('en-IN')}/month after all obligations`,
      detail: `Household income ₹${householdViability.totalHouseholdIncome.toLocaleString('en-IN')}/mo minus ₹${householdViability.totalMonthlyObligations.toLocaleString('en-IN')}/mo obligations = ₹${deficit.toLocaleString('en-IN')}/mo deficit. Biggest hidden debt: ${largestLabel} (₹${largestInvisible.toLocaleString('en-IN')}/mo).`,
      institution: 'Block Resource Centre — request household financial counseling',
      consequenceIfIgnored: `₹${deficit.toLocaleString('en-IN')}/mo deficit funded by more borrowing — debt spiral. Within 3-6 months, formal EMI also at risk.`,
      potentialImpact: (() => {
        const flip = largestInvisible - deficit
        return flip >= 0
          ? `Eliminating ${largestLabel} debt (₹${largestInvisible.toLocaleString('en-IN')}/mo) flips deficit to ₹${flip.toLocaleString('en-IN')}/mo surplus`
          : `Eliminating ${largestLabel} debt (₹${largestInvisible.toLocaleString('en-IN')}/mo) reduces deficit to ₹${Math.abs(flip).toLocaleString('en-IN')}/mo — still needs income boost`
      })(),
    })
  }

  const householdDSCR = householdViability
    ? householdViability.totalHouseholdIncome / Math.max(1, householdViability.totalMonthlyObligations)
    : risk.debtScore < 50 ? 0.8 : 1.5

  if (householdDSCR < 1.0) {
    const restructuredEmi = Math.round(enterprise.emiAmount * 0.7)
    const restructuredDSCR = householdViability
      ? householdViability.totalHouseholdIncome / Math.max(1, householdViability.totalMonthlyObligations - enterprise.emiAmount + restructuredEmi)
      : householdDSCR * (enterprise.emiAmount / restructuredEmi)
    suggestions.push({
      id: makeId(),
      category: 'credit',
      urgency: 'this_week',
      title: `Debt service ratio ${householdDSCR.toFixed(1)}x — cannot cover all obligations from income`,
      detail: `₹${householdViability ? householdViability.totalHouseholdIncome.toLocaleString('en-IN') : enterprise.monthlyRevenue.toLocaleString('en-IN')}/mo income against ₹${householdViability ? householdViability.totalMonthlyObligations.toLocaleString('en-IN') : enterprise.emiAmount.toLocaleString('en-IN')}/mo obligations.`,
      institution: `Lead Bank ${enterprise.district} — request debt restructuring under RBI restructuring framework`,
      consequenceIfIgnored: 'NACH bounce likely within 60 days. Persistent bounces (>30% of mandates) indicate severe liquidity stress requiring immediate intervention.',
      potentialImpact: `Restructuring formal EMI from ₹${enterprise.emiAmount.toLocaleString('en-IN')} to ₹${restructuredEmi.toLocaleString('en-IN')}/mo (36-month extension) improves DSCR to ${restructuredDSCR.toFixed(1)}x`,
    })
  }

  const upcomingNegative = forecasts.filter(f => f.predictedNet < 0)
  if (upcomingNegative.length >= 2) {
    const worstMonth = upcomingNegative.reduce((worst, f) => f.predictedNet < worst.predictedNet ? f : worst)
    const totalGap = Math.abs(upcomingNegative.reduce((s, f) => s + f.predictedNet, 0))

    suggestions.push({
      id: makeId(),
      category: 'savings',
      urgency: 'this_month',
      title: `${upcomingNegative.length} months of negative cash flow forecast ahead`,
      detail: `Worst month: ${worstMonth.month} (₹${Math.abs(worstMonth.predictedNet).toLocaleString('en-IN')} deficit). Cumulative gap: ₹${totalGap.toLocaleString('en-IN')}. Build buffer now while cash is available.`,
      institution: `SHG corpus — request pre-positioning of ₹${Math.round(totalGap * 0.6).toLocaleString('en-IN')} from group savings`,
      amount: totalGap,
      deadline: `Before ${worstMonth.month}`,
      consequenceIfIgnored: `Without buffer, formal EMI default in ${worstMonth.month}. Recovery takes 3-6 months.`,
      potentialImpact: `Buffer of ₹${Math.round(totalGap * 0.6).toLocaleString('en-IN')} (60% of gap) extends runway through trough`,
    })
  }

  if (risk.creditScore < 50) {
    const atRiskAmount = Math.round((1 - actualRecoveryRate) * enterprise.monthlyRevenue * (enterprise.sector === 'dairy' ? 0.1 : 0.2))
    const recoverableAmount = Math.round((0.85 - actualRecoveryRate) * enterprise.monthlyRevenue * (enterprise.sector === 'dairy' ? 0.1 : 0.2))
    const recoveryLabel = enterprise.sector === 'dairy'
      ? 'Cooperative payment collection rate'
      : enterprise.sector === 'rural_retail'
      ? 'Credit (udhaar) recovery rate'
      : enterprise.sector === 'poultry'
      ? 'Hotel/restaurant credit recovery'
      : 'Trader credit recovery rate'
    suggestions.push({
      id: makeId(),
      category: 'recovery',
      urgency: 'this_week',
      title: `${recoveryLabel} at ${Math.round(actualRecoveryRate * 100)}% — ₹${atRiskAmount.toLocaleString('en-IN')}/mo at risk`,
      detail: `Recovery score ${risk.creditScore}/100.`,
      institution: enterprise.sector === 'dairy'
        ? 'Contact cooperative payment desk — verify pending payments and quality deductions'
        : enterprise.sector === 'poultry'
        ? 'Contact hotel/restaurant accounts — send weekly statements'
        : 'WhatsApp broadcast to top 10 credit customers — send itemized statement with due date',
      consequenceIfIgnored: `At current trajectory, 3-month outstanding will exceed ₹${Math.round(enterprise.monthlyRevenue * 0.3).toLocaleString('en-IN')}. Bad debt provision reduces profit margin.`,
      potentialImpact: recoverableAmount > 0
        ? `Improving recovery from ${Math.round(actualRecoveryRate * 100)}% to 85% recovers ₹${recoverableAmount.toLocaleString('en-IN')}/mo`
        : `Recovery already near optimal — focus on reducing credit sales volume instead`,
    })
  }

  if (risk.trendScore < 40) {
    suggestions.push({
      id: makeId(),
      category: 'income',
      urgency: 'this_month',
      title: `Income instability: coefficient of variation above 0.5 — erratic revenue`,
      detail: `Month-to-month income varies >50%. Makes debt servicing unpredictable.`,
      institution: enterprise.sector === 'dairy'
        ? 'Dairy cooperative — negotiate fixed-rate milk procurement contract'
        : enterprise.sector === 'poultry'
        ? 'Poultry association — explore contract farming with guaranteed offtake'
        : enterprise.sector === 'agriculture'
        ? 'Krishi Vigyan Kendra — explore crop diversification for stable income'
        : 'Explore eNAM mandi listing for price transparency',
      consequenceIfIgnored: 'Unpredictable income means even low EMI can trigger default in lean months.',
      potentialImpact: `Reducing CV from >0.5 to <0.3 through contract sales stabilizes DSCR by ±${Math.round(enterprise.emiAmount * 0.3).toLocaleString('en-IN')}/mo`,
    })
  }

  if (risk.shockScore < 40) {
    suggestions.push({
      id: makeId(),
      category: 'cost',
      urgency: 'this_month',
      title: `Input cost pressure: sector-specific costs above baseline`,
      detail: enterprise.sector === 'dairy'
        ? 'Fodder/feed costs elevated. Feed is 55-75% of dairy operating cost.'
        : enterprise.sector === 'poultry'
        ? 'Poultry feed costs elevated. Feed is 60-70% of poultry operating cost.'
        : enterprise.sector === 'agriculture'
        ? 'Fertilizer/seed costs elevated. Inputs are 40-50% of cultivation cost.'
        : 'Wholesale procurement costs above average. Margin compression.',
      institution: enterprise.sector === 'dairy'
        ? 'PACS cooperative fodder procurement — ₹2/kg below market rate'
        : enterprise.sector === 'poultry'
        ? 'Poultry feed cooperative — bulk purchase discount'
        : enterprise.sector === 'agriculture'
        ? 'PACS input store — subsidized fertilizer/seeds under PM-KISAN'
        : 'Wholesale mandi direct purchase — cut middleman margin 8-12%',
      consequenceIfIgnored: `Continued margin erosion: estimated ₹${Math.round(enterprise.monthlyExpenses * 0.08).toLocaleString('en-IN')}/mo additional cost`,
      potentialImpact: `Fodder from cooperative saves ₹${Math.round(enterprise.monthlyExpenses * 0.12).toLocaleString('en-IN')}/mo (12% of feed cost)`,
    })
  }

  const liquidAssets = (enterprise.householdContext?.goldEstimate || 0)
    + (enterprise.householdContext?.otherSavings || 0)
    + enterprise.savingsBalance

  if (savingsFloor.status !== 'healthy' && liquidAssets > enterprise.emiAmount * 2) {
    const goldValue = enterprise.householdContext?.goldEstimate || 0
    const goldLoanAmount = Math.round(goldValue * 0.75)
    const assetWarning = enterprise.sector === 'dairy'
      ? 'Note: livestock is the enterprise — do not sell for cash.'
      : enterprise.sector === 'poultry'
      ? 'Note: birds are the enterprise — do not cull for cash.'
      : enterprise.sector === 'agriculture'
      ? 'Note: crops/land are the enterprise — do not liquidate for cash.'
      : 'Note: inventory is the enterprise — do not liquidate for cash.'
    suggestions.push({
      id: makeId(),
      category: 'savings',
      urgency: 'this_month',
      title: goldValue > 0
        ? `Liquid assets of ₹${liquidAssets.toLocaleString('en-IN')} available — gold loan could bridge gap`
        : `Savings of ₹${enterprise.savingsBalance.toLocaleString('en-IN')} available as emergency buffer`,
      detail: goldValue > 0
        ? `Gold ₹${goldValue.toLocaleString('en-IN')} (loanable at 7%) + savings ₹${enterprise.savingsBalance.toLocaleString('en-IN')}. ${assetWarning}`
        : `Savings ₹${enterprise.savingsBalance.toLocaleString('en-IN')} + other savings ₹${(enterprise.householdContext?.otherSavings || 0).toLocaleString('en-IN')}. ${assetWarning}`,
      institution: goldValue > 0
        ? `Bank gold loan counter — ₹${goldLoanAmount.toLocaleString('en-IN')} available (75% LTV)`
        : `SHG emergency corpus — request temporary bridge`,
      amount: goldValue > 0 ? goldLoanAmount : enterprise.savingsBalance,
      consequenceIfIgnored: 'Savings depleted while gold sits idle. Gold loan is cheaper than informal borrowing.',
      potentialImpact: goldValue > 0
        ? `Gold loan of ₹${goldLoanAmount.toLocaleString('en-IN')} at 7% = ₹${Math.round(goldLoanAmount * 0.07 / 12).toLocaleString('en-IN')}/mo interest — far cheaper than moneylender at 3%/mo`
        : `Using savings before informal borrowing saves ₹${Math.round(enterprise.emiAmount * 0.03).toLocaleString('en-IN')}/mo in moneylender interest`,
    })
  }

  if (risk.riskLevel === 'green' && suggestions.length === 0) {
    suggestions.push({
      id: makeId(),
      category: 'savings',
      urgency: 'this_month',
      title: `Build emergency fund: current ₹${enterprise.savingsBalance.toLocaleString('en-IN')} → target ₹${(enterprise.monthlyExpenses * 3).toLocaleString('en-IN')} (3 months expenses)`,
      detail: `Currently ${savingsFloor.monthsOfDebtCover}x EMI cover. Target: 3x for weathering any shock.`,
      institution: `Recurring Deposit at ${enterprise.district} branch — ₹${Math.round((enterprise.monthlyExpenses * 3 - enterprise.savingsBalance) / 12).toLocaleString('en-IN')}/mo for 12 months`,
      amount: Math.round((enterprise.monthlyExpenses * 3 - enterprise.savingsBalance) / 12),
      consequenceIfIgnored: 'Healthy today, but single shock (medical, breakdown, disease) without buffer can cascade.',
      potentialImpact: `3-month buffer provides ₹${(enterprise.monthlyExpenses * 3).toLocaleString('en-IN')} safety net — absorbs most rural micro-enterprise shocks`,
    })
  }

  return suggestions
}

// ─── Raw Value Computation ──────────────────────────────────────────────────
// These functions compute raw financial metrics from enterprise data.
// The rulebook evaluator then maps these to risk scores.

function computeCashRunwayMonths(savingsBalance: number, avgNetCashFlow: number, monthlyExpenses: number): number {
  if (monthlyExpenses <= 0) return 99
  if (avgNetCashFlow >= 0) return 99
  return savingsBalance / Math.abs(avgNetCashFlow)
}

function computeDSCR(totalIncome: number, totalObligations: number): number {
  if (totalObligations <= 0) return 99
  if (totalIncome <= 0) return 0
  return totalIncome / totalObligations
}

function computeIncomeCV(cashflows: CashFlowRecord[]): number {
  if (cashflows.length < 3) return 0
  const inflows = cashflows.slice(-6).map(c => c.inflow)
  const avgInflow = mean(inflows)
  const stdDev = inflows.length > 1
    ? Math.sqrt(inflows.reduce((s, v) => s + (v - avgInflow) ** 2, 0) / inflows.length)
    : 0
  return avgInflow > 0 ? stdDev / avgInflow : 0
}

function computeRecoveryRate(cashflows: CashFlowRecord[]): number {
  const totalGiven = cashflows.reduce((s, c) => s + c.udhaarGiven, 0)
  const totalCollected = cashflows.reduce((s, c) => s + c.udhaarCollected, 0)
  const totalInflow = cashflows.reduce((s, c) => s + c.inflow, 0)
  if (totalGiven === 0) return 1.0
  // If udhaar is <5% of revenue, recovery rate is not meaningful (cooperative/cash sectors)
  // Return 1.0 to avoid false distress signals from tiny credit amounts
  if (totalInflow > 0 && totalGiven / totalInflow < 0.05) return 1.0
  return totalCollected / totalGiven
}

function computeCreditSalesRatio(cashflows: CashFlowRecord[], avgRevenue: number): number {
  const totalGiven = cashflows.reduce((s, c) => s + c.udhaarGiven, 0)
  const months = cashflows.length || 1
  return avgRevenue > 0 ? (totalGiven / months) / avgRevenue : 0
}

// ─── Main Risk Calculation (Rulebook-Driven) ────────────────────────────────

/**
 * Calculate the overall risk score for an enterprise.
 * Uses the rulebook for thresholds, weights, and scoring.
 *
 * Flow:
 * 1. Compute raw financial metrics from enterprise data + cashflows
 * 2. Normalize metrics into rulebook-consumable signals
 * 3. Evaluate all rules via rulebook evaluator
 * 4. Map results to RiskScore format
 *
 * Research sources:
 * - All thresholds, weights, and multipliers come from the rulebook
 * - Each rule has documented research provenance (see config/rulebook/)
 */
export function calculateRisk(
  enterprise: Enterprise,
  cashflows: CashFlowRecord[],
  previousScore?: number,
  dpiSignals?: DPISignalBundle,
): RiskScore {
  const config = SECTOR_CONFIGS[enterprise.sector]
  const now = new Date()
  const monthIdx = now.getMonth()
  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Calculate data quality
  const dataQuality = computeDataQualityScore(cashflows, enterprise)

  // Compute raw financial metrics
  const recentCFs = cashflows.slice(-6)
  const avgNetCF = mean(recentCFs.map(c => c.netCashFlow))
  const avgRevenue = mean(recentCFs.map(c => c.inflow))

  // Household viability
  const householdViability = calculateHouseholdViability(enterprise, avgNetCF)

  // Raw metrics
  const cashRunwayMonths = computeCashRunwayMonths(enterprise.savingsBalance, avgNetCF, enterprise.monthlyExpenses)

  // DSCR: use whichever is worse — enterprise-only or household-level
  // Enterprise DSCR: standard bank ratio (revenue / enterprise EMI)
  const enterpriseDSCR = computeDSCR(avgRevenue, enterprise.emiAmount)
  // Household DSCR: total household income / all debt obligations (5-layer)
  const householdDSCR = householdViability && householdViability.totalMonthlyDebtService > 0
    ? computeDSCR(householdViability.totalHouseholdIncome, householdViability.totalMonthlyDebtService)
    : enterpriseDSCR
  // Use the worse DSCR — captures enterprise distress AND household debt stacking
  const dscr = Math.min(enterpriseDSCR, householdDSCR)
  const incomeCV = computeIncomeCV(cashflows)
  const recoveryRate = computeRecoveryRate(recentCFs)
  const creditSalesRatio = computeCreditSalesRatio(recentCFs, avgRevenue)
  const savingsRatio = enterprise.emiAmount > 0 ? enterprise.savingsBalance / enterprise.emiAmount : 99
  const seasonalMultiplier = config.monthlyMultipliers[monthIdx]

  // NACH bounce rate (simulated from DSCR)
  const nachBounceRate = dscr < 0.5 ? 45 : dscr < 1.0 ? 25 : dscr < 1.25 ? 12 : 5

  // Normalize signals for rulebook
  const signals = normalizeSignals({
    cashRunway: cashRunwayMonths,
    dscr,
    incomeCV,
    recoveryRate,
    creditSalesRatio,
    savingsRatio,
    nachBounceRate,
    upiVelocityDelta: dpiSignals ? dpiSignals.upiVelocity.delta : 0,
    mgnregaDemandSpike: dpiSignals ? (dpiSignals.mgnrega.delta > 10 ? 130 : 100) : 100,
    commodityPriceRatio: dpiSignals ? (1 + dpiSignals.mandiPrices.delta / 100) : 1.0,
    fodderPriceRatio: enterprise.sector === 'dairy' ? (1 + (dpiSignals?.mandiPrices.delta || 0) / 100) : 1.0,
    wholesaleIndexRatio: enterprise.sector === 'rural_retail' ? (1 + (dpiSignals?.mandiPrices.delta || 0) / 100) : 1.0,
    // THI/SPI: only use seasonal defaults when DPI signals are available (simulating real-time data)
    // Without DPI: neutral values so no climate penalty is applied
    thiIndex: dpiSignals
      ? (monthIdx >= 3 && monthIdx <= 5 ? 82 : monthIdx >= 6 && monthIdx <= 8 ? 78 : 70)
      : 70,
    spiIndex: dpiSignals
      ? (monthIdx >= 6 && monthIdx <= 8 ? -0.5 : 0.3)
      : 0.3,
    ndviIndex: enterprise.sector === 'agriculture' ? (monthIdx >= 9 && monthIdx <= 11 ? 0.7 : 0.4) : 0.5,
    seasonalMultiplier,
    milkYield: enterprise.milkLitresPerDay,
    eggProduction: enterprise.eggProductionPerDay,
    cropYield: enterprise.farmSizeAcres,
  })

  // Get rulebook evaluation
  const sectorProfile = getSectorProfile(enterprise.sector)
  const weightAdjustments = getWeightAdjustments(enterprise.sector)

  const evaluation = evaluateRules({
    sector: enterprise.sector,
    signals,
    rules: rulebook.rules,
    sectorProfile: sectorProfile!,
    weightAdjustments,
    convergenceRules: rulebook.convergenceRules,
    dampeningRules: rulebook.dampeningRules,
    baseWeights: rulebook.baseWeights,
  })

  // Household trap penalty: deeply negative disposable income amplifies risk
  // This is the structural mechanism that allows household-debt-trap enterprises to reach RED
  let modifiedFinalScore = evaluation.finalScore
  if (householdViability && householdViability.trueDisposableIncome < 0) {
    const disposableRatio = householdViability.trueDisposableIncome / Math.max(1, householdViability.totalHouseholdIncome)
    if (disposableRatio < -0.30) {
      // Severe trap: >30% of household income goes to debt service beyond obligations
      modifiedFinalScore *= 1.20
    } else if (disposableRatio < -0.15) {
      // Significant trap: 15-30% deficit
      modifiedFinalScore *= 1.12
    } else if (disposableRatio < 0) {
      // Mild trap: slight deficit
      modifiedFinalScore *= 1.05
    }
    modifiedFinalScore = Math.min(100, modifiedFinalScore)
  }

  // Household distress floor: if household debt burden is unsustainable, set minimum score
  // Uses absolute monthly shortfall (not just DSCR ratio) to distinguish severe from moderate distress
  if (householdViability && householdViability.totalMonthlyDebtService > 0) {
    const monthlyShortfall = Math.max(0, householdViability.totalMonthlyDebtService - householdViability.totalHouseholdIncome)
    if (monthlyShortfall > 15000) {
      modifiedFinalScore = Math.max(modifiedFinalScore, 76) // Red: >₹15K monthly shortfall
    } else if (monthlyShortfall > 8000) {
      modifiedFinalScore = Math.max(modifiedFinalScore, 65) // Orange: >₹8K monthly shortfall
    } else if (monthlyShortfall > 3000) {
      modifiedFinalScore = Math.max(modifiedFinalScore, 50) // Yellow: >₹3K monthly shortfall
    }
  }

  // Map rulebook component scores to RiskScore format
  // Rulebook scores: 0-100 where 100 = healthy
  // RiskScore fields: 0-100 where 100 = healthy (same convention)
  const runwayScore = evaluation.componentScores.cash_runway
  const debtScore = evaluation.componentScores.debt_service_coverage
  const trendScore = evaluation.componentScores.income_stability
  const seasonalScore = evaluation.componentScores.seasonal_position
  const shockScore = evaluation.componentScores.input_cost_pressure
  const creditScore = evaluation.componentScores.recovery_quality
  const marketScore = evaluation.componentScores.external_risk

  // Risk level from rulebook
  let riskLevel: 'green' | 'yellow' | 'orange' | 'red'
  if (modifiedFinalScore <= 25) riskLevel = 'green'
  else if (modifiedFinalScore <= 50) riskLevel = 'yellow'
  else if (modifiedFinalScore <= 75) riskLevel = 'orange'
  else riskLevel = 'red'

  // Velocity tracking
  const scoreDelta = previousScore !== undefined ? evaluation.finalScore - previousScore : 0
  let velocityFlag: 'stable' | 'improving' | 'declining' | 'rapidly_deteriorating'
  if (previousScore === undefined) {
    velocityFlag = 'stable'
  } else if (scoreDelta > 15) {
    velocityFlag = 'rapidly_deteriorating'
  } else if (scoreDelta > 5) {
    velocityFlag = 'declining'
  } else if (scoreDelta < -5) {
    velocityFlag = 'improving'
  } else {
    velocityFlag = 'stable'
  }

  // ─── Confidence Decomposition ──────────────────────────────────────────────
  // Each component draws from a different data layer with different epistemic status.
  // Divergence between layers is MORE informative than the composite score.

  const componentSources: RiskScore['componentSources'] = {
    cash_runway: 'reported',           // savings balance + expenses — enterprise-entered
    debt_service_coverage: householdViability ? 'estimated' : 'reported',  // household context = estimated
    income_stability: 'reported',      // cashflow history — enterprise-entered
    seasonal_position: 'verified',     // external seasonal multipliers
    input_cost_pressure: 'verified',   // THI, mandi prices, SPI — external signals
    recovery_quality: 'reported',      // udhaar given/collected — enterprise-entered
    external_risk: 'verified',         // market signals — external
  }

  // Layer averages
  const verifiedScores = [seasonalScore, shockScore, marketScore]
  const reportedScores = [runwayScore, trendScore, creditScore]
  const estimatedScores = householdViability ? [debtScore] : []

  const externalAvg = verifiedScores.reduce((a, b) => a + b, 0) / verifiedScores.length
  const reportedAvg = reportedScores.reduce((a, b) => a + b, 0) / reportedScores.length

  // Household disposable income range
  const hc = enterprise.householdContext
  const estimatedInformalDebt = hc
    ? hc.shgInternalLoan + hc.traderCreditMonthly + hc.informalLoanEmi
    : 0
  const baseDisposable = householdViability ? householdViability.trueDisposableIncome : avgNetCF - enterprise.emiAmount
  const conservativeDisposable = householdViability
    ? Math.round(householdViability.totalHouseholdIncome * 0.8
      - householdViability.totalMonthlyObligations * 1.15
      - estimatedInformalDebt * 0.3)
    : baseDisposable
  const optimisticDisposable = householdViability
    ? Math.round(householdViability.totalHouseholdIncome
      - householdViability.totalMonthlyObligations)
    : baseDisposable

  // Estimated layer range
  const estimatedRange: [number, number] = [conservativeDisposable, optimisticDisposable]
  const estimatedAssumptions: string[] = []
  if (householdViability) {
    estimatedAssumptions.push('Secondary income may be underreported by 20%')
    estimatedAssumptions.push('Household expenses inflated by 15% (conservative)')
    if (estimatedInformalDebt > 0) {
      estimatedAssumptions.push(`Informal debt (₹${estimatedInformalDebt.toLocaleString('en-IN')}/mo) may be underreported by 30%`)
    }
    if (hc!.spouseIncome === 0) {
      estimatedAssumptions.push('Spouse income not reported — may exist')
    }
  }

  // Divergence detection
  const layerSpread = Math.abs(externalAvg - reportedAvg)
  const estimatedSpread = estimatedScores.length > 0
    ? Math.abs(externalAvg - estimatedScores[0])
    : 0
  const maxSpread = Math.max(layerSpread, estimatedSpread)

  let divergence: RiskScore['divergence']
  if (maxSpread < 10) divergence = 'aligned'
  else if (maxSpread < 25) divergence = 'mild_divergence'
  else divergence = 'significant_divergence'

  const layerSummary: RiskScore['layerSummary'] = {
    external: { score: Math.round(externalAvg), signalCount: 3 },
    reported: { score: Math.round(reportedAvg), dataPoints: 3 },
    estimated: { scoreRange: estimatedRange, assumptions: estimatedAssumptions },
  }

  // ─── Collect Reasons ──────────────────────────────────────────────────────
  const reasons: string[] = evaluation.evaluations
    .filter(e => e.triggered && e.riskDelta > 0)
    .sort((a, b) => b.riskDelta - a.riskDelta)
    .slice(0, 5)
    .map(e => e.reason)

  // Add convergence reason
  if (evaluation.convergenceApplied) {
    reasons.push(`Signal convergence: ${evaluation.convergenceReason}`)
  }

  // Add household-specific reasons
  if (householdViability) {
    if (householdViability.trueDisposableIncome < 0) {
      reasons.push(`Household trap: True disposable income is ₹${Math.abs(householdViability.trueDisposableIncome).toLocaleString('en-IN')}/month NEGATIVE after counting all household expenses and debt obligations across 5 sources.`)
    } else if (householdViability.trueDisposableIncome < 5000) {
      reasons.push(`Household margin razor-thin: only ₹${householdViability.trueDisposableIncome.toLocaleString('en-IN')}/month disposable after all obligations.`)
    }
    const enterpriseDSCR = (enterprise.monthlyRevenue - enterprise.monthlyExpenses) / Math.max(1, enterprise.emiAmount)
    const householdDSCR = householdViability.totalHouseholdIncome / Math.max(1, householdViability.totalMonthlyDebtService)
    if (enterpriseDSCR > 1.25 && householdDSCR < 1.0) {
      reasons.push(`Hidden debt trap: Enterprise DSCR looks healthy (${enterpriseDSCR.toFixed(1)}x) but household DSCR craters to ${householdDSCR.toFixed(1)}x when SHG internal, trader credit, and informal loans are counted.`)
    }
    const hc = enterprise.householdContext!
    const incomeEarners = (hc.spouseIncome > 0 ? 1 : 0) + 1
    if (hc.dependents / Math.max(1, incomeEarners) > 2) {
      reasons.push(`High dependency ratio: ${hc.dependents} dependents per ${incomeEarners} income earner.`)
    }
  }

  if (reasons.length === 0) reasons.push('All indicators within healthy parameters.')

  // Collect recommended actions from triggered rules
  const actions: string[] = evaluation.evaluations
    .filter(e => e.triggered && e.riskDelta > 10)
    .sort((a, b) => b.riskDelta - a.riskDelta)
    .slice(0, 3)
    .map(e => e.researchBasis.specificFinding ? `${e.reason.split('.')[0]}. Source: ${e.researchBasis.source}` : e.reason)

  if (riskLevel === 'red') {
    actions.unshift(`Critical: Cash runway ${cashRunwayMonths.toFixed(1)} months, DSCR ${dscr.toFixed(2)}x`)
  }

  if (velocityFlag === 'rapidly_deteriorating') {
    actions.unshift(`Rapidly deteriorating: risk score increased ${Math.abs(scoreDelta)} points. Immediate attention required.`)
  }

  if (dataQuality.confidence === 'low') {
    actions.push(dataQuality.explanation)
  }

  if (actions.length === 0) actions.push('Continue regular monitoring')

  // Savings floor
  const savingsFloor = computeSavingsFloor(enterprise, householdViability)

  return {
    id: `risk-${enterprise.id}-${periodMonth}`,
    enterpriseId: enterprise.id,
    periodMonth,
    financialScore: runwayScore,
    seasonalScore,
    debtScore,
    creditScore,
    trendScore,
    shockScore,
    marketScore,
    finalScore: Math.round(modifiedFinalScore), // Higher = worse (matches riskLevel thresholds: 0=green, 100=red)
    riskLevel,
    confidence: dataQuality.confidence,
    dataQualityScore: dataQuality.score,
    scoreDelta,
    velocityFlag,
    totalMonthlyDebtService: householdViability ? householdViability.totalMonthlyDebtService : enterprise.emiAmount,
    totalHouseholdIncome: householdViability ? householdViability.totalHouseholdIncome : Math.max(0, avgNetCF),
    totalMonthlyObligations: householdViability ? householdViability.totalMonthlyObligations : enterprise.monthlyExpenses + enterprise.emiAmount,
    trueDisposableIncome: householdViability ? householdViability.trueDisposableIncome : avgNetCF - enterprise.emiAmount,
    trueDisposableIncomeRange: estimatedRange,
    householdRiskScore: householdViability ? householdViability.householdRiskScore : 0,
    reasons,
    recommendedActions: actions,
    savingsFloor,
    componentSources,
    layerSummary,
    divergence,
    peerContext: null,
    actionableSuggestions: [],
  }
}

// ─── Forecast ───────────────────────────────────────────────────────────────

export function forecastCashFlow(
  enterprise: Enterprise,
  cashflows: CashFlowRecord[],
): { month: string; predictedInflow: number; predictedOutflow: number; predictedNet: number; lowerBound: number; upperBound: number; confidence: string }[] {
  const config = SECTOR_CONFIGS[enterprise.sector]
  const recentCFs = cashflows.slice(-6)
  const avgInflow = mean(recentCFs.map(c => c.inflow))
  const avgOutflow = mean(recentCFs.map(c => c.outflow))

  const recentInflows = recentCFs.slice(-3).map(c => c.inflow)
  const olderInflows = recentCFs.slice(0, 3).map(c => c.inflow)
  const trendFactor = olderAvg(recentInflows, 3) > 0
    ? recentAvg(recentInflows, 3) / olderAvg(olderInflows, 3)
    : 1.0

  const inflowStdDev = recentCFs.length > 1
    ? Math.sqrt(recentCFs.reduce((s, c) => s + (c.inflow - avgInflow) ** 2, 0) / recentCFs.length)
    : avgInflow * 0.2

  const now = new Date()
  const forecasts = []

  for (let i = 1; i <= 6; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const forecastMonthIdx = forecastDate.getMonth()
    const monthStr = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`

    const seasonalMultiplier = config.monthlyMultipliers[forecastMonthIdx]
    const predictedInflow = Math.round(avgInflow * seasonalMultiplier * trendFactor)
    const predictedOutflow = Math.round(avgOutflow * (1 + i * 0.005))
    const predictedNet = predictedInflow - predictedOutflow

    const uncertaintyMultiplier = 1 + (i - 1) * 0.15
    const bandWidth = Math.round(inflowStdDev * 1.64 * uncertaintyMultiplier)
    const lowerBound = predictedInflow - bandWidth
    const upperBound = predictedInflow + bandWidth

    const confidence = i <= 2 ? 'high' : i <= 4 ? 'medium' : 'low'

    forecasts.push({
      month: monthStr,
      predictedInflow,
      predictedOutflow,
      predictedNet,
      lowerBound: Math.max(0, lowerBound),
      upperBound,
      confidence,
    })
  }

  return forecasts
}

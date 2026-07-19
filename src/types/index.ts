export type Sector = 'dairy' | 'rural_retail' | 'poultry' | 'mgnrega_wages' | 'agriculture'

export type RiskLevel = 'green' | 'yellow' | 'orange' | 'red'

export type DataConfidence = 'high' | 'medium' | 'low'

// ─── Confidence Layer Types ────────────────────────────────────────────────
// Each risk component draws from a different data layer with different epistemic status:
// - 'verified': external signals (THI, commodity prices, SPI) — always reliable
// - 'reported': enterprise-entered data (revenue, expenses, loans) — directionally useful
// - 'estimated': household context (informal debt, spouse income) — ranges, not point estimates
// Source: CGAP 2024 — transactional data (AUC 0.70-0.75) outperforms self-reported (AUC 0.60-0.65)
export type DataSourceType = 'verified' | 'reported' | 'estimated'

export interface HouseholdContext {
  // ─── Household Income ──────────────────────────────────────────────────────
  spouseIncome: number           // Spouse's monthly income (farm labor, tailoring, etc.)
  otherHouseholdIncome: number   // Rental, pension, MGNREGA, remittances

  // ─── Household Expenses ────────────────────────────────────────────────────
  householdExpenses: number      // Non-enterprise: food, education, medical, utilities
  dependents: number             // Number of dependents (children, elderly parents)

  // ─── Multi-Source Debt (5 layers) ──────────────────────────────────────────
  // Source: NAFIS 2022 — 17.4% rural households have informal debt
  // Source: MicroSave India — avg 2.2 MFI lenders per borrower (CRIF High Mark)
  // Source: IDBI SHG-BLP manual — SHG internal lending at 2-3%/month
  formalLoanEmi: number          // Bank/MFI EMI (already in Enterprise.emiAmount)
  shgInternalLoan: number        // SHG internal loan monthly repayment (2-3%/month, invisible to banks)
  shgInternalOutstanding: number // Outstanding SHG internal loan principal
  traderCreditMonthly: number    // Input supplier nexus credit (dairy: feed supplier, retail: wholesaler)
  cooperativeAdvanceEmi: number  // PACS/cooperative advance repayment
  informalLoanEmi: number       // Moneylender/personal loan EMI

  // ─── Savings & Assets (visible to DPI) ─────────────────────────────────────
  goldEstimate: number           // Estimated gold value (household savings proxy)
  livestockValue: number         // Dairy only: estimated livestock value
  otherSavings: number           // Post office, RD/FD, chit fund

  // ─── Derived (computed by engine) ──────────────────────────────────────────
  // totalMonthlyDebtService: computed from all 5 debt EMIs
  // trueDisposableIncome: (enterprise net + all household income) - (all household expenses + all debt service)
  // householdRisk: 0-100 score based on true disposable income and dependency ratio
}

export interface Enterprise {
  id: string
  ownerName: string
  enterpriseName: string
  sector: Sector
  state: string
  district: string
  block: string
  village: string
  monthlyRevenue: number
  monthlyExpenses: number
  loanOutstanding: number
  emiAmount: number
  savingsBalance: number
  shgId: string
  pacsId: string
  onboardingDate: string
  dataConfidence: DataConfidence
  householdContext?: HouseholdContext
  latitude?: number
  longitude?: number
  // ─── Sector-Specific Fields ─────────────────────────────────────────────
  // Dairy-specific
  cooperativeName?: string        // e.g., 'Chitale', 'Katraj', 'Amul'
  milkLitresPerDay?: number       // Daily milk yield
  feedCostPerLitre?: number       // Feed cost per litre of milk
  lactatingCowCount?: number      // Currently milking cows
  totalCowCount?: number          // Total herd
  loanType?: 'kcc' | 'term_loan' | 'mfi' | 'personal'  // KCC = subsidized 4%
  insuranceStatus?: 'insured' | 'uninsured' | 'partial'  // Livestock insurance
  // Poultry-specific
  birdCount?: number              // Total birds (layers + broilers)
  layerCount?: number             // Egg-laying hens
  broilerCount?: number           // Meat birds
  feedCostPerBird?: number        // Feed cost per bird per month
  eggProductionPerDay?: number    // Daily egg count
  // Agriculture-specific
  farmSizeAcres?: number          // Cultivated land
  cropType?: 'kharif' | 'rabi' | 'both'  // Season
  primaryCrop?: string            // e.g., 'cotton', 'wheat', 'rice'
  irrigationType?: 'rainfed' | 'borewell' | 'canal' | 'mixed'
  // MGNREGA-specific
  workerCount?: number            // Family members working under MGNREGA
  avgPersonDays?: number          // Average person-days per month
  jobCardId?: string              // MGNREGA job card number
}

export interface CashFlowRecord {
  id: string
  enterpriseId: string
  month: string // YYYY-MM
  inflow: number
  outflow: number
  netCashFlow: number
  udhaarGiven: number
  udhaarCollected: number
}

export interface Forecast {
  id: string
  enterpriseId: string
  forecastMonth: string
  predictedInflow: number
  predictedOutflow: number
  predictedNetCashFlow: number
  lowerBound: number
  upperBound: number
  confidence: DataConfidence
}

export interface RiskScore {
  id: string
  enterpriseId: string
  periodMonth: string
  financialScore: number   // Cash Runway (25% base)
  seasonalScore: number    // Seasonal Risk (10% base)
  debtScore: number        // DSCR — Debt Service Coverage (20% base)
  creditScore: number      // Credit Health / Udhaar recovery (10% base)
  trendScore: number       // Income Stability / CV (20% base)
  shockScore: number       // Input Cost Pressure (10% base)
  marketScore: number      // External Risk Index (5% base, capped)
  finalScore: number
  riskLevel: RiskLevel
  confidence: DataConfidence
  dataQualityScore: number // 0-100: data completeness metric
  scoreDelta: number       // Change from previous score (+ = deteriorating)
  velocityFlag: 'stable' | 'improving' | 'declining' | 'rapidly_deteriorating'
  // ─── Household Context (computed when householdContext provided) ────────────
  totalMonthlyDebtService: number   // Sum of all 5 debt sources (formal + SHG + trader + cooperative + informal)
  totalHouseholdIncome: number      // Enterprise net + spouse + other (floored at 0)
  totalMonthlyObligations: number   // Household expenses + total debt service
  trueDisposableIncome: number      // All income - all expenses - all debt service (monthly) — midpoint
  trueDisposableIncomeRange: [number, number]  // [conservative, optimistic] — honest range
  householdRiskScore: number        // 0-100: household financial stress level (0 = no data)
  reasons: string[]
  recommendedActions: string[]
  // ─── Confidence Decomposition ────────────────────────────────────────────
  // Which data layer drives each component score.
  // Divergence between layers is MORE informative than the composite score.
  componentSources: {
    cash_runway: DataSourceType
    debt_service_coverage: DataSourceType
    income_stability: DataSourceType
    seasonal_position: DataSourceType
    input_cost_pressure: DataSourceType
    recovery_quality: DataSourceType
    external_risk: DataSourceType
  }
  layerSummary: {
    external: { score: number; signalCount: number }     // avg of verified components
    reported: { score: number; dataPoints: number }      // avg of reported components
    estimated: { scoreRange: [number, number]; assumptions: string[] }  // range for estimated
  }
  divergence: 'aligned' | 'mild_divergence' | 'significant_divergence'
  // ─── Revised Scope Features ──────────────────────────────────────────────
  savingsFloor: SavingsFloor
  peerContext: PeerRelativeContext | null  // null when peer data unavailable
  actionableSuggestions: ActionableSuggestion[]
}

// ─── Savings Floor ──────────────────────────────────────────────────────────
// Single most predictive variable for microfinance default.
// Source: CGAP/Stuart Rutherford "Portfolios of the Poor" research.
// Displayed prominently BEFORE the 7-component score.
export interface SavingsFloor {
  ratio: number           // savings / totalMonthlyDebtService (0 = no savings vs debt)
  monthsOfDebtCover: number  // savings / totalMonthlyDebtService in months
  status: 'critical' | 'alert' | 'caution' | 'healthy'
  bufferDays: number      // savings / (daily expenses) — days until broke
}

// ─── Peer-Relative Context ──────────────────────────────────────────────────
// "Am I the only one struggling, or is everyone?"
// Distinguishes seasonal (everyone RED) from idiosyncratic (only you RED).
// Source: Stuart Rutherford "Portfolios of the Poor" — peer-relative framing
// is essential for rural borrowers to understand their own situation.
export interface PeerRelativeContext {
  sectorPercentile: number       // 0-100: where this enterprise ranks in district sector
  sectorMedianScore: number      // Median final score for sector in district
  distressIsIdiosyncratic: boolean  // true = enterprise struggling while peers are fine
  distressIsSeasonal: boolean    // true = sector-wide trough, most peers also RED
  expectedRecoveryMonth: string  // "YYYY-MM" when seasonal trough ends
  peerCount: number              // Number of peers in district sector for comparison
}

// ─── Actionable Suggestions ─────────────────────────────────────────────────
// The problem statement asks for "actionable suggestions" — not generic alerts.
// Each suggestion: what to do, where, when, how much, what happens if you don't.
// Source: Problem Statement explicitly requires "actionable suggestions"
export interface ActionableSuggestion {
  id: string
  category: 'credit' | 'savings' | 'recovery' | 'cost' | 'income' | 'household'
  urgency: 'immediate' | 'this_week' | 'this_month'
  title: string               // One-line action
  detail: string              // Full explanation with numbers
  institution?: string        // Where to go (Canara Bank Karad, SHG meeting, etc.)
  amount?: number             // How much (₹)
  deadline?: string           // By when
  consequenceIfIgnored: string
  potentialImpact: string     // "Extends cash runway by 2.3 months" or "Reduces DSCR gap by ₹4K/mo"
}

export interface Alert {
  id: string
  enterpriseId: string
  enterpriseName: string
  riskScoreId: string
  alertLevel: RiskLevel
  message: string
  recommendedAction: string
  createdAt: string
  status: 'active' | 'acknowledged' | 'resolved'
}

export interface SyncEvent {
  id: string
  entityType: string
  entityId: string
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
  syncStatus: 'pending' | 'synced' | 'conflict'
}

export interface SectorConfig {
  name: string
  icon: string
  monthlyMultipliers: number[]
  avgMonthlyRevenue: [number, number]
  keyFeatures: string[]
  riskFactors: string[]
}

export const SECTOR_CONFIGS: Record<Sector, SectorConfig> = {
  dairy: {
    name: 'Dairy',
    icon: '🥛',
    monthlyMultipliers: [1.1, 1.05, 0.95, 0.85, 0.80, 0.75, 0.85, 0.95, 1.0, 1.15, 1.25, 1.20],
    avgMonthlyRevenue: [16000, 25000],
    keyFeatures: ['milk_yield', 'feed_cost', 'vet_cost', 'milk_price', 'num_animals'],
    riskFactors: ['heat_stress', 'disease_outbreak', 'fodder_shortage', 'lactation_cycle']
  },
  rural_retail: {
    name: 'Rural Retail',
    icon: '🏪',
    monthlyMultipliers: [0.85, 0.80, 0.85, 0.90, 0.95, 1.0, 1.05, 1.10, 1.15, 1.25, 1.20, 1.10],
    avgMonthlyRevenue: [15000, 50000],
    keyFeatures: ['credit_sales_ratio', 'inventory_turnover', 'num_suppliers', 'daily_sales'],
    riskFactors: ['credit_sales_accumulation', 'inventory_expiry', 'quick_competition', 'demand_slump']
  },
  poultry: {
    name: 'Poultry',
    icon: '🐔',
    monthlyMultipliers: [1.15, 1.10, 1.05, 0.90, 0.85, 0.90, 0.95, 1.0, 1.05, 1.15, 1.20, 1.20],
    avgMonthlyRevenue: [20000, 60000],
    keyFeatures: ['bird_count', 'feed_cost', 'egg_production', 'mortality_rate', 'broiler_weight'],
    riskFactors: ['heat_stress_mortality', 'feed_cost_spike', 'disease_outbreak', 'egg_price_fluctuation']
  },
  mgnrega_wages: {
    name: 'MGNREGA Wages',
    icon: '👷',
    monthlyMultipliers: [0.70, 0.65, 0.75, 0.85, 0.90, 1.30, 1.45, 1.50, 1.40, 1.10, 0.80, 0.70],
    avgMonthlyRevenue: [5000, 15000],
    keyFeatures: ['person_days', 'worker_count', 'wage_rate', 'job_card_active'],
    riskFactors: ['monsoon_dependency', 'government_policy', 'low_wage_rate', 'irregular_payments']
  },
  agriculture: {
    name: 'Agriculture',
    icon: '🌾',
    monthlyMultipliers: [0.80, 0.75, 1.10, 1.20, 1.15, 0.85, 0.75, 0.80, 0.90, 1.35, 1.40, 1.15],
    avgMonthlyRevenue: [10000, 40000],
    keyFeatures: ['crop_yield', 'farm_size', 'irrigation', 'input_cost', 'harvest_timing'],
    riskFactors: ['monsoon_failure', 'pest_attack', 'price_volatility', 'input_cost_escalation']
  }
}

// ─── DPI Signal Types ───────────────────────────────────────────────────────
// Deep Public Infrastructure signals for real-time risk monitoring
// Source: SECTOR_RISK_MODEL_DATA.md DPI Architecture

export type DPISignalStrength = 'none' | 'weak' | 'moderate' | 'strong'

export interface DPISignal {
  strength: DPISignalStrength
  value: number           // Normalized 0-100 (0 = worst, 100 = best)
  delta: number           // Change vs baseline (negative = deteriorating)
  source: string          // Data source label
  detail: string          // Human-readable explanation
}

export interface DPISignalBundle {
  upiVelocity: DPISignal       // 7-day/30-day transaction ratio (penalty-adjusted)
  nachBounce: DPISignal        // Mandate bounce rate (strongest single signal)
  mgnrega: DPISignal           // Block-level person-day demand (context only)
  mandiPrices: DPISignal       // Input cost vs MSP ratio
  convergenceScore: number     // 0-100: how many signals align (3+ = multiplier)
  convergenceDirection: 'none' | 'stress' | 'improvement'
}


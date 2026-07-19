/**
 * Drishti Demo Data
 * =================
 * Realistic cash flow data for 9 demo enterprises across 5 sectors.
 * Each enterprise has causal shocks that tell a believable story.
 * Risk is calculated using the transparent rule-based engine.
 *
 * DPI Integration (Production):
 * In production, the following Digital Public Infrastructure data would
 * replace/augment the simulated cash flow data:
 *
 * - UPI Transaction Velocity (NPCI): Rolling 7-day inflow/outflow sums
 *   via Account Aggregator framework. Drop >20% vs 30-day avg = early
 *   warning of local demand contraction.
 *
 * - NACH Mandate Bounce Rate (NPCI): Real-time EMI bounce tracking.
 *   A bounce is an immediate hard signal of liquidity stress — faster
 *   than monthly ledger reconciliation.
 *
 * - MGNREGA Block Demand (nrega.nic.in): Person-day registrations at
 *   block level. Spike >30% suggests rural labor market stress and
 *   declining local spending power.
 *
 * - Agmarknet/eNAM Mandi Arrivals (agmarknet.gov.in): Commodity
 *   arrival volumes and prices. A 15% drop in arrivals with 10%
 *   price increase signals supply-side distress in agricultural
 *   hinterlands.
 *
 * - Grameen Credit Score (PSBs/CICs): Union Budget 2025-26 framework
 *   using KCC, PM-KISAN, DBT, SHG-BLP data. Complements CIBIL for
 *   credit-invisible rural borrowers (~160M individuals).
 *
 * - SHG-PACS Repayment History (NABARD): Internal SHG grading (A/B/C)
 *   and PACS repayment lag. Primary credit signal for SHG-linked
 *   enterprises.
 */

import type { Enterprise, CashFlowRecord, Forecast, DataConfidence } from '../types'
import { SECTOR_CONFIGS } from '../types'
import { db } from './db'
import { calculateRisk, forecastCashFlow, computeSavingsFloor, computePeerRelativeContext, computeActionableSuggestions, calculateHouseholdViability } from '../lib/risk-engine'

// ─── Demo Enterprises ───────────────────────────────────────────────────────
// Real businesses with real stories. Names, locations, numbers grounded in
// SECTOR_RISK_MODEL_DATA.md ranges.
// Dairy: 1 Green, 1 Yellow, 1 Red | Retail: 1 Green, 1 Orange, 1 Red
// Poultry: 1 Orange (heat stress) | MGNREGA: 1 Yellow (lean season) | Agriculture: 1 Red (monsoon failure)

const DEMO_ENTERPRISES: Enterprise[] = [
  // ── DAIRY ──────────────────────────────────────────────────────────────
  {
    id: 'ent-001',
    ownerName: 'Sunita Devi',
    enterpriseName: 'Sunita Dairy Farm',
    sector: 'dairy',
    state: 'Maharashtra',
    district: 'Satara',
    block: 'Karad',
    village: 'Wai',
    monthlyRevenue: 90000,  // 10-cow unit, moderate scenario
    monthlyExpenses: 55000,  // Feed 30K + Vet 4K + Labour 12K + Misc 9K
    loanOutstanding: 150000,
    emiAmount: 4500,
    savingsBalance: 35000,
    shgId: 'shg-001',
    pacsId: 'pacs-001',
    onboardingDate: '2024-06-15',
    dataConfidence: 'high',
    cooperativeName: 'Chitale',
    milkLitresPerDay: 95,
    feedCostPerLitre: 22,
    lactatingCowCount: 8,
    totalCowCount: 10,
    loanType: 'kcc',
    insuranceStatus: 'partial',
    // TRAP STORY: Business shows ₹35K surplus, but household is drowning.
    // Spouse back injury = no income. 4 dependents. Hidden SHG + trader + informal debt.
    // True disposable income is only ₹12K/month — one medical bill from distress.
    householdContext: {
      spouseIncome: 0,               // Back injury, can't work
      otherHouseholdIncome: 2000,    // Son's MGNREGA days (irregular)
      householdExpenses: 15000,      // Food + 2 children school + medicine
      dependents: 4,                 // 2 children, 2 elderly parents
      formalLoanEmi: 4500,           // Same as enterprise EMI
      shgInternalLoan: 2500,         // SHG internal: ₹30K outstanding at 2.5%/month
      shgInternalOutstanding: 30000,
      traderCreditMonthly: 3000,     // Feed supplier nexus credit
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 2000,         // Moneylender for spouse's treatment
      goldEstimate: 25000,           // 2 bangles (family heirloom)
      livestockValue: 300000,        // 10 cows @ ₹30K avg
      otherSavings: 5000,            // Post office RD
    }
  },
  {
    id: 'ent-006',
    ownerName: 'Meena Patel',
    enterpriseName: 'Meena Dairy Cooperative',
    sector: 'dairy',
    state: 'Gujarat',
    district: 'Anand',
    block: 'Anand Town',
    village: 'Anand',
    monthlyRevenue: 120000,  // Larger operation, 15 cows
    monthlyExpenses: 72000,
    loanOutstanding: 250000,
    emiAmount: 7500,
    savingsBalance: 55000,
    shgId: 'shg-006',
    pacsId: 'pacs-006',
    onboardingDate: '2024-11-20',
    dataConfidence: 'high',
    cooperativeName: 'Amul',
    milkLitresPerDay: 140,
    feedCostPerLitre: 19,
    lactatingCowCount: 13,
    totalCowCount: 15,
    loanType: 'kcc',
    insuranceStatus: 'insured',
    // HEALTHY: Both spouses work, low debt burden, 1 formal EMI only.
    // Business + household genuinely viable.
    householdContext: {
      spouseIncome: 15000,            // Auto-rickshaw driver
      otherHouseholdIncome: 5000,     // Rental from annexe
      householdExpenses: 18000,       // 2 children, moderate lifestyle
      dependents: 2,
      formalLoanEmi: 7500,            // Same as enterprise EMI
      shgInternalLoan: 0,
      shgInternalOutstanding: 0,
      traderCreditMonthly: 0,         // Cooperative member — no trader credit
      cooperativeAdvanceEmi: 5000,    // PACS cow purchase advance
      informalLoanEmi: 0,
      goldEstimate: 80000,            // Family gold
      livestockValue: 450000,         // 15 high-yield cows
      otherSavings: 40000,            // RD + FD
    }
  },
  {
    id: 'ent-011',
    ownerName: 'Kamla Rajput',
    enterpriseName: 'Kamla Dairy Farm',
    sector: 'dairy',
    state: 'Rajasthan',
    district: 'Kota',
    block: 'Ladpura',
    village: 'Ladpura',
    monthlyRevenue: 75000,  // Small 7-cow unit, tight margins
    monthlyExpenses: 52000,  // High feed cost ratio
    loanOutstanding: 200000,
    emiAmount: 7000,
    savingsBalance: 15000,
    shgId: 'shg-011',
    pacsId: 'pacs-011',
    onboardingDate: '2024-09-01',
    dataConfidence: 'medium',
    cooperativeName: 'Katraj',
    milkLitresPerDay: 70,
    feedCostPerLitre: 25,
    lactatingCowCount: 5,
    totalCowCount: 7,
    loanType: 'term_loan',
    insuranceStatus: 'uninsured',
    // TIGHT: Business barely viable alone. Husband's farm income helps.
    // But multi-source debt (formal + SHG + trader) eats margin.
    // ₹34.5K surplus depends on husband's farm income — monsoon risk.
    householdContext: {
      spouseIncome: 10000,            // Seasonal farm labor (unreliable)
      otherHouseholdIncome: 5000,     // Mother-in-law's widow pension
      householdExpenses: 15000,       // 3 children, basic needs
      dependents: 3,
      formalLoanEmi: 7000,            // Same as enterprise EMI
      shgInternalLoan: 3000,          // SHG internal: ₹20K outstanding
      shgInternalOutstanding: 20000,
      traderCreditMonthly: 4500,      // Feed supplier — higher ratio (dairy)
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 0,
      goldEstimate: 30000,            // Wedding jewelry
      livestockValue: 210000,         // 7 cows @ ₹30K
      otherSavings: 8000,             // Chit fund
    }
  },
  // ── RURAL RETAIL ───────────────────────────────────────────────────────
  {
    id: 'ent-002',
    ownerName: 'Ramesh Kumar',
    enterpriseName: 'Ramesh Kirana Store',
    sector: 'rural_retail',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    block: 'Mal',
    village: 'Mal Town',
    monthlyRevenue: 300000,  // Medium kirana, rural market town
    monthlyExpenses: 255000,  // Inventory 210K + Rent 15K + Staff 12K + Elec 6K + Misc 12K
    loanOutstanding: 200000,
    emiAmount: 8000,
    savingsBalance: 60000,
    shgId: 'shg-002',
    pacsId: 'pacs-002',
    onboardingDate: '2024-03-10',
    dataConfidence: 'high',
    loanType: 'term_loan',
    insuranceStatus: 'uninsured',
    // TRAP STORY: Looks healthy (₹45K surplus), but DSCR craters when you count
    // SHG internal + trader credit + cooperative advance. 3 EMIs the bank doesn't see.
    // True DSCR: 45K / 81.5K = 0.55 — barely covering debt service.
    householdContext: {
      spouseIncome: 8000,             // Tailoring (steady)
      otherHouseholdIncome: 2000,     // Rental from upper floor
      householdExpenses: 20000,       // 3 children + elderly mother
      dependents: 3,
      formalLoanEmi: 8000,            // Same as enterprise EMI
      shgInternalLoan: 12000,         // SHG internal: ₹80K outstanding — high
      shgInternalOutstanding: 80000,
      traderCreditMonthly: 25000,     // Wholesaler nexus — huge (retail = high)
      cooperativeAdvanceEmi: 6000,    // PACS inventory advance
      informalLoanEmi: 0,
      goldEstimate: 50000,            // Wife's wedding gold
      livestockValue: 0,              // Retail — no livestock
      otherSavings: 30000,            // Post office + chit fund
    }
  },
  {
    id: 'ent-008',
    ownerName: 'Kavita Singh',
    enterpriseName: 'Kavita Kirana',
    sector: 'rural_retail',
    state: 'Madhya Pradesh',
    district: 'Indore',
    block: 'Mhow',
    village: 'Mhow Town',
    monthlyRevenue: 180000,  // Small rural kirana
    monthlyExpenses: 150000,
    loanOutstanding: 80000,
    emiAmount: 4000,
    savingsBalance: 25000,
    shgId: 'shg-008',
    pacsId: 'pacs-008',
    onboardingDate: '2024-07-01',
    dataConfidence: 'medium',
    loanType: 'personal',
    insuranceStatus: 'uninsured',
    // HEALTHY: Low debt, both spouses work, SHG member with no internal loan.
    // Genuine surplus — no hidden distress.
    householdContext: {
      spouseIncome: 12000,            // Mechanic at local garage
      otherHouseholdIncome: 0,
      householdExpenses: 12000,       // 2 children, modest
      dependents: 2,
      formalLoanEmi: 4000,            // Same as enterprise EMI
      shgInternalLoan: 0,             // SHG member but no internal loan
      shgInternalOutstanding: 0,
      traderCreditMonthly: 3000,      // Moderate wholesaler credit
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 0,
      goldEstimate: 30000,
      livestockValue: 0,
      otherSavings: 15000,            // RD
    }
  },
  {
    id: 'ent-012',
    ownerName: 'Farhan Ali',
    enterpriseName: 'Farhan General Store',
    sector: 'rural_retail',
    state: 'Bihar',
    district: 'Nalanda',
    block: 'Biharsharif',
    village: 'Hilsa',
    monthlyRevenue: 120000,  // Small village kirana, high udhaar
    monthlyExpenses: 102000,
    loanOutstanding: 60000,
    emiAmount: 3000,
    savingsBalance: 18000,
    shgId: 'shg-012',
    pacsId: 'pacs-012',
    onboardingDate: '2024-05-15',
    dataConfidence: 'medium',
    loanType: 'mfi',
    insuranceStatus: 'uninsured',
    // TIGHT: Business surplus is thin. SHG + informal debt adds up.
    // DSCR drops from 2.0 (enterprise only) to 0.63 (full picture).
    // Household depends on wife's tailoring + MGNREGA.
    householdContext: {
      spouseIncome: 6000,             // Tailoring
      otherHouseholdIncome: 3000,     // MGNREGA (irregular, 4 months/year avg)
      householdExpenses: 15000,       // 4 dependents, basic
      dependents: 4,
      formalLoanEmi: 3000,            // Same as enterprise EMI
      shgInternalLoan: 1500,          // SHG internal: ₹15K outstanding
      shgInternalOutstanding: 15000,
      traderCreditMonthly: 5000,      // Wholesaler — moderate (Bihar = cash-heavy)
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 2500,          // Personal loan from relative
      goldEstimate: 20000,            // Wife's jewelry
      livestockValue: 0,
      otherSavings: 5000,             // Very low savings
    }
  },
  // ── POULTRY ────────────────────────────────────────────────────────────
  {
    id: 'ent-015',
    ownerName: 'Ganesh Nair',
    enterpriseName: 'Ganesh Poultry Farm',
    sector: 'poultry',
    state: 'Tamil Nadu',
    district: 'Namakkal',
    block: 'Rasipuram',
    village: 'Senthamangalam',
    monthlyRevenue: 85000,  // 2000-bird unit (1200 layers + 800 broiler cycle)
    monthlyExpenses: 62000,  // Feed 45K + Labour 8K + Vet 4K + Elec 3K + Misc 2K
    loanOutstanding: 300000,
    emiAmount: 9500,
    savingsBalance: 22000,
    shgId: 'shg-015',
    pacsId: 'pacs-015',
    onboardingDate: '2024-04-01',
    dataConfidence: 'medium',
    loanType: 'term_loan',
    insuranceStatus: 'partial',
    birdCount: 2000,
    layerCount: 1200,
    broilerCount: 800,
    feedCostPerBird: 45,
    eggProductionPerDay: 950,
    // ORANGE: Summer heat stress hit mortality hard. Feed cost spike from
    // soyameal price rise. Tight margins. Household OK (wife runs tailoring).
    householdContext: {
      spouseIncome: 8000,
      otherHouseholdIncome: 3000,
      householdExpenses: 12000,
      dependents: 3,
      formalLoanEmi: 9500,
      shgInternalLoan: 0,
      shgInternalOutstanding: 0,
      traderCreditMonthly: 5000,  // Feed supplier credit (poultry = high)
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 0,
      goldEstimate: 40000,
      livestockValue: 240000,  // 2000 birds @ ₹120 avg
      otherSavings: 10000,
    }
  },
  // ── MGNREGA WAGES ──────────────────────────────────────────────────────
  {
    id: 'ent-020',
    ownerName: 'Saroj Devi',
    enterpriseName: 'Saroj MGNREGA Unit',
    sector: 'mgnrega_wages',
    state: 'Jharkhand',
    district: 'Ranchi',
    block: 'Namkum',
    village: 'Ormanjhi',
    monthlyRevenue: 10000,  // Avg 80 person-days/month at ₹247/day
    monthlyExpenses: 7500,  // Food 5K + Transport 1K + Medicine 1.5K
    loanOutstanding: 40000,
    emiAmount: 1500,
    savingsBalance: 8000,
    shgId: 'shg-020',
    pacsId: 'pacs-020',
    onboardingDate: '2024-08-15',
    dataConfidence: 'low',
    loanType: 'personal',
    insuranceStatus: 'uninsured',
    workerCount: 2,
    avgPersonDays: 80,
    jobCardId: 'JH-2024-00452',
    // YELLOW: Irregular payment cycles, monsoon lean (Jun-Aug). But PM-KISAN
    // ₹6K/quarter helps. Very low debt but extremely low income. High dependency.
    householdContext: {
      spouseIncome: 5000,   // Seasonal farm labor
      otherHouseholdIncome: 2000,  // PM-KISAN ₹2K/month avg
      householdExpenses: 8000,
      dependents: 5,  // 3 children + 2 elderly
      formalLoanEmi: 1500,
      shgInternalLoan: 0,
      shgInternalOutstanding: 0,
      traderCreditMonthly: 0,
      cooperativeAdvanceEmi: 0,
      informalLoanEmi: 500,  // Small informal loan
      goldEstimate: 15000,   // Minimal gold
      livestockValue: 30000, // 1 cow + 2 goats
      otherSavings: 3000,
    }
  },
  // ── AGRICULTURE ────────────────────────────────────────────────────────
  {
    id: 'ent-025',
    ownerName: 'Ravi Yadav',
    enterpriseName: 'Ravi Cotton Farm',
    sector: 'agriculture',
    state: 'Gujarat',
    district: 'Rajkot',
    block: 'Gondal',
    village: 'Jamkandorna',
    monthlyRevenue: 35000,  // 5-acre cotton, kharif — volatile harvest income
    monthlyExpenses: 28000,  // Seeds 4K + Fertilizer 6K + Pesticide 4K + Labour 8K + Irrigation 6K
    loanOutstanding: 180000,
    emiAmount: 6500,
    savingsBalance: 12000,
    shgId: 'shg-025',
    pacsId: 'pacs-025',
    onboardingDate: '2024-02-01',
    dataConfidence: 'medium',
    loanType: 'kcc',
    insuranceStatus: 'partial',
    farmSizeAcres: 5,
    cropType: 'kharif',
    primaryCrop: 'cotton',
    irrigationType: 'borewell',
    // RED: Monsoon failed 30% below normal. Input costs (fertilizer + pesticide)
    // spiked. Borewell irrigation costs 3x when rain fails. Harvest 2 months away.
    // Household spread thin — wife runs small shop but ₹5K/month.
    householdContext: {
      spouseIncome: 5000,
      otherHouseholdIncome: 0,
      householdExpenses: 12000,
      dependents: 4,
      formalLoanEmi: 6500,
      shgInternalLoan: 2000,   // SHG internal for seed purchase
      shgInternalOutstanding: 25000,
      traderCreditMonthly: 4000,  // Input dealer nexus credit
      cooperativeAdvanceEmi: 3000,  // PACS advance
      informalLoanEmi: 1500,  // Moneylender for medical emergency
      goldEstimate: 35000,
      livestockValue: 60000,  // 2 oxen
      otherSavings: 5000,
    }
  }
]

// ─── Realistic Cash Flow Generator ──────────────────────────────────────────
// Generates 12 months of cash flow history with causal shocks.
// Each sector has known seasonal patterns and risk factors.

function generateCashFlowHistory(enterprise: Enterprise, months: number = 12): CashFlowRecord[] {
  const records: CashFlowRecord[] = []
  const config = SECTOR_CONFIGS[enterprise.sector]
  const baseInflow = enterprise.monthlyRevenue
  const baseOutflow = enterprise.monthlyExpenses

  // Use a seed based on enterprise ID for reproducible "randomness"
  let seed = 0
  for (let i = 0; i < enterprise.id.length; i++) seed = ((seed << 5) - seed + enterprise.id.charCodeAt(i)) | 0
  const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646 }

  const now = new Date()

  for (let i = months; i > 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthIdx = date.getMonth()

    // Seasonal multiplier from real industry data
    const seasonal = config.monthlyMultipliers[monthIdx]

    // Causal shocks (sector-specific, based on real risk factors)
    let shock = 1.0
    let udhaarRatio = 0.05  // Base credit ratio

    switch (enterprise.sector) {
      case 'dairy':
        // Feed price spike: 15% chance, reduces income
        if (seededRandom() < 0.15) shock -= seededRandom() * 0.15
        // Heat stress: Apr-Jun (months 3-5)
        if (monthIdx >= 3 && monthIdx <= 5) shock *= 0.85 + seededRandom() * 0.1
        // Disease: 5% chance
        if (seededRandom() < 0.05) shock *= 0.80
        break

      case 'rural_retail':
        // Monsoon lean: Jun-Aug
        if (monthIdx >= 5 && monthIdx <= 7) shock *= 0.80 + seededRandom() * 0.10
        // Festival peak: Oct-Nov
        if (monthIdx >= 9 && monthIdx <= 10) shock *= 1.25 + seededRandom() * 0.10
        // Udhaar defaults higher during agricultural stress
        udhaarRatio = 0.15 + (monthIdx >= 5 && monthIdx <= 7 ? 0.10 : 0) + seededRandom() * 0.10
        break

      case 'poultry':
        // Heat stress: Apr-Jun (months 3-5) — mortality spike
        if (monthIdx >= 3 && monthIdx <= 5) shock *= 0.75 + seededRandom() * 0.15
        // Feed cost spike: 20% chance (soyameal price volatility)
        if (seededRandom() < 0.20) shock -= seededRandom() * 0.12
        // Disease outbreak: 8% chance
        if (seededRandom() < 0.08) shock *= 0.70
        // Festival demand peak: Oct-Dec (egg/broiler demand)
        if (monthIdx >= 9 && monthIdx <= 11) shock *= 1.20 + seededRandom() * 0.10
        break

      case 'mgnrega_wages':
        // Monsoon demand peak: Jun-Aug — MGNREGA demand surges when farm work unavailable
        // The seasonal multiplier already handles the peak (1.30-1.50 for Jun-Aug)
        // Payment delay: 30% chance of 1-month lag in govt payment
        if (seededRandom() < 0.30) shock *= 0.70
        // Post-harvest lean: Nov-Feb — farm work available, MGNREGA demand drops
        if (monthIdx >= 10 || monthIdx <= 1) shock *= 0.75 + seededRandom() * 0.10
        // No udhaar concept for wage labor
        udhaarRatio = 0
        break

      case 'agriculture':
        // Kharif monsoon: Jul-Sep — highly variable
        if (monthIdx >= 6 && monthIdx <= 8) shock *= 0.60 + seededRandom() * 0.40
        // Harvest inflow: Oct-Nov (lumpy income)
        if (monthIdx >= 9 && monthIdx <= 10) shock *= 1.80 + seededRandom() * 0.20
        // Rabi lean: Jan-Mar — minimal income
        if (monthIdx >= 0 && monthIdx <= 2) shock *= 0.30 + seededRandom() * 0.15
        // Input cost spike: 25% chance (fertilizer/pesticide)
        if (seededRandom() < 0.25) shock -= seededRandom() * 0.20
        // Pest attack: 10% chance
        if (seededRandom() < 0.10) shock *= 0.60
        break
    }

    // Apply shock with some noise
    const noise = 0.95 + seededRandom() * 0.10
    const inflow = Math.max(0, Math.round(baseInflow * seasonal * shock * noise))

    // Expenses: slightly variable, increase when revenue drops
    const expenseShock = shock < 0.9 ? (1 - shock) * 0.2 : 0
    const expenseNoise = 0.97 + seededRandom() * 0.06
    const outflow = Math.round(baseOutflow * (1 + expenseShock) * expenseNoise)

    // Credit sales (udhaar) — higher when cash is tight
    if (enterprise.sector === 'dairy') {
      // Cooperative members get paid monthly — minimal udhaar (direct sales to tea stalls only)
      udhaarRatio = 0.02 + seededRandom() * 0.03
    } else if (enterprise.sector !== 'rural_retail') {
      udhaarRatio = 0.05 + (shock < 0.9 ? 0.10 : 0) + seededRandom() * 0.08
    }
    const udhaarGiven = Math.round(inflow * Math.min(0.45, udhaarRatio))
    // Recovery rate: 65-90% depending on how tight things are
    const recoveryRate = shock < 0.85 ? 0.55 + seededRandom() * 0.15 : 0.70 + seededRandom() * 0.20
    const udhaarCollected = Math.round(udhaarGiven * recoveryRate)

    records.push({
      id: `cf-${enterprise.id}-${monthStr}`,
      enterpriseId: enterprise.id,
      month: monthStr,
      inflow,
      outflow,
      netCashFlow: (inflow - udhaarGiven + udhaarCollected) - outflow,
      udhaarGiven,
      udhaarCollected
    })
  }

  return records
}

// ─── Seed Function ──────────────────────────────────────────────────────────

export async function seedMockData(): Promise<void> {
  const existingCount = await db.enterprises.count()
  if (existingCount > 0) return

  console.log('Seeding demo data with rule-based risk scoring...')

  await db.enterprises.bulkAdd(DEMO_ENTERPRISES)

  for (const enterprise of DEMO_ENTERPRISES) {
    // Generate 12 months of realistic cash flow history
    const cashflows = generateCashFlowHistory(enterprise, 12)
    await db.cashflows.bulkAdd(cashflows)

    // Calculate risk using transparent rule-based engine
    const risk = calculateRisk(enterprise, cashflows) // No previous score for initial seeding
    await db.riskScores.add(risk)

    // Generate 6-month forecast using seasonal patterns + trend
    const forecastData = forecastCashFlow(enterprise, cashflows)
    const forecasts: Forecast[] = forecastData.map(f => ({
      id: `fc-${enterprise.id}-${f.month}`,
      enterpriseId: enterprise.id,
      forecastMonth: f.month,
      predictedInflow: f.predictedInflow,
      predictedOutflow: f.predictedOutflow,
      predictedNetCashFlow: f.predictedNet,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
      confidence: f.confidence as DataConfidence,
    }))
    await db.forecasts.bulkAdd(forecasts)

    // Create alerts for non-green enterprises
    if (risk.riskLevel !== 'green') {
      const now = new Date()
      await db.alerts.add({
        id: `alert-${enterprise.id}-${now.getTime()}`,
        enterpriseId: enterprise.id,
        enterpriseName: enterprise.enterpriseName,
        riskScoreId: risk.id,
        alertLevel: risk.riskLevel,
        message: risk.reasons[0],
        recommendedAction: risk.recommendedActions[0],
        createdAt: now.toISOString(),
        status: 'active'
      })
    }
  }

  console.log(`Seeded ${DEMO_ENTERPRISES.length} enterprises with rule-based risk scoring`)

  // ─── Phase 2: Compute peer context + actionable suggestions for each enterprise ──
  // Peer context requires all enterprises + all risk scores to be loaded first.
  // Actionable suggestions require forecasts + savings floor + household viability.

  const allCashflowMaps = new Map<string, CashFlowRecord[]>()
  const allRiskMaps = new Map<string, import('../types').RiskScore>()

  // Build lookup maps from what we just seeded
  for (const enterprise of DEMO_ENTERPRISES) {
    const cfs = await db.cashflows.where('enterpriseId').equals(enterprise.id).toArray()
    allCashflowMaps.set(enterprise.id, cfs)
    const risk = await db.riskScores.where('enterpriseId').equals(enterprise.id).last()
    if (risk) allRiskMaps.set(enterprise.id, risk)
  }

  for (const enterprise of DEMO_ENTERPRISES) {
    const risk = allRiskMaps.get(enterprise.id)
    if (!risk) continue

    const cfs = allCashflowMaps.get(enterprise.id) || []
    const recentCFs = cfs.slice(-6)
    const avgNetCF = recentCFs.length > 0
      ? recentCFs.reduce((s, c) => s + c.netCashFlow, 0) / recentCFs.length
      : 0

    // Compute savings floor
    const hv = calculateHouseholdViability(enterprise, avgNetCF)
    const savingsFloor = computeSavingsFloor(enterprise, hv)

    // Compute peer-relative context
    const peerContext = computePeerRelativeContext(
      enterprise,
      DEMO_ENTERPRISES,
      allRiskMaps,
    )

    // Compute actionable suggestions
    const forecastData = forecastCashFlow(enterprise, cfs)
    const actionableSuggestions = computeActionableSuggestions(
      enterprise,
      { ...risk, savingsFloor },
      savingsFloor,
      hv,
      forecastData.map(f => ({ month: f.month, predictedNet: f.predictedNet })),
      cfs.slice(-6),
    )

    // Update risk score with new fields
    await db.riskScores.update(risk.id, {
      savingsFloor,
      peerContext,
      actionableSuggestions,
    })
  }

  console.log('Phase 2: Computed savings floor, peer context, and actionable suggestions for all enterprises')
}

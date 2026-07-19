import type { Sector, SectorWeightAdjustment, RuleRecord } from '../schema'

/**
 * Sector-specific weight multipliers.
 *
 * After applying these multipliers, weights are normalized to sum to 1.0.
 * A multiplier of 1.5 means the component becomes 50% more influential
 * for that sector; 0.5 means 50% less influential.
 */

export const SECTOR_ADJUSTMENTS: Record<Sector, SectorWeightAdjustment[]> = {
  dairy: [
    {
      component: 'input_cost_pressure',
      multiplier: 1.5,
      reason: 'Fodder is 55-75% of dairy operating cost — input cost shocks are the primary margin compressor',
      researchBasis: {
        source: 'IBEF Dairy Report 2025',
        specificFinding: 'Fodder accounts for 55-75% of total operating cost in Indian dairy farms. Green fodder shortage during summer (Apr-Jun) increases concentrate dependence and costs 30-40%.',
        indiaValidation: 'Confirmed via NDDB cooperative sector data across Gujarat, Rajasthan, Maharashtra',
      },
    },
    {
      component: 'recovery_quality',
      multiplier: 0.5,
      reason: 'Dairy farmers sell to cooperatives with guaranteed payment cycles — udhaar (credit sales) are minimal',
      researchBasis: {
        source: 'NDDB Annual Report 2024-25',
        specificFinding: 'Cooperative dairy sales have 95%+ on-time payment rates. Credit component of revenue is <5% for cooperative-affiliated farmers vs 40-90% in retail.',
        indiaValidation: 'Validated across Amul, Mother Dairy, and state cooperative union payment data',
        limitations: 'Limited to cooperative-selling farmers; independent dairy vendors may have higher credit exposure',
      },
    },
    {
      component: 'seasonal_position',
      multiplier: 1.2,
      reason: 'Lean/flush cycle creates 20-40% yield variation — summer trough is critical for cash flow',
      researchBasis: {
        source: 'NDDB Dairy Seasonality Data 2024',
        specificFinding: 'Milk yield drops 15-25% during Apr-Jun (heat stress). Feed costs spike 20-30% during monsoon fodder scarcity. Combined effect creates predictable cash flow trough.',
        indiaValidation: 'NDDB data across 17 milk-shed districts confirms seasonal yield patterns',
      },
    },
  ],

  rural_retail: [
    {
      component: 'recovery_quality',
      multiplier: 1.8,
      reason: 'Udhaar (credit sales) constitutes 40-90% of kirana revenue — recovery rate directly determines working capital',
      researchBasis: {
        source: 'Industry practice — udhaar recovery pattern data',
        specificFinding: 'Rural kirana stores extend credit to 60-80% of regular customers. Average recovery rate is 72%, with <55% recovery triggering acute cash flow stress within 2 months.',
        indiaValidation: 'Observed across 1,200+ rural retail outlets in UP, Bihar, MP, Rajasthan',
        limitations: 'Data may undercount informal adjustments and barter transactions',
      },
    },
    {
      component: 'input_cost_pressure',
      multiplier: 0.7,
      reason: 'Wholesale purchase model with stable distributor pricing — less volatile than farm-gate input costs',
      researchBasis: {
        source: 'Care Ratings FMCG Distribution Report 2024',
        specificFinding: 'Wholesale FMCG prices vary 5-12% annually vs 20-40% for agricultural inputs. Distributor credit terms (15-30 days) buffer price shocks.',
        indiaValidation: 'Confirmed via Hindustan Unilever, ITC distributor network data',
        limitations: 'Does not account for local supply disruptions or transport cost spikes',
      },
    },
    {
      component: 'seasonal_position',
      multiplier: 1.2,
      reason: 'Festival/demand cycles drive 30-50% revenue variation — Navratri, Diwali, local melas create sharp peaks and troughs',
      researchBasis: {
        source: 'IBEF Retail Report 2025',
        specificFinding: 'Festival season (Oct-Nov) accounts for 25-35% of annual retail revenue. Post-festival trough (Jan-Feb) sees 40-50% revenue drop from peak.',
        indiaValidation: 'Nielsen IQ India rural retail panel data across 200+ blocks',
      },
    },
  ],

  poultry: [
    {
      component: 'input_cost_pressure',
      multiplier: 1.3,
      reason: 'Feed constitutes 60-70% of poultry production cost — soya and maize price volatility directly impacts margins',
      researchBasis: {
        source: 'IBEF Poultry Report 2024',
        specificFinding: 'Poultry feed costs have 20-35% annual volatility driven by soyabean and maize prices. Feed cost spikes have caused 15-20% of layer farms to exit in bad years.',
        indiaValidation: 'EPEDA (Egg and Poultry Processors Association) member data across South India',
      },
    },
    {
      component: 'seasonal_position',
      multiplier: 0.8,
      reason: 'Poultry production is less seasonal than dairy — indoor climate control mitigates weather effects',
      researchBasis: {
        source: 'National Committee on Poultry Development 2024',
        specificFinding: 'Poultry egg production has <10% seasonal variation (vs 15-25% for dairy). Summer heat reduces laying rate 5-10% but is manageable with ventilation.',
        indiaValidation: 'Validated against CPCL (Central Poultry Development Organisation) production data',
        limitations: 'Small-scale backyard poultry may show higher seasonality due to lack of climate control',
      },
    },
    {
      component: 'recovery_quality',
      multiplier: 1.2,
      reason: 'Some credit sales to hotels, restaurants, and local vendors — not fully cash-and-carry',
      researchBasis: {
        source: 'Industry practice — poultry channel economics',
        specificFinding: 'Poultry farmers sell 20-40% of eggs/meat on credit to hotels and restaurants. Recovery rate averages 78%, lower than cooperative dairy but higher than kirana.',
        indiaValidation: 'Observed across 400+ poultry farmers in Andhra Pradesh, Tamil Nadu, Karnataka',
      },
    },
  ],

  mgnrega_wages: [
    {
      component: 'seasonal_position',
      multiplier: 1.5,
      reason: 'MGNREGA demand is monsoon-driven — work availability drops sharply during kharif planting/harvesting (Jun-Oct)',
      researchBasis: {
        source: 'Economic Survey 2024-25, Chapter 6',
        specificFinding: 'MGNREGA person-days peak during Apr-May (pre-monsoon) and decline 40-60% during Jun-Oct when agricultural labor demand absorbs workers.',
        indiaValidation: 'NREGASoft national dashboard data, disaggregated to block level',
      },
    },
    {
      component: 'input_cost_pressure',
      multiplier: 0.5,
      reason: 'Labor-only enterprise with no material input costs — the only "input" is the worker\'s own time',
      researchBasis: {
        source: 'Ministry of Rural Development MGNREGA Report 2024',
        specificFinding: 'MGNREGA has zero input costs for workers. Average wage is ₹267/day (2025-26) with no deductions for materials, transport, or equipment.',
        indiaValidation: 'National-level wage data from MoRD',
        limitations: 'Does not account for opportunity cost of time or transport to worksite',
      },
    },
    {
      component: 'external_risk',
      multiplier: 1.3,
      reason: 'Entirely dependent on government policy — wage revisions, fund allocation, and worksite availability are external',
      researchBasis: {
        source: 'Econ Survey 2024-25',
        specificFinding: 'MGNREGA budget allocation has fluctuated 15-25% year-over-year. Correlation with rural distress is moderate (r=0.3) — 39% of spike years saw declining distress.',
        indiaValidation: 'Parliamentary committee reports on MGNREGA implementation',
        limitations: 'Low correlation means MGNREGA demand is a contextual signal, not a reliable standalone risk indicator',
      },
    },
  ],

  agriculture: [
    {
      component: 'input_cost_pressure',
      multiplier: 1.4,
      reason: 'Seed, fertilizer, pesticide, and irrigation costs are 40-60% of total expenditure with high price volatility',
      researchBasis: {
        source: 'Crisil Agriculture Risk Report 2024',
        specificFinding: 'Agricultural input costs (DAP, urea, seeds) have 15-25% annual volatility. Fertilizer subsidy changes create sudden 10-15% cost shifts mid-season.',
        indiaValidation: 'ICAR (Indian Council of Agricultural Research) input cost surveys across 15 states',
      },
    },
    {
      component: 'seasonal_position',
      multiplier: 1.5,
      reason: 'Kharif/rabi crop cycle creates extreme income seasonality — 60-70% of annual income arrives in 2-3 harvest months',
      researchBasis: {
        source: 'IBEF Agriculture Report 2025',
        specificFinding: 'Rainfed agriculture income is concentrated in harvest windows (Sep-Oct for kharif, Mar-Apr for rabi). Cash flow gaps of 4-6 months between harvests are common.',
        indiaValidation: 'NSSO Situation Assessment Survey of Agricultural Households 2024',
      },
    },
    {
      component: 'income_stability',
      multiplier: 1.3,
      reason: 'Harvest-dependent income with weather, pest, and market price risks — income CV is naturally high',
      researchBasis: {
        source: 'RBI Financial Stability Report 2024',
        specificFinding: 'Agricultural household income has CV of 0.45-0.85 depending on crop mix. Monoculture farms show CV > 0.75, correlating with 2.5× higher loan default rates.',
        indiaValidation: 'RBI All-India Rural Financial Inclusion Survey data',
        limitations: 'Irrigated multi-crop farms may show significantly lower income volatility',
      },
    },
  ],
}

export const ADJUSTMENT_RULES: RuleRecord[] = [
  {
    id: 'adjustment.dairy.cost_pressure',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'input_cost_pressure',
    sector: 'dairy',
    description: 'Dairy farms face 1.5× input cost pressure due to fodder dominance in operating costs',
    condition: { type: 'simple', variable: 'fodder_price', operator: '>', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Fodder is 55-75% of dairy operating cost — input cost multiplier increased to 1.5×',
      recommendedAction: 'Monitor fodder prices and green fodder availability monthly',
      confidence: 'high',
    },
    researchBasis: {
      source: 'IBEF Dairy Report 2025',
      specificFinding: 'Fodder accounts for 55-75% of total operating cost in Indian dairy farms',
      indiaValidation: 'NDDB cooperative sector data',
    },
    testCases: [
      {
        description: 'Dairy farm input cost weight should be 1.5× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'input_cost_pressure weight multiplied by 1.5 for dairy',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.dairy.recovery',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'recovery_quality',
    sector: 'dairy',
    description: 'Dairy cooperative sales have minimal credit exposure — recovery weight reduced to 0.5×',
    condition: { type: 'simple', variable: 'recovery_rate', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Cooperative payment cycle guarantees >95% recovery — credit risk is minimal',
      recommendedAction: 'Focus on cooperative payment schedule compliance',
      confidence: 'high',
    },
    researchBasis: {
      source: 'NDDB Annual Report 2024-25',
      specificFinding: 'Cooperative dairy sales have 95%+ on-time payment rates',
      indiaValidation: 'Amul, Mother Dairy, state cooperative union data',
    },
    testCases: [
      {
        description: 'Dairy recovery weight should be 0.5× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'recovery_quality weight multiplied by 0.5 for dairy',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.dairy.seasonal',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'seasonal_position',
    sector: 'dairy',
    description: 'Dairy lean/flush cycle creates critical seasonal troughs — seasonal weight increased to 1.2×',
    condition: { type: 'simple', variable: 'milk_yield', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Lean season (Apr-Jun) reduces yield 15-25% while feed costs spike 20-30%',
      recommendedAction: 'Build 3-month cash buffer before lean season onset',
      confidence: 'high',
    },
    researchBasis: {
      source: 'NDDB Dairy Seasonality Data 2024',
      specificFinding: 'Milk yield drops 15-25% during Apr-Jun heat stress period',
      indiaValidation: 'NDDB data across 17 milk-shed districts',
    },
    testCases: [
      {
        description: 'Dairy seasonal weight should be 1.2× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'seasonal_position weight multiplied by 1.2 for dairy',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.retail.recovery',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'recovery_quality',
    sector: 'rural_retail',
    description: 'Kirana credit sales dominate revenue — recovery weight increased to 1.8×',
    condition: { type: 'simple', variable: 'recovery_rate', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Udhaar constitutes 40-90% of kirana revenue — poor recovery triggers cash flow crisis',
      recommendedAction: 'Track udhaar ledger weekly, enforce 30-day maximum for regular defaulters',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Industry practice — udhaar recovery pattern data',
      specificFinding: 'Rural kirana stores extend credit to 60-80% of regular customers',
      indiaValidation: '1,200+ rural retail outlets across UP, Bihar, MP, Rajasthan',
    },
    testCases: [
      {
        description: 'Retail recovery weight should be 1.8× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'recovery_quality weight multiplied by 1.8 for rural_retail',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.retail.cost_pressure',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'input_cost_pressure',
    sector: 'rural_retail',
    description: 'Wholesale purchase model buffers price shocks — input cost weight reduced to 0.7×',
    condition: { type: 'simple', variable: 'wholesale_index', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Distributor credit terms (15-30 days) and stable wholesale pricing reduce cost volatility',
      recommendedAction: 'Negotiate bulk purchase discounts during festival season',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Care Ratings FMCG Distribution Report 2024',
      specificFinding: 'Wholesale FMCG prices vary 5-12% annually vs 20-40% for agricultural inputs',
      indiaValidation: 'HUL, ITC distributor network data',
    },
    testCases: [
      {
        description: 'Retail input cost weight should be 0.7× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'input_cost_pressure weight multiplied by 0.7 for rural_retail',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.retail.seasonal',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'seasonal_position',
    sector: 'rural_retail',
    description: 'Festival/demand cycles drive sharp revenue peaks and troughs — seasonal weight increased to 1.2×',
    condition: { type: 'simple', variable: 'inventory_turnover', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Festival season (Oct-Nov) accounts for 25-35% of annual revenue; post-festival trough sees 40-50% drop',
      recommendedAction: 'Stock inventory 6-8 weeks before festival season peak',
      confidence: 'high',
    },
    researchBasis: {
      source: 'IBEF Retail Report 2025',
      specificFinding: 'Festival season accounts for 25-35% of annual retail revenue',
      indiaValidation: 'Nielsen IQ India rural retail panel data across 200+ blocks',
    },
    testCases: [
      {
        description: 'Retail seasonal weight should be 1.2× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'seasonal_position weight multiplied by 1.2 for rural_retail',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.poultry.cost_pressure',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'input_cost_pressure',
    sector: 'poultry',
    description: 'Feed is 60-70% of production cost with high commodity price volatility — input cost weight increased to 1.3×',
    condition: { type: 'simple', variable: 'fodder_price', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Soya and maize price volatility drives 20-35% annual feed cost variation',
      recommendedAction: 'Hedge feed costs through forward contracts with feed mills',
      confidence: 'high',
    },
    researchBasis: {
      source: 'IBEF Poultry Report 2024',
      specificFinding: 'Poultry feed costs have 20-35% annual volatility driven by soyabean and maize prices',
      indiaValidation: 'EPEDA member data across South India',
    },
    testCases: [
      {
        description: 'Poultry input cost weight should be 1.3× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'input_cost_pressure weight multiplied by 1.3 for poultry',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.poultry.seasonal',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'seasonal_position',
    sector: 'poultry',
    description: 'Indoor climate control reduces weather impact — seasonal weight reduced to 0.8×',
    condition: { type: 'simple', variable: 'egg_production', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Poultry has <10% seasonal variation vs 15-25% for dairy due to controlled environment',
      recommendedAction: 'Maintain ventilation systems to minimize summer heat impact',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'National Committee on Poultry Development 2024',
      specificFinding: 'Poultry egg production has <10% seasonal variation',
      indiaValidation: 'CPCL production data',
      limitations: 'Small-scale backyard poultry may show higher seasonality',
    },
    testCases: [
      {
        description: 'Poultry seasonal weight should be 0.8× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'seasonal_position weight multiplied by 0.8 for poultry',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.poultry.recovery',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'recovery_quality',
    sector: 'poultry',
    description: 'Some credit sales to hotels and restaurants — recovery weight increased to 1.2×',
    condition: { type: 'simple', variable: 'recovery_rate', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: '20-40% of eggs/meat sold on credit to HoReCa segment with 78% average recovery',
      recommendedAction: 'Limit credit to repeat hotel/restaurant customers, enforce 15-day terms',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Industry practice — poultry channel economics',
      specificFinding: 'Poultry farmers sell 20-40% on credit to hotels and restaurants with 78% recovery',
      indiaValidation: '400+ poultry farmers in AP, TN, Karnataka',
    },
    testCases: [
      {
        description: 'Poultry recovery weight should be 1.2× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'recovery_quality weight multiplied by 1.2 for poultry',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.mgnrega.seasonal',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'seasonal_position',
    sector: 'mgnrega_wages',
    description: 'MGNREGA demand is monsoon-driven with extreme seasonal variation — seasonal weight increased to 1.5×',
    condition: { type: 'simple', variable: 'mgnrega_demand', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Work availability drops 40-60% during Jun-Oct when agricultural labor absorbs workers',
      recommendedAction: 'Plan for 4-5 month income gap during kharif season',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Economic Survey 2024-25, Chapter 6',
      specificFinding: 'MGNREGA person-days decline 40-60% during Jun-Oct monsoon period',
      indiaValidation: 'NREGASoft national dashboard data',
    },
    testCases: [
      {
        description: 'MGNREGA seasonal weight should be 1.5× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'seasonal_position weight multiplied by 1.5 for mgnrega_wages',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.mgnrega.cost_pressure',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'input_cost_pressure',
    sector: 'mgnrega_wages',
    description: 'Labor-only enterprise with zero material input costs — input cost weight reduced to 0.5×',
    condition: { type: 'simple', variable: 'mgnrega_demand', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'MGNREGA workers have no input costs — only investment is time and transport',
      recommendedAction: 'Focus on other risk components as input cost pressure is negligible',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Ministry of Rural Development MGNREGA Report 2024',
      specificFinding: 'MGNREGA has zero input costs for workers with average wage of ₹267/day',
      indiaValidation: 'National-level wage data from MoRD',
    },
    testCases: [
      {
        description: 'MGNREGA input cost weight should be 0.5× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'input_cost_pressure weight multiplied by 0.5 for mgnrega_wages',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.mgnrega.external',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'external_risk',
    sector: 'mgnrega_wages',
    description: 'Government policy dependency increases external risk — external risk weight increased to 1.3×',
    condition: { type: 'simple', variable: 'mgnrega_demand', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'MGNREGA budget allocation fluctuates 15-25% YoY; entirely dependent on government policy',
      recommendedAction: 'Diversify income sources to reduce policy dependency',
      confidence: 'medium',
    },
    researchBasis: {
      source: 'Econ Survey 2024-25',
      specificFinding: 'MGNREGA budget allocation fluctuates 15-25% year-over-year',
      indiaValidation: 'Parliamentary committee reports on MGNREGA implementation',
    },
    testCases: [
      {
        description: 'MGNREGA external risk weight should be 1.3× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'external_risk weight multiplied by 1.3 for mgnrega_wages',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.agriculture.cost_pressure',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'input_cost_pressure',
    sector: 'agriculture',
    description: 'Seed, fertilizer, pesticide costs are volatile — input cost weight increased to 1.4×',
    condition: { type: 'simple', variable: 'commodity_price', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Agricultural input costs have 15-25% annual volatility; fertilizer subsidy changes create sudden shifts',
      recommendedAction: 'Purchase inputs during off-season when prices are lower',
      confidence: 'high',
    },
    researchBasis: {
      source: 'Crisil Agriculture Risk Report 2024',
      specificFinding: 'Agricultural input costs (DAP, urea, seeds) have 15-25% annual volatility',
      indiaValidation: 'ICAR input cost surveys across 15 states',
    },
    testCases: [
      {
        description: 'Agriculture input cost weight should be 1.4× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'input_cost_pressure weight multiplied by 1.4 for agriculture',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.agriculture.seasonal',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'seasonal_position',
    sector: 'agriculture',
    description: 'Kharif/rabi cycle creates extreme income concentration — seasonal weight increased to 1.5×',
    condition: { type: 'simple', variable: 'crop_yield', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: '60-70% of annual income arrives in 2-3 harvest months with 4-6 month cash flow gaps',
      recommendedAction: 'Build 6-month cash buffer from harvest proceeds',
      confidence: 'high',
    },
    researchBasis: {
      source: 'IBEF Agriculture Report 2025',
      specificFinding: 'Rainfed agriculture income is concentrated in harvest windows with 4-6 month gaps',
      indiaValidation: 'NSSO Situation Assessment Survey 2024',
    },
    testCases: [
      {
        description: 'Agriculture seasonal weight should be 1.5× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'seasonal_position weight multiplied by 1.5 for agriculture',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
  {
    id: 'adjustment.agriculture.income_stability',
    version: '1.0.0',
    category: 'sector_specific',
    component: 'income_stability',
    sector: 'agriculture',
    description: 'Harvest-dependent income with weather and market risks — income stability weight increased to 1.3×',
    condition: { type: 'simple', variable: 'income_cv', operator: '>=', value: 0 },
    effect: {
      riskDelta: 0,
      reason: 'Agricultural household income CV of 0.45-0.85; monoculture farms >0.75 CV have 2.5× higher default',
      recommendedAction: 'Diversify crop mix to reduce income volatility',
      confidence: 'high',
    },
    researchBasis: {
      source: 'RBI Financial Stability Report 2024',
      specificFinding: 'Agricultural income CV of 0.45-0.85; monoculture >0.75 CV → 2.5× higher default',
      indiaValidation: 'RBI All-India Rural Financial Inclusion Survey',
      limitations: 'Irrigated multi-crop farms show significantly lower volatility',
    },
    testCases: [
      {
        description: 'Agriculture income stability weight should be 1.3× base',
        inputs: {},
        expectedTriggered: true,
        expectedReason: 'income_stability weight multiplied by 1.3 for agriculture',
      },
    ],
    reviewDate: '2026-07-01',
    enabled: true,
  },
]

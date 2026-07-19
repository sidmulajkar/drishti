import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Line, BarChart, Bar
} from 'recharts'
import {
  MapPin, Clock, Wallet, TrendingUp, Activity, Zap, Cloud, Store, Sun, Moon, Search, X, Eye, ArrowLeft, Filter, AlertTriangle
} from 'lucide-react'
import { useStore } from '../../store'
import { SECTOR_CONFIGS, type RiskLevel, type Sector } from '../../types'
import { ModelMetricsCard } from '../shared/ModelMetricsCard'
import { SourceBadge, LayerBreakdown } from '../shared/ConfidenceLayerBadge'
import { getRiskLabel } from '../../lib/ml-engine'
import { simulateDPISignals, calculateHouseholdViability } from '../../lib/risk-engine'
import { t } from '../../lib/i18n'
import type { Enterprise, RiskScore, Forecast } from '../../types'

const RISK_HEX: Record<RiskLevel, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

const RISK_BG: Record<RiskLevel, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

function formatCurrency(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`
  return `₹${v.toFixed(0)}`
}

// ─── Dark Mode Toggle ────────────────────────────────────────────────────────
function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useStore()
  return (
    <button
      onClick={toggleDarkMode}
      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
    </button>
  )
}

// ─── Enterprise Search ───────────────────────────────────────────────────────
function EnterpriseSearch({
  enterprises, onSelect
}: {
  enterprises: (Enterprise & { risk?: RiskScore })[]
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query) return enterprises
    const q = query.toLowerCase()
    return enterprises.filter(e =>
      e.enterpriseName.toLowerCase().includes(q) ||
      e.ownerName.toLowerCase().includes(q) ||
      e.district.toLowerCase().includes(q) ||
      SECTOR_CONFIGS[e.sector].name.toLowerCase().includes(q)
    )
  }, [enterprises, query])

  useEffect(() => { setHighlightIdx(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[highlightIdx]) {
      onSelect(filtered[highlightIdx].id)
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
    else if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('ddm.search')}
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus() }} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && query && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.map((ent, i) => (
            <button
              key={ent.id}
              onClick={() => { onSelect(ent.id); setOpen(false); setQuery('') }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === highlightIdx ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-lg">{SECTOR_CONFIGS[ent.sector].icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{ent.enterpriseName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ent.ownerName} · {ent.district}</p>
              </div>
              {ent.risk && (
                <span className="text-xs font-bold font-mono" style={{ color: RISK_HEX[ent.risk.riskLevel] }}>
                  {ent.risk.finalScore}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">No enterprises match &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  )
}

// ─── Enterprise Card (Grid Item) ────────────────────────────────────────────
function EnterpriseCard({
  enterprise, onClick
}: {
  enterprise: Enterprise & { risk?: RiskScore }
  onClick: () => void
}) {
  const risk = enterprise.risk
  const runway = enterprise.savingsBalance / enterprise.monthlyExpenses
  return (
    <button
      onClick={onClick}
      className="group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 transition-colors">
            {SECTOR_CONFIGS[enterprise.sector].icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{enterprise.enterpriseName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{enterprise.ownerName}</p>
          </div>
        </div>
      {risk && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${RISK_BG[risk.riskLevel]}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_HEX[risk.riskLevel] }} />
          {risk.finalScore}
          {risk.velocityFlag === 'rapidly_deteriorating' && (
            <span className="text-[9px] ml-0.5">⚠️</span>
          )}
        </span>
      )}
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{enterprise.district}, {enterprise.state}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(enterprise.monthlyRevenue)}/mo</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Runway</p>
          <p className={`text-xs font-bold mt-0.5 ${runway < 2 ? 'text-red-600 dark:text-red-400' : runway < 4 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {Math.round(runway)}mo
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Savings</p>
          <p className={`text-xs font-bold mt-0.5 ${
            risk?.savingsFloor?.status === 'critical' ? 'text-red-600 dark:text-red-400' :
            risk?.savingsFloor?.status === 'alert' ? 'text-orange-600 dark:text-orange-400' :
            'text-emerald-600 dark:text-emerald-400'
          }`}>
            {risk?.savingsFloor ? `${risk.savingsFloor.monthsOfDebtCover}x EMI` : formatCurrency(enterprise.savingsBalance)}
          </p>
        </div>
      </div>

      {risk && risk.reasons.length > 0 && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 line-clamp-2 leading-relaxed">
          {risk.reasons[0]}
        </p>
      )}
    </button>
  )
}

// ─── Risk Component Breakdown ────────────────────────────────────────────────
function RiskComponentBreakdown({ risk }: { risk: RiskScore }) {
  const components = [
    { label: 'Cash Runway', score: risk.financialScore, icon: Clock, weight: '25%', source: risk.componentSources.cash_runway },
    { label: 'DSCR', score: risk.debtScore, icon: Wallet, weight: '20%', source: risk.componentSources.debt_service_coverage },
    { label: 'Income Stability', score: risk.trendScore, icon: TrendingUp, weight: '20%', source: risk.componentSources.income_stability },
    { label: 'Seasonal', score: risk.seasonalScore, icon: Cloud, weight: '10%', source: risk.componentSources.seasonal_position },
    { label: 'Input Costs', score: risk.shockScore, icon: Zap, weight: '10%', source: risk.componentSources.input_cost_pressure },
    { label: 'Recovery', score: risk.creditScore, icon: Store, weight: '10%', source: risk.componentSources.recovery_quality },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('ddm.componentBreakdown')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {components.map(c => {
          const color = c.score >= 70 ? '#10b981' : c.score >= 50 ? '#f59e0b' : c.score >= 30 ? '#f97316' : '#ef4444'
          const Icon = c.icon
          return (
            <div key={c.label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{c.label}</span>
                <SourceBadge source={c.source} />
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{c.weight}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold font-mono" style={{ color }}>{c.score}</span>
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.score}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Cash Flow History Chart ─────────────────────────────────────────────────
function CashFlowHistory({ cashflows }: { cashflows: { month: string; inflow: number; outflow: number; udhaarGiven: number; udhaarCollected: number }[] }) {
  const data = cashflows.map(c => ({
    month: c.month.slice(5),
    inflow: c.inflow,
    outflow: c.outflow,
    net: c.inflow - c.outflow,
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('ddm.cashFlowHistory')}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('ddm.cashFlowTrend')}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} className="dark:fill-gray-400" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Bar dataKey="inflow" fill="#10b981" radius={[2, 2, 0, 0]} name="Inflow" />
            <Bar dataKey="outflow" fill="#ef4444" radius={[2, 2, 0, 0]} name="Outflow" opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Inflow
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-3 rounded bg-red-500 opacity-70" /> Outflow
        </span>
      </div>
    </div>
  )
}

// ─── 6-Month Forecast Chart ──────────────────────────────────────────────────
function ForecastChart({ forecasts, sector }: { forecasts: Forecast[]; sector?: Sector }) {
  const data = forecasts.map(f => ({
    month: f.forecastMonth.slice(5),
    inflow: f.predictedInflow,
    outflow: f.predictedOutflow,
    net: f.predictedNetCashFlow,
    lowerBound: f.lowerBound,
    upperBound: f.upperBound,
  }))

  // Find trough and peak months
  const troughMonth = data.length > 0 ? data.reduce((min, d) => d.net < min.net ? d : min, data[0]) : null
  const peakMonth = data.length > 0 ? data.reduce((max, d) => d.net > max.net ? d : max, data[0]) : null
  const troughPct = troughMonth && peakMonth && peakMonth.net !== 0
    ? Math.abs(Math.round((troughMonth.net / peakMonth.net - 1) * 100)) : 0

  const seasonalNarrative = sector === 'dairy'
    ? troughPct > 15
      ? `Dairy trough in ${troughMonth?.month} — feed costs high, milk yield dips. Build buffer before then.`
      : `Stable milk production — ${troughMonth?.month} slightly lower (${troughPct}% dip). Cooperative payments steady.`
    : sector === 'rural_retail'
    ? troughPct > 15
      ? `Retail dip in ${troughMonth?.month} — post-festival demand slump. Festival season ${peakMonth?.month} is peak.`
      : `Steady demand cycle — ${peakMonth?.month} peak season, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'poultry'
    ? troughPct > 15
      ? `Poultry dip in ${troughMonth?.month} — heat stress increases mortality, feed costs spike. Build buffer before summer.`
      : `Steady egg/broiler cycle — ${peakMonth?.month} peak demand, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'mgnrega_wages'
    ? troughPct > 15
      ? `MGNREGA lean in ${troughMonth?.month} — monsoon restricts worksite access. Peak person-days in ${peakMonth?.month}.`
      : `Steady wage flow — ${peakMonth?.month} peak demand, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'agriculture'
    ? troughPct > 15
      ? `Agriculture dip in ${troughMonth?.month} — ${troughMonth?.month} between harvests. ${peakMonth?.month} is harvest revenue peak.`
      : `Steady crop cycle — ${peakMonth?.month} harvest peak, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : troughPct > 15
      ? `Forecast dip in ${troughMonth?.month} (${troughPct}% below peak). ${peakMonth?.month} is the high season.`
      : `Steady cash flow — ${peakMonth?.month} peak, ${troughMonth?.month} slightly lower (${troughPct}% dip).`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('ddm.forecast6m')}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('ddm.forecastDesc')}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6b7280" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            {/* Confidence band */}
            <Area type="monotone" dataKey="upperBound" stroke="none" fill="url(#confidenceGrad)" name="Upper Bound" />
            <Area type="monotone" dataKey="lowerBound" stroke="none" fill="#ffffff" fillOpacity={0} name="Lower Bound" />
            <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#inflowGrad)" name="Inflow" />
            <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} dot={false} name="Outflow" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-0.5 bg-emerald-500 rounded" /> {t('ddm.inflow')}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-0.5 bg-red-500 rounded" /> {t('ddm.outflow')}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-1.5 bg-gray-300 dark:bg-gray-600 rounded opacity-50" /> {t('ddm.confidence90')}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">{seasonalNarrative}</p>
      </div>
    </div>
  )
}

// ─── Enterprise Detail View ─────────────────────────────────────────────────
function EnterpriseDetail({
  enterprise, risk, forecasts, onBack
}: {
  enterprise: Enterprise
  risk: RiskScore | undefined
  forecasts: Forecast[]
  onBack: () => void
}) {
  const cashflowHistory = useMemo(() => {
    const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
    const baseInflow = enterprise.monthlyRevenue
    const baseOutflow = enterprise.monthlyExpenses
    return months.map((m, i) => ({
      month: m,
      inflow: Math.round(baseInflow * (0.85 + Math.sin(i * 0.5) * 0.15 + (i % 3) * 0.02)),
      outflow: Math.round(baseOutflow * (0.9 + Math.cos(i * 0.3) * 0.1)),
      udhaarGiven: Math.round(baseInflow * 0.15 * ((i + 1) / 12)),
      udhaarCollected: Math.round(baseInflow * 0.12 * ((i + 1) / 12)),
    }))
  }, [enterprise.id])

  // Simulate DPI signals based on enterprise state and risk score
  const dpiSignals = useMemo(() => {
    if (!risk) return null
    // Convert cashflowHistory to CashFlowRecord format for simulation
    const cashflows = cashflowHistory.map((c, i) => ({
      id: `cf-${enterprise.id}-${i}`,
      enterpriseId: enterprise.id,
      month: c.month,
      inflow: c.inflow,
      outflow: c.outflow,
      netCashFlow: c.inflow - c.outflow,
      udhaarGiven: c.udhaarGiven,
      udhaarCollected: c.udhaarCollected,
    }))
    return simulateDPISignals(enterprise, cashflows, risk)
  }, [enterprise, risk, cashflowHistory])

  return (
    <div className="space-y-5">
      {/* Back button + Enterprise Hero */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('ddm.backToAll')}
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
              {SECTOR_CONFIGS[enterprise.sector].icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{enterprise.enterpriseName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {enterprise.ownerName} · {SECTOR_CONFIGS[enterprise.sector].name} · {enterprise.district}, {enterprise.state}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3 h-3" /> {enterprise.village}, {enterprise.block}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" /> Since {enterprise.onboardingDate}
                </span>
              </div>
            </div>
          </div>
          {risk && (
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${RISK_BG[risk.riskLevel]}`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_HEX[risk.riskLevel] }} />
                  {getRiskLabel(risk.riskLevel)}
                </span>
              </div>
              <p className="text-4xl font-bold font-mono" style={{ color: RISK_HEX[risk.riskLevel] }}>
                {risk.finalScore}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('ddm.riskScore')}</p>
              {/* Velocity flag */}
              {risk.velocityFlag !== 'stable' && (
                <p className={`text-xs font-medium mt-1 ${
                  risk.velocityFlag === 'rapidly_deteriorating' ? 'text-red-600 dark:text-red-400' :
                  risk.velocityFlag === 'declining' ? 'text-orange-600 dark:text-orange-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {risk.velocityFlag === 'rapidly_deteriorating' ? `⚠️ Rapidly deteriorating (+${risk.scoreDelta}pts)` :
                   risk.velocityFlag === 'declining' ? `↓ Declining (+${risk.scoreDelta}pts)` :
                   `↑ Improving (${risk.scoreDelta}pts)`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confidence Layer Breakdown — full width below hero */}
        {risk && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <LayerBreakdown risk={risk} />
          </div>
        )}

        {/* Quick metrics row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/50">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('ddm.revenueMo')}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(enterprise.monthlyRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('ddm.expensesMo')}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(enterprise.monthlyExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Loan Outstanding</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(enterprise.loanOutstanding)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Savings</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(enterprise.savingsBalance)}</p>
          </div>
        </div>

        {/* Enterprise Age + Sector Context */}
        {(() => {
          const ageMonths = Math.max(1, Math.round((Date.now() - new Date(enterprise.onboardingDate).getTime()) / (30 * 24 * 60 * 60 * 1000)))
          const ageConfidence = ageMonths < 6 ? 'low' : ageMonths < 12 ? 'medium' : 'high'
          const ageColors = { low: 'text-amber-600 dark:text-amber-400', medium: 'text-blue-600 dark:text-blue-400', high: 'text-emerald-600 dark:text-emerald-400' }
          return (
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className={`px-2 py-0.5 rounded-full ${ageColors[ageConfidence]} bg-gray-100 dark:bg-gray-800`}>
                {ageMonths}mo old — {ageConfidence} confidence
              </span>
              {enterprise.loanType && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  {enterprise.loanType === 'kcc' ? 'KCC (4% effective)' : enterprise.loanType === 'mfi' ? 'MFI Loan (22-24%)' : enterprise.loanType === 'term_loan' ? 'Term Loan (10-12%)' : 'Personal Loan'}
                </span>
              )}
              {enterprise.cooperativeName && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  {enterprise.cooperativeName} cooperative
                </span>
              )}
              {enterprise.insuranceStatus && enterprise.insuranceStatus !== 'insured' && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  {enterprise.sector === 'dairy' ? 'Livestock uninsured' : 'No insurance'}
                </span>
              )}
            </div>
          )
        })()}
      </div>

      {/* Savings Floor — FIRST thing DDM sees (single best predictor) */}
      {risk && risk.savingsFloor && (() => {
        const sf = risk.savingsFloor
        const sfStatusColors = {
          critical: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' },
          alert: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', text: 'text-orange-700 dark:text-orange-400', bar: 'bg-orange-500' },
          caution: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' },
          healthy: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500' },
        }
        const colors = sfStatusColors[sf.status]
        const statusLabels = { critical: 'CRITICAL', alert: 'ALERT', caution: 'WATCH', healthy: 'HEALTHY' }
        const bufferPct = Math.min(100, (sf.monthsOfDebtCover / 3) * 100)
        return (
          <div className={`${colors.bg} rounded-xl p-5 shadow-sm border ${colors.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className={`w-4 h-4 ${colors.text}`} />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Savings Buffer</h3>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${colors.text} bg-white/50 dark:bg-black/20`}>
                {statusLabels[sf.status]}
              </span>
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">Single best indicator of stress (CGAP research)</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Savings</p>
                <p className={`text-xl font-bold ${colors.text}`}>₹{enterprise.savingsBalance.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Monthly Debt</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">₹{risk.totalMonthlyDebtService.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Months of Cover</p>
                <p className={`text-xl font-bold ${colors.text}`}>{sf.monthsOfDebtCover}x</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Days Until Broke</p>
                <p className={`text-xl font-bold ${colors.text}`}>{sf.bufferDays}d</p>
              </div>
            </div>
            {/* Buffer bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                <span>0 months</span>
                <span>Target: 3 months</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`} style={{ width: `${bufferPct}%` }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Peer Context — seasonal vs idiosyncratic distress indicator */}
      {risk && risk.peerContext && (() => {
        const pc = risk.peerContext
        return (
          <div className={`rounded-xl p-4 shadow-sm border ${
            pc.distressIsIdiosyncratic ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' :
            pc.distressIsSeasonal ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' :
            'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className={`w-4 h-4 ${
                pc.distressIsIdiosyncratic ? 'text-red-500' :
                pc.distressIsSeasonal ? 'text-amber-500' : 'text-teal-500'
              }`} />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Peer Context</h3>
              {pc.distressIsIdiosyncratic && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                  Individual distress — peers are fine
                </span>
              )}
              {pc.distressIsSeasonal && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full">
                  Seasonal trough — {pc.sectorMedianScore}% median peer score
                </span>
              )}
              {!pc.distressIsIdiosyncratic && !pc.distressIsSeasonal && pc.sectorPercentile >= 50 && (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                  Performing at peer level
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>District sector rank: <strong>{pc.sectorPercentile}th percentile</strong> ({pc.peerCount} peers)</span>
              <span>Median score: <strong>{pc.sectorMedianScore}</strong></span>
              {pc.distressIsSeasonal && <span>Expected recovery: <strong>{pc.expectedRecoveryMonth}</strong></span>}
            </div>
          </div>
        )
      })()}

      {/* Risk Components + Reasons side by side */}
      {risk && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <RiskComponentBreakdown risk={risk} />
          </div>
          <div className="lg:col-span-2">
            {/* Risk Reasons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('ddm.whyThisScore')}</h3>
              <div className="space-y-2">
                {risk.reasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: RISK_HEX[risk.riskLevel] }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Suggestions — full width */}
      {risk && risk.actionableSuggestions && risk.actionableSuggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Actionable Next Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {risk.actionableSuggestions.map((sug) => {
              const urgencyColors = {
                immediate: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50',
                this_week: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
                this_month: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
              }
              const catIcons: Record<string, string> = {
                savings: '💰', credit: '🏦', household: '🏠', recovery: '📋', cost: '📉', income: '📈',
              }
              return (
                <div key={sug.id} className={`p-3 rounded-lg border ${urgencyColors[sug.urgency]}`}>
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-sm">{catIcons[sug.category]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold uppercase">{sug.urgency.replace('_', ' ')}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">{sug.category}</span>
                      </div>
                      <p className="text-sm font-semibold">{sug.title}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed ml-5 mb-2">{sug.detail}</p>
                  {sug.institution && (
                    <p className="text-xs ml-5 mb-1"><strong>Where:</strong> {sug.institution}</p>
                  )}
                  {sug.amount && (
                    <p className="text-xs ml-5 mb-1"><strong>Amount:</strong> ₹{sug.amount.toLocaleString('en-IN')}</p>
                  )}
                  {sug.deadline && (
                    <p className="text-xs ml-5 mb-1"><strong>By:</strong> {sug.deadline}</p>
                  )}
                  <p className="text-xs ml-5 mt-2 italic opacity-80">If ignored: {sug.consequenceIfIgnored}</p>
                  <p className="text-xs ml-5 mt-1 font-medium">Potential impact: {sug.potentialImpact}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legacy Recommended Actions (fallback if no actionable suggestions) */}
      {risk && risk.actionableSuggestions && risk.actionableSuggestions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('ddm.whatToDoNext')}</h3>
          <div className="space-y-2">
            {risk.recommendedActions.map((action, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400">{i + 1}</span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Flow History + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CashFlowHistory cashflows={cashflowHistory} />
        <ForecastChart forecasts={forecasts} sector={enterprise.sector} />
      </div>

      {/* Household Financial Picture */}
      {risk && (() => {
        const recentNets = cashflowHistory.slice(-6).map(c => c.inflow - c.outflow)
        const avgNetCF = recentNets.reduce((s, v) => s + v, 0) / Math.max(1, recentNets.length)
        const hv = calculateHouseholdViability(enterprise, avgNetCF)
        if (!hv) return null
        const hc = enterprise.householdContext!
        const incomeEarners = (hc.spouseIncome > 0 ? 1 : 0) + 1
        const depRatio = (hc.dependents / Math.max(1, incomeEarners)).toFixed(1)
        // Trap = enterprise DSCR looks healthy but household DSCR is distressed
        const enterpriseDSCR = avgNetCF / Math.max(1, enterprise.emiAmount)
        const householdDSCR = risk.totalMonthlyObligations > 0
          ? risk.totalHouseholdIncome / risk.totalMonthlyObligations
          : enterpriseDSCR
        const isTrap = enterpriseDSCR > 1.25 && householdDSCR < 1.0
        return (
          <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border ${isTrap ? 'border-red-200 dark:border-red-800/50' : 'border-gray-100 dark:border-gray-700/50'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className={`w-4 h-4 ${isTrap ? 'text-red-500' : 'text-blue-500'}`} />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Household Financial Picture</h3>
              {isTrap && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                  Household trap detected
                </span>
              )}
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">True Disposable Income</p>
                <p className={`text-lg font-bold ${risk.trueDisposableIncome < 0 ? 'text-red-600 dark:text-red-400' : risk.trueDisposableIncome < 5000 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {risk.trueDisposableIncomeRange[0] === risk.trueDisposableIncomeRange[1]
                    ? `₹${risk.trueDisposableIncome.toLocaleString('en-IN')}`
                    : `₹${risk.trueDisposableIncomeRange[0].toLocaleString('en-IN')} – ${risk.trueDisposableIncomeRange[1].toLocaleString('en-IN')}`}
                  <span className="text-xs font-normal">/mo</span>
                </p>
                {risk.trueDisposableIncomeRange[0] !== risk.trueDisposableIncomeRange[1] && (
                  <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-0.5">
                    Range: field verification recommended
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Debt Service</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  ₹{risk.totalMonthlyDebtService.toLocaleString('en-IN')}<span className="text-xs font-normal">/mo</span>
                </p>
                {risk.totalMonthlyDebtService > enterprise.emiAmount && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {((risk.totalMonthlyDebtService / enterprise.emiAmount - 1) * 100).toFixed(0)}% more than formal EMI alone
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Household Risk</p>
                <p className={`text-lg font-bold ${risk.householdRiskScore > 60 ? 'text-red-600 dark:text-red-400' : risk.householdRiskScore > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {risk.householdRiskScore}<span className="text-xs font-normal">/100</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dependents</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {hc.dependents}<span className="text-xs font-normal"> ({depRatio} per earner)</span>
                </p>
              </div>
            </div>

            {/* 5-Source Debt Breakdown */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Debt Sources (5-layer view)</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Formal (Bank/MFI)', value: hv.debtBreakdown.formal, color: 'bg-blue-500' },
                  { label: 'SHG Internal', value: hv.debtBreakdown.shgInternal, color: 'bg-purple-500', invisible: true },
                  { label: 'Trader Credit', value: hv.debtBreakdown.traderCredit, color: 'bg-amber-500', invisible: true },
                  { label: 'Cooperative/PACS', value: hv.debtBreakdown.cooperative, color: 'bg-teal-500' },
                  { label: 'Informal (Moneylender)', value: hv.debtBreakdown.informal, color: 'bg-red-500', invisible: true },
                ].filter(d => d.value > 0).map(d => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${d.color}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{d.label}</span>
                    {d.invisible && <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">hidden</span>}
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">₹{d.value.toLocaleString('en-IN')}/mo</span>
                  </div>
                ))}
              </div>
              {risk.totalMonthlyDebtService > enterprise.emiAmount * 1.5 && (
                <p className="text-[10px] text-red-500 dark:text-red-400 mt-2 italic">
                  Bank only sees ₹{enterprise.emiAmount.toLocaleString('en-IN')}/mo — actual burden is {((risk.totalMonthlyDebtService / enterprise.emiAmount - 1) * 100).toFixed(0)}% higher
                </p>
              )}
            </div>

            {/* Household Income Sources */}
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Income Sources</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                  Enterprise: ₹{Math.max(0, avgNetCF).toLocaleString('en-IN')}/mo
                </span>
                {hc.spouseIncome > 0 && (
                  <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded-md">
                    Spouse: ₹{hc.spouseIncome.toLocaleString('en-IN')}/mo
                  </span>
                )}
                {hc.otherHouseholdIncome > 0 && (
                  <span className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs rounded-md">
                    Other: ₹{hc.otherHouseholdIncome.toLocaleString('en-IN')}/mo
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* DPI Signals */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('ddm.dpiSignals')}</h3>
          <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-medium rounded">SIMULATED</span>
          {dpiSignals && dpiSignals.convergenceDirection === 'stress' && dpiSignals.convergenceScore > 70 && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
              {dpiSignals.convergenceScore}% convergence
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dpiSignals ? (
            <>
              {/* UPI Velocity */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('ddm.upiVelocity')}</p>
                <p className={`text-sm font-bold mt-1 ${
                  dpiSignals.upiVelocity.strength === 'strong' ? 'text-red-600 dark:text-red-400' :
                  dpiSignals.upiVelocity.strength === 'moderate' ? 'text-orange-600 dark:text-orange-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {dpiSignals.upiVelocity.delta > 0 ? '+' : ''}{dpiSignals.upiVelocity.delta}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dpiSignals.upiVelocity.source}</p>
              </div>

              {/* NACH Bounce */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('ddm.nachBounce')}</p>
                <p className={`text-sm font-bold mt-1 ${
                  dpiSignals.nachBounce.strength === 'strong' ? 'text-red-600 dark:text-red-400' :
                  dpiSignals.nachBounce.strength === 'moderate' ? 'text-orange-600 dark:text-orange-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {Math.abs(dpiSignals.nachBounce.delta)}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dpiSignals.nachBounce.source}</p>
              </div>

              {/* MGNREGA */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('ddm.mgnregaDemand')}</p>
                <p className={`text-sm font-bold mt-1 ${
                  dpiSignals.mgnrega.strength === 'strong' ? 'text-red-600 dark:text-red-400' :
                  dpiSignals.mgnrega.strength === 'moderate' ? 'text-orange-600 dark:text-orange-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {dpiSignals.mgnrega.delta > 0 ? '+' : ''}{dpiSignals.mgnrega.delta}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dpiSignals.mgnrega.source}</p>
              </div>

              {/* Mandi Prices */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('ddm.mandiPrices')}</p>
                <p className={`text-sm font-bold mt-1 ${
                  dpiSignals.mandiPrices.strength === 'strong' ? 'text-red-600 dark:text-red-400' :
                  dpiSignals.mandiPrices.strength === 'moderate' ? 'text-orange-600 dark:text-orange-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {dpiSignals.mandiPrices.delta > 0 ? '+' : ''}{dpiSignals.mandiPrices.delta}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dpiSignals.mandiPrices.source}</p>
              </div>
            </>
          ) : (
            <>
              {/* Fallback when no risk data */}
              {[
                { label: t('ddm.upiVelocity'), value: 'Simulated', detail: 'NPCI / Account Aggregator' },
                { label: t('ddm.nachBounce'), value: 'Simulated', detail: 'Simulated from DSCR' },
                { label: t('ddm.mgnregaDemand'), value: 'Simulated', detail: 'Simulated from seasonal score' },
                { label: t('ddm.mandiPrices'), value: 'Simulated', detail: 'Agmarknet / eNAM' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{s.label}</p>
                  <p className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.detail}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* DPI Signal Details */}
        {dpiSignals && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {dpiSignals.upiVelocity.detail}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed mt-1">
              {dpiSignals.nachBounce.detail}
            </p>
            {dpiSignals.convergenceDirection === 'stress' && dpiSignals.convergenceScore > 60 && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">
                ⚠️ Convergence detected: {dpiSignals.convergenceScore}% — multiple simulated indicators aligning on stress
              </p>
            )}
          </div>
        )}
      </div>

      <ModelMetricsCard />
    </div>
  )
}

// ─── Main DDMView ────────────────────────────────────────────────────────────
export function DDMView() {
  const { enterprises, setView, selectEnterprise, selectedRisk, selectedForecasts } = useStore()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')

  // Find the enterprise being viewed in detail
  const detailEnterprise = useMemo(() => {
    if (!detailId) return null
    return enterprises.find(e => e.id === detailId) || null
  }, [enterprises, detailId])

  const handleCardClick = useCallback((id: string) => {
    selectEnterprise(id)
    setDetailId(id)
  }, [selectEnterprise])

  const handleSearchSelect = useCallback((id: string) => {
    selectEnterprise(id)
    setDetailId(id)
  }, [selectEnterprise])

  const handleBack = useCallback(() => {
    setDetailId(null)
  }, [])

  // Filtered enterprises
  const filteredEnterprises = useMemo(() => {
    return enterprises.filter(e => {
      const matchSector = sectorFilter === 'all' || e.sector === sectorFilter
      const matchRisk = riskFilter === 'all' || e.risk?.riskLevel === riskFilter
      return matchSector && matchRisk
    })
  }, [enterprises, sectorFilter, riskFilter])

  // Risk distribution counts
  const riskDistribution = useMemo(() => {
    const counts = { green: 0, yellow: 0, orange: 0, red: 0 }
    enterprises.forEach(e => {
      if (e.risk?.riskLevel) counts[e.risk.riskLevel]++
    })
    return counts
  }, [enterprises])

  // Enterprises needing attention (orange/red)
  const alerts = useMemo(() => {
    return enterprises
      .filter(e => e.risk && (e.risk.riskLevel === 'red' || e.risk.riskLevel === 'orange'))
      .sort((a, b) => (b.risk?.finalScore ?? 0) - (a.risk?.finalScore ?? 0))
  }, [enterprises])

  // Summary stats
  const totalRevenue = enterprises.reduce((sum, e) => sum + e.monthlyRevenue, 0)
  const atRisk = enterprises.filter(e => e.risk && (e.risk.riskLevel === 'red' || e.risk.riskLevel === 'orange')).length
  const avgScore = enterprises.reduce((sum, e) => sum + (e.risk?.finalScore ?? 0), 0) / (enterprises.length || 1)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] transition-colors">
      {/* Header — matches landing page nav */}
      <div className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-800 dark:text-gray-200">Drishti</span>
          </a>

          <EnterpriseSearch enterprises={enterprises} onSelect={handleSearchSelect} />

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-400 font-mono hidden sm:block">NABARD Hackathon @ GFF 2026</span>
            <DarkModeToggle />
            <button
              onClick={() => setView('enterprise')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t('ddm.mobileView')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-21 pb-5">
        {detailId && detailEnterprise ? (
          /* ── Detail View (Drill-down) ──────────────────────────────────── */
          <EnterpriseDetail
            enterprise={detailEnterprise}
            risk={selectedRisk || detailEnterprise.risk}
            forecasts={selectedForecasts}
            onBack={handleBack}
          />
        ) : (
          /* ── Gallery Grid (Default) ────────────────────────────────────── */
          <div className="space-y-5">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('ddm.portfolio')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{enterprises.length}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('ddm.monitored')}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('ddm.atRisk')}</p>
                <p className={`text-2xl font-bold mt-1 ${atRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{atRisk}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('ddm.needAttention')}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('ddm.revenue')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalRevenue)}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('ddm.monthlyTotal')}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('ddm.avgScore')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{Math.round(avgScore)}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('ddm.portfolioHealth')}</p>
              </div>
            </div>

            {/* Risk Distribution Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('ddm.riskDistribution')}</h3>
                <div className="flex items-center gap-4">
                  {([
                    { level: 'green' as RiskLevel, label: t('ddm.healthy'), count: riskDistribution.green },
                    { level: 'yellow' as RiskLevel, label: t('ddm.watch'), count: riskDistribution.yellow },
                    { level: 'orange' as RiskLevel, label: t('ddm.caution'), count: riskDistribution.orange },
                    { level: 'red' as RiskLevel, label: t('ddm.critical'), count: riskDistribution.red },
                  ]).map(({ level, label, count }) => (
                    <button
                      key={level}
                      onClick={() => setRiskFilter(riskFilter === level ? 'all' : level)}
                      className={`flex items-center gap-1.5 text-xs transition-all ${
                        riskFilter === level ? 'opacity-100 font-semibold' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_HEX[level] }} />
                      <span className="text-gray-600 dark:text-gray-300">{label}</span>
                      <span className="text-gray-400 dark:text-gray-500">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {([
                  { level: 'green' as RiskLevel, count: riskDistribution.green },
                  { level: 'yellow' as RiskLevel, count: riskDistribution.yellow },
                  { level: 'orange' as RiskLevel, count: riskDistribution.orange },
                  { level: 'red' as RiskLevel, count: riskDistribution.red },
                ]).map(({ level, count }) => (
                  <div
                    key={level}
                    style={{
                      width: `${enterprises.length > 0 ? (count / enterprises.length) * 100 : 0}%`,
                      backgroundColor: RISK_HEX[level],
                    }}
                    className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
            </div>

            {/* Alerts Panel */}
            {alerts.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    {t('ddm.attention')} ({alerts.length})
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {alerts.map(e => (
                    <button
                      key={e.id}
                      onClick={() => handleCardClick(e.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-100 dark:border-red-900/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_HEX[e.risk!.riskLevel] }} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.enterpriseName}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{e.district}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          Score {e.risk!.finalScore}
                        </span>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${RISK_HEX[e.risk!.riskLevel]}20`, color: RISK_HEX[e.risk!.riskLevel] }}
                        >
                          {e.risk!.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sector Filter + Section Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('ddm.monitoredEnterprises')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {filteredEnterprises.length === enterprises.length
                    ? t('ddm.clickToView')
                    : `${t('ddm.showing')} ${filteredEnterprises.length} ${t('ddm.of')} ${enterprises.length} ${t('ddm.enterprises')}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Sector filter */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  {[
                    { value: 'all', label: t('ddm.all') },
                    { value: 'dairy', label: t('ddm.dairy') },
                    { value: 'rural_retail', label: t('ddm.retail') },
                    { value: 'poultry', label: t('ddm.poultry') },
                    { value: 'mgnrega_wages', label: t('ddm.mgnrega') },
                    { value: 'agriculture', label: t('ddm.agriculture') },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSectorFilter(value)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        sectorFilter === value
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">{t('ddm.live')}</span>
                </div>
              </div>
            </div>

            {/* Enterprise Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEnterprises.map(ent => (
                <EnterpriseCard
                  key={ent.id}
                  enterprise={ent}
                  onClick={() => handleCardClick(ent.id)}
                />
              ))}
              {filteredEnterprises.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('ddm.noMatch')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

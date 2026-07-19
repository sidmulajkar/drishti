import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, Clock, Shield, ChevronRight, Globe, Sun, Moon, Search, ArrowLeft } from 'lucide-react'
import { useStore } from '../../store'
import { RiskBadge } from '../shared/RiskBadge'
import { LayerBreakdown } from '../shared/ConfidenceLayerBadge'
import { VoiceInput } from '../shared/VoiceInput'
import { getRiskColor } from '../../lib/ml-engine'
import { calculateHouseholdViability } from '../../lib/risk-engine'
import { setLocale, getLocale, t, type Locale } from '../../lib/i18n'
import { SECTOR_CONFIGS } from '../../types'
import type { Enterprise } from '../../types'

const RISK_HEX: Record<string, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
}

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

function CashRunwayGauge({ enterprise }: { enterprise: Enterprise }) {
  const months = enterprise.savingsBalance / enterprise.monthlyExpenses
  const clampedMonths = Math.min(12, Math.max(0, months))
  const percentage = (clampedMonths / 12) * 100

  let color = 'text-emerald-600 dark:text-emerald-400'
  let bgColor = 'from-emerald-400 to-emerald-600'
  if (months < 2) { color = 'text-red-600 dark:text-red-400'; bgColor = 'from-red-400 to-red-600' }
  else if (months < 4) { color = 'text-orange-600 dark:text-orange-400'; bgColor = 'from-orange-400 to-orange-600' }
  else if (months < 6) { color = 'text-amber-600 dark:text-amber-400'; bgColor = 'from-amber-400 to-amber-600' }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <Clock className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('enterprise.cashRunway')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Months until savings are depleted</p>
        </div>
      </div>
      <div className="text-center mb-3">
        <span className={`text-5xl font-bold ${color}`}>
          {Math.round(months)}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-lg ml-1">{t('enterprise.months')}</span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${bgColor} rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        {t('enterprise.basedOn')}
      </p>
    </div>
  )
}

function RiskScoreCard({ risk }: { risk: import('../../types').RiskScore }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('enterprise.riskStatus')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">7-component weighted assessment</p>
          </div>
        </div>
        <div className="text-right">
          <RiskBadge level={risk.riskLevel} size="lg" />
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: RISK_HEX[risk.riskLevel] }}>{risk.finalScore}</p>
        </div>
      </div>

      {/* Confidence Layer Summary */}
      <div className="mb-4">
        <LayerBreakdown risk={risk} />
      </div>

      <div className="space-y-2.5 mb-4">
        {risk.reasons.slice(0, 3).map((reason, i) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: RISK_HEX[risk.riskLevel] }} />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reason}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
        {risk.recommendedActions.slice(0, 3).map((action, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="text-gray-700 dark:text-gray-300">{action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomeChart({ forecasts, sector }: { forecasts: import('../../types').Forecast[]; sector?: import('../../types').Sector }) {
  const data = forecasts.map(f => ({
    month: f.forecastMonth.slice(5),
    inflow: f.predictedInflow,
    outflow: f.predictedOutflow,
    net: f.predictedNetCashFlow,
    upper: f.upperBound,
    lower: f.lowerBound
  }))

  // Seasonal narrative
  const troughMonth = data.length > 0 ? data.reduce((min, d) => d.net < min.net ? d : min, data[0]) : null
  const peakMonth = data.length > 0 ? data.reduce((max, d) => d.net > max.net ? d : max, data[0]) : null
  const troughPct = troughMonth && peakMonth && peakMonth.net !== 0 ? Math.abs(Math.round((troughMonth.net / peakMonth.net - 1) * 100)) : 0
  const seasonalNarrative = sector === 'dairy'
    ? troughPct > 15
      ? `Dairy trough in ${troughMonth!.month} — feed costs high, milk yield dips. Build buffer before then.`
      : `Stable milk production — ${troughMonth?.month} slightly lower (${troughPct}% dip). Cooperative payments steady.`
    : sector === 'rural_retail'
    ? troughPct > 15
      ? `Retail dip in ${troughMonth!.month} — post-festival demand slump. Festival season ${peakMonth!.month} is peak.`
      : `Steady demand cycle — ${peakMonth?.month} peak season, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'poultry'
    ? troughPct > 15
      ? `Poultry dip in ${troughMonth!.month} — heat stress increases mortality, feed costs spike. Build buffer before summer.`
      : `Steady egg/broiler cycle — ${peakMonth?.month} peak demand, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'mgnrega_wages'
    ? troughPct > 15
      ? `MGNREGA lean in ${troughMonth!.month} — monsoon restricts worksite access. Peak person-days in ${peakMonth!.month}.`
      : `Steady wage flow — ${peakMonth?.month} peak demand, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : sector === 'agriculture'
    ? troughPct > 15
      ? `Agriculture dip in ${troughMonth!.month} — between harvests. ${peakMonth!.month} is harvest revenue peak.`
      : `Steady crop cycle — ${peakMonth?.month} harvest peak, ${troughMonth?.month} slightly lower (${troughPct}% dip).`
    : troughPct > 15
      ? `Forecast dip in ${troughMonth!.month} (${troughPct}% below peak). ${peakMonth!.month} is the high season.`
      : `Steady cash flow — ${peakMonth?.month} peak, ${troughMonth?.month} slightly lower (${troughPct}% dip).`

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('enterprise.forecast')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">6-month seasonal projection</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ev-inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="dark:fill-gray-400" />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} className="dark:fill-gray-400" />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#10b981" fillOpacity={0.1} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} />
            <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2.5} dot={false} name="Inflow" />
            <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Outflow" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-0.5 bg-emerald-500 rounded" /> Inflow
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-3 h-0.5 bg-red-500 rounded" /> Outflow
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">{seasonalNarrative}</p>
      </div>
    </div>
  )
}

function AlertList({ alerts }: { alerts: import('../../types').Alert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('enterprise.activeAlerts')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{alerts.length} active</p>
        </div>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 3).map(alert => (
          <div key={alert.id} className={`p-3 rounded-xl border ${getRiskColor(alert.alertLevel)} dark:border-gray-700/50`}>
            <p className="text-sm font-medium">{alert.message}</p>
            <p className="text-xs mt-1 opacity-80">{alert.recommendedAction}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EnterpriseView() {
  const { enterprises, selectedEnterprise, selectEnterprise, alerts, selectedForecasts, setView } = useStore()
  const [showList, setShowList] = useState(!selectedEnterprise)
  const [locale, setLocaleState] = useState<Locale>(getLocale())
  const [voiceText, setVoiceText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (enterprises.length > 0 && !selectedEnterprise) {
      selectEnterprise(enterprises[0].id)
    }
  }, [enterprises, selectedEnterprise, selectEnterprise])

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'hi' : 'en'
    setLocaleState(newLocale)
    setLocale(newLocale)
  }

  const enterprise = selectedEnterprise
  const enterpriseAlerts = enterprise
    ? alerts.filter(a => a.enterpriseId === enterprise.id && a.status === 'active')
    : []

  if (!enterprise) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>

  const config = SECTOR_CONFIGS[enterprise.sector]
  const risk = enterprises.find(e => e.id === enterprise.id)?.risk

  const filteredEnterprises = searchQuery
    ? enterprises.filter(e =>
        e.enterpriseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.district.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : enterprises

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] transition-colors">
      {/* Header — matches landing page nav */}
      <div className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setView('ddm')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{enterprise.enterpriseName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLocale}
              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Toggle language"
            >
              <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-18 pb-8 space-y-5">

        {/* Hero Card — enterprise info */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
                {config.icon}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{enterprise.enterpriseName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{enterprise.ownerName} · {config.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{enterprise.district}, {enterprise.state}</p>
              </div>
            </div>
            {risk && (
              <div className="text-right">
                <RiskBadge level={risk.riskLevel} />
                <p className="text-2xl font-bold font-mono mt-1" style={{ color: RISK_HEX[risk.riskLevel] }}>{risk.finalScore}</p>
              </div>
            )}
          </div>

          {/* Quick metrics */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Revenue</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">₹{enterprise.monthlyRevenue.toLocaleString('en-IN')}/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Expenses</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">₹{enterprise.monthlyExpenses.toLocaleString('en-IN')}/mo</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Loan</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{enterprise.loanOutstanding.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Enterprise Age + Sector Context */}
          {(() => {
            const ageMonths = Math.max(1, Math.round((Date.now() - new Date(enterprise.onboardingDate).getTime()) / (30 * 24 * 60 * 60 * 1000)))
            const ageConfidence = ageMonths < 6 ? 'low' : ageMonths < 12 ? 'medium' : 'high'
            const ageColors = { low: 'text-amber-600 dark:text-amber-400', medium: 'text-blue-600 dark:text-blue-400', high: 'text-emerald-600 dark:text-emerald-400' }
            return (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ageColors[ageConfidence]} bg-gray-100 dark:bg-gray-800`}>
                  {ageMonths}mo data — {ageConfidence} confidence
                </span>
                {enterprise.loanType && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {enterprise.loanType === 'kcc' ? 'KCC 4%' : enterprise.loanType === 'mfi' ? 'MFI 22-24%' : enterprise.loanType === 'term_loan' ? 'Term 10-12%' : 'Personal'}
                  </span>
                )}
                {enterprise.cooperativeName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {enterprise.cooperativeName}
                  </span>
                )}
                {enterprise.insuranceStatus && enterprise.insuranceStatus !== 'insured' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    {enterprise.sector === 'dairy' ? 'No livestock insurance' : 'No insurance'}
                  </span>
                )}
              </div>
            )
          })()}

          {/* Voice input */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <VoiceInput
              onResult={(text) => setVoiceText(text)}
              onError={(err) => console.error('Voice error:', err)}
            />
            {voiceText && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">"{voiceText}"</p>
            )}
          </div>
        </div>

        <CashRunwayGauge enterprise={enterprise} />

        {/* Savings Floor — single best predictor */}
        {risk?.savingsFloor && (() => {
          const sf = risk.savingsFloor
          const sfColors = {
            critical: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', text: 'text-red-700 dark:text-red-400', icon: 'bg-red-100 dark:bg-red-900/30' },
            alert: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', text: 'text-orange-700 dark:text-orange-400', icon: 'bg-orange-100 dark:bg-orange-900/30' },
            caution: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', text: 'text-amber-700 dark:text-amber-400', icon: 'bg-amber-100 dark:bg-amber-900/30' },
            healthy: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-700 dark:text-emerald-400', icon: 'bg-emerald-100 dark:bg-emerald-900/30' },
          }
          const c = sfColors[sf.status]
          const labels = { critical: 'CRITICAL', alert: 'ALERT', caution: 'WATCH', healthy: 'HEALTHY' }
          const bufferPct = Math.min(100, (sf.monthsOfDebtCover / 3) * 100)
          return (
            <div className={`${c.bg} rounded-2xl p-5 shadow-sm border ${c.border} transition-all hover:shadow-md hover:-translate-y-0.5`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.icon} flex items-center justify-center`}>
                  <Wallet className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Savings Buffer</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${c.text} bg-white/60 dark:bg-black/20`}>{labels[sf.status]}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Single best indicator of stress (CGAP research)</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Savings</p>
                  <p className={`text-lg font-bold ${c.text}`}>₹{enterprise.savingsBalance.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">EMI Cover</p>
                  <p className={`text-lg font-bold ${c.text}`}>{sf.monthsOfDebtCover}x</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Days Left</p>
                  <p className={`text-lg font-bold ${c.text}`}>{sf.bufferDays}d</p>
                </div>
              </div>
              <div className="h-2 bg-white/60 dark:bg-gray-800/60 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${c.text.replace('text-', 'bg-')}`} style={{ width: `${bufferPct}%` }} />
              </div>
            </div>
          )
        })()}

        {risk && <RiskScoreCard risk={risk} />}

        <IncomeChart forecasts={selectedForecasts} sector={enterprise.sector} />

        <AlertList alerts={enterpriseAlerts} />

        {/* Household Financial Picture */}
        {enterprise.householdContext && risk && (() => {
          const hc = enterprise.householdContext!
          const avgNetCF = selectedForecasts.length > 0
            ? selectedForecasts.slice(-3).reduce((s, f) => s + f.predictedNetCashFlow, 0) / 3
            : enterprise.monthlyRevenue - enterprise.monthlyExpenses
          const hv = calculateHouseholdViability(enterprise, avgNetCF)
          if (!hv) return null
          const enterpriseDSCR = avgNetCF / Math.max(1, enterprise.emiAmount)
          const householdDSCR = risk.totalMonthlyObligations > 0
            ? risk.totalHouseholdIncome / risk.totalMonthlyObligations
            : enterpriseDSCR
          const isTrap = enterpriseDSCR > 1.25 && householdDSCR < 1.0
          return (
            <div className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 ${isTrap ? 'border-red-200 dark:border-red-800/50' : 'border-gray-100 dark:border-gray-800'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${isTrap ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30'} flex items-center justify-center`}>
                  <Wallet className={`w-5 h-5 ${isTrap ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Household Picture</h3>
                    {isTrap && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
                        TRAP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">5-layer debt view across all household obligations</p>
                </div>
              </div>

              {/* True Disposable Income */}
              <div className={`p-3 rounded-xl mb-3 ${risk.trueDisposableIncome < 0 ? 'bg-red-50 dark:bg-red-900/20' : risk.trueDisposableIncome < 5000 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">True Disposable Income (all sources)</p>
                <p className={`text-xl font-bold ${risk.trueDisposableIncome < 0 ? 'text-red-600 dark:text-red-400' : risk.trueDisposableIncome < 5000 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {risk.trueDisposableIncomeRange[0] === risk.trueDisposableIncomeRange[1]
                    ? `₹${risk.trueDisposableIncome.toLocaleString('en-IN')}`
                    : `₹${risk.trueDisposableIncomeRange[0].toLocaleString('en-IN')} – ${risk.trueDisposableIncomeRange[1].toLocaleString('en-IN')}`}
                  <span className="text-xs font-normal">/mo</span>
                </p>
                {risk.trueDisposableIncomeRange[0] !== risk.trueDisposableIncomeRange[1] && (
                  <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-0.5">
                    Estimated range — field verification recommended
                  </p>
                )}
              </div>

              {/* 5-Source Debt Breakdown */}
              <div className="mb-3">
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Debt Sources</p>
                <div className="space-y-1">
                  {[
                    { label: 'Formal EMI', value: hv.debtBreakdown.formal, color: 'bg-blue-500' },
                    { label: 'SHG Internal', value: hv.debtBreakdown.shgInternal, color: 'bg-purple-500', invisible: true },
                    { label: 'Trader Credit', value: hv.debtBreakdown.traderCredit, color: 'bg-amber-500', invisible: true },
                    { label: 'Cooperative', value: hv.debtBreakdown.cooperative, color: 'bg-teal-500' },
                    { label: 'Informal', value: hv.debtBreakdown.informal, color: 'bg-red-500', invisible: true },
                  ].filter(d => d.value > 0).map(d => (
                    <div key={d.label} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${d.color}`} />
                      <span className="text-[11px] text-gray-600 dark:text-gray-400 flex-1">{d.label}</span>
                      {d.invisible && <span className="text-[9px] text-gray-400 italic">hidden</span>}
                      <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200">₹{d.value.toLocaleString('en-IN')}/mo</span>
                    </div>
                  ))}
                </div>
                {risk.totalMonthlyDebtService > enterprise.emiAmount && (
                  <p className="text-[9px] text-red-500 dark:text-red-400 mt-1.5 italic">
                    Bank sees ₹{enterprise.emiAmount.toLocaleString('en-IN')}/mo — actual is ₹{risk.totalMonthlyDebtService.toLocaleString('en-IN')}/mo ({((risk.totalMonthlyDebtService / enterprise.emiAmount - 1) * 100).toFixed(0)}% more)
                  </p>
                )}
              </div>

              {/* Household Income + Dependents */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400">HH Income</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">₹{hv.totalHouseholdIncome.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400">Dependents</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{hc.dependents}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-[9px] text-gray-500 dark:text-gray-400">HH Risk</p>
                  <p className={`text-sm font-bold ${risk.householdRiskScore > 60 ? 'text-red-600 dark:text-red-400' : risk.householdRiskScore > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {risk.householdRiskScore}
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Actionable Suggestions */}
        {risk?.actionableSuggestions && risk.actionableSuggestions.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">What to do next</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Specific, time-bound actions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {risk.actionableSuggestions.slice(0, 4).map((sug) => {
                const urgencyStyles = {
                  immediate: { border: 'border-l-red-500', bg: 'bg-red-50/50 dark:bg-red-900/10', badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                  this_week: { border: 'border-l-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-900/10', badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
                  this_month: { border: 'border-l-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
                }
                const us = urgencyStyles[sug.urgency]
                return (
                  <div key={sug.id} className={`p-3.5 rounded-xl border-l-4 ${us.border} ${us.bg}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${us.badge}`}>{sug.urgency.replace('_', ' ').toUpperCase()}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase">{sug.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 leading-snug">{sug.title}</p>
                    {sug.institution && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">→ {sug.institution}</p>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Impact: {sug.potentialImpact}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-2">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('enterprise.loanOutstanding')}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{enterprise.loanOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-2">
              <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('enterprise.savingsBalance')}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₹{enterprise.savingsBalance.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Enterprise Switcher */}
        {showList && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('enterprise.allEnterprises')}</h3>
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-400 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {filteredEnterprises.map(ent => (
                <button
                  key={ent.id}
                  onClick={() => { selectEnterprise(ent.id); setShowList(false); setSearchQuery(''); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                    ent.id === enterprise.id
                      ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{SECTOR_CONFIGS[ent.sector].icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ent.enterpriseName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ent.district}</p>
                    </div>
                  </div>
                  {ent.risk && <RiskBadge level={ent.risk.riskLevel} size="sm" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showList && (
          <button
            onClick={() => setShowList(true)}
            className="w-full py-3 text-sm text-teal-600 dark:text-teal-400 font-medium hover:bg-white dark:hover:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors"
          >
            {t('enterprise.viewAll')}
          </button>
        )}
      </div>
    </div>
  )
}

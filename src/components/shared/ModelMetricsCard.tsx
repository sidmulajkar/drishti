import { Shield, TrendingUp, AlertTriangle, BarChart3, BookOpen } from 'lucide-react'
import { rulebook } from '../../config/rulebook'

export function ModelMetricsCard() {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-2xl p-5 border border-teal-100 dark:border-teal-800/50">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        <h3 className="font-semibold text-teal-900 dark:text-teal-200">Risk Engine Methodology</h3>
        <span className="ml-auto text-xs bg-teal-100 dark:bg-teal-800/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          v{rulebook.version}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricItem
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Cash Runway"
          value="25%"
          desc="Months until savings are depleted"
          color="text-emerald-600 dark:text-emerald-400"
        />
        <MetricItem
          icon={<BarChart3 className="w-4 h-4" />}
          label="DSCR"
          value="20%"
          desc="Debt Service Coverage Ratio"
          color="text-blue-600 dark:text-blue-400"
        />
        <MetricItem
          icon={<TrendingUp className="w-4 h-4" />}
          label="Income Stability"
          value="20%"
          desc="Coefficient of Variation of income"
          color="text-purple-600 dark:text-purple-400"
        />
        <MetricItem
          icon={<Shield className="w-4 h-4" />}
          label="Seasonal"
          value="10%"
          desc="Sector-specific peak/trough periods"
          color="text-amber-600 dark:text-amber-400"
        />
        <MetricItem
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Input Costs"
          value="10%"
          desc="Feed prices, disease, climate shocks"
          color="text-rose-600 dark:text-rose-400"
        />
        <MetricItem
          icon={<BarChart3 className="w-4 h-4" />}
          label="Recovery"
          value="10%"
          desc="Udhaar (credit sales) recovery rate"
          color="text-cyan-600 dark:text-cyan-400"
        />
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-teal-700/70 dark:text-teal-300/60">
        <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>50+ rulebook rules across 5 sectors. Thresholds informed by IBEF/CRISIL sector research, CGAP MSE lending guidance, NAFIS 2022, and Stuart Rutherford financial diaries research. Weights adjust dynamically by sector. Every flag has an explainable reason and recommended action. Next review: Oct 2026.</p>
      </div>
    </div>
  )
}

function MetricItem({ icon, label, value, desc, color }: {
  icon: React.ReactNode
  label: string
  value: string
  desc: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
    </div>
  )
}

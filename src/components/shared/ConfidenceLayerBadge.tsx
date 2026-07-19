import type { DataSourceType, RiskScore } from '../../types'

interface SourceBadgeProps {
  source: DataSourceType
  size?: 'sm' | 'md'
}

const SOURCE_CONFIG: Record<DataSourceType, { label: string; dot: string; bg: string; text: string }> = {
  verified: {
    label: 'VERIFIED',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  reported: {
    label: 'REPORTED',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  estimated: {
    label: 'ESTIMATED',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-400',
  },
}

export function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {size === 'md' ? config.label : config.label[0]}
    </span>
  )
}

interface LayerBreakdownProps {
  risk: RiskScore
}

export function LayerBreakdown({ risk }: LayerBreakdownProps) {
  const { layerSummary, divergence } = risk

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <span>Data Confidence Layers</span>
        {divergence === 'significant_divergence' && (
          <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-semibold">
            LAYERS DIVERGE — VERIFY
          </span>
        )}
        {divergence === 'mild_divergence' && (
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs">
            Minor divergence
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">EXTERNAL</span>
          </div>
          <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300">{layerSummary.external.score}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">{layerSummary.external.signalCount} signals</div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">ENTERPRISE</span>
          </div>
          <div className="text-xl font-bold text-amber-900 dark:text-amber-300">{layerSummary.reported.score}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">{layerSummary.reported.dataPoints} data points</div>
        </div>

        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">HOUSEHOLD</span>
          </div>
          <div className="text-lg font-bold text-orange-900 dark:text-orange-300">
            {layerSummary.estimated.scoreRange[0] === layerSummary.estimated.scoreRange[1]
              ? layerSummary.estimated.scoreRange[0].toLocaleString('en-IN')
              : `${layerSummary.estimated.scoreRange[0].toLocaleString('en-IN')}–${layerSummary.estimated.scoreRange[1].toLocaleString('en-IN')}`}
          </div>
          <div className="text-[11px] text-orange-600 dark:text-orange-500 mt-0.5">estimated range</div>
        </div>
      </div>

      {divergence === 'significant_divergence' && (
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 text-sm text-orange-700 dark:text-orange-400">
          External environment looks stable but household context suggests stress.
          <span className="font-semibold"> Recommend field verification of household debt structure.</span>
        </div>
      )}

      {layerSummary.estimated.assumptions.length > 0 && (
        <div className="text-[11px] text-gray-400 dark:text-gray-500 space-y-1">
          {layerSummary.estimated.assumptions.map((a, i) => (
            <div key={i}>~ {a}</div>
          ))}
        </div>
      )}
    </div>
  )
}

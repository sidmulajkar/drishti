import type { RiskLevel } from '../../types'
import { getRiskColor, getRiskLabel } from '../../lib/ml-engine'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function RiskBadge({ level, size = 'md', showLabel = true }: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'w-2 h-2 rounded-full',
    md: 'w-3 h-3 rounded-full',
    lg: 'w-4 h-4 rounded-full'
  }

  const dotColor = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(level)}`}>
      <span className={`${sizeClasses[size]} ${dotColor[level]}`} />
      {showLabel && getRiskLabel(level)}
    </span>
  )
}

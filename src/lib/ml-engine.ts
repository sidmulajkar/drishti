import type { RiskLevel } from '../types'

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'green': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'yellow': return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'orange': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'red': return 'text-red-600 bg-red-50 border-red-200'
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'green': return 'Healthy'
    case 'yellow': return 'Watch'
    case 'orange': return 'Warning'
    case 'red': return 'Critical'
  }
}

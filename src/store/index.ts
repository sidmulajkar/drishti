import { create } from 'zustand'
import type { Enterprise, RiskScore, Forecast, Alert, Sector, RiskLevel } from '../types'
import { db, getAllEnterprisesWithLatestRisk } from '../data/db'

interface AppState {
  initialized: boolean
  enterprises: (Enterprise & { risk?: RiskScore })[]
  selectedEnterprise: Enterprise | null
  selectedRisk: RiskScore | null
  selectedForecasts: Forecast[]
  alerts: Alert[]
  filterSector: Sector | 'all'
  filterRisk: RiskLevel | 'all'
  view: 'enterprise' | 'ddm'
  darkMode: boolean

  initialize: () => Promise<void>
  selectEnterprise: (id: string) => Promise<void>
  setFilterSector: (sector: Sector | 'all') => void
  setFilterRisk: (level: RiskLevel | 'all') => void
  setView: (view: 'enterprise' | 'ddm') => void
  toggleDarkMode: () => void
  acknowledgeAlert: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set) => ({
  initialized: false,
  enterprises: [],
  selectedEnterprise: null,
  selectedRisk: null,
  selectedForecasts: [],
  alerts: [],
  filterSector: 'all',
  filterRisk: 'all',
  view: 'ddm',
  darkMode: localStorage.getItem('drishti-dark') === 'true',

  initialize: async () => {
    const enterprises = await getAllEnterprisesWithLatestRisk()
    const alerts = await db.alerts.toArray()

    set({ enterprises, alerts, initialized: true })
  },

  selectEnterprise: async (id: string) => {
    const enterprise = await db.enterprises.get(id)
    if (!enterprise) return

    const risk = await db.riskScores
      .where('enterpriseId')
      .equals(id)
      .last()

    const forecasts = await db.forecasts
      .where('enterpriseId')
      .equals(id)
      .toArray()

    set({
      selectedEnterprise: enterprise,
      selectedRisk: risk || null,
      selectedForecasts: forecasts.sort((a, b) =>
        a.forecastMonth.localeCompare(b.forecastMonth)
      )
    })
  },

  setFilterSector: (sector) => set({ filterSector: sector }),
  setFilterRisk: (level) => set({ filterRisk: level }),
  setView: (view) => set({ view }),

  toggleDarkMode: () => {
    set((state) => {
      const next = !state.darkMode
      localStorage.setItem('drishti-dark', String(next))
      if (next) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return { darkMode: next }
    })
  },

  acknowledgeAlert: async (id: string) => {
    await db.alerts.update(id, { status: 'acknowledged' })
    const alerts = await db.alerts.toArray()
    set({ alerts })
  }
}))

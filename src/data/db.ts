import Dexie, { type Table } from 'dexie'
import type { Enterprise, CashFlowRecord, Forecast, RiskScore, Alert, SyncEvent } from '../types'

class DrishtiDB extends Dexie {
  enterprises!: Table<Enterprise>
  cashflows!: Table<CashFlowRecord>
  forecasts!: Table<Forecast>
  riskScores!: Table<RiskScore>
  alerts!: Table<Alert>
  syncQueue!: Table<SyncEvent>

  constructor() {
    super('drishti-db-v4')
    this.version(1).stores({
      enterprises: 'id, sector, district, block, shgId, pacsId',
      cashflows: 'id, enterpriseId, [enterpriseId+month]',
      forecasts: 'id, enterpriseId, [enterpriseId+forecastMonth]',
      riskScores: 'id, enterpriseId, [enterpriseId+periodMonth]',
      alerts: 'id, enterpriseId, alertLevel, status',
      syncQueue: 'id, entityType, syncStatus'
    })
  }
}

export const db = new DrishtiDB()

export async function getEnterpriseWithRisk(id: string) {
  const enterprise = await db.enterprises.get(id)
  if (!enterprise) return null

  const latestRisk = await db.riskScores
    .where('enterpriseId')
    .equals(id)
    .last()

  const forecasts = await db.forecasts
    .where('enterpriseId')
    .equals(id)
    .toArray()

  const cashflows = await db.cashflows
    .where('enterpriseId')
    .equals(id)
    .sortBy('month')

  return { enterprise, latestRisk, forecasts, cashflows }
}

export async function getAllEnterprisesWithLatestRisk() {
  const enterprises = await db.enterprises.toArray()
  const results = []

  for (const ent of enterprises) {
    const latestRisk = await db.riskScores
      .where('enterpriseId')
      .equals(ent.id)
      .last()
    results.push({ ...ent, risk: latestRisk })
  }

  return results
}

export async function getAlertsByLevel(level?: string) {
  if (level) {
    return db.alerts.where('alertLevel').equals(level).toArray()
  }
  return db.alerts.toArray()
}



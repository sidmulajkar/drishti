import { useState } from 'react'
import { X, Save, ArrowRight } from 'lucide-react'
import { useStore } from '../../store'
import { db } from '../../data/db'
import { calculateRisk, forecastCashFlow } from '../../lib/risk-engine'
import { SECTOR_CONFIGS } from '../../types'
import type { Enterprise } from '../../types'

interface DataEntryFormProps {
  enterprise: Enterprise
  onClose: () => void
}

export function DataEntryForm({ enterprise, onClose }: DataEntryFormProps) {
  const { initialize } = useStore()
  const [step, setStep] = useState<'income' | 'loans' | 'done'>('income')
  const [saving, setSaving] = useState(false)

  const [monthlyRevenue, setMonthlyRevenue] = useState(String(enterprise.monthlyRevenue))
  const [monthlyExpenses, setMonthlyExpenses] = useState(String(enterprise.monthlyExpenses))
  const [savingsBalance, setSavingsBalance] = useState(String(enterprise.savingsBalance))
  const [loanOutstanding, setLoanOutstanding] = useState(String(enterprise.loanOutstanding))
  const [emiAmount, setEmiAmount] = useState(String(enterprise.emiAmount))

  const config = SECTOR_CONFIGS[enterprise.sector]

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = {
        monthlyRevenue: Number(monthlyRevenue) || enterprise.monthlyRevenue,
        monthlyExpenses: Number(monthlyExpenses) || enterprise.monthlyExpenses,
        savingsBalance: Number(savingsBalance) || enterprise.savingsBalance,
        loanOutstanding: Number(loanOutstanding) || enterprise.loanOutstanding,
        emiAmount: Number(emiAmount) || enterprise.emiAmount,
      }

      await db.enterprises.update(enterprise.id, updates)

      // Re-calculate risk with updated data
      const cashflows = await db.cashflows
        .where('enterpriseId')
        .equals(enterprise.id)
        .toArray()

      // Get previous score for velocity tracking
      const previousRisk = await db.riskScores
        .where('enterpriseId')
        .equals(enterprise.id)
        .last()
      const previousScore = previousRisk?.finalScore

      const updatedEnterprise = { ...enterprise, ...updates }
      const newRisk = calculateRisk(updatedEnterprise, cashflows, previousScore)
      await db.riskScores.put(newRisk)

      const newForecasts = forecastCashFlow(updatedEnterprise, cashflows)
      for (const f of newForecasts) {
        await db.forecasts.put({
          id: `forecast-${enterprise.id}-${f.month}`,
          enterpriseId: enterprise.id,
          forecastMonth: f.month,
          predictedInflow: f.predictedInflow,
          predictedOutflow: f.predictedOutflow,
          predictedNetCashFlow: f.predictedNet,
          lowerBound: f.lowerBound,
          upperBound: f.upperBound,
          confidence: f.confidence as 'high' | 'medium' | 'low',
        })
      }

      // Refresh store
      await initialize()
      setStep('done')
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center sm:items-center">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <Save className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Data Updated</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Risk score and forecast have been recalculated
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
          >
            View Updated Analysis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center sm:items-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              {step === 'income' ? 'Update Financials' : 'Update Loans'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {config.icon} {enterprise.enterpriseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {step === 'income' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Monthly Revenue (₹)
                </label>
                <input
                  type="number"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Current: ₹{enterprise.monthlyRevenue.toLocaleString('en-IN')}/mo
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Current: ₹{enterprise.monthlyExpenses.toLocaleString('en-IN')}/mo
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Savings Balance (₹)
                </label>
                <input
                  type="number"
                  value={savingsBalance}
                  onChange={(e) => setSavingsBalance(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Current: ₹{enterprise.savingsBalance.toLocaleString('en-IN')}
                </p>
              </div>

              <button
                onClick={() => setStep('loans')}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                Next: Loans <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'loans' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Loan Outstanding (₹)
                </label>
                <input
                  type="number"
                  value={loanOutstanding}
                  onChange={(e) => setLoanOutstanding(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Current: ₹{enterprise.loanOutstanding.toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Monthly EMI (₹)
                </label>
                <input
                  type="number"
                  value={emiAmount}
                  onChange={(e) => setEmiAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Current: ₹{enterprise.emiAmount.toLocaleString('en-IN')}/mo
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('income')}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save & Recalculate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

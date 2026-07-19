import { useEffect } from 'react'
import { useStore } from './store'
import { seedMockData } from './data/mockData'
import { EnterpriseView } from './components/enterprise/EnterpriseView'
import { DDMView } from './components/dashboard/DDMView'

function App() {
  const { initialized, initialize, view, darkMode } = useStore()

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    async function init() {
      await seedMockData()
      await initialize()
    }
    init()
  }, [initialize])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading Drishti...</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Initializing risk engine</p>
        </div>
      </div>
    )
  }

  return view === 'ddm' ? <DDMView /> : <EnterpriseView />
}

export default App

import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import LiveMonitoring from './pages/LiveMonitoring'
import Analytics from './pages/Analytics'
import EventHistory from './pages/EventHistory'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live" element={<LiveMonitoring />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<EventHistory />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}


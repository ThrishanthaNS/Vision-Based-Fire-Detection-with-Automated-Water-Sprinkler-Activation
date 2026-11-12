import { BarChart3, Flame, Ruler, Gauge, TrendingUp } from 'lucide-react';
import { useTelemetryContext } from '../components/layout/Layout';
import DetectionChart from '../components/charts/DetectionChart';
import DistanceChart from '../components/charts/DistanceChart';
import PressureChart from '../components/charts/PressureChart';

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold text-white tabular-nums">{value ?? '—'}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const {
    telemetryHistory,
    fireDetectionHistory,
    distanceHistory,
    pressureHistory,
  } = useTelemetryContext();

  const totalFrames = telemetryHistory.length;
  const fireEvents = telemetryHistory.filter(t => t.fire_detected).length;
  const avgConfidence = telemetryHistory.length > 0
    ? (telemetryHistory.reduce((s, t) => s + (t.confidence || 0), 0) / telemetryHistory.length * 100).toFixed(1)
    : null;
  const avgDistance = telemetryHistory.filter(t => t.distance_m > 0).length > 0
    ? (telemetryHistory.filter(t => t.distance_m > 0).reduce((s, t) => s + t.distance_m, 0) /
        telemetryHistory.filter(t => t.distance_m > 0).length).toFixed(2)
    : null;
  const avgPressure = telemetryHistory.filter(t => t.estimated_pressure_bar > 0).length > 0
    ? (telemetryHistory.filter(t => t.estimated_pressure_bar > 0).reduce((s, t) => s + t.estimated_pressure_bar, 0) /
        telemetryHistory.filter(t => t.estimated_pressure_bar > 0).length).toFixed(2)
    : null;

  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h1 className="text-lg font-bold text-white">Analytics</h1>
        <span className="text-xs text-gray-500 ml-2">Last {totalFrames} frames</span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Fire Events" value={fireEvents} unit="" color="text-red-400" />
        <StatCard icon={TrendingUp} label="Avg Confidence" value={avgConfidence} unit="%" color="text-purple-400" />
        <StatCard icon={Ruler} label="Avg Distance" value={avgDistance} unit="m" color="text-blue-400" />
        <StatCard icon={Gauge} label="Avg Pressure" value={avgPressure} unit="bar" color="text-orange-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Detection Confidence" icon={Flame}>
          <DetectionChart data={fireDetectionHistory} />
        </ChartCard>
        <ChartCard title="LiDAR Distance" icon={Ruler}>
          <DistanceChart data={distanceHistory} />
        </ChartCard>
        <ChartCard title="Estimated Pressure" icon={Gauge}>
          <PressureChart data={pressureHistory} />
        </ChartCard>
      </div>
    </div>
  );
}


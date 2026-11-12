import { Gauge, Info, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3142] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-mono text-orange-400">
          {p.value?.toFixed(2)} bar
        </p>
      ))}
    </div>
  );
}

export default function PressurePanel({ telemetry, pressureHistory = [] }) {
  const t = telemetry;
  const pressureBar = t?.estimated_pressure_bar;
  const pressurePsi = t?.estimated_pressure_psi;
  const distance = t?.distance_m;

  const chartData = pressureHistory.slice(-60).map((item, idx) => ({
    name: idx.toString(),
    pressure: item.estimated_pressure_bar,
  }));

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-orange-400" />
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-200">
            Estimated Pressure
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
          <Info className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-medium text-blue-400">Calculated — Not Measured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - Values */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Fire Distance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-bold text-white tabular-nums">
                {distance != null ? distance.toFixed(2) : '—'}
              </span>
              <span className="text-sm text-gray-400">m</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#252b3b]">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Pressure</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-bold text-orange-400 tabular-nums">
                  {pressureBar != null ? pressureBar.toFixed(2) : '—'}
                </span>
                <span className="text-xs text-gray-400">bar</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#252b3b]">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">PSI</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-bold text-orange-400 tabular-nums">
                  {pressurePsi != null ? pressurePsi.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-gray-400">PSI</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
            <p className="text-[10px] text-yellow-400/80 leading-tight">
              Placeholder formula — pending calibration with actual hardware measurements
            </p>
          </div>
        </div>

        {/* Right - Chart */}
        <div className="lg:col-span-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Pressure Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
              <XAxis dataKey="name" hide />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `${v}`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


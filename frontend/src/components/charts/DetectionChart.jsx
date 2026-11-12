import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3142] rounded-lg px-3 py-2 shadow-xl">
      <p className={`text-xs font-semibold ${d.fire_detected ? 'text-red-400' : 'text-green-400'}`}>
        {d.fire_detected ? '🔥 Fire Detected' : '✓ Clear'}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        Confidence: {(d.confidence * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export default function DetectionChart({ data = [] }) {
  const chartData = data.slice(-100).map((item, idx) => ({
    name: idx,
    confidence: item.confidence ?? 0,
    fire_detected: item.fire_detected,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
        <XAxis dataKey="name" hide />
        <YAxis
          stroke="#64748b"
          fontSize={10}
          domain={[0, 1]}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="confidence"
          stroke="#ef4444"
          fill="url(#confGrad)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#ef4444' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}


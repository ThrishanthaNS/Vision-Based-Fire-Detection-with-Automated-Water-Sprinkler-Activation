import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3142] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-mono text-blue-400">
        {payload[0].value?.toFixed(2)} m
      </p>
    </div>
  );
}

export default function DistanceChart({ data = [] }) {
  const chartData = data.slice(-100).map((item, idx) => ({
    name: idx,
    distance_m: item.distance_m ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
        <XAxis dataKey="name" hide />
        <YAxis
          stroke="#64748b"
          fontSize={10}
          tickFormatter={(v) => `${v}m`}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="distance_m"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#3b82f6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}


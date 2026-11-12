export default function MetricValue({ value, unit, label, className = '' }) {
  return (
    <div className={`${className}`}>
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold text-white tabular-nums">
          {value ?? '—'}
        </span>
        {unit && (
          <span className="text-sm font-medium text-gray-400">{unit}</span>
        )}
      </div>
    </div>
  );
}


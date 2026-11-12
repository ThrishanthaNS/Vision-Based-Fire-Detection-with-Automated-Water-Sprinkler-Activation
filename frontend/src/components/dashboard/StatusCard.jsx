import StatusIndicator from '../common/StatusIndicator';

export default function StatusCard({ title, value, subtitle, icon: Icon, status = 'normal', unit, loading }) {
  const borderColors = {
    normal: 'border-l-green-500',
    warning: 'border-l-orange-500',
    danger: 'border-l-red-500',
    offline: 'border-l-gray-600',
  };

  const iconColors = {
    normal: 'text-green-400',
    warning: 'text-orange-400',
    danger: 'text-red-400',
    offline: 'text-gray-500',
  };

  const glowEffects = {
    normal: '',
    warning: 'glow-orange',
    danger: 'glow-red',
    offline: '',
  };

  return (
    <div
      className={`bg-[#1a1f2e] rounded-xl border border-[#2a3142] border-l-4 ${borderColors[status]} p-5 transition-all duration-300 hover:border-[#3a4256] ${status === 'danger' ? glowEffects[status] : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColors[status]}`} />}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </span>
        </div>
        <StatusIndicator status={status} size="sm" />
      </div>

      {loading ? (
        <div className="h-10 flex items-center">
          <div className="w-24 h-6 bg-[#252b3b] rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-bold text-white tabular-nums leading-tight">
            {value ?? '—'}
          </span>
          {unit && (
            <span className="text-sm font-medium text-gray-400">{unit}</span>
          )}
        </div>
      )}

      {subtitle && (
        <p className="text-xs text-gray-500 mt-2 leading-tight">{subtitle}</p>
      )}
    </div>
  );
}


export default function StatusIndicator({ status = 'offline', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    normal: 'bg-green-500',
    danger: 'bg-red-500',
    warning: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  const glowClasses = {
    normal: 'shadow-[0_0_8px_rgba(34,197,94,0.6)]',
    danger: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    warning: 'shadow-[0_0_8px_rgba(234,179,8,0.6)]',
    offline: '',
  };

  return (
    <span className="relative inline-flex">
      <span
        className={`${sizeClasses[size]} ${colorClasses[status]} ${glowClasses[status]} rounded-full inline-block`}
      />
      {status !== 'offline' && (
        <span
          className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses[status]} rounded-full animate-ping opacity-40`}
        />
      )}
    </span>
  );
}


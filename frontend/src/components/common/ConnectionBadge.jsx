import { Wifi, WifiOff } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

export default function ConnectionBadge({ connected, label = 'System' }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#252b3b] border border-[#2a3142]">
      <StatusIndicator status={connected ? 'normal' : 'danger'} size="sm" />
      {connected ? (
        <Wifi className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-red-400" />
      )}
      <span className={`text-xs font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
        {label}: {connected ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}


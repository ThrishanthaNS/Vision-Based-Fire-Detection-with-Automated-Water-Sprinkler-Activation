import { Brain, CheckCircle, Circle, ChevronRight } from 'lucide-react';

const STATES = [
  { key: 'MONITORING', label: 'Monitoring Environment', tag: 'SYSTEM' },
  { key: 'FIRE_DETECTED', label: 'Fire Detected', tag: 'SENSOR' },
  { key: 'SMOKE_DETECTED', label: 'Smoke Detected', tag: 'SENSOR' },
  { key: 'FIRE_CONFIRMED', label: 'Fire Confirmed', tag: 'SYSTEM' },
  { key: 'DISTANCE_ACQUIRED', label: 'Distance Measurement Acquired', tag: 'SENSOR' },
  { key: 'PRESSURE_ESTIMATED', label: 'Pressure Estimated', tag: 'SYSTEM' },
  { key: 'SUPPRESSION_SIMULATED', label: 'Suppression Simulation Initiated', tag: 'SIMULATED' },
  { key: 'SUPPRESSION_COMPLETE', label: 'Suppression Simulation Complete', tag: 'SIMULATED' },
];

const tagColors = {
  SENSOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SYSTEM: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SIMULATED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function DecisionPanel({ telemetry }) {
  const currentState = telemetry?.system_state || 'MONITORING';
  const currentIndex = STATES.findIndex(s => s.key === currentState);

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          System Decision
        </span>
      </div>

      {/* State List */}
      <div className="space-y-1.5">
        {STATES.map((state, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          return (
            <div
              key={state.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isCurrent
                  ? 'bg-orange-500/10 border border-orange-500/20'
                  : isPast
                  ? 'bg-green-500/5'
                  : 'opacity-40'
              }`}
            >
              {/* Status Icon */}
              {isPast ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : isCurrent ? (
                <div className="relative flex-shrink-0">
                  <Circle className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <div className="absolute inset-0">
                    <Circle className="w-4 h-4 text-orange-500 animate-ping opacity-30" />
                  </div>
                </div>
              ) : (
                <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
              )}

              {/* Label */}
              <span className={`text-xs font-medium flex-1 ${
                isCurrent ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {state.label}
              </span>

              {/* Tag */}
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${tagColors[state.tag]}`}>
                {state.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


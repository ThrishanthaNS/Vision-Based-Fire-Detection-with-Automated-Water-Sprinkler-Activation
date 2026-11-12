import { Flame, Wind, Ruler, Gauge, Droplets, CheckCircle, AlertTriangle } from 'lucide-react';

const STEPS = [
  { key: 'detection', label: 'Fire Detection', icon: Flame, stateKey: 'FIRE_DETECTED' },
  { key: 'smoke', label: 'Smoke Confirmation', icon: Wind, stateKey: 'SMOKE_DETECTED' },
  { key: 'distance', label: 'Distance Estimation', icon: Ruler, stateKey: 'DISTANCE_ACQUIRED' },
  { key: 'pressure', label: 'Pressure Calculation', icon: Gauge, stateKey: 'PRESSURE_ESTIMATED' },
  { key: 'suppression', label: 'Suppression Initiation', icon: Droplets, stateKey: 'SUPPRESSION_SIMULATED' },
  { key: 'complete', label: 'Suppression Complete', icon: CheckCircle, stateKey: 'SUPPRESSION_COMPLETE' },
];

const STATE_ORDER = [
  'MONITORING', 'FIRE_DETECTED', 'SMOKE_DETECTED', 'FIRE_CONFIRMED',
  'DISTANCE_ACQUIRED', 'PRESSURE_ESTIMATED', 'SUPPRESSION_SIMULATED', 'SUPPRESSION_COMPLETE'
];

export default function SuppressionTimeline({ telemetry }) {
  const currentState = telemetry?.system_state || 'MONITORING';
  const currentStateIdx = STATE_ORDER.indexOf(currentState);

  function getStepStatus(stateKey) {
    const stepIdx = STATE_ORDER.indexOf(stateKey);
    if (currentStateIdx >= stepIdx) return 'completed';
    if (currentStateIdx === stepIdx - 1) return 'active';
    return 'pending';
  }

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] p-6">
      {/* Warning Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        <p className="text-xs text-yellow-400">
          <span className="font-semibold">SIMULATION</span> — Physical suppression mechanism not implemented. 
          This section demonstrates the logical suppression sequence only.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Droplets className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          Suppression Process Timeline
        </span>
      </div>

      {/* Timeline - Horizontal on desktop, vertical on mobile */}
      <div className="hidden md:flex items-start justify-between">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.stateKey);
          const Icon = step.icon;
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {/* Icon Circle */}
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  status === 'completed'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : status === 'active'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                    : 'bg-[#252b3b] border-[#2a3142] text-gray-600'
                }`}>
                  <Icon className="w-4 h-4" />
                  {status === 'active' && (
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-20" />
                  )}
                </div>
                {/* Label */}
                <p className={`text-[10px] font-medium mt-2 text-center max-w-[80px] ${
                  status === 'completed' ? 'text-green-400' : status === 'active' ? 'text-orange-400' : 'text-gray-600'
                }`}>
                  {step.label}
                </p>
              </div>
              {/* Connecting Line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mt-5 mx-1 transition-all duration-500 ${
                  status === 'completed' ? 'bg-green-500' : 'bg-[#2a3142]'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical timeline */}
      <div className="md:hidden space-y-3">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.stateKey);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                status === 'completed'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : status === 'active'
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                  : 'bg-[#252b3b] border-[#2a3142] text-gray-600'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-xs ${
                status === 'completed' ? 'text-green-400' : status === 'active' ? 'text-orange-400' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


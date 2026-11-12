import { useRef, useEffect } from 'react';
import { Activity, Flame, ShieldCheck } from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return '--:--:--';
  }
}

export default function FrameAnalysis({ frameRecords = [], latestTelemetry }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [frameRecords.length]);

  const t = latestTelemetry;

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a3142]">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          Frame Analysis
        </span>
        <span className="ml-auto text-[10px] text-gray-500 font-mono tabular-nums">
          {frameRecords.length} records
        </span>
      </div>

      {/* Latest Frame Details */}
      {t && (
        <div className="grid grid-cols-2 gap-2 p-3 border-b border-[#2a3142] bg-[#252b3b]/30">
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Frame</p>
            <p className="text-xs font-mono text-white tabular-nums">#{t.frame_id ?? '—'}</p>
          </div>
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Detection</p>
            <p className={`text-xs font-semibold ${t.fire_detected ? 'text-red-400' : 'text-green-400'}`}>
              {t.fire_detected ? '🔥 FIRE' : '✓ CLEAR'}
            </p>
          </div>
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Confidence</p>
            <p className="text-xs font-mono text-white tabular-nums">{t.confidence != null ? (t.confidence * 100).toFixed(1) + '%' : '—'}</p>
          </div>
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Smoke</p>
            <p className={`text-xs font-semibold ${t.smoke_triggered ? 'text-orange-400' : 'text-gray-400'}`}>
              {t.smoke_triggered ? 'TRIGGERED' : 'Normal'}
            </p>
          </div>
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Distance</p>
            <p className="text-xs font-mono text-white tabular-nums">{t.distance_m != null ? t.distance_m.toFixed(2) + ' m' : '—'}</p>
          </div>
          <div className="px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">Pressure</p>
            <p className="text-xs font-mono text-white tabular-nums">{t.estimated_pressure_bar != null ? t.estimated_pressure_bar.toFixed(1) + ' bar' : '—'}</p>
          </div>
          <div className="col-span-2 px-2 py-1.5 rounded bg-[#252b3b]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500">System Decision</p>
            <p className="text-xs font-semibold text-orange-400">{t.system_state ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Frame History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-64 min-h-0">
        {frameRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <Activity className="w-8 h-8 mb-2" />
            <p className="text-xs">Waiting for frame data...</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a3142]/50">
            {frameRecords.map((record, idx) => (
              <div
                key={`${record.frame_id}-${idx}`}
                className={`flex items-center gap-2 px-3 py-1.5 text-[11px] animate-slide-in ${
                  record.fire_detected ? 'bg-red-500/5' : ''
                }`}
              >
                <span className="font-mono text-gray-500 w-12 tabular-nums">#{record.frame_id}</span>
                <span className="font-mono text-gray-500 w-16 tabular-nums">{formatTime(record.timestamp)}</span>
                {record.fire_detected ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 w-14">
                    <Flame className="w-2.5 h-2.5" /> FIRE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 w-14">
                    <ShieldCheck className="w-2.5 h-2.5" /> CLEAR
                  </span>
                )}
                <div className="flex-1 h-1.5 bg-[#252b3b] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      record.fire_detected ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(record.confidence ?? 0) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-gray-400 w-10 text-right tabular-nums">
                  {record.confidence != null ? (record.confidence * 100).toFixed(0) + '%' : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


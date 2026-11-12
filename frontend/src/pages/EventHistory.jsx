import { useState, useEffect, useCallback } from 'react';
import { History, Download, ChevronLeft, ChevronRight, Flame, ShieldCheck, Calendar } from 'lucide-react';
import { getEvents, exportEventsCSV } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

function formatDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

const PAGE_SIZE = 20;

export default function EventHistory() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await getEvents(params);
      setEvents(data.events || data || []);
      setTotal(data.total || (data.events || data || []).length);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportEventsCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fireguard-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mt-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-bold text-white">Event History</h1>
          <span className="text-xs text-gray-500 ml-1">{total} events</span>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-[#1a1f2e] rounded-xl border border-[#2a3142]">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">Filter:</span>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(0); }}
            className="px-2 py-1 rounded bg-[#252b3b] border border-[#2a3142] text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(0); }}
            className="px-2 py-1 rounded bg-[#252b3b] border border-[#2a3142] text-xs text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPage(0); }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3142] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a3142] bg-[#252b3b]">
                {['ID', 'Date / Time', 'Fire Status', 'Confidence', 'Distance', 'Pressure (bar)', 'Pressure (PSI)', 'Duration', 'State'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3142]/50">
              {loading ? (
                <tr><td colSpan={9}><LoadingSpinner message="Loading events..." /></td></tr>
              ) : error ? (
                <tr><td colSpan={9} className="p-6 text-center text-red-400 text-xs">{error}</td></tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <History className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500">No events recorded yet</p>
                    <p className="text-xs text-gray-600 mt-1">Events are logged when fire is detected or system state changes</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className={`hover:bg-[#252b3b]/50 transition-colors ${event.fire_detected ? 'bg-red-500/3' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-gray-400">#{event.id}</td>
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{formatDate(event.timestamp)}</td>
                    <td className="px-3 py-2">
                      {event.fire_detected ? (
                        <span className="flex items-center gap-1 text-red-400 font-semibold">
                          <Flame className="w-3 h-3" /> FIRE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-400">
                          <ShieldCheck className="w-3 h-3" /> Clear
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 tabular-nums">
                      {event.confidence != null ? (event.confidence * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 tabular-nums">
                      {event.distance_m != null ? event.distance_m.toFixed(2) + ' m' : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 tabular-nums">
                      {event.estimated_pressure_bar != null ? event.estimated_pressure_bar.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300 tabular-nums">
                      {event.estimated_pressure_psi != null ? event.estimated_pressure_psi.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-400 tabular-nums">
                      {event.duration_seconds != null ? event.duration_seconds.toFixed(1) + 's' : '—'}
                    </td>
                    <td className="px-3 py-2 text-orange-400 font-medium whitespace-nowrap">
                      {event.system_state || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a3142]">
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages} ({total} events)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded bg-[#252b3b] border border-[#2a3142] text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded bg-[#252b3b] border border-[#2a3142] text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


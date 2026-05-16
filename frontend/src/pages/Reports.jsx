import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_REPORTS } from '../data/demoData';

export default function Reports() {
  const navigate = useNavigate();
  const availableReports = useMemo(() => DEMO_REPORTS, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Export ready summaries, trend reports, and compliance scorecards for municipality stakeholders.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Export PDF</button>
          <button className="rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">Export Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {availableReports.map((report) => (
          <div key={report.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">{report.category}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{report.status}</span>
            </div>
            <p className="text-sm text-slate-500 mt-4">Updated {report.updated}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 inline-flex items-center justify-center rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              View details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

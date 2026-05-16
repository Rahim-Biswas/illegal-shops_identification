import { DEMO_SCHEDULE } from '../data/demoData';

export default function Scheduling() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Inspector rosters, shift planning, and on-call coverage for municipal operations.</p>
        </div>
        <button className="rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Add Shift</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inspector Roster</h2>
              <p className="text-sm text-gray-500">Daily duty status for field teams.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Live</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Inspector', 'Shift', 'Status', 'Area'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_SCHEDULE.map((row) => (
                  <tr key={row.inspector} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.inspector}</td>
                    <td className="px-4 py-3 text-slate-600">{row.shift}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        row.status === 'On Duty' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                        row.status === 'On Leave' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Coverage Summary</h2>
            <p className="text-sm text-gray-500">Shift readiness and hall coverage metrics.</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">On duty today</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">2 / 4</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">On-call backup</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">1</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Areas covered</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

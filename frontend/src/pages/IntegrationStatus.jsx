import { DEMO_INTEGRATIONS } from '../data/demoData';

export default function IntegrationStatus() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Municipality Integrations</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Monitor API syncs, property data links, and system health for connected municipal services.</p>
        </div>
        <button className="rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">Sync now</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DEMO_INTEGRATIONS.map((integration) => (
          <div key={integration.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{integration.name}</h2>
                <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                integration.status === 'Active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : integration.status === 'Scheduled'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {integration.status}
              </span>
            </div>
            <div className="mt-5 text-sm text-slate-500">
              Last synced: <span className="font-medium text-slate-900">{integration.lastSync}</span>
            </div>
            <button className="mt-6 inline-flex items-center rounded-3xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              View details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

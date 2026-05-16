import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_TASKS } from '../data/demoData';

const COLUMN_ORDER = [
  { key: 'Assigned', title: 'Assigned', color: 'bg-blue-50 text-blue-700' },
  { key: 'In Progress', title: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  { key: 'Planned', title: 'Planned', color: 'bg-slate-50 text-slate-700' },
  { key: 'Completed', title: 'Completed', color: 'bg-emerald-50 text-emerald-700' },
];

export default function CaseManagement() {
  const navigate = useNavigate();
  const groupedTasks = useMemo(() => {
    return COLUMN_ORDER.reduce((acc, column) => {
      acc[column.key] = DEMO_TASKS.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Case Management</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Manage enforcement assignments, approvals, and field routing from a single board.</p>
        </div>
        <button
          onClick={() => navigate('/map')}
          className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          View GIS Map
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {COLUMN_ORDER.map((column) => (
          <div key={column.key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{column.title}</h2>
                <p className="text-xs text-slate-500">{groupedTasks[column.key]?.length || 0} tasks</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${column.color}`}>{column.title}</span>
            </div>
            <div className="space-y-3">
              {groupedTasks[column.key]?.length === 0 ? (
                <p className="text-sm text-slate-400">No tasks</p>
              ) : groupedTasks[column.key].map((task) => (
                <article key={task.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm">{task.title}</h3>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{task.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{task.district} · {task.assignment}</p>
                  <p className="text-xs text-slate-400 mt-3">Due {task.due}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

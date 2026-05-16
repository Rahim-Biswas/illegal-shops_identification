import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import { getRoleLabel } from '../utils/helpers';
import {
  DEMO_DASHBOARD_CARDS,
  DEMO_VIOLATION_DISTRICT,
  DEMO_COMPLIANCE_TREND,
  DEMO_DETECTION_CONFIDENCE,
  DEMO_TASKS,
} from '../data/demoData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444'];

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'user';
  const roleLabel = getRoleLabel(role);

  const actionCards = useMemo(() => [
    { label: 'Open GIS Map', path: '/map', style: 'bg-blue-600' },
    { label: 'Case Board', path: '/tasks', style: 'bg-slate-600' },
    { label: 'Reports Library', path: '/reports', style: 'bg-emerald-600' },
    { label: 'Inspector Schedule', path: '/scheduling', style: 'bg-violet-600' },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{roleLabel} Dashboard</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">Real-time operational insights, violation summaries, and live workflow status for the GeoAI enforcement platform.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full sm:w-auto">
          {DEMO_DASHBOARD_CARDS.map((item) => (
            <div key={item.title} className={`rounded-3xl p-4 shadow-sm border border-gray-100 bg-gradient-to-br ${item.color}`}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Violation trend by district</h2>
              <p className="text-sm text-gray-500">Latest hotspots and inspection priority zones.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_VIOLATION_DISTRICT} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detection confidence</h2>
            <p className="text-sm text-gray-500">AI inference distribution for the latest dataset.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DEMO_DETECTION_CONFIDENCE} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} innerRadius={42} paddingAngle={4}>
                  {DEMO_DETECTION_CONFIDENCE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compliance trend</h2>
              <p className="text-sm text-gray-500">Weekly score cadence for inspected districts.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DEMO_COMPLIANCE_TREND} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Live task queue</h2>
              <p className="text-sm text-gray-500">Open assignments from today&apos;s enforcement pipeline.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{DEMO_TASKS.length} items</span>
          </div>
          <div className="space-y-3">
            {DEMO_TASKS.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{task.title}</p>
                  <span className="text-xs uppercase tracking-[0.15em] text-slate-500">{task.priority}</span>
                </div>
                <p className="text-sm text-slate-500">{task.district} · {task.assignment}</p>
                <p className="text-sm text-slate-500 mt-2">Due {task.due}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actionCards.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`${item.style} rounded-3xl p-4 text-white shadow-lg hover:opacity-95 transition-opacity`}
          >
            <p className="text-sm opacity-90">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

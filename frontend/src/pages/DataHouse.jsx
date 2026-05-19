/**
 * Data House — central hub for all data sources.
 * Shows available dataset cards and navigates to the dedicated page on click.
 */
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/store';
import {
  FiCloud, FiFileText, FiArrowRight, FiDatabase, FiLock, FiVideo, FiUpload
} from 'react-icons/fi';

const ALL_SOURCES = [
  {
    id: 'kobo',
    icon: FiCloud,
    iconBg: 'from-blue-500 to-cyan-400',
    title: 'Kobo Data',
    subtitle: 'KoboToolbox Integration',
    description:
      'Live shop inspection submissions synced from KoboToolbox. Includes inspector details, GPS coordinates, violation types, evidence photos, and export to CSV / Excel.',
    path: '/admin/kobo',
    tags: ['Inspector Reports', 'GPS', 'Photos', 'Export'],
    accentColor: 'blue',
    adminOnly: true,
  },
  {
    id: 'field',
    icon: FiFileText,
    iconBg: 'from-emerald-500 to-teal-400',
    title: 'Field Survey Data',
    subtitle: 'On-Ground Reports',
    description:
      'All field-submitted shop violation reports collected by enforcement officers. Filter, review, and manage each case through its full lifecycle.',
    path: '/complaints',
    tags: ['Violation Reports', 'Status Tracking', 'Case Lifecycle'],
    accentColor: 'emerald',
    adminOnly: false,
  },
  {
    id: 'street',
    icon: FiVideo,
    iconBg: 'from-violet-500 to-purple-400',
    title: 'Street Explorer',
    subtitle: '360° Capture Sessions',
    description:
      'Browse all collected street footage from Madinah city drives. Sessions are organised by date and route with expandable folder trees for videos and extracted frames.',
    path: '/street-data',
    tags: ['360° Video', 'Frame Extraction', 'Route Sessions', 'GPS Coverage'],
    accentColor: 'violet',
    adminOnly: false,
  },
  {
    id: 'custom-data',
    icon: FiUpload,
    iconBg: 'from-amber-500 to-orange-400',
    title: 'Custom Data Upload & View',
    subtitle: 'Excel & CSV Files',
    description:
      'Upload, view, and manage custom Excel or CSV files containing shop data. Automatically parse fields and explore tabular datasets.',
    path: '/custom-data',
    tags: ['Excel', 'CSV', 'Upload', 'Tabular Viewer'],
    accentColor: 'amber',
    adminOnly: true,
  },
];

const ACCENT = {
  blue:   { card: 'hover:border-blue-300',   badge: 'bg-blue-50 text-blue-700 border-blue-100',       btn: 'bg-blue-600 hover:bg-blue-700',   ring: 'ring-blue-200'   },
  emerald:{ card: 'hover:border-emerald-300', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', btn: 'bg-emerald-600 hover:bg-emerald-700', ring: 'ring-emerald-200' },
  violet: { card: 'hover:border-violet-300',  badge: 'bg-violet-50 text-violet-700 border-violet-100',   btn: 'bg-violet-600 hover:bg-violet-700',  ring: 'ring-violet-200'  },
  amber:  { card: 'hover:border-amber-300',   badge: 'bg-amber-50 text-amber-700 border-amber-100',      btn: 'bg-amber-600 hover:bg-amber-700',   ring: 'ring-amber-200'   },
};

export default function DataHouse() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const sources = ALL_SOURCES.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow">
            <FiDatabase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data House</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Central hub for all data sources — select a dataset to explore.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <FiDatabase size={14} className="text-slate-400" />
          {sources.length} data source{sources.length !== 1 ? 's' : ''} available
        </span>
        {!isAdmin && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <FiLock size={13} />
            Some sources require admin access
          </span>
        )}
      </div>

      {/* ── Source Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sources.map((src) => {
          const Icon   = src.icon;
          const accent = ACCENT[src.accentColor];
          return (
            <button
              key={src.id}
              onClick={() => navigate(src.path)}
              className={`group relative text-left w-full bg-white rounded-3xl border-2 border-gray-100 ${accent.card} shadow-sm hover:shadow-xl transition-all duration-200 p-7 overflow-hidden focus:outline-none focus:ring-4 ${accent.ring}`}
            >
              {/* Gradient blob in corner */}
              <div
                className={`absolute -top-6 -right-6 w-28 h-28 rounded-full bg-gradient-to-br ${src.iconBg} opacity-10 group-hover:opacity-20 transition-opacity`}
              />

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${src.iconBg} shadow mb-5`}>
                <Icon size={22} className="text-white" />
              </div>

              {/* Title & subtitle */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                {src.subtitle}
              </p>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{src.title}</h2>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                {src.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {src.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${accent.badge}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className={`inline-flex items-center gap-2 ${accent.btn} text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors`}>
                Open {src.title}
                <FiArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}

        {/* Admin-only locked card (shown to non-admins) */}
        {!isAdmin && (
          <div className="relative text-left w-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-7 opacity-60 cursor-not-allowed overflow-hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow mb-5 opacity-40">
              <FiCloud size={22} className="text-white" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">KoboToolbox Integration</p>
            <h2 className="text-xl font-bold text-gray-400 mb-3">Kobo Data</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Live KoboToolbox submissions with GPS, photos, and export tools.
            </p>
            <div className="inline-flex items-center gap-2 bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <FiLock size={14} /> Admin Access Required
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

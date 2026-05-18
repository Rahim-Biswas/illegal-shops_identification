/**
 * Street Explorer — 360° street capture sessions browser.
 * Organised by date and route, file-explorer-style UI.
 * All data is demo/mock until a real backend is wired up.
 */
import { useState, useMemo } from 'react';
import {
  FiFolder, FiFilm, FiImage, FiChevronRight,
  FiChevronDown, FiSearch, FiCalendar,
  FiClock, FiHardDrive, FiInfo, FiPlay,
  FiCamera, FiNavigation2, FiFilter,
} from 'react-icons/fi';

// ─── Demo data ────────────────────────────────────────────────────────────────
const SESSIONS = [
  {
    id: 'S2025-05-14',
    date: '2025-05-14',
    label: 'May 14, 2025',
    route: 'Al-Haram District',
    zone: 'al_haram',
    color: 'blue',
    distance: '14.2 km',
    duration: '2h 18m',
    totalFiles: 163,
    totalSize: '27.4 GB',
    status: 'complete',
    folders: [
      {
        name: 'Raw 360° Videos',
        icon: 'video',
        fileCount: 9,
        size: '19.8 GB',
        files: [
          { name: 'haram_loop_A_001.mp4', size: '2.3 GB', duration: '14:22', thumb: null },
          { name: 'haram_loop_A_002.mp4', size: '2.1 GB', duration: '13:05', thumb: null },
          { name: 'haram_loop_B_001.mp4', size: '2.4 GB', duration: '15:01', thumb: null },
          { name: 'haram_loop_B_002.mp4', size: '2.2 GB', duration: '13:48', thumb: null },
          { name: 'haram_central_001.mp4', size: '2.5 GB', duration: '15:30', thumb: null },
          { name: 'haram_central_002.mp4', size: '2.3 GB', duration: '14:10', thumb: null },
          { name: 'haram_east_001.mp4', size: '2.0 GB', duration: '12:40', thumb: null },
          { name: 'haram_west_001.mp4', size: '2.1 GB', duration: '13:22', thumb: null },
          { name: 'haram_south_001.mp4', size: '1.9 GB', duration: '11:55', thumb: null },
        ],
      },
      {
        name: 'Extracted Frames',
        icon: 'image',
        fileCount: 154,
        size: '7.6 GB',
        files: Array.from({ length: 20 }, (_, i) => ({
          name: `frame_haram_${String(i + 1).padStart(4, '0')}.jpg`,
          size: `${(48 + (i % 7)).toFixed(0)} MB`,
          thumb: null,
        })),
      },
    ],
  },
  {
    id: 'S2025-05-10',
    date: '2025-05-10',
    label: 'May 10, 2025',
    route: 'Quba District',
    zone: 'quba',
    color: 'emerald',
    distance: '9.7 km',
    duration: '1h 42m',
    totalFiles: 118,
    totalSize: '18.9 GB',
    status: 'complete',
    folders: [
      {
        name: 'Raw 360° Videos',
        icon: 'video',
        fileCount: 6,
        size: '13.5 GB',
        files: [
          { name: 'quba_main_001.mp4', size: '2.3 GB', duration: '14:30', thumb: null },
          { name: 'quba_main_002.mp4', size: '2.1 GB', duration: '13:10', thumb: null },
          { name: 'quba_north_001.mp4', size: '2.4 GB', duration: '15:00', thumb: null },
          { name: 'quba_south_001.mp4', size: '2.2 GB', duration: '14:00', thumb: null },
          { name: 'quba_east_001.mp4', size: '2.5 GB', duration: '15:30', thumb: null },
          { name: 'quba_west_001.mp4', size: '2.0 GB', duration: '12:30', thumb: null },
        ],
      },
      {
        name: 'Extracted Frames',
        icon: 'image',
        fileCount: 112,
        size: '5.4 GB',
        files: Array.from({ length: 15 }, (_, i) => ({
          name: `frame_quba_${String(i + 1).padStart(4, '0')}.jpg`,
          size: `${(44 + (i % 9)).toFixed(0)} MB`,
          thumb: null,
        })),
      },
    ],
  },
  {
    id: 'S2025-05-06',
    date: '2025-05-06',
    label: 'May 6, 2025',
    route: 'Aziziyah District',
    zone: 'aziziyah',
    color: 'violet',
    distance: '11.3 km',
    duration: '1h 58m',
    totalFiles: 134,
    totalSize: '22.1 GB',
    status: 'complete',
    folders: [
      {
        name: 'Raw 360° Videos',
        icon: 'video',
        fileCount: 7,
        size: '15.8 GB',
        files: Array.from({ length: 7 }, (_, i) => ({
          name: `aziziyah_route${i + 1}_001.mp4`,
          size: `${(2.0 + i * 0.15).toFixed(1)} GB`,
          duration: `${13 + i}:${String(i * 7 % 60).padStart(2, '0')}`,
          thumb: null,
        })),
      },
      {
        name: 'Extracted Frames',
        icon: 'image',
        fileCount: 127,
        size: '6.3 GB',
        files: Array.from({ length: 12 }, (_, i) => ({
          name: `frame_aziz_${String(i + 1).padStart(4, '0')}.jpg`,
          size: `${(46 + (i % 8)).toFixed(0)} MB`,
          thumb: null,
        })),
      },
    ],
  },
  {
    id: 'S2025-04-28',
    date: '2025-04-28',
    label: 'Apr 28, 2025',
    route: 'Jabal Uhud Area',
    zone: 'jabal_uhud',
    color: 'amber',
    distance: '7.8 km',
    duration: '1h 24m',
    totalFiles: 94,
    totalSize: '15.2 GB',
    status: 'processing',
    folders: [
      {
        name: 'Raw 360° Videos',
        icon: 'video',
        fileCount: 5,
        size: '11.1 GB',
        files: Array.from({ length: 5 }, (_, i) => ({
          name: `uhud_segment_${String(i + 1).padStart(3, '0')}.mp4`,
          size: `${(2.0 + i * 0.2).toFixed(1)} GB`,
          duration: `${12 + i}:${String(i * 9 % 60).padStart(2, '0')}`,
          thumb: null,
        })),
      },
      {
        name: 'Extracted Frames',
        icon: 'image',
        fileCount: 89,
        size: '4.1 GB',
        files: Array.from({ length: 10 }, (_, i) => ({
          name: `frame_uhud_${String(i + 1).padStart(4, '0')}.jpg`,
          size: `${(42 + (i % 6)).toFixed(0)} MB`,
          thumb: null,
        })),
      },
    ],
  },
  {
    id: 'S2025-04-21',
    date: '2025-04-21',
    label: 'Apr 21, 2025',
    route: 'Old City Core',
    zone: 'old_city',
    color: 'rose',
    distance: '6.4 km',
    duration: '1h 12m',
    totalFiles: 78,
    totalSize: '12.6 GB',
    status: 'complete',
    folders: [
      {
        name: 'Raw 360° Videos',
        icon: 'video',
        fileCount: 4,
        size: '9.2 GB',
        files: Array.from({ length: 4 }, (_, i) => ({
          name: `oldcity_lane_${String(i + 1).padStart(3, '0')}.mp4`,
          size: `${(2.1 + i * 0.25).toFixed(1)} GB`,
          duration: `${11 + i}:${String(i * 11 % 60).padStart(2, '0')}`,
          thumb: null,
        })),
      },
      {
        name: 'Extracted Frames',
        icon: 'image',
        fileCount: 74,
        size: '3.4 GB',
        files: Array.from({ length: 8 }, (_, i) => ({
          name: `frame_oldcity_${String(i + 1).padStart(4, '0')}.jpg`,
          size: `${(40 + (i % 5)).toFixed(0)} MB`,
          thumb: null,
        })),
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700'   },
  emerald:{ bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',icon: 'text-emerald-500',badge: 'bg-emerald-100 text-emerald-700'},
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: 'text-violet-500', badge: 'bg-violet-100 text-violet-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700'  },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   icon: 'text-rose-500',   badge: 'bg-rose-100 text-rose-700'    },
};

const STATUS_BADGE = {
  complete:   'bg-green-100 text-green-700',
  processing: 'bg-amber-100 text-amber-700',
  pending:    'bg-gray-100 text-gray-600',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FileRow({ file, type }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 rounded-lg group transition-colors cursor-pointer">
      {type === 'video'
        ? <FiFilm size={15} className="text-blue-500 flex-shrink-0" />
        : <FiImage size={15} className="text-emerald-500 flex-shrink-0" />
      }
      <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
      {file.duration && (
        <span className="text-xs text-gray-400 flex items-center gap-1 mr-3">
          <FiPlay size={10} />{file.duration}
        </span>
      )}
      <span className="text-xs text-gray-400 w-16 text-right">{file.size}</span>
    </div>
  );
}

function FolderNode({ folder, sessionColor }) {
  const [open, setOpen] = useState(false);
  const c = COLOR_MAP[sessionColor] || COLOR_MAP.blue;
  const isVideo = folder.icon === 'video';

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors group text-left"
      >
        {open ? <FiChevronDown size={14} className="text-gray-400" /> : <FiChevronRight size={14} className="text-gray-400" />}
        {open ? <FiFolder size={18} className={`${c.icon} opacity-80`} /> : <FiFolder size={18} className={c.icon} />}
        <span className="flex-1 text-sm font-medium text-gray-800">{folder.name}</span>
        <span className="text-xs text-gray-400">{folder.fileCount} files</span>
        <span className="text-xs text-gray-400 ml-3">{folder.size}</span>
      </button>
      {open && (
        <div className="ml-8 border-l border-gray-100 pl-2 mt-1">
          {folder.files.map((f, i) => (
            <FileRow key={i} file={f} type={isVideo ? 'video' : 'image'} />
          ))}
          {folder.fileCount > folder.files.length && (
            <p className="text-xs text-gray-400 px-4 py-2 italic">
              + {folder.fileCount - folder.files.length} more files…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const c = COLOR_MAP[session.color] || COLOR_MAP.blue;

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isSelected ? `${c.border} shadow-lg` : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Session header */}
      <div
        className={`flex items-center gap-3 px-5 py-4 cursor-pointer ${isSelected ? c.bg : 'bg-white'}`}
        onClick={() => { onSelect(session.id); setExpanded(!expanded); }}
      >
        {expanded
          ? <FiChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          : <FiChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        }

        {/* Route icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
          <FiCamera size={18} className={c.icon} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{session.route}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[session.status]}`}>
              {session.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1"><FiCalendar size={11} />{session.label}</span>
            <span className="flex items-center gap-1"><FiNavigation2 size={11} />{session.distance}</span>
            <span className="flex items-center gap-1"><FiClock size={11} />{session.duration}</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-sm font-semibold text-gray-800">{session.totalFiles} files</p>
          <p className="text-xs text-gray-400">{session.totalSize}</p>
        </div>
      </div>

      {/* Expanded folder tree */}
      {expanded && (
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          {session.folders.map((folder, i) => (
            <FolderNode key={i} folder={folder} sessionColor={session.color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StreetExplorer() {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');

  const totalSessions = SESSIONS.length;
  const totalFiles    = SESSIONS.reduce((a, s) => a + s.totalFiles, 0);
  const totalStorage  = '96.2 GB';
  const totalDistance = SESSIONS.reduce((a, s) => a + parseFloat(s.distance), 0).toFixed(1);

  const filtered = useMemo(() => {
    return SESSIONS.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.route.toLowerCase().includes(q) || s.label.toLowerCase().includes(q);
      const matchZone = filterZone === 'all' || s.zone === filterZone;
      return matchSearch && matchZone;
    });
  }, [search, filterZone]);

  const zones = ['all', ...new Set(SESSIONS.map((s) => s.zone))];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow">
            <FiCamera size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Street Explorer</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              360° capture sessions — Madinah city street data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <FiInfo size={13} className="text-amber-500 flex-shrink-0" />
          <span>Demo data — live sessions will appear once the capture backend is connected.</span>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Capture Sessions', value: totalSessions, icon: <FiFolder size={16} className="text-blue-500" />,     bg: 'bg-blue-50 border-blue-100' },
          { label: 'Total Files',      value: totalFiles,    icon: <FiFilm size={16} className="text-emerald-500" />,    bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Storage Used',     value: totalStorage,  icon: <FiHardDrive size={16} className="text-violet-500" />,bg: 'bg-violet-50 border-violet-100' },
          { label: 'KM Covered',       value: `${totalDistance} km`, icon: <FiNavigation2 size={16} className="text-amber-500" />, bg: 'bg-amber-50 border-amber-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-500 font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions by route or date…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Zone filter */}
        <div className="flex items-center gap-2">
          <FiFilter size={14} className="text-gray-400" />
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z === 'all' ? 'All Zones' : z.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500 self-center whitespace-nowrap">
          {filtered.length} of {totalSessions} sessions
        </div>
      </div>

      {/* ── Session list ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <FiFolder size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No sessions match your filter</p>
          </div>
        ) : (
          filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedId === session.id}
              onSelect={setSelectedId}
            />
          ))
        )}
      </div>
    </div>
  );
}

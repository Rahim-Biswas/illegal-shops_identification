/**
 * AI Lab Page — Illegal Shop AI Detection Platform
 * Proper page replacing the old modal.
 * Keeps the "Open AI Lab Platform" external link to https://aces.logicity.in/
 */
import { useState, useEffect } from 'react';
import {
  FiCpu, FiCamera, FiSearch, FiDatabase, FiTag, FiExternalLink,
  FiCheckCircle, FiClock, FiAlertCircle, FiPlay,
  FiZap, FiEye, FiMapPin, FiRefreshCw, FiImage
} from 'react-icons/fi';
import YoloDetectionModal from '../components/YoloDetectionModal';

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE = [
  {
    id: 1,
    icon: FiCamera,
    name: '360° Capture',
    desc: 'Car-mounted 360° camera collects street footage',
    status: 'done',
    detail: 'Session: Al-Haram · 14.2 km recorded',
  },
  {
    id: 2,
    icon: FiPlay,
    name: 'Frame Extraction',
    desc: 'Video decoded & frames sampled at 2 fps',
    status: 'done',
    detail: '≈ 12,400 frames extracted',
  },
  {
    id: 3,
    icon: FiSearch,
    name: 'Shop Detection',
    desc: 'YOLO v8 model identifies shop frontages',
    status: 'processing',
    detail: '7,214 / 12,400 frames processed',
  },
  {
    id: 4,
    icon: FiEye,
    name: 'OCR — Sign Reading',
    desc: 'Arabic & English text extracted from shop boards',
    status: 'queued',
    detail: 'Waiting for Detection stage',
  },
  {
    id: 5,
    icon: FiDatabase,
    name: 'License DB Matching',
    desc: 'Extracted names compared with municipal registry',
    status: 'queued',
    detail: 'Waiting for OCR stage',
  },
  {
    id: 6,
    icon: FiTag,
    name: 'Violation Classification',
    desc: 'Each shop flagged & categorised by violation type',
    status: 'queued',
    detail: 'Waiting for DB Match stage',
  },
];

// ─── Demo recent detections ───────────────────────────────────────────────────
const DEMO_DETECTIONS = [
  { id: 1, shopName: 'Al-Baraka Grocery',  zone: 'Al-Haram', confidence: 97, ocr: 'البركة للبقالة', matched: true,  violation: 'No License',          status: 'flagged' },
  { id: 2, shopName: 'Crown Electronics',  zone: 'Al-Haram', confidence: 94, ocr: 'كراون للإلكترونيات', matched: true,  violation: 'Expired License',     status: 'flagged' },
  { id: 3, shopName: 'Noor Pharmacy',      zone: 'Quba',     confidence: 91, ocr: 'نور للصيدليات',  matched: true,  violation: null,                  status: 'clear' },
  { id: 4, shopName: 'Unknown Shop #2147', zone: 'Al-Haram', confidence: 82, ocr: '[unreadable]',   matched: false, violation: 'Health Violation',    status: 'flagged' },
  { id: 5, shopName: 'Madina Sweets',      zone: 'Al-Haram', confidence: 89, ocr: 'مدينة للحلويات', matched: true,  violation: null,                  status: 'clear' },
  { id: 6, shopName: 'Al-Ameen Tailor',    zone: 'Aziziyah', confidence: 76, ocr: 'الأمين للخياطة', matched: false, violation: 'Encroachment',        status: 'flagged' },
];

// ─── Upcoming features ────────────────────────────────────────────────────────
const UPCOMING = [
  { icon: '🗺️', label: 'Zone Heatmaps',       desc: 'Density maps of violations across Madinah districts' },
  { icon: '📈', label: 'Trend Analysis',       desc: 'Week-over-week compliance scoring per route' },
  { icon: '🤖', label: 'Auto Enforcement',     desc: 'Auto-generate violation notices from AI findings' },
  { icon: '🔄', label: 'Continuous Sync',      desc: 'Real-time sync with KoboToolbox field reports' },
  { icon: '📷', label: 'Live Camera Feed',     desc: 'Stream and process footage in real-time' },
  { icon: '🔍', label: 'Advanced OCR',         desc: 'Multi-language shop name recognition & transliteration' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STAGE_STYLE = {
  done:       { bar: 'bg-green-500',  ring: 'ring-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  icon: FiCheckCircle },
  processing: { bar: 'bg-blue-500',   ring: 'ring-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: FiRefreshCw },
  queued:     { bar: 'bg-gray-300',   ring: 'ring-gray-200',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-500',   icon: FiClock },
};

function PipelineStep({ stage, index, total }) {
  const s = STAGE_STYLE[stage.status];
  const Icon  = stage.icon;
  const SIcon = s.icon;
  const isLast = index === total - 1;

  return (
    <div className="flex gap-4">
      {/* Left: icon + connector */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-4 ${s.ring} ${
          stage.status === 'done'       ? 'bg-green-500' :
          stage.status === 'processing' ? 'bg-blue-600'  : 'bg-gray-200'
        }`}>
          <Icon size={18} className="text-white" />
        </div>
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-2 min-h-[28px]" />}
      </div>

      {/* Right: content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step {stage.id}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge} flex items-center gap-1`}>
            {stage.status === 'processing' && <FiZap size={10} className="animate-pulse" />}
            {stage.status}
          </span>
        </div>
        <p className="font-semibold text-gray-900 text-sm">{stage.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{stage.desc}</p>
        <p className={`text-xs mt-1 font-medium ${s.text}`}>{stage.detail}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AiLabPage() {
  const [progress, setProgress] = useState(58);
  const [showYoloModal, setShowYoloModal] = useState(false);

  // Simulate live progress ticking
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => (p >= 62 ? 58 : p + 0.2));
    }, 800);
    return () => clearInterval(t);
  }, []);

  const flagged = DEMO_DETECTIONS.filter((d) => d.status === 'flagged').length;
  const clear   = DEMO_DETECTIONS.filter((d) => d.status === 'clear').length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
          >
            <FiCpu size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Lab</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Automated Illegal Shop Detection — Madinah City
            </p>
          </div>
        </div>

        {/* Primary CTA — existing hyperlink kept as required */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <button
            onClick={() => setShowYoloModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#2dd4bf)' }}
          >
            <FiSearch size={15} /> Open YOLO Detection
          </button>

          <a
            href="https://aces.logicity.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
          >
            <FiExternalLink size={15} /> Open AI Lab Platform
          </a>
        </div>
      </div>

      {/* ── Under-development banner ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <span className="text-2xl leading-none flex-shrink-0">🚧</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Under Active Development</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            The AI pipeline is currently being built and integrated. The cards below show the planned
            workflow with demo data. Live processing will be available in the next release.
          </p>
        </div>
      </div>

      {/* ── Live processing stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Session',    value: 'Al-Haram',        icon: <FiMapPin size={16} className="text-blue-500" />,      bg: 'bg-blue-50 border-blue-100' },
          { label: 'Frames Processed',  value: '7,214',           icon: <FiZap size={16} className="text-violet-500" />,        bg: 'bg-violet-50 border-violet-100' },
          { label: 'Shops Detected',    value: '348',             icon: <FiSearch size={16} className="text-emerald-500" />,   bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Flagged Violations',value: flagged.toString(),icon: <FiAlertCircle size={16} className="text-rose-500" />, bg: 'bg-rose-50 border-rose-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-500 font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid: pipeline + detections ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Pipeline */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Processing Pipeline</h2>
              <p className="text-sm text-gray-500">End-to-end shop detection workflow</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              <FiZap size={11} className="animate-pulse" /> Live
            </span>
          </div>

          {/* Overall progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Overall progress</span>
              <span className="font-semibold text-blue-700">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stages */}
          <div>
            {PIPELINE.map((stage, i) => (
              <PipelineStep key={stage.id} stage={stage} index={i} total={PIPELINE.length} />
            ))}
          </div>
        </div>

        {/* Recent Detections */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Detections</h2>
              <p className="text-sm text-gray-500">Latest AI-identified shops</p>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">{flagged} flagged</span>
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">{clear} clear</span>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[440px] pr-1">
            {DEMO_DETECTIONS.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border p-3 transition-colors ${
                  d.status === 'flagged'
                    ? 'border-rose-100 bg-rose-50/60'
                    : 'border-green-100 bg-green-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.shopName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-arabic">{d.ocr}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <FiMapPin size={10} />{d.zone}
                      </span>
                      <span className="text-xs text-gray-400">
                        Confidence: <strong className="text-gray-700">{d.confidence}%</strong>
                      </span>
                      {d.matched
                        ? <span className="text-xs text-emerald-600 font-medium">✓ DB matched</span>
                        : <span className="text-xs text-amber-600 font-medium">⚠ No DB match</span>
                      }
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {d.violation ? (
                      <span className="text-xs font-medium bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {d.violation}
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Compliant
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upcoming Features ── */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Features</h2>
          <p className="text-sm text-gray-500">Planned capabilities for the AI Lab roadmap</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {UPCOMING.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <span className="text-2xl leading-none flex-shrink-0">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showYoloModal && (
        <YoloDetectionModal onClose={() => setShowYoloModal(false)} />
      )}
    </div>
  );
}

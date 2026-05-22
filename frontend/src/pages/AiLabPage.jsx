/**
 * AI Lab Page — Illegal Shop AI Detection Platform
 * Three-section layout:
 *   1) Folder Explorer  (reuses MinIO tree from StreetExplorer pattern)
 *   2) OCR Process      (trigger Azure OCR on selected folder)
 *   3) Results           (display extracted text per image)
 * Keeps the "Open AI Lab Platform" external link to https://aces.logicity.in/
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiCpu, FiSearch, FiExternalLink,
  FiFolder, FiFolderMinus, FiFilm, FiImage as FiImageIcon, FiFile,
  FiChevronRight, FiChevronDown, FiHardDrive,
  FiRefreshCw, FiAlertCircle, FiPlay, FiEye,
  FiZap, FiCheckCircle, FiClock, FiFileText, FiLoader
} from 'react-icons/fi';
import YoloDetectionModal from '../components/YoloDetectionModal';
import { minioApi, ocrApi } from '../services/api';

// ─── Palette for top-level folder cards ───────────────────────────────────────
const PALETTE = [
  { bg:'bg-blue-50',    border:'border-blue-200',    icon:'text-blue-500'    },
  { bg:'bg-emerald-50', border:'border-emerald-200', icon:'text-emerald-500' },
  { bg:'bg-violet-50',  border:'border-violet-200',  icon:'text-violet-500'  },
  { bg:'bg-amber-50',   border:'border-amber-200',   icon:'text-amber-500'   },
  { bg:'bg-rose-50',    border:'border-rose-200',     icon:'text-rose-500'    },
  { bg:'bg-cyan-50',    border:'border-cyan-200',     icon:'text-cyan-500'    },
];
function palette(i) { return PALETTE[i % PALETTE.length]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const e = Math.min(Math.floor(Math.log2(b) / 10), u.length - 1);
  return `${(b / 1024 ** e).toFixed(1)} ${u[e]}`;
}
function prettyName(n = '') {
  return n.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function fileIconType(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video';
  if (['jpg','jpeg','png','webp','tiff','bmp','gif'].includes(ext)) return 'image';
  return 'file';
}

// ─── File row ─────────────────────────────────────────────────────────────────
function FileRow({ file, indent }) {
  const type = fileIconType(file.name);
  if (file.name === '.keep') return null;

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
      style={{ paddingLeft: `${indent * 16 + 8}px` }}
    >
      {type === 'video'
        ? <FiFilm size={14} className="text-blue-400 flex-shrink-0" />
        : type === 'image'
          ? <FiImageIcon size={14} className="text-emerald-400 flex-shrink-0" />
          : <FiFile size={14} className="text-gray-400 flex-shrink-0" />
      }
      <span className="flex-1 text-sm text-gray-700 truncate" title={file.name}>{file.name}</span>
      <span className="text-xs text-gray-400">{fmtBytes(file.size)}</span>
    </div>
  );
}

// ─── Recursive folder node (read-only explorer) ──────────────────────────────
function FolderNode({ node, depth, colorIndex, selectedPath, onSelect }) {
  const [open, setOpen] = useState(false);
  const c = depth === 0 ? palette(colorIndex) : null;
  const isSelected = selectedPath === node.path;
  const hasContent = node.subfolders?.length > 0 || node.files?.filter(f => f.name !== '.keep').length > 0;

  // ── TOP-LEVEL card ──
  if (depth === 0) {
    return (
      <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-indigo-400 border-indigo-300 shadow-lg' :
        open ? `${c.border} shadow-md` : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
      }`}>
        <div
          className={`flex items-center gap-3 px-5 py-4 cursor-pointer select-none group ${
            isSelected ? 'bg-indigo-50' : open ? c.bg : 'bg-white hover:bg-gray-50'
          }`}
          onClick={() => { setOpen(v => !v); onSelect(node.path); }}
        >
          {open ? <FiChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                : <FiChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
            <FiFolder size={18} className={c.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{prettyName(node.name)}</p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{node.path}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-800">{node.total_files} file{node.total_files !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-400">{fmtBytes(node.total_size)}</p>
          </div>
        </div>
        {open && (
          <div className="border-t border-gray-100 bg-white px-3 py-2 space-y-0.5">
            {!hasContent && <p className="text-sm text-gray-400 italic py-2 px-2">Empty folder.</p>}
            {node.files?.map((f, i) => <FileRow key={i} file={f} indent={0} />)}
            {node.subfolders?.map((sf) => (
              <FolderNode key={sf.path} node={sf} depth={1} colorIndex={colorIndex}
                selectedPath={selectedPath} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── INNER folder ──
  const indentPx = (depth - 1) * 16;
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 rounded-lg transition-colors cursor-pointer select-none group ${
          isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indentPx + 8}px` }}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); onSelect(node.path); }}
      >
        {open ? <FiChevronDown size={12} className="text-gray-400 flex-shrink-0" />
              : <FiChevronRight size={12} className="text-gray-400 flex-shrink-0" />}
        {open
          ? <FiFolderMinus size={15} className="text-gray-400 flex-shrink-0" />
          : <FiFolder size={15} className="text-gray-500 flex-shrink-0" />}
        <span className="flex-1 text-sm font-medium text-gray-700">{prettyName(node.name)}</span>
        <span className="text-xs text-gray-400 mr-1">{node.total_files} files</span>
        <span className="text-xs text-gray-400">{fmtBytes(node.total_size)}</span>
      </div>
      {open && (
        <div style={{ paddingLeft: `${indentPx + 24}px` }} className="border-l border-gray-100 ml-2">
          {!hasContent && <p className="text-xs text-gray-400 italic py-1 px-2">Empty</p>}
          {node.files?.map((f, i) => <FileRow key={i} file={f} indent={0} />)}
          {node.subfolders?.map(sf => (
            <FolderNode key={sf.path} node={sf} depth={depth + 1} colorIndex={colorIndex}
              selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-48" />
          <div className="h-2.5 bg-gray-100 rounded w-28" />
        </div>
        <div className="space-y-1">
          <div className="h-3.5 bg-gray-200 rounded w-16 ml-auto" />
          <div className="h-2.5 bg-gray-100 rounded w-12 ml-auto" />
        </div>
      </div>
    </div>
  );
}

// ─── OCR Step Indicator ───────────────────────────────────────────────────────
function OcrStepIndicator({ step, currentStep }) {
  const isDone = currentStep > step;
  const isActive = currentStep === step;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
      isDone ? 'bg-green-50 text-green-700 border border-green-200' :
      isActive ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' :
      'bg-gray-50 text-gray-400 border border-gray-100'
    }`}>
      {isDone ? <FiCheckCircle size={14} /> : isActive ? <FiLoader size={14} className="animate-spin" /> : <FiClock size={14} />}
      <span>{step === 1 ? 'Connecting to MinIO' : step === 2 ? 'Reading images' : 'Running Azure OCR'}</span>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function AiLabPage() {
  const [showYoloModal, setShowYoloModal] = useState(false);

  // ── Section 1: Folder Explorer state ──
  const [folders, setFolders]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [selectedPath, setSelectedPath] = useState('');

  // ── Section 2: OCR state ──
  const [ocrLoading, setOcrLoading]   = useState(false);
  const [ocrStep, setOcrStep]         = useState(0);   // 0=idle, 1,2,3=steps
  const [ocrError, setOcrError]       = useState(null);

  // ── Section 3: Results state ──
  const [ocrResults, setOcrResults]   = useState([]);
  const [expandedResult, setExpandedResult] = useState(null);

  // ── Fetch folder tree ──
  const fetchData = useCallback(async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { data } = await minioApi.listAllFolders();
      setFolders(data.folders || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load bucket data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(false); }, [fetchData]);

  // ── Filter folders ──
  const filtered = folders.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
  });

  // ── Run OCR ──
  const handleRunOcr = async () => {
    if (!selectedPath) return;
    setOcrLoading(true);
    setOcrError(null);
    setOcrResults([]);
    setOcrStep(1);

    try {
      // Simulate step progression for UX
      await new Promise(r => setTimeout(r, 400));
      setOcrStep(2);
      await new Promise(r => setTimeout(r, 400));
      setOcrStep(3);

      const { data } = await ocrApi.runFolderOcr(selectedPath);
      setOcrResults(data.results || []);
      setOcrStep(0);
    } catch (err) {
      setOcrError(err.response?.data?.detail || err.message || 'OCR processing failed.');
      setOcrStep(0);
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
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
              Automated Illegal Shop Detection &mdash; Madinah City
            </p>
          </div>
        </div>

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

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — FOLDER EXPLORER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow">
              <FiFolder size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Folder Explorer</h2>
              <p className="text-sm text-gray-500">Browse MinIO folders &amp; select one for OCR processing</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search folders by name or path..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Selected folder indicator */}
        {selectedPath && (
          <div className="mb-4 flex items-center gap-2 text-sm bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
            <FiCheckCircle size={14} className="text-indigo-500 flex-shrink-0" />
            <span className="text-indigo-700 font-medium">Selected:</span>
            <span className="text-indigo-900 font-semibold font-mono text-xs">{selectedPath}</span>
            <button
              onClick={() => setSelectedPath('')}
              className="ml-auto text-xs text-indigo-400 hover:text-indigo-700 font-semibold"
            >
              Clear
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Could not load bucket data</p>
              <p className="text-red-400 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Folder tree */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {loading
            ? [0, 1, 2, 3].map(i => <Skeleton key={i} />)
            : filtered.length === 0
              ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <FiFolder size={36} className="text-gray-200 mx-auto mb-3" />
                  {search
                    ? <p className="text-gray-500 font-medium">No folders match "<span className="font-semibold">{search}</span>"</p>
                    : <p className="text-gray-500 font-medium">No folders found in bucket.</p>
                  }
                </div>
              )
              : filtered.map((f, i) => (
                <FolderNode
                  key={f.path} node={f} depth={0} colorIndex={i}
                  selectedPath={selectedPath} onSelect={setSelectedPath}
                />
              ))
          }
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — OCR PROCESS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}
          >
            <FiEye size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">OCR Process</h2>
            <p className="text-sm text-gray-500">
              Extract Arabic &amp; English text from shop sign images using Azure Computer Vision
            </p>
          </div>
        </div>

        {/* OCR Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <FiFolder size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              readOnly
              value={selectedPath || ''}
              placeholder="Select a folder from the explorer above..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 cursor-default focus:outline-none"
            />
          </div>
          <button
            onClick={handleRunOcr}
            disabled={ocrLoading || !selectedPath}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: ocrLoading ? '#94a3b8' : 'linear-gradient(135deg,#3b82f6,#6366f1)' }}
          >
            {ocrLoading ? (
              <>
                <FiLoader size={15} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                <FiPlay size={15} /> Run OCR
              </>
            )}
          </button>
        </div>

        {/* Step indicators */}
        {ocrLoading && (
          <div className="flex flex-wrap gap-2 mb-4">
            <OcrStepIndicator step={1} currentStep={ocrStep} />
            <OcrStepIndicator step={2} currentStep={ocrStep} />
            <OcrStepIndicator step={3} currentStep={ocrStep} />
          </div>
        )}

        {/* OCR Error */}
        {ocrError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">OCR Failed</p>
              <p className="text-red-400 text-xs mt-0.5">{ocrError}</p>
            </div>
          </div>
        )}

        {/* Helpful hint */}
        {!ocrLoading && !ocrError && ocrResults.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <FiFileText size={14} className="flex-shrink-0" />
            <span>Select a folder above and click <strong>Run OCR</strong> to extract text from images.</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — RESULTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              <FiFileText size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Results</h2>
              <p className="text-sm text-gray-500">OCR-extracted text from shop sign images</p>
            </div>
          </div>
          {ocrResults.length > 0 && (
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              {ocrResults.length} image{ocrResults.length !== 1 ? 's' : ''} processed
            </span>
          )}
        </div>

        {ocrResults.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-10 text-center">
            <FiFileText size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No OCR results yet</p>
            <p className="text-gray-400 text-sm mt-1">Run the OCR process above to see extracted text here.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {ocrResults.map((r, i) => {
              const isExpanded = expandedResult === i;
              const hasText = r.text && r.text.trim().length > 0;
              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                    hasText
                      ? 'border-emerald-100 hover:border-emerald-200'
                      : 'border-amber-100 hover:border-amber-200'
                  }`}
                >
                  {/* Result header */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none ${
                      hasText ? 'bg-emerald-50/60' : 'bg-amber-50/60'
                    }`}
                    onClick={() => setExpandedResult(isExpanded ? null : i)}
                  >
                    {isExpanded
                      ? <FiChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                      : <FiChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                    <FiImageIcon size={15} className={hasText ? 'text-emerald-500' : 'text-amber-500'} />
                    <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{r.name}</span>
                    {hasText ? (
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Text found
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        No text
                      </span>
                    )}
                  </div>

                  {/* Expanded text content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-white px-4 py-3">
                      {hasText ? (
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-arabic leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                          {r.text}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No readable text was extracted from this image.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── YOLO Modal ── */}
      {showYoloModal && (
        <YoloDetectionModal onClose={() => setShowYoloModal(false)} />
      )}
    </div>
  );
}

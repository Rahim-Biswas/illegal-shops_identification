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
  FiZap, FiCheckCircle, FiClock, FiFileText, FiLoader,
  FiGrid, FiList, FiX, FiMaximize2, FiMinimize2, FiZoomIn, FiZoomOut, FiMapPin
} from 'react-icons/fi';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';

import YoloDetectionModal from '../components/YoloDetectionModal';
import { minioApi, ocrApi, customDataApi } from '../services/api';

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

// ─── Bounding box colors ─────────────────────────────────────────────────────
const BBOX_COLORS = [
  'rgba(99, 102, 241, 0.85)',   // indigo
  'rgba(16, 185, 129, 0.85)',   // emerald
  'rgba(245, 158, 11, 0.85)',   // amber
  'rgba(239, 68, 68, 0.85)',    // red
  'rgba(139, 92, 246, 0.85)',   // violet
  'rgba(6, 182, 212, 0.85)',    // cyan
  'rgba(236, 72, 153, 0.85)',   // pink
  'rgba(34, 197, 94, 0.85)',    // green
];

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

// ─── Simple Map Modal ────────────────────────────────────────────────────────
function MiniMapModal({ lat, lon, title, onClose }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    const safeLat = parseFloat(lat) || 0;
    const safeLon = parseFloat(lon) || 0;

    const point = new Feature({
      geometry: new Point(fromLonLat([safeLon, safeLat]))
    });
    
    point.setStyle(new Style({
      image: new CircleStyle({
        radius: 8,
        fill: new Fill({ color: '#ef4444' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    }));

    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features: [point] }),
      zIndex: 10
    });

    const basemap = new TileLayer({
      source: new XYZ({ url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' })
    });

    const map = new Map({
      target: mapRef.current,
      layers: [basemap, vectorLayer],
      view: new View({
        center: fromLonLat([safeLon, safeLat]),
        zoom: 18
      })
    });

    // Fix for OL map rendered inside a modal that hasn't fully painted
    setTimeout(() => {
      if (map) map.updateSize();
    }, 200);

    return () => map.setTarget(null);
  }, [lat, lon]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <FiMapPin className="text-red-400" />
            <span className="font-semibold text-sm">{title || 'Location'}</span>
            <span className="text-xs text-slate-400 ml-2">({lat}, {lon})</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><FiX size={18} /></button>
        </div>
        <div ref={mapRef} className="w-full h-[65vh] bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Image Viewer with Bounding Boxes (Modal) ─────────────────────────────────
function OcrImageViewerModal({ result, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const imgUrl = result.full_key ? minioApi.getStreamUrl(result.full_key) : null;
  const lines = result.lines || [];

  // Draw bounding boxes on canvas overlay
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const ctx = canvas.getContext('2d');

    // Match canvas to displayed image size
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showBoxes || lines.length === 0) return;

    const scaleX = rect.width / naturalSize.w;
    const scaleY = rect.height / naturalSize.h;

    lines.forEach((line, idx) => {
      if (!line.boundingPolygon || line.boundingPolygon.length < 3) return;

      const color = BBOX_COLORS[idx % BBOX_COLORS.length];
      const isHovered = hoveredLine === idx;

      ctx.beginPath();
      const points = line.boundingPolygon;
      ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * scaleX, points[i].y * scaleY);
      }
      ctx.closePath();

      // Fill
      ctx.fillStyle = isHovered
        ? color.replace(/[\d.]+\)$/, '0.25)')
        : color.replace(/[\d.]+\)$/, '0.12)');
      ctx.fill();

      // Stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      // Label
      if (isHovered) {
        const labelX = points[0].x * scaleX;
        const labelY = points[0].y * scaleY - 6;
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        const textMetrics = ctx.measureText(line.text);
        const pad = 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(labelX - pad, labelY - 14, textMetrics.width + pad * 2, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(line.text, labelX, labelY);
      }
    });
  }, [imgLoaded, showBoxes, hoveredLine, lines, naturalSize]);

  // Resize handler
  useEffect(() => {
    if (!imgLoaded) return;
    const handleResize = () => {
      if (!imgRef.current || !canvasRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      // Trigger redraw by toggling
      setHoveredLine(prev => prev);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imgLoaded]);

  const handleImgLoad = (e) => {
    setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    setImgLoaded(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)' }}
        >
          <div className="flex items-center gap-3 text-white min-w-0">
            <FiEye size={18} className="text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{result.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {lines.length} text region{lines.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBoxes(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showBoxes
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-gray-600/40 text-gray-400 border border-gray-500/30'
              }`}
            >
              <FiEye size={12} />
              {showBoxes ? 'Hide Boxes' : 'Show Boxes'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-2">
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image with canvas overlay */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-auto p-4" ref={containerRef}>
            {imgUrl ? (
              <>
                {!imgLoaded && !imgError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FiLoader size={32} className="text-gray-500 animate-spin" />
                  </div>
                )}
                {imgError && (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <FiAlertCircle size={48} />
                    <p className="text-sm">Failed to load image</p>
                  </div>
                )}
                <div className="relative inline-block">
                  <img
                    ref={imgRef}
                    src={imgUrl}
                    alt={result.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    style={{ display: imgLoaded ? 'block' : 'none' }}
                    onLoad={handleImgLoad}
                    onError={() => setImgError(true)}
                    crossOrigin="anonymous"
                  />
                  {imgLoaded && (
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 pointer-events-none rounded-lg"
                      style={{ pointerEvents: showBoxes ? 'auto' : 'none' }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <FiImageIcon size={48} />
                <p className="text-sm">No image URL available</p>
              </div>
            )}
          </div>

          {/* Detected text lines sidebar */}
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <h4 className="font-semibold text-sm text-gray-800">Detected Text Lines</h4>
              <p className="text-xs text-gray-400 mt-0.5">Hover to highlight on image</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                  <FiFileText size={28} className="mb-2 opacity-50" />
                  <p className="text-sm">No text detected</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {lines.map((line, idx) => {
                    const color = BBOX_COLORS[idx % BBOX_COLORS.length];
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          hoveredLine === idx
                            ? 'bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setHoveredLine(idx)}
                        onMouseLeave={() => setHoveredLine(null)}
                      >
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0 mt-1"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 leading-relaxed break-words font-medium" dir="auto">
                            {line.text}
                          </p>
                          {line.boundingPolygon && (
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              {line.boundingPolygon.length} points
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 mt-1">
                          #{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
  const [resultView, setResultView]   = useState('cards'); // 'cards' or 'table'
  const [viewerResult, setViewerResult] = useState(null);  // modal image viewer
  const [tableSearch, setTableSearch] = useState('');

  // ── Section 4: Data Matches state ──
  const [dataMatches, setDataMatches] = useState([]);
  const [matchingData, setMatchingData] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);

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

  // ── Search OCR in Custom Data ──
  const handleSearchData = async () => {
    if (!ocrResults.length) return;
    setMatchingData(true);
    setMatchError(null);
    try {
      const res = await customDataApi.searchOcr(ocrResults);
      setDataMatches(res.data.matches || []);
    } catch (err) {
      setMatchError(err.response?.data?.detail || err.message || 'Failed to search data files.');
    } finally {
      setMatchingData(false);
    }
  };



  // ── Filtered table results ──
  const filteredTableResults = ocrResults.filter(r => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.text || '').toLowerCase().includes(q);
  });

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
          <div className="flex items-center gap-2">
            {ocrResults.length > 0 && (
              <>
                {/* View toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setResultView('cards')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      resultView === 'cards'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiGrid size={12} /> Cards
                  </button>
                  <button
                    onClick={() => setResultView('table')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      resultView === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FiList size={12} /> Table
                  </button>
                </div>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                  {ocrResults.length} image{ocrResults.length !== 1 ? 's' : ''} processed
                </span>
              </>
            )}
          </div>
        </div>

        {ocrResults.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-10 text-center">
            <FiFileText size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No OCR results yet</p>
            <p className="text-gray-400 text-sm mt-1">Run the OCR process above to see extracted text here.</p>
          </div>
        ) : resultView === 'cards' ? (
          /* ── CARD VIEW ── */
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {ocrResults.map((r, i) => {
              const isExpanded = expandedResult === i;
              const hasText = r.text && r.text.trim().length > 0;
              const hasLines = r.lines && r.lines.length > 0;
              const imgUrl = r.full_key ? minioApi.getStreamUrl(r.full_key) : null;
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
                    {hasLines && (
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mr-1">
                        {r.lines.length} region{r.lines.length !== 1 ? 's' : ''}
                      </span>
                    )}
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

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-white">
                      {/* Image preview with bounding box view button */}
                      <div className="flex flex-col md:flex-row gap-0">
                        {/* Image thumbnail */}
                        {imgUrl && (
                          <div className="md:w-72 flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-3">
                            <div className="relative group rounded-xl overflow-hidden bg-gray-900">
                              <img
                                src={imgUrl}
                                alt={r.name}
                                className="w-full h-48 object-contain"
                                crossOrigin="anonymous"
                              />
                              <div
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setViewerResult(r); }}
                              >
                                <div className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg">
                                  <FiMaximize2 size={14} />
                                  View with Bounding Boxes
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewerResult(r); }}
                              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              <FiEye size={12} /> View Bounding Boxes
                            </button>
                          </div>
                        )}

                        {/* Text content */}
                        <div className="flex-1 p-4">
                          {hasText ? (
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-arabic leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100" dir="auto">
                              {r.text}
                            </pre>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No readable text was extracted from this image.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TABLE VIEW ── */
          <div>
            {/* Table search */}
            <div className="mb-4">
              <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search results by image name or text..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Image</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Image Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Extracted Text</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Regions</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTableResults.map((r, i) => {
                    const hasText = r.text && r.text.trim().length > 0;
                    const lineCount = r.lines?.length || 0;
                    const imgUrl = r.full_key ? minioApi.getStreamUrl(r.full_key) : null;
                    return (
                      <tr key={i} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          {imgUrl ? (
                            <div
                              className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all flex-shrink-0"
                              onClick={() => setViewerResult(r)}
                            >
                              <img
                                src={imgUrl}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <FiImageIcon size={16} className="text-gray-300" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px]" title={r.name}>
                            {r.name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700 text-sm line-clamp-2 max-w-md leading-relaxed" dir="auto" title={r.text}>
                            {hasText ? r.text : <span className="text-gray-400 italic">No text detected</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            lineCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {lineCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasText ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                              <FiCheckCircle size={10} /> Found
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                              <FiAlertCircle size={10} /> Empty
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setViewerResult(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <FiEye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTableResults.length === 0 && (
                <div className="p-8 text-center">
                  <FiSearch size={24} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No results match "<span className="font-semibold">{tableSearch}</span>"</p>
                </div>
              )}
            </div>

            {/* Table footer summary */}
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-xs text-gray-400">
                Showing {filteredTableResults.length} of {ocrResults.length} results
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {ocrResults.filter(r => r.text && r.text.trim()).length} with text
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  {ocrResults.filter(r => !r.text || !r.text.trim()).length} empty
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — DATA MATCHES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
            >
              <FiSearch size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Data Matches</h2>
              <p className="text-sm text-gray-500">Cross-reference OCR results with uploaded Excel files</p>
            </div>
          </div>
          <button
            onClick={handleSearchData}
            disabled={matchingData || ocrResults.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
          >
            {matchingData ? (
              <><FiLoader size={14} className="animate-spin" /> Searching...</>
            ) : (
              <><FiSearch size={14} /> Search Excel Files</>
            )}
          </button>
        </div>

        {matchError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Search Failed</p>
              <p className="text-red-400 text-xs mt-0.5">{matchError}</p>
            </div>
          </div>
        )}

        {dataMatches.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
            <FiHardDrive size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No matches found</p>
            <p className="text-gray-400 text-sm mt-1">Run OCR first, then click Search Excel Files.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {dataMatches.map((match, idx) => (
              <div key={idx} className="border border-amber-100 rounded-xl bg-white overflow-hidden shadow-sm">
                <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-amber-600" />
                    <span className="font-semibold text-gray-900 text-sm">{match.image_name}</span>
                  </div>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded font-medium">
                    Found in {match.matched_file}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 text-sm text-gray-700">
                  <p className="font-semibold mb-2">OCR Text:</p>
                  <p className="bg-white p-2 border border-gray-200 rounded text-xs font-arabic mb-4" dir="auto">{match.ocr_text}</p>
                  <p className="font-semibold mb-2">Matched Excel Data:</p>
                  <div className="space-y-2">
                    {match.matched_rows.map((row, rIdx) => {
                      const dateStr = row['Permit End Date (Gregorian)'] || row['License Expiry Date'];
                      let isExpired = false;
                      if (dateStr) {
                        const endDate = new Date(dateStr);
                        if (!isNaN(endDate.getTime())) {
                          isExpired = endDate < new Date();
                        }
                      }
                      
                      const lat = row['Latitude (Y)'] || row['lat'] || row['latitude'];
                      const lon = row['Longitude (X)'] || row['lon'] || row['longitude'];
                      const hasLocation = lat && lon;

                      return (
                        <div key={rIdx} className={`bg-white p-3 border rounded overflow-x-auto relative ${isExpired ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-200'}`}>
                          
                          {/* Expiry Badge & Map Button Toolbar */}
                          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                            <div>
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                                  <FiAlertCircle /> Permit Expired ({dateStr})
                                </span>
                              ) : dateStr ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                                  <FiCheckCircle /> Valid Permit ({dateStr})
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No expiry date found</span>
                              )}
                            </div>
                            
                            {hasLocation && (
                              <button
                                onClick={() => setMapLocation({ lat: parseFloat(lat), lon: parseFloat(lon), title: row['Shop Name'] || 'Shop Location' })}
                                className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                              >
                                <FiMapPin size={12} /> View on Map
                              </button>
                            )}
                          </div>

                          <table className="w-full text-xs text-left">
                            <tbody>
                              {Object.entries(row).map(([k, v], cIdx) => (
                                <tr key={cIdx} className="border-b last:border-0 border-gray-100">
                                  <th className={`py-1.5 pr-4 font-medium whitespace-nowrap ${isExpired && (k === 'Permit End Date (Gregorian)' || k === 'License Expiry Date') ? 'text-red-600' : 'text-gray-500'}`}>
                                    {k}
                                  </th>
                                  <td className={`py-1.5 font-arabic ${isExpired && (k === 'Permit End Date (Gregorian)' || k === 'License Expiry Date') ? 'text-red-700 font-bold' : ''}`} dir="auto">
                                    {v}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Image Viewer Modal ── */}
      {viewerResult && (
        <OcrImageViewerModal
          result={viewerResult}
          onClose={() => setViewerResult(null)}
        />
      )}

      {/* ── YOLO Modal ── */}
      {showYoloModal && (
        <YoloDetectionModal onClose={() => setShowYoloModal(false)} />
      )}
    </div>
  );
}

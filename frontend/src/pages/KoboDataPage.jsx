/**
 * KoboToolbox Data Page — Admin Only
 * Displays all submissions from the 'GEO AI Complaint system' KoboToolbox form.
 * Uses OpenLayers (ol) for map visualization.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { koboApi } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiRefreshCw, FiDatabase, FiMapPin, FiCalendar,
  FiAlertTriangle, FiImage, FiDownload, FiFilter, FiExternalLink,
  FiLoader, FiCloud, FiCheckCircle, FiX, FiFileText,
} from 'react-icons/fi';

// OpenLayers imports
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import 'ol/ol.css';

// ============ Helpers ============

const VIOLATION_COLORS = {
  'no license': 'bg-red-100 text-red-800 border-red-200',
  'expired license': 'bg-orange-100 text-orange-800 border-orange-200',
  'illegal construction': 'bg-amber-100 text-amber-800 border-amber-200',
  'health violation': 'bg-purple-100 text-purple-800 border-purple-200',
  'zoning violation': 'bg-blue-100 text-blue-800 border-blue-200',
  'fire safety': 'bg-rose-100 text-rose-800 border-rose-200',
  'encroachment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

const MARKER_COLORS = {
  'no license': '#ef4444',
  'expired license': '#f97316',
  'illegal construction': '#f59e0b',
  'health violation': '#8b5cf6',
  'zoning violation': '#3b82f6',
  'fire safety': '#f43f5e',
  'encroachment': '#eab308',
  default: '#6b7280',
};

function disasterBadgeClass(type) {
  const key = (type || '').toLowerCase();
  return VIOLATION_COLORS[key] || VIOLATION_COLORS.default;
}

function markerColor(type) {
  const key = (type || '').toLowerCase();
  return MARKER_COLORS[key] || MARKER_COLORS.default;
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.split('.')[0].replace('+05:30', '').replace('+00:00', '');
};

// ─── Export helpers ──────────────────────────────────────────────────────────

function submissionsToRows(submissions) {
  return submissions.map((s) => ({
    'ID':                  s.id ?? '',
    'Inspector Name':      s.inspector_name ?? '',
    'Inspector ID':        s.inspector_id ?? '',
    'Municipality Zone':   s.municipality_zone ?? '',
    'Shop Name':           s.shop_name ?? '',
    'Shop Owner':          s.shop_owner_name ?? '',
    'Contact Number':      s.contact_number ?? '',
    'License Number':      s.license_number ?? '',
    'Violation Type':      s.violation_type ?? '',
    'Violation Details':   s.violation_description ?? '',
    'Action Taken':        s.action_taken ?? '',
    'Inspection Date':     s.inspection_date ?? '',
    'Inspection Time':     formatTime(s.inspection_time),
    'Latitude':            s.latitude ?? '',
    'Longitude':           s.longitude ?? '',
    'Submitted By':        s.submitted_by ?? '',
    'Submission Time':     s.submission_time ?? '',
    'Image URL':           s.image_url ?? '',
  }));
}

/** Trigger a file download reliably across all browsers. */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  // Must be in the DOM for Firefox + some Chromium builds to honour `download`
  document.body.appendChild(a);
  a.click();
  // Revoke after a short delay so the browser has time to start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function exportCSV(submissions, filename) {
  if (!submissions.length) return;
  const rows    = submissionsToRows(submissions);
  const headers = Object.keys(rows[0]);
  const escape  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines   = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  // UTF-8 BOM (\uFEFF) so Excel opens the file without garbled characters
  const csv  = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function exportExcel(submissions, filename) {
  if (!submissions.length) return;
  const rows = submissionsToRows(submissions);
  const ws   = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KoboToolbox Data');
  // writeFile uses FileSaver internally — generates proper xlsx binary
  XLSX.writeFile(wb, filename);
}

// ============ OpenLayers Map Component ============

function KoboMap({ submissions }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const popupRef = useRef(null);
  const [popupContent, setPopupContent] = useState(null);

  const geoSubs = submissions.filter((s) => s.latitude != null && s.longitude != null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Popup overlay
    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: { animation: { duration: 250 } },
    });
    overlayRef.current = overlay;

    // Build features
    const features = geoSubs.map((sub) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([sub.longitude, sub.latitude])),
        submission: sub,
      });
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 10,
            fill: new Fill({ color: markerColor(sub.disaster_type) }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
          text: new Text({
            text: (sub.disaster_type || '?')[0].toUpperCase(),
            fill: new Fill({ color: '#fff' }),
            font: 'bold 10px sans-serif',
          }),
        })
      );
      return feature;
    });

    const vectorSource = new VectorSource({ features });
    const vectorLayer = new VectorLayer({ source: vectorSource });

    // Center on data or India default
    const center = geoSubs.length > 0
      ? fromLonLat([geoSubs[0].longitude, geoSubs[0].latitude])
      : fromLonLat([78.9629, 20.5937]);

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({
        center,
        zoom: geoSubs.length > 0 ? 9 : 5,
      }),
      overlays: [overlay],
    });

    // Click handler
    map.on('click', (evt) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const sub = feature.get('submission');
        const coord = feature.getGeometry().getCoordinates();
        overlay.setPosition(coord);
        setPopupContent(sub);
      } else {
        overlay.setPosition(undefined);
        setPopupContent(null);
      }
    });

    // Pointer cursor on hover
    map.on('pointermove', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // Fit to features if available
    if (geoSubs.length > 0) {
      map.getView().fit(vectorSource.getExtent(), {
        padding: [60, 60, 60, 60],
        maxZoom: 12,
        duration: 500,
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, [submissions]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full rounded-b-2xl" style={{ height: '500px' }} />

      {/* OL Popup element */}
      <div ref={popupRef} className="ol-popup" style={{ position: 'absolute' }}>
        {popupContent && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[220px] relative">
            <button
              onClick={() => { overlayRef.current?.setPosition(undefined); setPopupContent(null); }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={14} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${disasterBadgeClass(popupContent.violation_type || popupContent.disaster_type)}`}>
                {popupContent.violation_type || popupContent.disaster_type || 'Unknown'}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{popupContent.shop_name || 'Unknown Shop'}</p>
            <p className="text-xs text-gray-600 mt-0.5">Inspector: {popupContent.inspector_name || popupContent.reporter_name || '—'}</p>
            <p className="text-xs text-gray-500">{formatDate(popupContent.inspection_date || popupContent.incident_date)}</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {popupContent.latitude?.toFixed(5)}, {popupContent.longitude?.toFixed(5)}
            </p>
            {popupContent.image_url && (
              <a
                href={popupContent.image_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <FiImage size={11} /> View Photo
              </a>
            )}
          </div>
        )}
      </div>

      {geoSubs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded-b-2xl">
          <div className="text-center text-gray-400">
            <FiMapPin size={32} className="mx-auto mb-2" />
            <p className="text-sm">No GPS data available</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1">
        {Object.entries(MARKER_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize text-gray-600">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function KoboDataPage() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [totalCount, setTotalCount] = useState(0);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await koboApi.getSubmissions(500, 0);
      const data = res.data;
      setSubmissions(data.results || []);
      setFilteredSubmissions(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      toast.error('Failed to load KoboToolbox data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(
        submissions.filter(
          (s) => (s.disaster_type || '').toLowerCase() === filterType.toLowerCase()
        )
      );
    }
  }, [filterType, submissions]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await koboApi.syncSubmissions();
      setSyncResult(res.data);
      toast.success(`Sync complete! ${res.data.created} new records imported.`);
    } catch (err) {
      toast.error('Sync failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  const disasterTypes = ['all', ...new Set(submissions.map((s) => s.violation_type || s.disaster_type).filter(Boolean))];
  const geoSubmissions = filteredSubmissions.filter((s) => s.latitude != null && s.longitude != null);

  const dateTag = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCloud className="text-blue-600" size={22} />
            KoboToolbox — Shop Inspection Data
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Live data from <strong>Illegal Shop Detection &amp; Reporting</strong> survey
            <span className="ml-2 font-mono text-xs text-gray-400">{settings?.KOBO_ASSET_UID || 'acNYuKP7ZdAigVucAD5eHF'}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* ── Export Buttons ── */}
          <button
            onClick={() => {
              if (!filteredSubmissions.length) { toast.warn('No data to export'); return; }
              exportCSV(filteredSubmissions, `kobo_data_${dateTag}.csv`);
              toast.success(`Exported ${filteredSubmissions.length} rows as CSV`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium transition-colors"
            title="Download CSV"
          >
            <FiFileText size={14} />
            Export CSV
          </button>
          <button
            onClick={() => {
              if (!filteredSubmissions.length) { toast.warn('No data to export'); return; }
              exportExcel(filteredSubmissions, `kobo_data_${dateTag}.xlsx`);
              toast.success(`Exported ${filteredSubmissions.length} rows as Excel`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow transition-colors"
            title="Download Excel (.xlsx)"
          >
            <FiDownload size={14} />
            Export Excel
          </button>

          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium shadow transition-colors"
          >
            {isSyncing ? <FiLoader size={14} className="animate-spin" /> : <FiDatabase size={14} />}
            {isSyncing ? 'Syncing...' : 'Sync to Database'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Inspections', value: totalCount, icon: <FiCloud size={16} className="text-blue-600" />, bg: 'bg-blue-50 border-blue-100' },
          { label: 'With GPS', value: geoSubmissions.length, icon: <FiMapPin size={16} className="text-green-600" />, bg: 'bg-green-50 border-green-100' },
          { label: 'Violation Types', value: disasterTypes.length - 1, icon: <FiAlertTriangle size={16} className="text-amber-600" />, bg: 'bg-amber-50 border-amber-100' },
          { label: 'With Evidence', value: submissions.filter((s) => s.image_url).length, icon: <FiImage size={16} className="text-purple-600" />, bg: 'bg-purple-50 border-purple-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-500 font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <FiCheckCircle size={18} className="text-green-600 flex-shrink-0" />
          <span>
            Sync complete: <strong>{syncResult.created}</strong> new records imported,{' '}
            <strong>{syncResult.skipped}</strong> already in database.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <FiFilter size={14} className="text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            {disasterTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Violations' : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden sm:ml-auto">
          {['table', 'map'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <FiLoader className="animate-spin text-blue-600 mx-auto mb-3" size={32} />
            <p className="text-gray-500 text-sm">Fetching KoboToolbox submissions...</p>
          </div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center">
          <FiCloud size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No submissions found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterType !== 'all' ? 'Clear the filter to see all data.' : 'No data available from KoboToolbox.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ======= TABLE ======= */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {filteredSubmissions.length} of {totalCount} inspections
            </span>
            <a
              href={`https://kf.kobotoolbox.org/#/forms/${import.meta.env.VITE_KOBO_ASSET_UID || 'acNYuKP7ZdAigVucAD5eHF'}/data/table`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <FiExternalLink size={12} /> Open in KoboToolbox
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['ID', 'Inspector', 'Zone', 'Shop Name', 'Owner', 'Violation Type', 'Action', 'Date', 'GPS', 'Evidence'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{sub.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {(sub.inspector_name || sub.reporter_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 whitespace-nowrap text-xs">{sub.inspector_name || sub.reporter_name || '—'}</p>
                          {sub.inspector_id && <p className="text-gray-400 text-xs">{sub.inspector_id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{sub.municipality_zone || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs whitespace-nowrap">{sub.shop_name || '—'}</p>
                      {sub.license_number && <p className="text-gray-400 text-xs">Lic: {sub.license_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{sub.shop_owner_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${disasterBadgeClass(sub.violation_type || sub.disaster_type)}`}>
                        {sub.violation_type || sub.disaster_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate" title={sub.action_taken}>
                      {sub.action_taken || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <FiCalendar size={12} className="text-gray-400" />
                        <span className="text-xs">{formatDate(sub.inspection_date || sub.incident_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sub.latitude != null ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600 font-mono">
                          <FiMapPin size={11} className="text-green-500 flex-shrink-0" />
                          {sub.latitude.toFixed(4)},{sub.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">No GPS</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub.image_url ? (
                        <button
                          onClick={() => setSelectedPhoto({ url: sub.image_url, reporter: sub.inspector_name || sub.reporter_name, type: sub.violation_type || sub.disaster_type })}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <FiImage size={13} /> View
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ======= MAP (OpenLayers) ======= */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing <strong>{geoSubmissions.length}</strong> submissions with GPS • Click a marker for details
            </p>
          </div>
          <KoboMap submissions={filteredSubmissions} />
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedPhoto.type} — Photo</h3>
                <p className="text-xs text-gray-400">{selectedPhoto.reporter}</p>
              </div>
              <div className="flex gap-3 items-center">
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FiDownload size={14} /> Open
                </a>
                <button onClick={() => setSelectedPhoto(null)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={18} />
                </button>
              </div>
            </div>
            <div className="p-5 bg-gray-50">
              <img
                src={selectedPhoto.url}
                alt={`${selectedPhoto.type} by ${selectedPhoto.reporter}`}
                className="w-full max-h-[55vh] object-contain rounded-xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div
                style={{ display: 'none' }}
                className="py-8 text-center text-gray-400 text-sm"
              >
                <FiImage size={28} className="mx-auto mb-2" />
                Photo requires KoboToolbox authentication to view.
                <br />
                <a href={selectedPhoto.url} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-1 inline-block">
                  Open directly in browser
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

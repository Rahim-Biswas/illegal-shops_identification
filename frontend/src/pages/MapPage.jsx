/**
 * Map visualization page — accessible to all authenticated users.
 * - Admins: see all geo-tagged complaints (uses /admin/map-data)
 * - Regular users: see their own complaints + download button with purpose form
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { complaintApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiList, FiDownload, FiX, FiMapPin, FiAlertCircle,
  FiFilter, FiFileText, FiLoader,
} from 'react-icons/fi';
import 'ol/ol.css';

// ─── Colour palettes ────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  Low:      '#10b981',
  Medium:   '#f59e0b',
  High:     '#ef4444',
  Critical: '#7c2d12',
};

const STATUS_COLORS = {
  submitted:    '#3b82f6',
  under_review: '#f59e0b',
  acknowledged: '#8b5cf6',
  resolved:     '#10b981',
  closed:       '#9ca3af',
};

// ─── CSV/Excel helpers ───────────────────────────────────────────────────────

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = ['ID', 'Title', 'Disaster Type', 'Status', 'Severity', 'Latitude', 'Longitude', 'Created At'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((c) =>
      [
        c.id, c.title, c.disaster_type, c.status,
        c.severity ?? '', c.latitude, c.longitude,
        new Date(c.created_at).toLocaleDateString('en-IN'),
      ].map(escape).join(',')
    ),
  ];
  // UTF-8 BOM so Excel opens the file without garbled characters
  return '\uFEFF' + lines.join('\r\n');
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  // Append to DOM so all browsers honour the `download` attribute
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ─── Download Purpose Modal ──────────────────────────────────────────────────

const DOWNLOAD_PURPOSES = [
  'Academic / Research',
  'Government / Policy Use',
  'NGO / Humanitarian Response',
  'Journalism / Media',
  'Personal Reference',
  'Other',
];

function DownloadModal({ complaints, onClose }) {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    purpose: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.purpose) {
      toast.warn('Please fill in your name and purpose.');
      return;
    }
    setSubmitting(true);

    try {
      // Persist the download log to the database
      await complaintApi.logDownload({
        full_name: form.name.trim(),
        organization: form.organization.trim() || null,
        purpose: form.purpose,
        notes: form.notes.trim() || null,
        record_count: complaints.length,
      });
    } catch (err) {
      // Log failure is non-blocking — download proceeds anyway
      console.warn('Could not save download log:', err?.response?.data?.detail || err.message);
    }

    // Generate and trigger CSV download
    const date = new Date().toISOString().slice(0, 10);
    const csv = toCSV(complaints);
    downloadFile(csv, `complaints_map_${date}.csv`, 'text/csv;charset=utf-8;');

    toast.success(`Download started! (${complaints.length} records)`);
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <FiDownload size={18} />
            <h2 className="font-semibold text-lg">Download Data</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 flex gap-2 items-start">
            <FiFileText size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
            Please provide your details before downloading. This helps us track data usage.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Rahim Biswas"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={form.organization}
              onChange={set('organization')}
              placeholder="e.g. University / NGO (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose of Download <span className="text-red-500">*</span>
            </label>
            <select
              value={form.purpose}
              onChange={set('purpose')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            >
              <option value="">Select a purpose…</option>
              {DOWNLOAD_PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Any additional context (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <FiLoader size={14} className="animate-spin" /> : <FiDownload size={14} />}
              Download CSV ({complaints.length} records)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const districtLayerRef = useRef(null);
  const navigate     = useNavigate();
  const { user }     = useAuthStore();
  const isAdmin      = user?.role === 'admin';

  const [complaints, setComplaints]         = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [selectedComplaint, setSelected]    = useState(null);
  const [showList, setShowList]             = useState(false);
  const [showDownload, setShowDownload]     = useState(false);
  const [showDistricts, setShowDistricts]   = useState(false);
  const [filters, setFilters]               = useState({ status: '', severity: '' });

  // ── Initialise map (once) ──
  useEffect(() => {
    if (mapRef.current) return;
    const vectorSource = new VectorSource();
    const vectorLayer  = new VectorLayer({ source: vectorSource });

    districtLayerRef.current = new VectorLayer({
      source: new VectorSource(),
      visible: false,
      style: new Style({
        stroke: new Stroke({ color: '#2563eb', width: 2 }),
        fill: new Fill({ color: 'rgba(37, 99, 235, 0.08)' }),
      }),
    });

    mapRef.current = new Map({
      target: mapContainer.current,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer, districtLayerRef.current],
      view: new View({ center: fromLonLat([39.6, 24.5]), zoom: 12 }),
    });

    mapRef.current.on('click', (event) => {
      mapRef.current.forEachFeatureAtPixel(event.pixel, (feature) => {
        setSelected(feature.get('complaint'));
      });
    });

    mapRef.current.on('pointermove', (evt) => {
      const hit = mapRef.current.hasFeatureAtPixel(evt.pixel);
      mapRef.current.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
    // Add Madinah district demo boundaries
    const districtCoordinates = [
      [
        [39.56, 24.49],
        [39.59, 24.49],
        [39.59, 24.52],
        [39.56, 24.52],
        [39.56, 24.49],
      ],
      [
        [39.60, 24.50],
        [39.63, 24.50],
        [39.63, 24.53],
        [39.60, 24.53],
        [39.60, 24.50],
      ],
    ];

    const districtFeatures = districtCoordinates.map((polygon) => {
      return new Feature({
        geometry: new Polygon([polygon.map((coords) => fromLonLat(coords))]),
      });
    });

    districtLayerRef.current.getSource().addFeatures(districtFeatures);
  }, []);

  useEffect(() => {
    if (districtLayerRef.current) {
      districtLayerRef.current.setVisible(showDistricts);
    }
  }, [showDistricts]);

  // ── Load complaints ──
  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    try {
      // Admin uses privileged endpoint; users use the shared one
      const response = isAdmin
        ? await complaintApi.getMapData()
        : await complaintApi.getPublicMapData();
      setComplaints(response.data);
      plotMarkers(response.data);
    } catch {
      toast.error('Failed to load map data');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  // ── Plot markers ──
  const plotMarkers = (data) => {
    if (!mapRef.current) return;
    const src = mapRef.current.getLayers().getArray()[1].getSource();
    src.clear();

    data.forEach((c) => {
      const color = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.Low;
      const feature = new Feature({
        geometry: new Point(fromLonLat([c.longitude, c.latitude])),
        complaint: c,
      });
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 10,
            fill:   new Fill({ color }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
        })
      );
      src.addFeature(feature);
    });

    // Fit view to features
    if (data.length > 0) {
      const ext = src.getExtent();
      mapRef.current.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 12, duration: 600 });
    }
  };

  // ── Filtered list ──
  const filteredComplaints = complaints.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.severity && c.severity !== filters.severity) return false;
    return true;
  });

  // ── Re-plot when filters change ──
  useEffect(() => {
    plotMarkers(filteredComplaints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="flex h-screen relative">
      {/* ── Map ── */}
      <div ref={mapContainer} className="flex-1" style={{ height: '100%' }} />

      {/* ── Side Panel ── */}
      <div className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-100">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FiMapPin size={18} /> Complaints Map
          </h2>
          <p className="text-blue-100 text-xs mt-0.5">
            All geo-tagged complaints • Click a marker to view details
          </p>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setShowList(!showList)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiList size={15} />
              {showList ? 'Hide List' : 'Show List'}
            </button>

            {/* Download button — only for regular users */}
            {!isAdmin && (
              <button
                onClick={() => setShowDownload(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow"
              >
                <FiDownload size={15} />
                Download
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDistricts(!showDistricts)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showDistricts
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showDistricts ? 'Hide Districts' : 'Show Districts'}
            </button>
            <button
              onClick={() => setFilters({ status: '', severity: '' })}
              className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">All Severity</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {complaints.length > 0 && (
            <p className="text-xs text-gray-400 text-center">
              {filteredComplaints.length} of {complaints.length} records shown
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <FiLoader size={28} className="animate-spin text-blue-400" />
              <p className="text-sm">Loading map data…</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6 text-center">
              <FiAlertCircle size={36} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No geo-tagged complaints found</p>
              <p className="text-xs text-gray-400">
                Complaints with GPS coordinates will appear as markers on the map.
              </p>
            </div>
          ) : showList ? (
            /* List view */
            <div className="space-y-2 p-4">
              {filteredComplaints.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No complaints match filters</p>
              ) : (
                filteredComplaints.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelected(c);
                      setShowList(false);
                      mapRef.current?.getView().animate({
                        center: fromLonLat([c.longitude, c.latitude]),
                        zoom: 12,
                        duration: 500,
                      });
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      selectedComplaint?.id === c.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{c.disaster_type}</p>
                    <div className="flex gap-2 mt-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (SEVERITY_COLORS[c.severity] || '#6b7280') + '22',
                          color: SEVERITY_COLORS[c.severity] || '#6b7280',
                        }}
                      >
                        {c.severity || 'N/A'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: STATUS_COLORS[c.status] || '#9ca3af' }}
                      >
                        {c.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : selectedComplaint ? (
            /* Detail view */
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm leading-tight pr-2">
                  {selectedComplaint.title}
                </h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <FiX size={16} />
                </button>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  ['Disaster Type', selectedComplaint.disaster_type],
                  ['Severity',      selectedComplaint.severity || 'N/A'],
                  ['Status',        selectedComplaint.status?.replace(/_/g, ' ')],
                  ['Coordinates',   `${selectedComplaint.latitude?.toFixed(5)}, ${selectedComplaint.longitude?.toFixed(5)}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start">
                    <dt className="text-gray-400 text-xs uppercase tracking-wide font-medium">{label}</dt>
                    <dd className="font-medium text-gray-800 text-right capitalize text-xs max-w-[60%]">{value}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={() => navigate(`/complaints/${selectedComplaint.id}`)}
                className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow"
              >
                View Full Details
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <FiMapPin size={28} className="text-gray-300" />
              <p className="text-sm">Click a marker to view details</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Severity Legend</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <div key={sev} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-600">{sev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Download Purpose Modal ── */}
      {showDownload && (
        <DownloadModal
          complaints={filteredComplaints.length > 0 ? filteredComplaints : complaints}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}

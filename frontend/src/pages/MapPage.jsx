/**
 * Shop Violations Map — Illegal Shop Detection & Enforcement Platform
 * - Color-coded markers by violation type
 * - Rich popup on marker click (overlaid on map)
 * - Filters: violation type, zone, status
 * - Side panel: stats + scrollable violation list
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import { complaintApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiMapPin, FiAlertCircle, FiFilter, FiLoader, FiX,
  FiRefreshCw, FiList, FiEye, FiShield, FiAlertTriangle,
  FiCheckCircle, FiClock, FiTag,
} from 'react-icons/fi';
import 'ol/ol.css';

// ── Violation colour palette ─────────────────────────────────────────────────

const VIOLATION_COLORS = {
  no_license:           '#ef4444',
  expired_license:      '#f97316',
  illegal_construction: '#f59e0b',
  health_violation:     '#8b5cf6',
  zoning_violation:     '#3b82f6',
  fire_safety:          '#f43f5e',
  encroachment:         '#eab308',
  noise_pollution:      '#06b6d4',
  unknown:              '#6b7280',
};

const VIOLATION_LABELS = {
  no_license:           'No License',
  expired_license:      'Expired License',
  illegal_construction: 'Illegal Construction',
  health_violation:     'Health Violation',
  zoning_violation:     'Zoning Violation',
  fire_safety:          'Fire Safety',
  encroachment:         'Encroachment',
  noise_pollution:      'Noise / Pollution',
  unknown:              'Unknown',
};

const STATUS_COLORS = {
  submitted:    '#3b82f6',
  under_review: '#f59e0b',
  acknowledged: '#8b5cf6',
  resolved:     '#10b981',
  closed:       '#9ca3af',
};

const ZONE_LABELS = {
  old_city:    'Old City',
  al_haram:    'Al Haram',
  quba:        'Quba',
  jabal_uhud:  'Jabal Uhud',
  aziziyah:    'Aziziyah',
  other:       'Other',
};

function violationColor(type) {
  const key = (type || '').toLowerCase().replace(/[\s-]/g, '_');
  return VIOLATION_COLORS[key] || VIOLATION_COLORS.unknown;
}

function violationLabel(type) {
  const key = (type || '').toLowerCase().replace(/[\s-]/g, '_');
  return VIOLATION_LABELS[key] || type || 'Unknown';
}

function zoneLabel(zone) {
  return ZONE_LABELS[zone] || zone || 'Unknown';
}

// ── Authenticated Image loader ───────────────────────────────────────────────
// <img src="..."> can't send Authorization headers, so we fetch via axios
// (which has the JWT token) and convert to a local blob URL.

function useAuthImage(imageUrl) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(false);

  useEffect(() => {
    if (!imageUrl) return;
    let objectUrl = null;
    setLoading(true);
    setError(false);
    import('../services/api').then(({ default: api }) => {
      api.get(
        `/kobo/attachment-proxy?url=${encodeURIComponent(imageUrl)}`,
        { responseType: 'blob' },
      )
        .then((res) => {
          objectUrl = URL.createObjectURL(res.data);
          setBlobUrl(objectUrl);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageUrl]);

  return { blobUrl, loading, error };
}

// ── Map Popup ────────────────────────────────────────────────────────────────

function MapPopup({ shop, onClose, onViewDetail }) {
  if (!shop) return null;
  const color = violationColor(shop.disaster_type);
  const statusColor = STATUS_COLORS[shop.status] || '#9ca3af';
  const { blobUrl, loading: imgLoading, error: imgError } = useAuthImage(shop.image_url);

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden">
      {/* Evidence Photo */}
      {shop.image_url ? (
        <div className="relative w-full h-36 bg-gray-100 overflow-hidden">
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <FiLoader size={20} className="animate-spin text-gray-400" />
            </div>
          )}
          {blobUrl && !imgError && (
            <img
              src={blobUrl}
              alt="Evidence"
              className="w-full h-full object-cover"
            />
          )}
          {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 bg-gray-50">
              <FiAlertCircle size={20} />
              <span className="text-xs">Photo unavailable</span>
            </div>
          )}
          {/* Violation badge over image */}
          <div className="absolute top-2 left-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white shadow"
              style={{ backgroundColor: color }}
            >
              {violationLabel(shop.disaster_type)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
          >
            <FiX size={13} />
          </button>
        </div>
      ) : (
        <>
          {/* Coloured top bar when no image */}
          <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
        </>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
              {shop.title?.replace('Illegal Shop: ', '') || 'Unknown Shop'}
            </p>
            <span
              className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              {violationLabel(shop.disaster_type)}
            </span>
          </div>
          {/* Close button always present in header */}
          {!shop.image_url && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Details grid */}
        <div className="space-y-2 text-xs">
          {shop.location_name && (
            <div className="flex items-center gap-2 text-gray-600">
              <FiMapPin size={12} className="text-gray-400 flex-shrink-0" />
              <span>Zone: <strong>{zoneLabel(shop.location_name)}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <FiClock size={12} className="text-gray-400 flex-shrink-0" />
            <span>{shop.created_at ? new Date(shop.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="font-semibold capitalize px-2 py-0.5 rounded-full text-white text-xs"
              style={{ backgroundColor: statusColor }}
            >
              {shop.status?.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-gray-400 text-xs">
              {shop.latitude?.toFixed(4)}, {shop.longitude?.toFixed(4)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onViewDetail(shop.id)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: color }}
        >
          <FiEye size={13} /> View Full Report
        </button>
      </div>
    </div>
  );
}

// ── Stat Badge ───────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }) {
  return (
    <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: color + '18', border: `1px solid ${color}33` }}>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const popupRef     = useRef(null);
  const overlayRef   = useRef(null);
  const navigate     = useNavigate();
  const { user }     = useAuthStore();
  const isAdmin      = ['admin', 'super_admin'].includes(user?.role);

  const [violations, setViolations]       = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [selectedShop, setSelectedShop]   = useState(null);
  const [showList, setShowList]           = useState(false);
  const [filters, setFilters]             = useState({ status: '', violation: '', zone: '' });

  // ── Init map ──
  useEffect(() => {
    if (mapRef.current) return;

    // Popup overlay
    const overlay = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -14],
      autoPan: { animation: { duration: 250 } },
    });
    overlayRef.current = overlay;

    const vectorSource = new VectorSource();
    const vectorLayer  = new VectorLayer({ source: vectorSource });

    mapRef.current = new Map({
      target: mapContainer.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attributions: '© CartoDB',
          }),
        }),
        vectorLayer,
      ],
      view: new View({ center: fromLonLat([39.597, 24.468]), zoom: 13 }),
      overlays: [overlay],
    });

    // Click → show popup
    mapRef.current.on('click', (evt) => {
      const feature = mapRef.current.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        const shop = feature.get('shop');
        const coord = feature.getGeometry().getCoordinates();
        overlay.setPosition(coord);
        setSelectedShop(shop);
      } else {
        overlay.setPosition(undefined);
        setSelectedShop(null);
      }
    });

    mapRef.current.on('pointermove', (evt) => {
      const hit = mapRef.current.hasFeatureAtPixel(evt.pixel);
      mapRef.current.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }, []);

  // ── Load data ──
  const loadViolations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = isAdmin
        ? await complaintApi.getMapData()
        : await complaintApi.getPublicMapData();
      setViolations(res.data || []);
    } catch {
      toast.error('Failed to load violation map data');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadViolations(); }, [loadViolations]);

  // ── Plot markers ──
  const plotMarkers = useCallback((data) => {
    if (!mapRef.current) return;
    const src = mapRef.current.getLayers().getArray()[1].getSource();
    src.clear();
    data.forEach((c) => {
      const color = violationColor(c.disaster_type);
      const initials = (c.disaster_type || 'U')[0].toUpperCase();
      const feature = new Feature({
        geometry: new Point(fromLonLat([c.longitude, c.latitude])),
        shop: c,
      });
      feature.setStyle(new Style({
        image: new CircleStyle({
          radius: 11,
          fill:   new Fill({ color }),
          stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
        }),
        text: new Text({
          text: initials,
          fill: new Fill({ color: '#fff' }),
          font: 'bold 10px Inter, sans-serif',
          offsetY: 0.5,
        }),
      }));
      src.addFeature(feature);
    });
    if (data.length > 0) {
      const ext = src.getExtent();
      mapRef.current.getView().fit(ext, { padding: [80, 80, 80, 80], maxZoom: 14, duration: 700 });
    }
  }, []);

  // ── Filtered data ──
  const filtered = violations.filter((c) => {
    if (filters.status    && c.status       !== filters.status)    return false;
    if (filters.violation && c.disaster_type !== filters.violation) return false;
    if (filters.zone      && c.location_name !== filters.zone)     return false;
    return true;
  });

  useEffect(() => { plotMarkers(filtered); }, [filters, violations, plotMarkers]);

  // ── Stats ──
  const total    = filtered.length;
  const resolved = filtered.filter((c) => c.status === 'resolved').length;
  const pending  = filtered.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
  const withGPS  = filtered.filter((c) => c.latitude && c.longitude).length;

  const violationTypes = [...new Set(violations.map((c) => c.disaster_type).filter(Boolean))];
  const zones          = [...new Set(violations.map((c) => c.location_name).filter(Boolean))];

  return (
    <div className="flex h-full relative overflow-hidden">

      {/* ── Map ── */}
      <div ref={mapContainer} className="flex-1" style={{ height: '100%' }} />

      {/* ── Popup overlay element ── */}
      <div ref={popupRef} style={{ position: 'absolute', zIndex: 10 }}>
        <MapPopup
          shop={selectedShop}
          onClose={() => {
            overlayRef.current?.setPosition(undefined);
            setSelectedShop(null);
          }}
          onViewDetail={(id) => navigate(`/complaints/${id}`)}
        />
      </div>

      {/* ── Side Panel ── */}
      <div className="w-80 bg-slate-900 text-white flex flex-col shadow-2xl z-10">

        {/* Header */}
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <FiAlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Shop Violations Map</h2>
              <p className="text-xs text-slate-400">Illegal Shop Detection Platform</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex gap-2">
            <StatBadge label="Total"    value={total}    color="#3b82f6" />
            <StatBadge label="Pending"  value={pending}  color="#f97316" />
            <StatBadge label="Resolved" value={resolved} color="#10b981" />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-slate-700 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <FiFilter size={11} /> Filters
            </p>
            <div className="flex gap-2">
              <button
                onClick={loadViolations}
                disabled={isLoading}
                className="text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setFilters({ status: '', violation: '', zone: '' })}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Violation Type */}
          <select
            value={filters.violation}
            onChange={(e) => setFilters((f) => ({ ...f, violation: e.target.value }))}
            className="w-full text-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Violation Types</option>
            {violationTypes.map((v) => (
              <option key={v} value={v}>{violationLabel(v)}</option>
            ))}
          </select>

          {/* Zone */}
          <select
            value={filters.zone}
            onChange={(e) => setFilters((f) => ({ ...f, zone: e.target.value }))}
            className="w-full text-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="w-full text-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <p className="text-xs text-slate-500 text-right">
            {filtered.length} of {violations.length} violations shown
          </p>
        </div>

        {/* Toggle list */}
        <button
          onClick={() => setShowList((v) => !v)}
          className="mx-4 my-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-600 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <FiList size={13} />
          {showList ? 'Hide Violation List' : 'Show Violation List'}
        </button>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <FiLoader size={26} className="animate-spin text-blue-400" />
              <p className="text-xs">Loading violations…</p>
            </div>
          ) : violations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-6 text-center">
              <FiAlertCircle size={32} className="text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No violations with GPS found</p>
              <p className="text-xs text-slate-500">
                Sync KoboToolbox data to populate the map.
              </p>
            </div>
          ) : showList ? (
            <div className="space-y-2 p-3">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No violations match filters</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedShop(c);
                      setShowList(false);
                      mapRef.current?.getView().animate({
                        center: fromLonLat([c.longitude, c.latitude]),
                        zoom: 15, duration: 600,
                      });
                    }}
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-left transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: violationColor(c.disaster_type) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {c.title?.replace('Illegal Shop: ', '') || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {violationLabel(c.disaster_type)} · {zoneLabel(c.location_name)}
                        </p>
                        <span
                          className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{
                            backgroundColor: (STATUS_COLORS[c.status] || '#6b7280') + '33',
                            color: STATUS_COLORS[c.status] || '#9ca3af',
                          }}
                        >
                          {c.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <FiMapPin size={12} className="text-slate-500 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 p-6 text-center">
              <FiMapPin size={28} className="text-slate-600" />
              <p className="text-sm text-slate-400">Click a marker on the map</p>
              <p className="text-xs text-slate-600">A popup will show violation details</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FiTag size={11} /> Violation Legend
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Object.entries(VIOLATION_COLORS).filter(([k]) => k !== 'unknown').map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-400 truncate">{VIOLATION_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

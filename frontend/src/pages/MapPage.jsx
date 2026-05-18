/**
 * Shop Violations Map — Illegal Shop Detection & Enforcement Platform
 * - Color-coded markers by violation type
 * - Rich popup on marker click (overlaid on map)
 * - Mapillary street view panel (synced with map)
 * - Filters: violation type, zone, status
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Circle as CircleStyle, Text, RegularShape } from 'ol/style';
import Overlay from 'ol/Overlay';
import { Viewer } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';
import { complaintApi } from '../services/api';
import { useAuthStore } from '../store/store';
import { toast } from 'react-toastify';
import {
  FiMapPin, FiAlertCircle, FiFilter, FiLoader, FiX,
  FiRefreshCw, FiList, FiEye, FiAlertTriangle,
  FiClock, FiTag, FiCamera, FiMaximize2, FiMinimize2,
  FiLayers, FiZoomIn, FiEyeOff, FiGlobe, FiNavigation2,
} from 'react-icons/fi';
import 'ol/ol.css';

const MLY_TOKEN = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN || '';

// ── Basemap presets ──────────────────────────────────────────────────────────
const BASEMAPS = [
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '© CartoDB',
    preview: '#1a1a2e',
  },
  {
    id: 'street',
    label: 'Street',
    url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attr: '© CartoDB',
    preview: '#e8e0d5',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '© Esri',
    preview: '#2d4a1e',
  }
];


// ── Violation colour palette ─────────────────────────────────────────────────

const VIOLATION_COLORS = {
  no_license: '#ef4444',
  expired_license: '#f97316',
  illegal_construction: '#f59e0b',
  health_violation: '#8b5cf6',
  zoning_violation: '#3b82f6',
  fire_safety: '#f43f5e',
  encroachment: '#eab308',
  noise_pollution: '#06b6d4',
  unknown: '#6b7280',
};

const VIOLATION_LABELS = {
  no_license: 'No License',
  expired_license: 'Expired License',
  illegal_construction: 'Illegal Construction',
  health_violation: 'Health Violation',
  zoning_violation: 'Zoning Violation',
  fire_safety: 'Fire Safety',
  encroachment: 'Encroachment',
  noise_pollution: 'Noise / Pollution',
  unknown: 'Unknown',
};

const STATUS_COLORS = {
  submitted: '#3b82f6',
  under_review: '#f59e0b',
  acknowledged: '#8b5cf6',
  resolved: '#10b981',
  closed: '#9ca3af',
};

const ZONE_LABELS = {
  al_haram:    'Al Haram',
  quba:        'Quba',
  aziziyah:   'Aziziyah',
  jabal_uhud:  'Jabal Uhud',
  al_manakhah: 'Al Manakhah',
  al_awali:    'Al Awali',
  bani_haritha:'Bani Haritha',
  al_aqiq:     'Al Aqiq',
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
  const [error, setError] = useState(false);

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

function MapPopup({ shop, onClose, onViewDetail, onStreetView }) {
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

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onViewDetail(shop.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: color }}
          >
            <FiEye size={13} /> Full Report
          </button>
          <button
            onClick={onStreetView}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
            title="Open Mapillary street view near this location"
          >
            <FiCamera size={13} /> Street View
          </button>
        </div>
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

// ── Layer Management Panel ────────────────────────────────────────────────────

const LAYER_META = [
  {
    key: 'basemap',
    label: 'Base Map',
    desc: 'CartoDB Voyager street map',
    color: '#64748b',
    canZoom: false,
  },
  {
    key: 'violations',
    label: 'Shop Violations',
    desc: 'Geo-tagged illegal shop reports',
    color: '#ef4444',
    canZoom: true,
  },
  {
    key: 'mly_coverage',
    label: 'Street View Coverage',
    desc: 'Mapillary imagery availability',
    color: '#22c55e',
    canZoom: false,
    requiresToken: true,
  },
];

function LayerPanel({ open, onToggleOpen, layerVis, onToggleLayer, onZoomTo }) {
  return (
    <div className="absolute top-24 left-2 z-30 flex flex-col items-start gap-1">
      {/* Toggle button — styled like OL zoom controls */}
      <button
        onClick={onToggleOpen}
        title="Layer Manager"
        className={`w-8 h-8 rounded shadow-lg flex items-center justify-center text-sm font-bold transition-colors border ${open
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
      >
        <FiLayers size={15} />
      </button>

      {/* Panel */}
      {open && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-64 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
            <div className="flex items-center gap-2">
              <FiLayers size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">Layer Manager</span>
            </div>
            <button onClick={onToggleOpen} className="text-slate-400 hover:text-white">
              <FiX size={14} />
            </button>
          </div>

          {/* Layer list */}
          <div className="divide-y divide-gray-100">
            {LAYER_META.map((layer) => {
              const visible = layerVis[layer.key];
              return (
                <div key={layer.key} className={`px-3 py-2.5 transition-colors ${visible ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    {/* Color swatch */}
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: layer.color, opacity: visible ? 1 : 0.3 }}
                    />
                    {/* Name + desc */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${visible ? 'text-gray-800' : 'text-gray-400'}`}>
                        {layer.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{layer.desc}</p>
                    </div>
                    {/* Zoom to */}
                    {layer.canZoom && onZoomTo && (
                      <button
                        onClick={() => onZoomTo(layer.key)}
                        title="Zoom to layer"
                        className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                      >
                        <FiZoomIn size={13} />
                      </button>
                    )}
                    {/* Visibility toggle */}
                    <button
                      onClick={() => onToggleLayer(layer.key)}
                      title={visible ? 'Hide layer' : 'Show layer'}
                      className={`flex-shrink-0 transition-colors ${visible ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300 hover:text-gray-500'}`}
                    >
                      {visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer hint
          <div className="px-3 py-2 bg-slate-50 border-t border-gray-100">
            <p className="text-xs text-slate-400">
              <span className="text-green-500 font-semibold">■</span> Street View Coverage requires Mapillary token & zoom ≥ 12
            </p>
          </div> */}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

// ── Mapillary nearest image fetch ───────────────────────────────────────────
async function fetchNearestMlyImage(lat, lon) {
  if (!MLY_TOKEN) return null;
  const radius = 200; // metres
  const url = `https://graph.mapillary.com/images?access_token=${MLY_TOKEN}` +
    `&fields=id,thumb_256_url,computed_geometry,captured_at,creator` +
    `&bbox=${lon - 0.002},${lat - 0.002},${lon + 0.002},${lat + 0.002}` +
    `&limit=10`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    const imgs = d.data || [];
    if (!imgs.length) return null;
    // Pick closest
    imgs.sort((a, b) => {
      const dist = (img) => {
        const [lng2, lat2] = img.computed_geometry?.coordinates || [lon, lat];
        return Math.hypot(lng2 - lon, lat2 - lat);
      };
      return dist(a) - dist(b);
    });
    return imgs[0];
  } catch { return null; }
}

export default function MapPage() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const overlayRef = useRef(null);
  const mlyContainer = useRef(null);
  const mlyViewerRef = useRef(null);
  const viewerDotLayerRef = useRef(null);  // layer showing current SV position
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState({ status: '', violation: '', zone: '' });
  const [streetView, setStreetView] = useState(false);
  const [mlyImageId, setMlyImageId] = useState(null);
  const [mlyLoading, setMlyLoading] = useState(false);
  const [mlyError, setMlyError] = useState(false);
  const [svExpanded, setSvExpanded] = useState(false);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [basemapId, setBasemapId] = useState('dark');
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [mlyCoverageClick, setMlyCoverageClick] = useState(null);
  const [layerVis, setLayerVis] = useState({
    basemap: true,
    violations: true,
    mly_coverage: false,
  });
  const layerRefs = useRef({});

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
    const violationsLayer = new VectorLayer({ source: vectorSource, zIndex: 10 });

    // Mapillary street view coverage tiles
    const mlyCoverageLayer = new VectorTileLayer({
      source: new VectorTileSource({
        format: new MVT(),
        url: `https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${MLY_TOKEN}`,
        minZoom: 6,
        maxZoom: 14,
      }),
      visible: false,
      zIndex: 5,
      style: (feature, resolution) => {
        const isSequence = feature.getGeometry().getType() === 'LineString';
        return new Style({
          stroke: new Stroke({
            color: '#22c55e',
            width: resolution < 5 ? 3 : 2,
            lineDash: [5, 3],
          }),
        });
      },
    });

    const baseTileLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attributions: '© CartoDB',
      }),
      zIndex: 0,
    });

    layerRefs.current = {
      basemap: baseTileLayer,
      violations: violationsLayer,
      mly_coverage: mlyCoverageLayer,
    };

    // ── Street view position dot layer ──
    const dotSource = new VectorSource();
    const dotLayer = new VectorLayer({
      source: dotSource,
      zIndex: 20,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      style: (feature) => {
        const bearing = feature.get('bearing') ?? 0;
        return [
          // Outer glow ring
          new Style({
            image: new CircleStyle({
              radius: 18,
              fill: new Fill({ color: 'rgba(59,130,246,0.18)' }),
              stroke: new Stroke({ color: 'rgba(59,130,246,0.5)', width: 1.5 }),
            }),
          }),
          // Inner blue dot
          new Style({
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({ color: '#3b82f6' }),
              stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
            }),
          }),
          // Bearing arrow triangle (points in look direction)
          new Style({
            image: new RegularShape({
              fill: new Fill({ color: '#3b82f6' }),
              stroke: new Stroke({ color: '#fff', width: 1 }),
              points: 3,
              radius: 8,
              radius2: 0,
              angle: 0,
              rotation: ((bearing - 90) * Math.PI) / 180,
              displacement: [20, 0],
            }),
          }),
        ];
      },
    });
    viewerDotLayerRef.current = dotLayer;

    mapRef.current = new Map({
      target: mapContainer.current,
      layers: [baseTileLayer, mlyCoverageLayer, violationsLayer, dotLayer],
      view: new View({ center: fromLonLat([39.597, 24.468]), zoom: 13 }),
      overlays: [overlay],
    });

    // Click → show popup
    mapRef.current.on('click', (evt) => {
      const coordinate = evt.coordinate;
      const [lon, lat] = toLonLat(coordinate);
      let hitShop = false;

      mapRef.current.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        // Shop violation marker
        if (feature.get('shop')) {
          const shop = feature.get('shop');
          const coord = feature.getGeometry().getCoordinates();
          overlay.setPosition(coord);
          setSelectedShop(shop);
          // Hide coverage popup if showing
          setMlyCoverageClick(null);
          hitShop = true;
          return true; // stop iterating
        }
        // Mapillary coverage line
        if (layer === mlyCoverageLayer && !hitShop) {
          overlay.setPosition(undefined);
          setSelectedShop(null);
          setMlyCoverageClick({ lat, lon, pixel: evt.pixel, coord: coordinate });
          return true;
        }
      });

      if (!hitShop && !mapRef.current.forEachFeatureAtPixel(evt.pixel, () => true)) {
        overlay.setPosition(undefined);
        setSelectedShop(null);
        setMlyCoverageClick(null);
      }
    });

    mapRef.current.on('pointermove', (evt) => {
      const hitShop = mapRef.current.hasFeatureAtPixel(evt.pixel, { layerFilter: (l) => l === violationsLayer });
      const hitMly = mapRef.current.hasFeatureAtPixel(evt.pixel, { layerFilter: (l) => l === mlyCoverageLayer });
      mapRef.current.getTargetElement().style.cursor = (hitShop || hitMly) ? 'pointer' : '';
    });
  }, []);  // eslint-disable-line

  // ── Sync layer visibility state → OL layers ──
  useEffect(() => {
    Object.entries(layerVis).forEach(([key, visible]) => {
      layerRefs.current[key]?.setVisible(visible);
    });
  }, [layerVis]);

  // ── Swap basemap source when user changes it ──
  useEffect(() => {
    const layer = layerRefs.current.basemap;
    if (!layer) return;
    const bm = BASEMAPS.find(b => b.id === basemapId);
    if (!bm) return;
    layer.setSource(new XYZ({ url: bm.url, attributions: bm.attr }));
  }, [basemapId]);


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
    const src = layerRefs.current.violations?.getSource();
    if (!src) return;
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
          fill: new Fill({ color }),
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
    if (filters.status && c.status !== filters.status) return false;
    if (filters.violation && c.disaster_type !== filters.violation) return false;
    if (filters.zone && c.location_name !== filters.zone) return false;
    return true;
  });

  useEffect(() => { plotMarkers(filtered); }, [filters, violations, plotMarkers]);

  // ── Stats ──
  const total = filtered.length;
  const resolved = filtered.filter((c) => c.status === 'resolved').length;
  const pending = filtered.filter((c) => ['submitted', 'under_review'].includes(c.status)).length;
  const withGPS = filtered.filter((c) => c.latitude && c.longitude).length;

  const violationTypes = [...new Set(violations.map((c) => c.disaster_type).filter(Boolean))];
  const zones = [...new Set(violations.map((c) => c.location_name).filter(Boolean))];

  // ── Open Mapillary for a lat/lon ──
  const openStreetView = useCallback(async (lat, lon) => {
    if (!MLY_TOKEN) {
      toast.warn('Add VITE_MAPILLARY_ACCESS_TOKEN to frontend .env to enable street view');
      return;
    }
    setStreetView(true);
    setMlyLoading(true);
    setMlyError(false);
    setMlyImageId(null);
    const img = await fetchNearestMlyImage(lat, lon);
    if (!img) {
      setMlyError(true);
      setMlyLoading(false);
      return;
    }
    setMlyImageId(img.id);
    setMlyLoading(false);
  }, []);

  // ── Init / update Mapillary viewer ──
  useEffect(() => {
    if (!streetView || !mlyImageId || !mlyContainer.current) return;
    if (mlyViewerRef.current) {
      mlyViewerRef.current.moveTo(mlyImageId).catch(() => { });
      return;
    }

    const viewer = new Viewer({
      accessToken: MLY_TOKEN,
      container: mlyContainer.current,
      imageId: mlyImageId,
      component: { cover: false },
    });

    // Helper: update/create the dot feature on the OL map
    const updateDot = (lat, lng, bearing) => {
      const dotSrc = viewerDotLayerRef.current?.getSource();
      if (!dotSrc) return;
      const coord = fromLonLat([lng, lat]);
      const existing = dotSrc.getFeatures()[0];
      if (existing) {
        // Move + update bearing in-place (faster than clear+add)
        existing.getGeometry().setCoordinates(coord);
        existing.set('bearing', bearing ?? existing.get('bearing') ?? 0);
        dotSrc.changed();
      } else {
        dotSrc.clear();
        const feat = new Feature({ geometry: new Point(coord) });
        feat.set('bearing', bearing ?? 0);
        dotSrc.addFeature(feat);
      }
      // Soft-pan the map to keep dot visible
      mapRef.current?.getView().animate({ center: coord, duration: 300 });
    };

    // 'image' event — fires when viewer moves to a new image (v4 API)
    viewer.on('image', (evt) => {
      try {
        const lngLat = evt.image.lngLat; // { lat, lng }
        const dotSrc = viewerDotLayerRef.current?.getSource();
        const lastBearing = dotSrc?.getFeatures()[0]?.get('bearing') ?? 0;
        updateDot(lngLat.lat, lngLat.lng, lastBearing);
      } catch (e) { console.warn('Mly image event error', e); }
    });

    // 'pov' event — fires on look-around, updates the bearing arrow
    viewer.on('pov', (evt) => {
      try {
        const bearing = evt.bearing;
        const dotSrc = viewerDotLayerRef.current?.getSource();
        const feat = dotSrc?.getFeatures()[0];
        if (feat) {
          feat.set('bearing', bearing);
          dotSrc.changed();
        }
      } catch (e) { /* ignore */ }
    });

    // Place dot immediately at starting position when viewer is ready
    viewer.getPosition().then((lngLat) => {
      if (lngLat) updateDot(lngLat.lat, lngLat.lng, 0);
    }).catch(() => {
      // Fallback: wait for first 'image' event which will call updateDot
    });

    mlyViewerRef.current = viewer;
    return () => {
      viewer.remove();
      mlyViewerRef.current = null;
    };
  }, [streetView, mlyImageId]);

  // ── Cleanup viewer on close ──
  const closeStreetView = () => {
    setStreetView(false);
    setMlyImageId(null);
    // Clear the position dot
    viewerDotLayerRef.current?.getSource()?.clear();
    if (mlyViewerRef.current) {
      mlyViewerRef.current.remove();
      mlyViewerRef.current = null;
    }
  };

  // ── Zoom to a layer extent ──
  const zoomToLayer = useCallback((key) => {
    if (key === 'violations') {
      const src = layerRefs.current.violations?.getSource();
      if (!src || src.getFeatures().length === 0) return;
      const ext = src.getExtent();
      mapRef.current?.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 14, duration: 700 });
    }
  }, []);

  return (
    <div className="flex h-full relative overflow-hidden">

      {/* ── Layer Management Panel (left side, over map) ── */}
      <LayerPanel
        open={layerPanelOpen}
        onToggleOpen={() => setLayerPanelOpen(v => !v)}
        layerVis={layerVis}
        onToggleLayer={(key) => setLayerVis(v => ({ ...v, [key]: !v[key] }))}
        onZoomTo={zoomToLayer}
      />

      {/* ── Basemap Switcher (bottom-left, over map) ── */}
      <div className="absolute bottom-8 left-2 z-30 flex flex-col items-start gap-1">
        <button
          onClick={() => setBasemapOpen(v => !v)}
          title="Change basemap"
          className={`w-8 h-8 rounded shadow-lg flex items-center justify-center transition-colors border ${basemapOpen
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
        >
          <FiGlobe size={15} />
        </button>
        {basemapOpen && (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-44">
            <div className="px-3 py-2 bg-slate-800 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              <FiGlobe size={12} /> Basemap
            </div>
            {BASEMAPS.map(bm => (
              <button
                key={bm.id}
                onClick={() => { setBasemapId(bm.id); setBasemapOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${basemapId === bm.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
              >
                <div
                  className="w-6 h-6 rounded flex-shrink-0 border border-gray-200"
                  style={{ backgroundColor: bm.preview }}
                />
                <span className={`text-xs font-medium ${basemapId === bm.id ? 'text-blue-700' : 'text-gray-700'}`}>
                  {bm.label}
                  {basemapId === bm.id && <span className="ml-1 text-blue-400">✓</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Mapillary Coverage Line Click Mini-Popup ── */}
      {mlyCoverageClick && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{
            left: mlyCoverageClick.pixel[0] + 10,
            top: mlyCoverageClick.pixel[1] - 20,
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-56 overflow-hidden">
            <div className="h-1 bg-green-500 w-full" />
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiCamera size={13} className="text-green-500" />
                  <span className="text-xs font-bold text-gray-800">Street View Available</span>
                </div>
                <button
                  onClick={() => setMlyCoverageClick(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={13} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Mapillary imagery exists near this location.
              </p>
              <button
                onClick={() => {
                  openStreetView(mlyCoverageClick.lat, mlyCoverageClick.lon);
                  setMlyCoverageClick(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
              >
                <FiCamera size={12} /> Open Street View Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map (shrinks when street view is open) ── */}
      <div
        ref={mapContainer}
        className="flex-1 transition-all duration-300"
        style={{ height: streetView ? (svExpanded ? '40%' : '55%') : '100%' }}
      />


      {/* ── Popup overlay ── */}
      <div ref={popupRef} style={{ position: 'absolute', zIndex: 10 }}>
        <MapPopup
          shop={selectedShop}
          onClose={() => {
            overlayRef.current?.setPosition(undefined);
            setSelectedShop(null);
          }}
          onViewDetail={(id) => navigate(`/complaints/${id}`)}
          onStreetView={() => selectedShop && openStreetView(selectedShop.latitude, selectedShop.longitude)}
        />
      </div>

      {/* ── Mapillary Street View Panel ── */}
      {streetView && (
        <div
          className="absolute bottom-0 left-0 right-80 z-20 bg-slate-900 border-t-2 border-slate-600 flex flex-col"
          style={{ height: svExpanded ? '60%' : '45%' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FiCamera size={14} className="text-green-400" />
              <span className="text-xs font-semibold text-white">Mapillary Street View</span>
              {mlyLoading && <FiLoader size={12} className="animate-spin text-slate-400" />}
              {mlyError && <span className="text-xs text-amber-400">No imagery nearby</span>}
              {mlyImageId && <span className="text-xs text-slate-400 font-mono">#{mlyImageId.slice(0, 8)}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSvExpanded(v => !v)}
                className="text-slate-400 hover:text-white transition-colors"
                title={svExpanded ? 'Shrink' : 'Expand'}
              >
                {svExpanded ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
              </button>
              <button
                onClick={closeStreetView}
                className="text-slate-400 hover:text-red-400 transition-colors"
                title="Close street view"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Viewer container */}
          <div className="flex-1 relative">
            {mlyLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                <FiLoader size={28} className="animate-spin text-green-400" />
                <p className="text-xs text-slate-400">Searching for street imagery nearby…</p>
              </div>
            ) : mlyError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                <FiCamera size={32} className="text-slate-600" />
                <p className="text-sm text-slate-400">No Mapillary imagery available near this location</p>
                <p className="text-xs text-slate-600">Try clicking a different marker</p>
              </div>
            ) : (
              <div ref={mlyContainer} className="w-full h-full" />
            )}
          </div>
        </div>
      )}

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
            <StatBadge label="Total" value={total} color="#3b82f6" />
            <StatBadge label="Pending" value={pending} color="#f97316" />
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

        {/* Toggle list + Street View button */}
        <div className="mx-4 my-2 flex flex-col gap-2">
          <button
            onClick={() => setShowList((v) => !v)}
            className="flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-600 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <FiList size={13} />
            {showList ? 'Hide Violation List' : 'Show Violation List'}
          </button>
          {selectedShop && (
            <button
              onClick={() => openStreetView(selectedShop.latitude, selectedShop.longitude)}
              className="flex items-center justify-center gap-2 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-semibold text-white transition-colors"
            >
              <FiCamera size={13} />
              Street View — {selectedShop.title?.replace('Illegal Shop: ', '').split('—')[0].trim()}
            </button>
          )}
          {!MLY_TOKEN && (
            <p className="text-xs text-amber-400 text-center px-2">
              ⚠ Add VITE_MAPILLARY_ACCESS_TOKEN to enable street view
            </p>
          )}
        </div>

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

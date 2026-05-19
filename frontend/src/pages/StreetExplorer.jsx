/**
 * Street Explorer — live MinIO bucket browser with full management UI.
 * - Upload files / folders (any depth)
 * - Create new folders
 * - Delete folders or files
 * - Preview images / videos inline
 * Auto-refreshes every 30 s so new data appears without a reload.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFolder, FiFolderMinus, FiFilm, FiImage, FiFile,
  FiChevronRight, FiChevronDown, FiSearch, FiHardDrive,
  FiRefreshCw, FiAlertCircle, FiCamera, FiUploadCloud,
  FiFolderPlus, FiTrash2, FiEye, FiMoreVertical, FiArrowLeft,
} from 'react-icons/fi';
import { minioApi } from '../services/api';
import {
  UploadModal, NewFolderModal, DeleteModal, PreviewModal,
} from '../components/MinioModals';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  { bg:'bg-blue-50',    border:'border-blue-200',    icon:'text-blue-500'    },
  { bg:'bg-emerald-50', border:'border-emerald-200', icon:'text-emerald-500' },
  { bg:'bg-violet-50',  border:'border-violet-200',  icon:'text-violet-500'  },
  { bg:'bg-amber-50',   border:'border-amber-200',   icon:'text-amber-500'   },
  { bg:'bg-rose-50',    border:'border-rose-200',    icon:'text-rose-500'    },
  { bg:'bg-cyan-50',    border:'border-cyan-200',    icon:'text-cyan-500'    },
  { bg:'bg-indigo-50',  border:'border-indigo-200',  icon:'text-indigo-500'  },
];
const POLL_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B';
  const u=['B','KB','MB','GB','TB'];
  const e=Math.min(Math.floor(Math.log2(b)/10),u.length-1);
  return `${(b/1024**e).toFixed(1)} ${u[e]}`;
}
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}
function fileIconType(name='') {
  const ext=name.split('.').pop().toLowerCase();
  if(['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video';
  if(['jpg','jpeg','png','webp','tiff','bmp','gif'].includes(ext)) return 'image';
  return 'file';
}
function prettyName(n='') {
  return n.replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function palette(i){ return PALETTE[i%PALETTE.length]; }

export const COLLECTORS = [
  'أحمد بن خالد الحربي (Ahmed Al-Harbi)',
  'فيصل بن نايف العتيبي (Faisal Al-Otaibi)',
  'عبد الله بن علي الغامدي (Abdullah Al-Ghamdi)',
  'ياسر بن محمد الشمراني (Yasser Al-Shamrani)',
  'رائد بن سليمان المطيري (Raed Al-Mutairi)',
];

export function getFolderCollector(path = '') {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = path.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLLECTORS.length;
  return COLLECTORS[idx];
}

// ─── Tiny action button ───────────────────────────────────────────────────────
function ActionBtn({ icon, label, onClick, danger }) {
  return (
    <button
      title={label}
      onClick={(e)=>{ e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
        danger
          ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {icon}
    </button>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────
function FileRow({ file, indent, onView, onDelete }) {
  const type = fileIconType(file.name);
  const date = fmtDate(file.last_modified);

  // hide .keep placeholders
  if (file.name === '.keep') return null;

  return (
    <div
      className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
      style={{ paddingLeft: `${indent*16+8}px` }}
    >
      {type==='video'
        ? <FiFilm  size={14} className="text-blue-400 flex-shrink-0"/>
        : type==='image'
          ? <FiImage size={14} className="text-emerald-400 flex-shrink-0"/>
          : <FiFile  size={14} className="text-gray-400 flex-shrink-0"/>
      }
      <span className="flex-1 text-sm text-gray-700 truncate" title={file.name}>{file.name}</span>
      {date && <span className="text-xs text-gray-400 mr-2 hidden md:block">{date}</span>}
      <span className="text-xs text-gray-400 mr-1">{fmtBytes(file.size)}</span>
      {/* actions */}
      <ActionBtn icon={<FiEye size={13}/>}    label="View / Preview" onClick={()=>onView(file)} />
      <ActionBtn icon={<FiTrash2 size={13}/>} label="Delete file"    onClick={()=>onDelete({type:'file',path:file.full_key,name:file.name})} danger />
    </div>
  );
}

// ─── Recursive folder node ────────────────────────────────────────────────────
function FolderNode({ node, depth, colorIndex, onAction }) {
  const [open, setOpen] = useState(depth===0 ? false : true);
  const c = depth===0 ? palette(colorIndex) : null;
  const hasContent = node.subfolders?.length>0 || node.files?.filter(f=>f.name!=='.keep').length>0;

  function act(type) {
    if (type==='upload-files')  onAction({ modal:'upload',     targetPath:node.path, mode:'files' });
    if (type==='upload-folder') onAction({ modal:'upload',     targetPath:node.path, mode:'folder' });
    if (type==='new-folder')    onAction({ modal:'new-folder', parentPath:node.path });
    if (type==='delete-folder') onAction({ modal:'delete',     item:{type:'folder',path:node.path,name:node.name} });
  }

  // ── TOP-LEVEL card ─────────────────────────────────────────────────────────
  if (depth===0) {
    return (
      <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
        open ? `${c.border} shadow-md` : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
      }`}>
        {/* header */}
        <div
          className={`flex items-center gap-3 px-5 py-4 cursor-pointer select-none group ${open?c.bg:'bg-white hover:bg-gray-50'}`}
          onClick={()=>setOpen(v=>!v)}
        >
          {open ? <FiChevronDown size={16} className="text-gray-400 flex-shrink-0"/>
                : <FiChevronRight size={16} className="text-gray-400 flex-shrink-0"/>}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
            <FiFolder size={18} className={c.icon}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{prettyName(node.name)}</p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{node.path}</p>
            <p className="text-[11px] text-blue-600 font-medium mt-1">
              Collector: <span className="text-gray-700 font-semibold">{getFolderCollector(node.path)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 mr-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
            <ActionBtn icon={<FiUploadCloud size={14}/>} label="Upload files here"    onClick={()=>act('upload-files')} />
            <ActionBtn icon={<FiMoreVertical size={14}/>} label="Upload folder here"  onClick={()=>act('upload-folder')} />
            <ActionBtn icon={<FiFolderPlus size={14}/>}  label="New subfolder"        onClick={()=>act('new-folder')} />
            <ActionBtn icon={<FiTrash2 size={14}/>}      label="Delete folder"        onClick={()=>act('delete-folder')} danger />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-800">{node.total_files} file{node.total_files!==1?'s':''}</p>
            <p className="text-xs text-gray-400">{fmtBytes(node.total_size)}</p>
          </div>
        </div>

        {/* body */}
        {open && (
          <div className="border-t border-gray-100 bg-white px-3 py-2 space-y-0.5">
            {!hasContent && (
              <p className="text-sm text-gray-400 italic py-2 px-2">Empty folder.</p>
            )}
            {node.files?.map((f,i)=>(
              <FileRow key={i} file={f} indent={0}
                onView={file=>onAction({modal:'preview',file})}
                onDelete={item=>onAction({modal:'delete',item})}
              />
            ))}
            {node.subfolders?.map((sf)=>(
              <FolderNode key={sf.path} node={sf} depth={1} colorIndex={colorIndex} onAction={onAction}/>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── INNER folder (inline row) ──────────────────────────────────────────────
  const indentPx = (depth-1)*16;
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer select-none group"
        style={{ paddingLeft:`${indentPx+8}px` }}
        onClick={()=>setOpen(v=>!v)}
      >
        {open ? <FiChevronDown  size={12} className="text-gray-400 flex-shrink-0"/>
              : <FiChevronRight size={12} className="text-gray-400 flex-shrink-0"/>}
        {open
          ? <FiFolderMinus size={15} className="text-gray-400 flex-shrink-0"/>
          : <FiFolder      size={15} className="text-gray-500 flex-shrink-0"/>}
        <span className="flex-1 text-sm font-medium text-gray-700">{prettyName(node.name)}</span>
        {/* inline actions */}
        <div className="flex items-center gap-0.5 mr-1 opacity-0 group-hover:opacity-100" onClick={e=>e.stopPropagation()}>
          <ActionBtn icon={<FiUploadCloud size={12}/>} label="Upload files" onClick={()=>act('upload-files')} />
          <ActionBtn icon={<FiFolderPlus size={12}/>}  label="New subfolder" onClick={()=>act('new-folder')} />
          <ActionBtn icon={<FiTrash2 size={12}/>}      label="Delete" onClick={()=>act('delete-folder')} danger />
        </div>
        <span className="text-xs text-gray-400 mr-1">{node.total_files} files</span>
        <span className="text-xs text-gray-400">{fmtBytes(node.total_size)}</span>
      </div>
      {open && (
        <div style={{ paddingLeft:`${indentPx+24}px` }} className="border-l border-gray-100 ml-2">
          {!hasContent && <p className="text-xs text-gray-400 italic py-1 px-2">Empty</p>}
          {node.files?.map((f,i)=>(
            <FileRow key={i} file={f} indent={0}
              onView={file=>onAction({modal:'preview',file})}
              onDelete={item=>onAction({modal:'delete',item})}
            />
          ))}
          {node.subfolders?.map(sf=>(
            <FolderNode key={sf.path} node={sf} depth={depth+1} colorIndex={colorIndex} onAction={onAction}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-gray-200 rounded"/>
        <div className="w-10 h-10 bg-gray-200 rounded-xl"/>
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded w-48"/>
          <div className="h-2.5 bg-gray-100 rounded w-28"/>
        </div>
        <div className="space-y-1">
          <div className="h-3.5 bg-gray-200 rounded w-16 ml-auto"/>
          <div className="h-2.5 bg-gray-100 rounded w-12 ml-auto"/>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StreetExplorer() {
  const navigate = useNavigate();
  const [folders,      setFolders]      = useState([]);
  const [totalFiles,   setTotalFiles]   = useState(0);
  const [totalSize,    setTotalSize]    = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [search,       setSearch]       = useState('');
  const [selectedCollector, setSelectedCollector] = useState('');

  // modal state — one object controls all modals
  const [modal, setModal] = useState(null);
  // modal: null
  //   | { modal:'upload',     targetPath, mode }
  //   | { modal:'new-folder', parentPath }
  //   | { modal:'delete',     item:{type,path,name} }
  //   | { modal:'preview',    file }

  const pollRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent=false) => {
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const { data } = await minioApi.listAllFolders();
      setFolders(data.folders || []);
      setTotalFiles(data.total_files || 0);
      setTotalSize(data.total_size  || 0);
      setLastRefresh(new Date());
    } catch(err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load bucket data.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(()=>{
    fetchData(false);
    pollRef.current = setInterval(()=>fetchData(true), POLL_MS);
    return ()=>clearInterval(pollRef.current);
  }, [fetchData]);

  // ── action dispatcher ──────────────────────────────────────────────────────
  function onAction(payload) { setModal(payload); }
  function closeModal()      { setModal(null); }
  function afterMutation()   { fetchData(false); }

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = folders.filter(f => {
    const collector = getFolderCollector(f.path);
    const matchesCollector = !selectedCollector || collector === selectedCollector;
    
    if (!search) return matchesCollector;
    const q = search.toLowerCase();
    const matchesSearch = f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    
    return matchesSearch && matchesCollector;
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/data-house')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to Data House
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow">
            <FiCamera size={22} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Street Explorer</h1>
            <p className="text-sm text-gray-500 mt-0.5">360° capture sessions — Madinah city street data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>}
          {/* Global actions */}
          <button
            onClick={()=>setModal({modal:'new-folder',parentPath:''})}
            className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-100 transition-colors"
          >
            <FiFolderPlus size={14}/> New folder
          </button>
          <button
            onClick={()=>setModal({modal:'upload',targetPath:'',mode:'files'})}
            className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 hover:bg-blue-100 transition-colors"
          >
            <FiUploadCloud size={14}/> Upload
          </button>
          <button
            onClick={()=>fetchData(false)} disabled={loading||refreshing}
            className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={refreshing?'animate-spin':''}/>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5"/>
          <div><p className="font-medium">Could not load bucket data</p><p className="text-red-400 text-xs mt-0.5">{error}</p></div>
        </div>
      )}

      {/* Live badge */}
      {!error && !loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
          Live · <strong>madinah-street-data</strong> · auto-refreshes every 30 s
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Folders',     value:loading?'—':folders.length, icon:<FiFolder    size={16} className="text-blue-500"/>,   bg:'bg-blue-50 border-blue-100'       },
          { label:'Total Files', value:loading?'—':totalFiles,     icon:<FiFilm      size={16} className="text-emerald-500"/>, bg:'bg-emerald-50 border-emerald-100' },
          { label:'Storage',     value:loading?'—':fmtBytes(totalSize), icon:<FiHardDrive size={16} className="text-violet-500"/>, bg:'bg-violet-50 border-violet-100' },
        ].map(s=>(
          <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-gray-500 font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search folders by name or path..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        {/* Collector Filter */}
        <div className="w-full md:w-72">
          <select
            value={selectedCollector}
            onChange={(e) => setSelectedCollector(e.target.value)}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All Data Collectors</option>
            {COLLECTORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        {(search || selectedCollector) && (
          <button
            onClick={() => { setSearch(''); setSelectedCollector(''); }}
            className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-sm font-semibold rounded-xl transition-all"
          >
            Reset
          </button>
        )}

        {!loading && (
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap ml-auto self-center">
            {filtered.length} of {folders.length} folder{folders.length!==1?'s':''}
          </span>
        )}
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {loading ? [0,1,2,3].map(i=><Skeleton key={i}/>)
        : filtered.length===0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <FiFolder size={40} className="text-gray-200 mx-auto mb-3"/>
            {search
              ? <p className="text-gray-500 font-medium">No folders match "<span className="font-semibold">{search}</span>"</p>
              : <><p className="text-gray-500 font-medium">Bucket is empty.</p>
                  <p className="text-gray-400 text-sm mt-1">Use the <strong>Upload</strong> or <strong>New folder</strong> button above.</p></>
            }
          </div>
        ) : filtered.map((f,i)=>(
          <FolderNode key={f.path} node={f} depth={0} colorIndex={i} onAction={onAction}/>
        ))}
      </div>

      {/* ── Modals ── */}
      {modal?.modal==='upload' && (
        <UploadModal
          targetPath={modal.targetPath}
          onClose={closeModal}
          onSuccess={afterMutation}
        />
      )}
      {modal?.modal==='new-folder' && (
        <NewFolderModal
          parentPath={modal.parentPath}
          onClose={closeModal}
          onSuccess={afterMutation}
        />
      )}
      {modal?.modal==='delete' && (
        <DeleteModal
          item={modal.item}
          onClose={closeModal}
          onSuccess={afterMutation}
        />
      )}
      {modal?.modal==='preview' && (
        <PreviewModal
          file={modal.file}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

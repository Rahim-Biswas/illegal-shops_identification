/**
 * MinioModals.jsx — Upload / New-Folder / Delete / Preview modals
 * for the Street Explorer page.
 */
import { useState, useRef } from 'react';
import {
  FiX, FiUploadCloud, FiFolder, FiTrash2,
  FiAlertTriangle, FiFilm, FiImage, FiFile,
  FiLoader, FiFolderPlus, FiCheckCircle,
} from 'react-icons/fi';
import { minioApi } from '../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB','TB'];
  const e = Math.min(Math.floor(Math.log2(b)/10), u.length-1);
  return `${(b/1024**e).toFixed(1)} ${u[e]}`;
}
function fileType(name=''){
  const ext = name.split('.').pop().toLowerCase();
  if(['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video';
  if(['jpg','jpeg','png','webp','tiff','bmp','gif'].includes(ext)) return 'image';
  return 'file';
}

// ── shared backdrop ───────────────────────────────────────────────────────────
function Backdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. UPLOAD MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function UploadModal({ targetPath, onClose, onSuccess }) {
  const [mode, setMode] = useState('files');   // 'files' | 'folder'
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef();

  const label = targetPath ? `…/${targetPath.split('/').slice(-1)[0]}` : 'bucket root';

  function pickFiles(fileList) {
    setPicked(Array.from(fileList));
    setError('');
  }

  async function handleUpload() {
    if (!picked.length) { setError('Select at least one file.'); return; }
    setUploading(true); setError('');

    try {
      if (mode === 'folder') {
        // Each file has webkitRelativePath e.g. "MyFolder/sub/file.mp4"
        const groups = {};
        for (const file of picked) {
          const rel   = file.webkitRelativePath || file.name;
          const parts = rel.split('/');
          const fname = parts.pop();
          const dir   = (targetPath ? `${targetPath}/` : '') + (parts.join('/') || '');
          const key   = dir || (targetPath || '');
          if (!groups[key]) groups[key] = [];
          groups[key].push({ file, fname });
        }
        const keys = Object.keys(groups);
        for (let i = 0; i < keys.length; i++) {
          const folderKey = keys[i];
          const fd = new FormData();
          groups[folderKey].forEach(({ file, fname }) => fd.append('files', file, fname));
          setProgress(`Uploading batch ${i+1}/${keys.length}…`);
          await minioApi.uploadFiles(folderKey, fd);
        }
      } else {
        const fd = new FormData();
        picked.forEach(f => fd.append('files', f));
        setProgress('Uploading…');
        await minioApi.uploadFiles(targetPath || '', fd);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed.');
    } finally {
      setUploading(false); setProgress('');
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiUploadCloud size={18} className="text-blue-500" />
            <span className="font-semibold text-gray-900">Upload to <span className="text-blue-600">{label}</span></span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* mode toggle */}
          <div className="flex gap-2">
            {['files','folder'].map(m => (
              <button key={m} onClick={() => { setMode(m); setPicked([]); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  mode===m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {m === 'files' ? '📄 Files' : '📁 Folder'}
              </button>
            ))}
          </div>

          {/* drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pickFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <FiUploadCloud size={32} className="mx-auto text-gray-300 mb-2" />
            {picked.length
              ? <p className="text-sm text-gray-700 font-medium">{picked.length} file{picked.length>1?'s':''} selected ({fmtBytes(picked.reduce((a,f)=>a+f.size,0))})</p>
              : <p className="text-sm text-gray-400">Drop {mode==='folder'?'a folder':'files'} here or <span className="text-blue-500 underline">browse</span></p>
            }
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            {...(mode==='folder' ? { webkitdirectory:'', directory:'' } : {})}
            className="hidden"
            onChange={e => pickFiles(e.target.files)}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {uploading && <p className="text-sm text-blue-500">{progress}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !picked.length}
            className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {uploading && <FiLoader size={14} className="animate-spin" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NEW FOLDER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function NewFolderModal({ parentPath, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [busy, setBusy]  = useState(false);
  const [error, setError] = useState('');

  const label = parentPath ? `inside "${parentPath.split('/').slice(-1)[0]}"` : 'at bucket root';

  async function handleCreate() {
    const trimmed = name.trim().replace(/\//g,'');
    if (!trimmed) { setError('Folder name cannot be empty.'); return; }
    setBusy(true); setError('');
    try {
      const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      await minioApi.createFolder(fullPath);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create folder.');
    } finally { setBusy(false); }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiFolderPlus size={18} className="text-emerald-500" />
            <span className="font-semibold text-gray-900">New folder <span className="text-gray-400 font-normal text-sm">{label}</span></span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key==='Enter' && handleCreate()}
            placeholder="folder-name"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreate} disabled={busy}
            className="px-5 py-2 text-sm rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            {busy && <FiLoader size={14} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DELETE MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function DeleteModal({ item, onClose, onSuccess }) {
  // item = { type:'folder'|'file', path, name }
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setBusy(true); setError('');
    try {
      await minioApi.deletePath(item.path);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Delete failed.');
    } finally { setBusy(false); }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={18} className="text-red-500" />
            <span className="font-semibold text-gray-900">Confirm Delete</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18}/></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">
            Delete <span className="font-semibold">{item.type === 'folder' ? 'folder' : 'file'}</span>{' '}
            "<span className="font-mono text-red-600">{item.name}</span>"?
          </p>
          {item.type === 'folder' && (
            <p className="text-xs text-gray-400 mt-1">All files inside will be permanently removed.</p>
          )}
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleDelete} disabled={busy}
            className="px-5 py-2 text-sm rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            {busy ? <FiLoader size={14} className="animate-spin" /> : <FiTrash2 size={14}/>}
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FILE PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════
export function PreviewModal({ file, onClose }) {
  // file = { name, full_key, size, last_modified }
  const type = fileType(file.name);
  const url  = minioApi.getStreamUrl(file.full_key);

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {type==='video' ? <FiFilm size={16} className="text-blue-500 flex-shrink-0"/>
              : type==='image' ? <FiImage size={16} className="text-emerald-500 flex-shrink-0"/>
              : <FiFile size={16} className="text-gray-400 flex-shrink-0"/>}
            <span className="font-semibold text-gray-900 truncate text-sm">{file.name}</span>
            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{fmtBytes(file.size)}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <a href={url} download={file.name}
              className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5">
              ⬇ Download
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18}/></button>
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-900 p-4">
          {type === 'image' && (
            <img src={url} alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl" />
          )}
          {type === 'video' && (
            <video controls autoPlay className="max-w-full max-h-full rounded-lg shadow-xl"
              style={{ maxHeight: '70vh' }}>
              <source src={url} />
              Your browser does not support video playback.
            </video>
          )}
          {type === 'file' && (
            <div className="text-center text-white">
              <FiFile size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-gray-400 mb-4">No preview available for this file type.</p>
              <a href={url} download={file.name}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium">
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

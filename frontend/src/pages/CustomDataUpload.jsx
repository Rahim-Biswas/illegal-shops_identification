import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUploadCloud, FiFile, FiCheckCircle, FiXCircle, 
  FiDatabase, FiList, FiGrid, FiFolder, FiTrash2, FiEye, FiArrowLeft 
} from 'react-icons/fi';
import { customDataApi } from '../services/api';

export default function CustomDataUpload() {
  const navigate = useNavigate();
  const [filesList, setFilesList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'structure'

  useEffect(() => {
    fetchFilesList();
  }, []);

  const fetchFilesList = async () => {
    try {
      const response = await customDataApi.listFiles();
      setFilesList(response.data.files || []);
    } catch (err) {
      console.error("Error fetching files list:", err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await customDataApi.uploadFile(formData);
      const data = response.data;
      setUploadFile(null);
      await fetchFilesList();
      
      // Auto-select the newly uploaded file for preview
      handleSelectFile(data.table_info.filename);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to upload and parse file');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFile = async (filename) => {
    setSelectedFile(filename);
    setLoadingPreview(true);
    setPreviewData(null);
    setError(null);

    try {
      const response = await customDataApi.previewFile(filename);
      setPreviewData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDeleteFile = async (filename, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await customDataApi.deleteFile(filename);
      await fetchFilesList();
      if (selectedFile === filename) {
        setSelectedFile(null);
        setPreviewData(null);
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      alert(err.response?.data?.detail || err.message || 'Failed to delete file');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/data-house')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to Data House
        </button>
      </div>

      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow">
            <FiUploadCloud size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Data Upload & View</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Upload, view, and analyze Excel or CSV files in MinIO storage.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Sidebar: Upload & List (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upload Card */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiUploadCloud className="text-amber-500" /> Upload New File
            </h2>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/50 flex flex-col items-center justify-center text-center">
              <FiFile size={32} className="text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 mb-4">CSV or Excel (xlsx) formats supported</p>
              
              <label className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
                Choose File
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                />
              </label>

              {uploadFile && (
                <div className="mt-4 w-full">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between text-left shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{uploadFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="ml-2 bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {uploading ? 'Parsing...' : 'Upload'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && !previewData && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-xs">
                <FiXCircle size={14} className="shrink-0" />
                <span className="font-medium truncate">{error}</span>
              </div>
            )}
          </div>

          {/* Files List Card */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiFolder className="text-amber-500" /> Existing Datasets
            </h2>
            {filesList.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No files uploaded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {filesList.map((fileItem) => {
                  const isSelected = selectedFile === fileItem.filename;
                  return (
                    <div
                      key={fileItem.filename}
                      onClick={() => handleSelectFile(fileItem.filename)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-50/50 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <FiFile className={isSelected ? 'text-amber-600' : 'text-gray-400'} size={18} />
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-900' : 'text-gray-700'}`}>
                            {fileItem.filename}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(fileItem.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteFile(fileItem.filename, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete File"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: View & Preview (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedFile ? (
            <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <FiGrid size={48} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">No Dataset Selected</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Select an existing dataset from the sidebar or upload a new CSV/Excel file to start exploring the table structure and fields.
              </p>
            </div>
          ) : loadingPreview ? (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4"></div>
              <p className="text-sm text-gray-500">Loading dataset preview and metadata...</p>
            </div>
          ) : previewData ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Dataset Header & Tabs */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 truncate max-w-md">{previewData.table_info.filename}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                    <span>Rows: <strong className="text-gray-700">{previewData.table_info.total_rows.toLocaleString()}</strong></span>
                    <span>Columns: <strong className="text-gray-700">{previewData.table_info.total_columns}</strong></span>
                    <span>Size: <strong className="text-gray-700">{(previewData.table_info.file_size_bytes / 1024).toFixed(1)} KB</strong></span>
                  </div>
                </div>
                
                {/* Navigation Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'preview' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-950'
                    }`}
                  >
                    <FiEye size={13} /> Data Viewer
                  </button>
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'structure' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-950'
                    }`}
                  >
                    <FiList size={13} /> Table Structure
                  </button>
                </div>
              </div>

              {/* Tab 1: Data Viewer (Actual Data Table) */}
              {activeTab === 'preview' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiGrid className="text-amber-500" />
                      <h3 className="font-semibold text-gray-900">Tabular Data Viewer</h3>
                    </div>
                    <span className="text-xs text-gray-400">Showing first 20 rows</span>
                  </div>
                  
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-white shadow-sm z-10">
                          {previewData.fields_info.map((field) => (
                            <th key={field.name} className="px-4 py-3 whitespace-nowrap font-bold">
                              <div className="flex flex-col">
                                <span className="text-gray-900">{field.name}</span>
                                <span className="text-[10px] text-gray-400 normal-case mt-0.5">{field.type}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.preview_rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-gray-50 transition-colors">
                            {previewData.fields_info.map((field) => {
                              const cellValue = row[field.name];
                              const isSpatial = field.is_latitude || field.is_longitude;
                              return (
                                <td 
                                  key={field.name} 
                                  className={`px-4 py-3 whitespace-nowrap max-w-[200px] truncate ${
                                    isSpatial ? 'bg-emerald-50/30 text-emerald-800 font-semibold' : 'text-gray-600'
                                  }`}
                                >
                                  {cellValue !== null ? String(cellValue) : <em className="text-gray-300">null</em>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Table Structure (Fields Info) */}
              {activeTab === 'structure' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center gap-2">
                    <FiList className="text-amber-500" />
                    <h3 className="font-semibold text-gray-900">Fields & Metadata</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Field Name</th>
                          <th className="px-6 py-4">Inferred Type</th>
                          <th className="px-6 py-4">Geospatial Attribute</th>
                          <th className="px-6 py-4">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.fields_info.map((field, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {field.name}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {field.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {field.is_latitude ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                  <FiCheckCircle size={12} /> Latitude (Y)
                                </span>
                              ) : field.is_longitude ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                  <FiCheckCircle size={12} /> Longitude (X)
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono bg-gray-50/30 max-w-[250px] truncate">
                              {field.sample_values.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center text-red-700">
              Failed to load preview details. Please select another file.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

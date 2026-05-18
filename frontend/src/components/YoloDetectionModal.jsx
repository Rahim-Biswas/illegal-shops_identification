import React, { useState, useEffect } from 'react';
import {
  FiX, FiCpu, FiFolder, FiFile, FiCheckSquare,
  FiSquare, FiPlay, FiLoader, FiAlertTriangle, FiImage, FiVideo
} from 'react-icons/fi';
import { minioApi, yoloApi } from '../services/api';

function Backdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

export default function YoloDetectionModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: Setup, 2: Processing, 3: Results
  
  // Setup State
  const [folders, setFolders] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Model Config
  const [conf, setConf] = useState(0.50);
  const [iou, setIou] = useState(0.45);

  // Job State
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // 'queued', 'running', 'done', 'error'
  const [jobData, setJobData] = useState(null);
  const [error, setError] = useState('');

  // Fetch MinIO files on mount
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await minioApi.listAllFolders();
        setFolders(res.data.folders || []);
      } catch (err) {
        console.error("Failed to fetch MinIO files", err);
      } finally {
        setLoadingFiles(false);
      }
    }
    fetchFiles();
  }, []);

  // Poll Job Status
  useEffect(() => {
    let interval;
    if (jobId && (jobStatus === 'queued' || jobStatus === 'running')) {
      interval = setInterval(async () => {
        try {
          const res = await yoloApi.pollJob(jobId);
          setJobData(res.data);
          setJobStatus(res.data.status);
          if (res.data.status === 'done' || res.data.status === 'error') {
            clearInterval(interval);
            setStep(3);
          }
        } catch (err) {
          console.error("Failed to poll job", err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const toggleFile = (fileKey) => {
    setSelectedFiles(prev => 
      prev.includes(fileKey) ? prev.filter(k => k !== fileKey) : [...prev, fileKey]
    );
  };

  const startDetection = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    try {
      setError('');
      const res = await yoloApi.detect(selectedFiles, parseFloat(conf), parseFloat(iou));
      setJobId(res.data.job_id);
      setJobStatus(res.data.status);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to start detection.');
    }
  };

  // Helper to render file tree recursively
  const renderTree = (nodes) => {
    return nodes.map(node => (
      <div key={node.path} className="ml-4 mt-2">
        <div className="flex items-center gap-2 text-gray-700 font-medium mb-1">
          <FiFolder className="text-blue-500" /> {node.name}
        </div>
        {node.subfolders && node.subfolders.length > 0 && renderTree(node.subfolders)}
        {node.files && node.files.length > 0 && (
          <div className="ml-6 space-y-1">
            {node.files.map(file => {
              const isSelected = selectedFiles.includes(file.full_key);
              const ext = file.name.split('.').pop().toLowerCase();
              const isVideo = ['mp4','mov','avi'].includes(ext);
              const isImage = ['jpg','jpeg','png','webp'].includes(ext);
              if (!isVideo && !isImage) return null;

              return (
                <div 
                  key={file.full_key} 
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                  }`}
                  onClick={() => toggleFile(file.full_key)}
                >
                  {isSelected ? <FiCheckSquare className="text-blue-600 flex-shrink-0" /> : <FiSquare className="text-gray-400 flex-shrink-0" />}
                  {isVideo ? <FiVideo className="text-purple-500 flex-shrink-0" /> : <FiImage className="text-emerald-500 flex-shrink-0" />}
                  <span className="text-sm truncate" title={file.name}>{file.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ));
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)' }}>
          <div className="flex items-center gap-3 text-white">
            <FiCpu size={20} className="text-blue-400" />
            <h2 className="font-bold text-lg">YOLO AI Detection</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <FiX size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex bg-gray-50">
          
          {/* STEP 1: SETUP */}
          {step === 1 && (
            <div className="flex w-full h-full">
              {/* Left sidebar: File Selection */}
              <div className="w-1/2 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Select Input Data</h3>
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                    {selectedFiles.length} selected
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <FiLoader className="animate-spin mr-2" /> Loading bucket...
                    </div>
                  ) : folders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <FiFolder size={32} className="mb-2 opacity-50" />
                      <p>No folders found in MinIO bucket.</p>
                    </div>
                  ) : (
                    renderTree(folders)
                  )}
                </div>
              </div>

              {/* Right sidebar: Config */}
              <div className="w-1/2 flex flex-col p-6 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Model Configuration</h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Threshold</label>
                        <input 
                          type="number" 
                          step="0.05" min="0.01" max="1.0"
                          value={conf} 
                          onChange={e => setConf(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">IOU Threshold</label>
                        <input 
                          type="number" 
                          step="0.05" min="0.01" max="1.0"
                          value={iou} 
                          onChange={e => setIou(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                      <FiAlertTriangle className="flex-shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={startDetection}
                    disabled={selectedFiles.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiPlay /> Run Detection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 2 && (
            <div className="flex w-full h-full items-center justify-center flex-col p-8">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center relative z-10 border-4 border-blue-50">
                  <FiLoader size={40} className="text-blue-600 animate-spin" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Analyzing Data...</h3>
              
              {jobData?.progress ? (
                <div className="w-full max-w-md mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                    <span>Processing {jobData.progress.file || '...'}</span>
                    <span>{jobData.progress.current} / {jobData.progress.total}</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(jobData.progress.current / jobData.progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Initializing model and resources...</p>
              )}
            </div>
          )}

          {/* STEP 3: RESULTS */}
          {step === 3 && (
            <div className="flex w-full h-full flex-col">
              {jobStatus === 'error' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <FiAlertTriangle size={64} className="text-red-500 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Detection Failed</h3>
                  <p className="text-gray-600 max-w-md">{jobData?.error || 'Unknown error occurred.'}</p>
                  <button 
                    onClick={() => setStep(1)}
                    className="mt-6 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {/* Results Header / Stats */}
                  <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">Detection Complete</h3>
                        <p className="text-sm text-gray-500">
                          Processed {jobData?.summary?.processed} files in MinIO bucket.
                        </p>
                      </div>
                      <button 
                        onClick={() => { setStep(1); setJobId(null); setJobStatus(null); setSelectedFiles([]); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        New Analysis
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-blue-500 text-sm font-semibold mb-1">Total Detections</div>
                        <div className="text-3xl font-bold text-gray-900">{jobData?.summary?.total_detections || 0}</div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="text-emerald-500 text-sm font-semibold mb-1">Files Processed</div>
                        <div className="text-3xl font-bold text-gray-900">{jobData?.summary?.processed || 0}</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <div className="text-amber-600 text-sm font-semibold mb-1">Files Skipped</div>
                        <div className="text-3xl font-bold text-gray-900">{jobData?.summary?.skipped || 0}</div>
                      </div>
                      <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                        <div className="text-rose-500 text-sm font-semibold mb-1">Errors</div>
                        <div className="text-3xl font-bold text-gray-900">{jobData?.summary?.errors || 0}</div>
                      </div>
                    </div>
                    
                    {/* Class Counts tags */}
                    {jobData?.summary?.class_counts && Object.keys(jobData.summary.class_counts).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(jobData.summary.class_counts).map(([cls, count]) => (
                          <span key={cls} className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700">
                            {cls}: <span className="text-blue-600">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Results Gallery */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {jobData?.results?.map((res, idx) => {
                        if (res.status !== 'ok') return null;
                        
                        if (res.type === 'video') {
                          return (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                              <div className="bg-gray-900 aspect-video flex items-center justify-center relative">
                                <FiVideo size={48} className="text-gray-600" />
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                  Video
                                </div>
                              </div>
                              <div className="p-4 flex-1">
                                <p className="font-semibold text-sm truncate mb-2" title={res.file}>{res.file}</p>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Detections: <strong className="text-gray-900">{res.detection_count}</strong></span>
                                  <span>Frames Sampled: <strong className="text-gray-900">{res.frames_sampled}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Image result
                        const imgUrl = yoloApi.getResultImageUrl(jobId, res.file);
                        return (
                          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition">
                            <div className="bg-gray-100 aspect-video relative group">
                              <img 
                                src={imgUrl} 
                                alt={res.file} 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a 
                                  href={imgUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100"
                                >
                                  View Full Image
                                </a>
                              </div>
                            </div>
                            <div className="p-4 flex-1">
                              <p className="font-semibold text-sm truncate mb-2" title={res.file}>{res.file}</p>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                                  {res.detection_count} Detections
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

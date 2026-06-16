/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Camera, 
  MapPin, 
  Loader2, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ScanLine, 
  User, 
  Sparkles,
  Info
} from 'lucide-react';
import { Teacher, AttendanceRecord, GPSLocation, Gender } from '../types';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  onSaveScan: (teacherId: string, type: 'in' | 'out', signatureBase64: string, location?: GPSLocation) => void;
}

export default function QuickScanModal({
  isOpen,
  onClose,
  teachers,
  attendanceRecords,
  onSaveScan
}: QuickScanModalProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [scanType, setScanType] = useState<'in' | 'out'>('in');
  
  // Camera & Image state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedSignature, setProcessedSignature] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter out teachers who have already completed both check-in & check-out for today
  const eligibleTeachers = teachers.filter(t => {
    const record = attendanceRecords.find(r => r.teacherId === t.id);
    if (!record) return true;
    const hasIn = record.timeIn && record.signatureIn;
    const hasOut = record.timeOut && record.signatureOut;
    return !hasIn || !hasOut;
  });

  // Default select the first eligible teacher
  useEffect(() => {
    if (eligibleTeachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(eligibleTeachers[0].id);
    }
  }, [eligibleTeachers, selectedTeacherId]);

  // Adjust default scan type based on selection
  useEffect(() => {
    if (selectedTeacherId) {
      const record = attendanceRecords.find(r => r.teacherId === selectedTeacherId);
      if (record && record.timeIn && record.signatureIn) {
        setScanType('out');
      } else {
        setScanType('in');
      }
    }
  }, [selectedTeacherId, attendanceRecords]);

  // Clean up camera stream on close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    setProcessedSignature(null);
    setCameraActive(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        throw new Error('កម្មវិធីរុករកនេះមិនគាំទ្រកាមេរ៉ាស្កែនទេ។');
      }
    } catch (err: any) {
      console.error('Camera stream access failed:', err);
      setCameraError('មិនអាចបើកកាមេរ៉ាបានទេ ឬការអនុញ្ញាតត្រូវបានរារាំងក្នុងប្រព័ន្ធ (IFrame Restrict)។ សូមប្រើវិធី "ផ្ទុកឡើងរូបភាពហត្ថលេខា" ជំនួសវិញ។');
      setCameraActive(false);
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const switchTab = (tab: 'camera' | 'upload') => {
    setActiveTab(tab);
    if (tab === 'upload') {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Process and extract signature line
  const processSignatureImage = (imgSrc: string) => {
    setScannerActive(true);
    
    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fit to standard scale
      canvas.width = 400;
      canvas.height = 200;

      // Draw original centered and scaled
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Extract raw pixels for black-and-white threshold filtering
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Calculate dynamic average brightness to adapt threshold to different lighting environments
      let totalBrightness = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const avgBrightness = totalBrightness / pixelCount;

      // Ink strokes should be darker than the background paper.
      // We set the threshold at 85% of average brightness, clamped safely between 85 and 190.
      let threshold = avgBrightness * 0.85;
      if (threshold < 85) threshold = 85;
      if (threshold > 190) threshold = 190;

      // Process pixel coordinates
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // RGB Luminance brightness calculation
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Threshold: is it a dark stroke (pen pen signature)?
        if (brightness < threshold) {
          // Replace stroke with our cohesive beautiful brand green color (#4A5D45 -> RGB 74, 93, 69)
          data[i] = 74;     // Red
          data[i + 1] = 93;  // Green
          data[i + 2] = 69;  // Blue
          data[i + 3] = 255; // Fully opaque
        } else {
          // Erase standard light backgrounds (white paper reflection)
          data[i + 3] = 0; // Translucent / Alpha mask
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const finalResult = canvas.toDataURL('image/png');
      
      // Simulate scan line travel delay for polished UX feel
      setTimeout(() => {
        setProcessedSignature(finalResult);
        setScannerActive(false);
      }, 1200);
    };
  };

  // Capture current video window frame
  const captureFrame = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal alignment for standard screen preview symmetry
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Reset transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    stopCamera();
    
    // Process ink extraction immediately
    processSignatureImage(dataUrl);
  };

  // Handle uploaded image files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setCapturedImage(res);
      processSignatureImage(res);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file selection click
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleResetScan = () => {
    setCapturedImage(null);
    setProcessedSignature(null);
    setScannerActive(false);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleConfirmSave = () => {
    if (!selectedTeacherId || !processedSignature) return;
    onSaveScan(selectedTeacherId, scanType, processedSignature, undefined);
    onClose();
  };

  if (!isOpen) return null;

  const currentTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="quick-scan-overlay">
      <div 
        className="bg-white rounded-[32px] shadow-xl border border-brand-clay max-w-xl w-full overflow-hidden flex flex-col md:max-h-[92vh] bg-gradient-to-b from-white to-brand-sand-light/20"
        id="quick-scan-container"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-clay bg-brand-sand-light">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-brand-green/10 text-brand-green rounded-full border border-brand-green/20 flex items-center gap-1.5 animate-pulse">
              <ScanLine className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-green text-base md:text-lg">
                ម៉ាស៊ីនស្កែនវត្តមាន (ហត្ថលេខាផ្ទាល់ក្រដាស)
              </h3>
              <p className="text-[11px] text-brand-brown-muted">ប្រព័ន្ធស្កែនដៅវីធីវត្តមានរហ័ស តាមរយៈការថតរូបហត្ថលេខាផ្ទាល់ក្រដាស</p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-full text-brand-brown-muted hover:text-brand-brown hover:bg-brand-sand transition-colors"
            id="close-quick-scan-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          
          {/* Step 1: Select Teacher and Status */}
          <div className="bg-brand-sand/30 border border-brand-clay p-4 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-brown-muted flex items-center gap-1 uppercase tracking-wider">
                <User className="h-3 w-3 text-brand-green" />
                <span>ជ្រើសរើសឈ្មោះលោកគ្រូ/អ្នកគ្រូ៖</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-clay bg-white rounded-xl text-brand-brown focus:outline-none focus:border-brand-green font-bold cursor-pointer"
                id="scan-teacher-select"
              >
                {eligibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.school} - {t.role})
                  </option>
                ))}
                {eligibleTeachers.length === 0 && (
                  <option value="">-- វត្តមានត្រូវបានស្រង់បញ្ជប់រួចរាល់ --</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-brown-muted flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-brand-accent" />
                <span>កំណត់ប្រភេទវត្តមាន៖</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScanType('in')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                    scanType === 'in'
                      ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
                      : 'bg-white text-brand-brown border-brand-clay hover:bg-brand-sand-light'
                  }`}
                  id="scan-type-in-btn"
                >
                  វត្តមានចូល
                </button>
                <button
                  type="button"
                  onClick={() => setScanType('out')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                    scanType === 'out'
                      ? 'bg-brand-green text-white border-brand-green shadow-sm'
                      : 'bg-white text-brand-brown border-brand-clay hover:bg-brand-sand-light'
                  }`}
                  id="scan-type-out-btn"
                >
                  វត្តមានចេញ
                </button>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-brand-clay print:hidden">
            <button
              onClick={() => switchTab('camera')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex justify-center items-center gap-1.5 ${
                activeTab === 'camera' 
                  ? 'border-brand-green text-brand-green' 
                  : 'border-transparent text-brand-brown-muted hover:text-brand-brown'
              }`}
              id="camera-scan-tab"
            >
              <Camera className="w-4.5 h-4.5" />
              <span>ស្កែនផ្ទាល់ពីកាមេរ៉ា</span>
            </button>
            <button
              onClick={() => switchTab('upload')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex justify-center items-center gap-1.5 ${
                activeTab === 'upload' 
                  ? 'border-brand-green text-brand-green' 
                  : 'border-transparent text-brand-brown-muted hover:text-brand-brown'
              }`}
              id="upload-scan-tab"
            >
              <Upload className="w-4.5 h-4.5" />
              <span>បង្ហោះរូបភាពហត្ថលេខា</span>
            </button>
          </div>

          {/* Step 2: Signature Scan Core Viewport */}
          <div className="border border-brand-clay bg-brand-sand-light/10 rounded-2xl overflow-hidden relative shadow-inner flex flex-col items-center justify-center min-h-[220px]">
            
            {/* LASER SCANNING ANNIHILATOR LINE (Only shows when rendering analysis is running) */}
            {scannerActive && (
              <div className="absolute left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_#10b981] z-10 animate-scan-line-movement pointer-events-none"></div>
            )}

            {activeTab === 'camera' ? (
              <div className="w-full relative flex flex-col items-center">
                {!capturedImage && (
                  <div className="w-full aspect-[4/3] max-h-[280px] bg-slate-900 overflow-hidden relative flex items-center justify-center">
                    {!cameraActive ? (
                      <div className="p-6 text-center space-y-4 text-white">
                        <Camera className="h-10 w-10 mx-auto text-brand-green stroke-[1.5]" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold">កាមេរ៉ាមិនទាន់ដំណើរការឡើយ</p>
                          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">សូមត្រៀមក្រដាសដាក់ហត្ថលេខារបស់អ្នក រួចចុចប៊ូតុងខាងក្រោមដើម្បីបើកកាមេរ៉ាស្កែន</p>
                        </div>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-5 py-2 text-xs font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow cursor-pointer transition-colors"
                          id="activate-camera-btn"
                        >
                          បើកកាមេរ៉ាឥឡូវនេះ
                        </button>
                      </div>
                    ) : (
                      <>
                        <video 
                          ref={videoRef}
                          autoPlay 
                          playsInline 
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* Camera Bounding Box Target */}
                        <div className="absolute inset-8 border border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-20 border-2 border-brand-green/80 rounded-lg relative flex items-center justify-center">
                            <span className="text-[9px] text-white/50 absolute top-1 uppercase tracking-widest font-mono">ALIGN SIGNATURE HERE</span>
                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-brand-green"></div>
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-brand-green"></div>
                            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-brand-green"></div>
                            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-brand-green"></div>
                          </div>
                        </div>
                        
                        {/* Live Trigger Button inside Overlay */}
                        <div className="absolute bottom-4 inset-x-0 flex justify-center">
                          <button
                            type="button"
                            onClick={captureFrame}
                            className="bg-brand-accent hover:bg-brand-accent-hover text-white rounded-full p-3 shadow-lg flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95"
                            title="ថតដើម្បីស្កែនហត្ថលេខា"
                            id="trigger-snapshot-btn"
                          >
                            <Camera className="h-5 w-5 animate-pulse" />
                            <span className="text-xs font-bold px-1">ថតរូបស្កែន</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {cameraError && (
                  <div className="p-4 bg-brand-accent/5 text-center text-xs text-brand-brown space-y-2 max-w-sm">
                    <AlertTriangle className="h-5 w-5 text-brand-accent mx-auto" />
                    <p className="font-bold">{cameraError}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full p-6 text-center space-y-4">
                {!capturedImage ? (
                  <div 
                    onClick={triggerFileSelect}
                    className="border-2 border-dashed border-brand-clay hover:border-brand-green bg-white rounded-xl p-8 cursor-pointer transition-colors space-y-3 flex flex-col items-center justify-center group"
                    id="dropzone-signature-upload"
                  >
                    <div className="p-3 bg-brand-sand rounded-xl text-brand-green group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-brown">ចុចទីនេះ ដើម្បីជ្រើសរើស ឬបង្ហោះរូបភាពហត្ថលេខា</p>
                      <p className="text-[10px] text-brand-brown-muted mt-1 font-sans">គាំទ្រប្រភេទ file៖ PNG, JPG, JPEG គ្រប់ទំហំ</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="upload-file-selector"
                    />
                  </div>
                ) : null}
              </div>
            )}

            {/* Render Processed results overlay */}
            {capturedImage && (
              <div className="w-full flex flex-col items-center p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-brown-muted font-bold block">រូបភាពថតហត្ថលេខាដើម៖</span>
                    <div className="border border-brand-clay rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-[120px]">
                      <img src={capturedImage} alt="Captured Source" className="object-contain h-24 w-full" referrerPolicy="no-referrer" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-brown-muted font-bold block flex items-center gap-1">
                      <span>ហត្ថលេខាស្កែនឌីជីថល៖</span>
                      {scannerActive && <Loader2 className="h-2.5 w-2.5 animate-spin text-brand-green" />}
                    </span>
                    <div className="border-2 border-dashed border-brand-green/40 rounded-xl overflow-hidden bg-brand-sand-light/40 flex items-center justify-center relative min-h-[96px] h-[120px]">
                      {scannerActive ? (
                        <div className="text-center space-y-1 text-xs text-brand-green font-bold">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          <span>កំពុងវិភាគ & ចម្រោះទឹកខ្មៅ...</span>
                        </div>
                      ) : processedSignature ? (
                        <img src={processedSignature} alt="Scanned Digital Result" className="object-contain h-24 w-full p-2" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] text-brand-brown-muted italic">រង់ចាំដំណើរការស្កែន</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-brand-brown bg-white border border-brand-clay hover:bg-brand-sand rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    id="scan-reset-btn"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>ថតឬបង្ហោះថ្មី (Retry/Upload)</span>
                  </button>

                  {processedSignature && (
                    <button
                      type="button"
                      onClick={handleConfirmSave}
                      className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-brand-accent hover:bg-brand-accent-hover rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-accent/25 animate-pulse"
                      id="scan-submit-inline-btn"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>បញ្ជូនវត្តមានឥឡូវនេះ (Submit Attendance)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

           {/* Quick Informational Notice */}
          <div className="bg-brand-sand-light/50 border border-brand-clay/40 rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-brand-brown-muted">
            <Info className="h-3.5 w-3.5 text-brand-green mt-0.5 flex-shrink-0" />
            <p><strong>របៀបប្រើប្រាស់៖</strong> សូមជ្រើសរើសឈ្មោះលោកគ្រូ/អ្នកគ្រូ រួចជ្រើសរើសប្រភេទវត្តមាន។ បន្ទាប់មក ថតហត្ថលេខាពីក្រដាសផ្ទាល់របស់អ្នក ឬបង្ហោះរូបភាពហត្ថលេខាដែលបានថតទុក។ ប្រព័ន្ធនឹងស្កែនចម្រោះយកតែទឹកខ្មៅហត្ថលេខាចេញដើម្បីកត់ត្រាវត្តមានលឿនរហ័ស។</p>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-brand-sand-light border-t border-brand-clay flex flex-col sm:flex-row justify-end items-center gap-3">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-brand-brown bg-white border border-brand-clay rounded-xl hover:bg-brand-sand transition-colors"
            id="cancel-quick-scan-modal"
          >
            បដិសេធ
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={!selectedTeacherId || !processedSignature}
            className={`w-full sm:w-auto px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              (selectedTeacherId && processedSignature)
                ? 'bg-brand-green hover:bg-[#3d4d38] ring-2 ring-brand-green/20 animate-pulse'
                : 'bg-brand-clay opacity-50 cursor-not-allowed'
            }`}
            id="confirm-quick-scan-modal"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>បញ្ជូនវត្តមាន និងហត្ថលេខា (Submit Attendance)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

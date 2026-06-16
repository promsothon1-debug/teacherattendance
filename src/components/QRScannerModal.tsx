/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  X, 
  Camera, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Sparkles,
  QrCode,
  Image as ImageIcon
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: {
    teacherId: string;
    date: string;
    mode: 'in' | 'out';
    time: string;
    signature: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ name?: string; mode?: string } | null>(null);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Canvas and video references for camera decoding loop
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Hidden canvas for file-upload decoding
  const fileCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    setErrorMessage(null);
    
    // Stop any existing stream first to avoid hardware conflict
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    try {
      // Direct media streams request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.setAttribute('muted', 'true'); // Required for inline autoplay
        videoRef.current.play().catch(e => console.log('Video auto-play blocked:', e));
        
        // Start decoding loop
        animationFrameRef.current = requestAnimationFrame(tickCamera);
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Webcam access error:', err);
      let errorMsg = 'មិនអាចបើកកាមេរ៉ាបានទេ។';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'ការអនុញ្ញាតប្រើប្រាស់កាមេរ៉ាត្រូវបានបដិសេធ (សូមពិនិត្យមើល Privacy Settings)';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'មិនបានរកឃើញកាមេរ៉ានៅលើឧបករណ៍នេះឡើយ';
      }
      setCameraError(errorMsg);
      setCameraLoading(false);
      setActiveTab('upload'); // fallback automatically to file upload which always works!
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Live video frame decoding routine loop
  const tickCamera = () => {
    if (!videoRef.current || !canvasRef.current || !isOpen) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });
      
      if (code && code.data) {
        // Core check for JSON syntax
        try {
          const parsed = JSON.parse(code.data);
          if (parsed && parsed.tId && parsed.dt && parsed.m && parsed.sig) {
            handleParsedQrData(parsed);
            return; // stop requesting animation frames
          }
        } catch (e) {
          // not a valid app attendance JSON, ignore and continue scanning
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(tickCamera);
  };

  // Core handle QR details
  const handleParsedQrData = (payload: any) => {
    // success vibe
    stopCamera();
    setIsSuccessState(true);
    setErrorMessage(null);

    // Call success emitter
    onScanSuccess({
      teacherId: payload.tId,
      date: payload.dt,
      mode: payload.m,
      time: payload.ti,
      signature: payload.sig,
      latitude: payload.lat,
      longitude: payload.lng
    });

    // close modal automatically after showing success badge checkmark
    setTimeout(() => {
      setIsSuccessState(false);
      onClose();
    }, 1800);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setErrorMessage(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processQrFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      processQrFile(e.target.files[0]);
    }
  };

  const processQrFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = fileCanvasRef.current || document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          try {
            const parsed = JSON.parse(code.data);
            if (parsed && parsed.tId && parsed.dt && parsed.m && parsed.sig) {
              handleParsedQrData(parsed);
              return;
            }
          } catch (e) {
            // failed parsing
          }
          setErrorMessage('កូដ QR នេះមិនមែនជាទម្រង់បញ្ជាក់វត្តមានផ្លូវការរបស់ប្រព័ន្ធឡើយ!');
        } else {
          setErrorMessage('មិនអាចស្វែងរកទីតាំងកូដ QR ក្នុងរូបភាពនេះបានទេ។ សូមព្យាយាមបង្ហោះរូបភាពច្បាស់ជាងនេះ!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="qr-scanner-overlay">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-brand-clay w-full max-w-lg overflow-hidden relative"
        id="qr-scanner-container"
      >
        {/* Header */}
        <div className="bg-brand-brown text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-brand-accent animate-pulse" />
            <h3 className="font-bold text-sm md:text-base font-khmer-muol text-brand-sand">
              ស្កេនបញ្ជាក់វត្តមានពីទូរស័ព្ទដៃ
            </h3>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-brand-sand/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            id="close-scanner-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        {!isSuccessState && (
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-all ${
                activeTab === 'camera'
                  ? 'border-brand-green text-brand-green bg-brand-sand/15 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
              id="camera-scan-tab"
            >
              <Camera className="h-4 w-4" />
              <span>ស្កេនតាមរយៈកាមេរ៉ា</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-all ${
                activeTab === 'upload'
                  ? 'border-brand-green text-brand-green bg-brand-sand/15 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
              id="file-scan-tab"
            >
              <Upload className="h-4 w-4" />
              <span>បង្ហោះរូបភាពកូដ QR</span>
            </button>
          </div>
        )}

        {/* Modal content body */}
        <div className="p-6">
          {/* Success state */}
          {isSuccessState ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-scale-up" id="scanner-success-state">
              <div className="p-4 rounded-full bg-brand-sand-light border border-brand-green/30 text-brand-green animate-bounce">
                <CheckCircle className="h-16 w-16" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-xl font-bold text-stone-900">ទទួលបានវត្តមានជោគជ័យ!</h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
                  ទិន្នន័យវត្តមាន និងហត្ថលេខារបស់លោកគ្រូ/អ្នកគ្រូត្រូវបានសហការីស្កែនបញ្ចូលក្នុងបញ្ជីរួចរាល់។
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Camera tab content */}
              {activeTab === 'camera' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-stone-800">
                    {cameraLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-white bg-black/80 z-10">
                        <RefreshCw className="h-8 w-8 animate-spin text-brand-accent" />
                        <span className="text-xs">កំពុងភ្ជាប់កាមេរ៉ា...</span>
                      </div>
                    )}
                    
                    {cameraError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-stone-900 text-stone-300 z-10">
                        <AlertCircle className="h-10 w-10 text-brand-accent" />
                        <p className="text-xs font-semibold leading-relaxed">{cameraError}</p>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          ប្តូរទៅបង្ហោះជាឯកសាររូបភាពវិញ
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Live video layer */}
                        <video 
                          ref={videoRef} 
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover" 
                          id="scanner-video"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Camera Direction Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                          className="absolute bottom-3 right-3 bg-black/65 hover:bg-black/85 text-brand-sand hover:text-white rounded-xl py-2 px-3 text-[11px] font-bold transition-all cursor-pointer z-10 flex items-center gap-1.5 backdrop-blur-sm shadow border border-white/10"
                          id="toggle-camera-facing-btn"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>ប្តូរកាមេរ៉ា ({facingMode === 'environment' ? 'កាមេរ៉ាក្រោយ' : 'កាមេរ៉ាមុខ'})</span>
                        </button>

                        {/* Aesthetic scan layer target crosshair */}
                        <div className="absolute inset-0 border-2 border-transparent flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 md:w-56 md:h-56 border-2 border-brand-accent rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            {/* Scanning horizontal red light line animation */}
                            <div className="absolute left-0 right-0 h-1 bg-brand-accent top-0 animate-scan-light opacity-85 shadow-[0_0_10px_2px_#f27d26]" />
                            {/* Target bracket notches */}
                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-white" />
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-white" />
                            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-white" />
                            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-white" />
                          </div>
                        </div>

                        {/* Top banner overlay guide */}
                        <div className="absolute top-3 inset-x-0 mx-auto max-w-xs bg-black/60 text-white rounded-full py-1.5 px-3 text-[10px] text-center backdrop-blur-sm">
                          លៃកូដ QR របស់គ្រូឱ្យចំប្រអប់កណ្ដាលបង្អួច
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-brand-brown-muted text-center max-w-sm mx-auto leading-relaxed">
                     កាមេរ៉ាកំពុងស្វែងរក QR ហត្ថលេខាកម្រងសាលារៀនជានិច្ច។ សូមដាក់អេក្រង់ទូរស័ព្ទគ្រូឱ្យជិត ល្អិត និងភ្លឺច្បាស់។
                  </p>
                </div>
              )}

              {/* Upload tab content */}
              {activeTab === 'upload' && (
                <div className="space-y-4 animate-fade-in">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-3 border-dashed rounded-2xl p-8 py-12 text-center transition-all flex flex-col items-center justify-center relative shadow-inner cursor-pointer ${
                      dragActive
                        ? 'border-brand-accent bg-brand-sand/20'
                        : errorMessage
                        ? 'border-[#ff0a0a]/30 bg-[#ff0a0a]/5'
                        : 'border-brand-clay hover:border-brand-green/50 bg-stone-50/50 hover:bg-stone-50'
                    }`}
                    onClick={() => document.getElementById('qr-file-picker')?.click()}
                  >
                    <input
                      id="qr-file-picker"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    
                    <div className="p-4 rounded-full bg-white shadow-sm border border-brand-clay/30 text-brand-green mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="h-8 w-8 text-brand-green" />
                    </div>

                    <p className="text-xs font-bold text-stone-700 font-sans">
                      អូស និងទម្លាក់ រូបថតកូដ QR ទីនេះ ឬ ចុចដើម្បីជ្រើសរើសឯកសារ
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1 leading-normal max-w-xs">
                      គាំទ្រប្រភេទរូបភាព PNG, JPG, JPEG ឬ រូបភាពដែលបានថតអេក្រង់ (Screenshot) ពីទូរស័ព្ទដៃរបស់គ្រូ
                    </p>

                    {/* Hidden canvas for image decoding */}
                    <canvas ref={fileCanvasRef} className="hidden" />
                  </div>

                  {/* Feedback Errors */}
                  {errorMessage && (
                    <div className="bg-[#ff0a0a]/5 border border-[#ff0a0a]/15 text-[#ff0a0a] p-3.5 rounded-xl text-xs flex items-start gap-2 max-w-md mx-auto">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{errorMessage}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-brand-brown-muted text-center max-w-sm mx-auto leading-relaxed">
                    ប្រសិនបើកាមេរ៉ារបស់អ្នកមិនដំណើរការ ឬស្ថិតក្នុង Browser iFrame, គ្រូគ្រាន់តែថតអេក្រង់ (Screenshot) កូដ QR verification នៅលើទូរស័ព្ទរបស់គាត់ ហើយផ្ញើមកលោកគ្រូ-អ្នកគ្រូវត្តមានតាមរយៈ Telegram ដើម្បីបង្ហោះបញ្ចូលទីនេះបានភ្លាមៗ!
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info tip overlay */}
        <div className="bg-brand-sand/20 px-5 py-3.5 border-t border-brand-clay/35 text-center flex items-center justify-center gap-1.5 text-[11px] text-brand-brown-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-accent animate-pulse" />
          <span>ការស្កេន QR ជួយបង្កើនទិន្នន័យច្បាស់លាស់ និងភាពងាយស្រួល 100% គ្មានក្រដាស</span>
        </div>
      </div>
    </div>
  );
}

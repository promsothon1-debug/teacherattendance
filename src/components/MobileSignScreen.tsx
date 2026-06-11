/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  MapPin, 
  RefreshCw, 
  User, 
  Award, 
  Map, 
  Activity, 
  QrCode, 
  Clock, 
  FileCheck,
  ChevronLeft
} from 'lucide-react';
import QRCode from 'qrcode';
import { Teacher, GPSLocation, Gender, Shift } from '../types';

interface MobileSignScreenProps {
  teacherId: string;
  mode: 'in' | 'out';
  date: string;
  teachers: Teacher[];
}

export default function MobileSignScreen({ teacherId, mode, date, teachers }: MobileSignScreenProps) {
  const teacher = teachers.find(t => t.id === teacherId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [verificationQrUrl, setVerificationQrUrl] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Setup current time clock active
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('km-KH', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (isSubmitted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.strokeStyle = '#4A5D45'; // Cohesive brand green
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Auto-fetch location on mobile screen load
    fetchLocation();
  }, [isSubmitted]);

  const fetchLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('កម្មវិធីរុករកមិនគាំទ្រ GPS ទេ។');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toLocaleTimeString('km-KH')
        });
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Mobile Geolocation error:', error);
        let errorMsg = 'បដិសេធ GPS (សូមបើកការអនុញ្ញាតទីតាំង)';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'សូមបើក Location Permission ក្នុងទូរស័ព្ទរបស់អ្នក';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'មិនមាន GPS ល្អជុំវិញឧបករណ៍ឡើយ';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'ការទាញយកទីតាំងហួសពេលកំណត់';
        }
        setLocationError(errorMsg);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas has any pixels drawn
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hasSig = false;
    for (let i = 3; i < buffer.data.length; i += 4) {
      if (buffer.data[i] > 10) { // alpha channel greater than threshold
        hasSig = true;
        break;
      }
    }

    if (!hasSig) {
      alert('សូមចុះហត្ថលេខាបញ្ជាក់ជាមុនសិន!');
      return;
    }

    // Shrink and optimize the signature down to 120x60 JPEG to keep the QR code extremely lightweight and easily scannable
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 120;
    tempCanvas.height = 55;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fill white background for compression quality safety
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, 120, 55);
    // Draw original drawing onto minimized canvas
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 120, 55);
    
    // Low size JPEG dataURL
    const optimizedBase64 = tempCanvas.toDataURL('image/jpeg', 0.5);

    // Build the extremely compact object package to fit safely into QR standard structure
    const attendancePayload = {
      tId: teacherId,
      dt: date,
      m: mode,
      ti: currentTime,
      sig: optimizedBase64,
      lat: gpsLocation ? Number(gpsLocation.latitude.toFixed(6)) : null,
      lng: gpsLocation ? Number(gpsLocation.longitude.toFixed(6)) : null
    };

    // Serialize compact payload
    const payloadString = JSON.stringify(attendancePayload);

    try {
      // Create local QR displaying this attendance packet
      const dataUrl = await QRCode.toDataURL(payloadString, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a', // Deep slate for high scan reliability
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L' // low recovery to fit maximal data densities smoothly
      });

      setVerificationQrUrl(dataUrl);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to generate verification QR:', err);
      alert('មានចម្ងល់ក្នុងការបង្កើតកូដ QR។ សូមព្យាយាមចុះឈ្មោះម្តងទៀត!');
    }
  };

  const handleReturnToSign = () => {
    setIsSubmitted(false);
    setVerificationQrUrl('');
  };

  if (!teacher) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-6 rounded-2xl shadow border max-w-sm">
          <p className="text-brand-accent font-bold mb-3 text-sm">រកមិនឃើញគណនីគ្រូបង្រៀនឡើយ!</p>
          <p className="text-xs text-stone-600">ID របស់លោកគ្រូ-អ្នកគ្រូ មិនទាន់ចុះឈ្មោះក្នុងប្រព័ន្ធកម្រងនៅឡើយទេ។ សូមទាក់ទងមកកាន់នាយក ឬអ្នកដំណើរការប្រព័ន្ធ។</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-12 font-sans select-none">
      {/* Visual Top Header Accent */}
      <div className="bg-brand-brown text-brand-sand px-4 py-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-brand-accent animate-pulse" />
            <h1 className="font-bold text-xs md:text-sm tracking-wide font-khmer-muol text-brand-sand">
              ប្រព័ន្ធវត្តមានស្វ័យប្រវត្តិកម្រងអូរស្រឡៅ
            </h1>
          </div>
          <span className="text-[11px] font-semibold text-brand-accent bg-white/10 px-2 py-0.5 rounded-full font-mono">
            {currentTime}
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5">
        {!isSubmitted ? (
          <div className="space-y-5 animate-fade-in">
            {/* Identity badge card (MoEYS style) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-clay/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/5 rounded-bl-full pointer-events-none" />
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-full bg-brand-sand/50 border border-brand-clay/60 flex items-center justify-center text-brand-green shadow-sm flex-shrink-0">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 font-sans">{teacher.name}</h2>
                  <div className="flex flex-col space-y-1 mt-1 text-xs text-stone-600">
                    <p className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-brand-green" />
                      <span>{teacher.role}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-stone-500">
                      <span>{teacher.school}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Details line */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-clay/35 text-xs text-center">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-stone-400 block mb-0.5 text-[10px]">វេនគ្រូ</span>
                  <span className="font-bold text-brand-green text-sm">{teacher.shift}</span>
                </div>
                <div className="bg-brand-sand/30 p-2.5 rounded-xl border border-brand-clay/20">
                  <span className="text-stone-400 block mb-0.5 text-[10px]">ប្រភេទវត្តមាន</span>
                  <span className="font-bold text-brand-accent text-sm">
                    {mode === 'in' ? 'ចុះឈ្មោះ ចូល' : 'ចុះឈ្មោះ ចេញ'}
                  </span>
                </div>
              </div>

              {/* Date banner */}
              <div className="text-center mt-3 pt-1">
                <span className="text-[10px] text-stone-400 font-sans">
                  កាលបរិច្ឆេទប្រជុំ៖ <strong className="text-stone-600">{date}</strong>
                </span>
              </div>
            </div>

            {/* Signature Area */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-clay/30">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-xs md:text-sm text-stone-800 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-brand-green" />
                  <span>សូមគូរហត្ថលេខារបស់អ្នក (Draw Signature)</span>
                </h3>
                <button
                  onClick={clearCanvas}
                  className="text-[11px] font-bold text-brand-accent hover:text-brand-accent-hover flex items-center gap-1 bg-brand-sand/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  id="mobile-clear-btn"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>សម្អាតឡើងវិញ</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-brand-clay bg-stone-50/50 rounded-xl overflow-hidden relative shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair block touch-none"
                  id="mobile-sig-canvas"
                />
                <div className="absolute bottom-2 right-2 pointer-events-none text-[9px] text-stone-300 font-mono font-medium">
                  TOUCH PAD FOR SIGNATURE
                </div>
              </div>
            </div>

            {/* GPS verification cards */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-clay/30">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <MapPin className={`h-4 w-4 ${gpsLocation ? 'text-brand-green animate-bounce' : 'text-stone-400'}`} />
                  <span>ទីតាំង GPS បច្ចុប្បន្ន</span>
                </span>
                <button 
                  onClick={fetchLocation}
                  disabled={loadingLocation}
                  className="text-[11px] text-brand-green hover:bg-brand-sand hover:text-brand-brown font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  id="mobile-refetch-location-btn"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingLocation ? 'animate-spin' : ''}`} />
                  <span>{gpsLocation ? 'ទាញជាថ្មី' : 'រកទីតាំង'}</span>
                </button>
              </div>

              {loadingLocation ? (
                <div className="flex items-center gap-2 mt-2 py-1 pl-1 text-xs text-stone-500 italic">
                  <div className="w-3.5 h-3.5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                  <span>កំពុងទាញទីតាំងពីផ្កាយរណប...</span>
                </div>
              ) : gpsLocation ? (
                <div className="mt-3 bg-brand-sand/20 rounded-xl p-3 border border-brand-clay/20 text-[11px] space-y-1 text-stone-700">
                  <div className="flex justify-between">
                    <span>រយៈទទឹង (Latitude)៖</span>
                    <span className="font-semibold font-mono text-stone-900">{gpsLocation.latitude.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>រយៈបណ្តោយ (Longitude)៖</span>
                    <span className="font-semibold font-mono text-stone-900">{gpsLocation.longitude.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>កម្រិតលំអៀង (Accuracy)៖</span>
                    <span className="font-semibold text-brand-green font-mono">±{gpsLocation.accuracy?.toFixed(0)}m</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 bg-[#ff0a0a]/5 p-3 rounded-xl border border-[#ff0a0a]/10 text-[11px] text-[#ff0a0a] flex items-center gap-1.5">
                  <span>⚠️ {locationError || 'មិនទាន់មានទិន្នន័យ GPS ទេ។'}</span>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl text-xs md:text-sm font-bold text-white bg-brand-green hover:bg-[#3d4d38] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              id="mobile-confirm-attendance-btn"
            >
              <CheckCircle className="h-4.5 w-4.5 text-brand-accent animate-bounce" />
              <span>បញ្ជាក់ និងរក្សាទុកវត្តមាន</span>
            </button>
          </div>
        ) : (
          /* Submission Screen displays verification code */
          <div className="space-y-5 animate-fade-in">
            {/* Visual Header Success Badge */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-green/30 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-brand-green" />
              <div className="inline-flex p-3 rounded-full bg-brand-sand-light border border-brand-green/20 text-brand-green mb-3">
                <CheckCircle className="h-10 w-10 text-brand-green" />
              </div>
              
              <h2 className="text-xl font-bold text-stone-900">បានចុះឈ្មោះជោគជ័យ!</h2>
              <p className="text-xs text-stone-500 mt-1">វត្តមានត្រូវបានកត់ត្រាក្នុងទូរស័ព្ទរបស់អ្នករួចរាល់</p>

              {/* Brief details tag */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 my-4 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">ឈ្មោះគ្រូ៖</span>
                  <strong className="text-stone-900">{teacher.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">កាលបរិច្ឆេទ៖</span>
                  <strong className="text-stone-700">{date}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">ម៉ោងចុះឈ្មោះ៖</span>
                  <strong className="text-brand-green font-mono">{currentTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">ប្រភេទវត្តមាន៖</span>
                  <strong className="text-brand-accent">វត្តមាន {mode === 'in' ? 'ចូលប្រជុំ' : 'ចេញប្រជុំ'}</strong>
                </div>
              </div>
            </div>

            {/* Displaying verification QR */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-clay/35 flex flex-col items-center">
              <h3 className="font-bold text-xs md:text-sm text-stone-800 flex items-center gap-1.5 mb-3">
                <QrCode className="h-4.5 w-4.5 text-brand-green animate-pulse" />
                <span>កូដ QR បញ្ជាក់វត្តមាន</span>
              </h3>

              <div className="p-3.5 bg-white border-2 border-stone-900 rounded-2xl shadow-md mb-4">
                {verificationQrUrl ? (
                  <img 
                    src={verificationQrUrl} 
                    alt="Attendance Scan Pack" 
                    className="w-56 h-56 md:w-64 md:h-64 object-contain"
                    id="verification-qr-image"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-stone-400 italic text-xs">
                    កំពុងបង្កើតកូដ QR...
                  </div>
                )}
              </div>

              {/* Guide instructions */}
              <div className="bg-brand-sand/50 border border-brand-clay/30 p-3.5 rounded-xl text-center">
                <p className="text-[11.5px] leading-relaxed text-brand-brown font-semibold">
                  👉 សូមបង្ហាញកូដ QR ខាងលើនេះទៅកាន់ <span className="text-brand-green font-bold">លោកគ្រូ-អ្នកគ្រូអ្នកសម្របសម្រួល</span> ដើម្បីឱ្យគាត់ស្កេនបញ្ចប់ការចុះវត្តមានចូលក្នុងបញ្ជីជាតិ!
                </p>
              </div>

              {/* Adjust correction/redo */}
              <button
                onClick={handleReturnToSign}
                className="mt-4 flex items-center gap-1.5 text-xs text-brand-accent hover:text-brand-accent-hover bg-brand-sand px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                id="edit-mobile-sign-btn"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>គូរហត្ថលេខាឡើងវិញ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

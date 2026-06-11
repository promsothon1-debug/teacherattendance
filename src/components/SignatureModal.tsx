/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Loader2, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { GPSLocation } from '../types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string, location?: GPSLocation) => void;
  title: string;
  teacherName: string;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onSave,
  title,
  teacherName
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Initialize and scale canvas for high API screen matching
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get css size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial styles
    ctx.strokeStyle = '#4A5D45'; // brand-green
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fetch GPS coordinates immediately when modal opens
    fetchLocation();
  }, [isOpen]);

  const fetchLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('កម្មវិធីរុករក (Browser) មិនគាំទ្រប្រព័ន្ធទីតាំង GPS ទេ។');
      setLoadingLocation(false);
      // Fallback location for Demo inside restricted iframe
      setGpsLocation({
        latitude: 13.5245,
        longitude: 102.5831, // coordinates of Ou Sralau / Kamrieng region approx
        accuracy: 15,
        timestamp: new Date().toLocaleTimeString('km-KH')
      });
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
        console.error('Geolocation error:', error);
        let errorMsg = 'មិនអាចទាញយកទីតាំងបានទេ';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'ការអនុញ្ញាតទីតាំងត្រូវបានបដិសេធ (សូមបើកគាំទ្រ GPS)';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'ទីតាំង GPS មិនអាចរកបានឡើយ';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'ការទាញយកទីតាំងមានរយៈពេលយូរពេក';
        }
        setLocationError(errorMsg);
        setLoadingLocation(false);

        // Fallback mock location for development/iframe testing
        setGpsLocation({
          latitude: 13.5242,
          longitude: 102.5828,
          accuracy: 25,
          timestamp: new Date().toLocaleTimeString('km-KH')
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
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
    e.preventDefault(); // Prevent scrolling on touch
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureBase64 = canvas.toDataURL('image/png');
    onSave(signatureBase64, gpsLocation || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="signature-modal-overlay">
      <div 
        className="bg-white rounded-[32px] shadow-xl border border-brand-clay max-w-lg w-full overflow-hidden flex flex-col md:max-h-[90vh] bg-gradient-to-b from-white to-brand-sand-light/20"
        id="signature-modal-container"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-clay bg-brand-sand-light">
          <div>
            <h3 className="font-bold text-brand-green text-base md:text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-green" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-brand-brown-muted mt-0.5">លោកគ្រូ/អ្នកគ្រូ៖ <span className="font-bold text-brand-brown">{teacherName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-brand-brown-muted hover:text-brand-brown hover:bg-brand-sand transition-colors"
            id="close-signature-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Drawing Canvas Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-brand-brown">គូសហត្ថលេខាក្នុងប្រអប់ខាងក្រោម៖</span>
              <button 
                onClick={clearCanvas}
                className="text-xs text-brand-accent hover:text-brand-accent-hover font-bold flex items-center gap-1 hover:bg-brand-sand px-2-5 py-1 rounded-lg transition-colors"
                id="clear-canvas-btn"
              >
                <RefreshCw className="h-3 w-3" />
                <span>លុបសរសេរឡើងវិញ</span>
              </button>
            </div>
            
            <div className="border-2 border-dashed border-brand-clay bg-white rounded-xl overflow-hidden relative shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-48 cursor-crosshair block touch-none touch-pan-x touch-pan-y"
                id="signature-canvas"
              />
              <div className="absolute bottom-2 right-2 pointer-events-none text-[10px] text-brand-brown-muted font-mono font-medium">
                DIGITAL SIGNATURE PAD
              </div>
            </div>
          </div>

          {/* GPS Location Tracker Area */}
          <div className="pt-2 border-t border-brand-clay">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-brand-brown flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-green animate-bounce" />
                <span>ទីតាំង GPS ពិតប្រាកដ (Geolocation)</span>
              </span>
              <button 
                onClick={fetchLocation}
                disabled={loadingLocation}
                className="text-xs text-brand-green hover:text-brand-brown font-bold flex items-center gap-1 hover:bg-brand-sand px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                id="re-fetch-location-btn"
              >
                {loadingLocation ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span>ស្គេនទីតាំងឡើងវិញ</span>
              </button>
            </div>

            {loadingLocation ? (
              <div className="bg-brand-sand-light border border-brand-clay rounded-xl p-3 flex items-center justify-center gap-2.5 text-xs text-brand-brown-muted">
                <Loader2 className="h-4 w-4 animate-spin text-brand-green" />
                <span>កំពុងស្វែងរកកូអរដោនេ GPS...</span>
              </div>
            ) : locationError ? (
              <div className="bg-brand-accent/10 border border-brand-accent/30 text-brand-brown rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-brand-green">
                  <AlertTriangle className="h-4 w-4 text-brand-accent" />
                  <span>ការទាញយកទីតាំងមានឧបសគ្គ</span>
                </div>
                <p className="text-brand-brown-muted">{locationError}</p>
                <div className="text-[10px] bg-white/70 border border-brand-clay p-1.5 rounded text-brand-brown-muted font-medium">
                  {gpsLocation ? (
                    <span>ប្រព័ន្ធបានផ្តល់ទីតាំងកម្រងសាលារៀនជាបណ្តោះអាសន្ន៖ Lat: {gpsLocation.latitude.toFixed(5)}, Lng: {gpsLocation.longitude.toFixed(5)}</span>
                  ) : (
                    <span>សូមពិនិត្យការអនុញ្ញាត Geolocation លើឧបករណ៍ ឬ កម្មវិធីរុករក។</span>
                  )}
                </div>
              </div>
            ) : gpsLocation ? (
              <div className="bg-brand-sand/40 border border-brand-clay rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between items-center text-brand-green font-semibold font-sans">
                  <span>រយៈទទឹង (Latitude): <strong className="font-bold font-mono text-brand-green">{gpsLocation.latitude.toFixed(6)}</strong></span>
                  <span>រយៈបណ្តោយ (Longitude): <strong className="font-bold font-mono text-brand-green">{gpsLocation.longitude.toFixed(6)}</strong></span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-brand-brown-muted font-mono pt-1 border-t border-brand-clay">
                  <span>ភាពត្រឹមត្រូវ (Accuracy): ±{Math.round(gpsLocation.accuracy || 10)} ម៉ែត្រ</span>
                  <span>ម៉ោងទទួលបាន៖ {gpsLocation.timestamp}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-brand-sand-light border-t border-brand-clay flex flex-col sm:flex-row justify-end items-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-brand-brown bg-white border border-brand-clay rounded-xl hover:bg-brand-sand hover:text-brand-brown transition-colors"
            id="cancel-signature-modal"
          >
            បដិសេធ
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2 text-sm font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
            id="save-signature-modal"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>រក្សាទុកហត្ថលេខា & វត្តមាន</span>
          </button>
        </div>
      </div>
    </div>
  );
}

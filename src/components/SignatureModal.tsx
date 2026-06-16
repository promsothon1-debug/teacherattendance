/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Loader2, RefreshCw, X, AlertTriangle, Camera, Image } from 'lucide-react';
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get bounds
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Reset transform to identity
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Fit image into the actual pixels size of the canvas, leaving 10% margins
        const maxW = canvas.width * 0.9;
        const maxH = canvas.height * 0.9;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxW / w, maxH / h);
        w *= scale;
        h *= scale;

        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.drawImage(img, x, y, w, h);

        // Perform transparent filter mapping high contrast scan
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 50) continue; // already transparent

            // Calculate brightness
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            // Threshold: if pixel is close to white (light paper paper), make transparent
            if (brightness > 205) {
              data[i + 3] = 0; // Translucent / transparent background
            } else {
              // Recolor standard ink to matched brand green #4A5D45
              const intensity = (205 - brightness) / 205;
              data[i] = 74;
              data[i + 1] = 93;
              data[i + 2] = 69;
              data[i + 3] = Math.min(255, Math.round(intensity * 350));
            }
          }
          ctx.putImageData(imageData, 0, 0);
        } catch (err) {
          console.error("Error applying signature filter scan", err);
        }

        // Restore context dpr scaling for potential manual correction drawing
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
  }, [isOpen]);

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
    onSave(signatureBase64, undefined);
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
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Drawing Canvas Area */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-brand-brown">គូសហត្ថលេខាក្នុងប្រអប់ខាងក្រោម៖</span>
              <button 
                onClick={clearCanvas}
                className="text-xs text-brand-accent hover:text-brand-accent-hover font-bold flex items-center gap-1 hover:bg-brand-sand px-2.5 py-1 rounded-lg transition-colors"
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

          {/* Picture scanning utility */}
          <div className="border-t border-brand-clay/40 pt-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-brand-green" />
              <span className="text-sm font-bold text-brand-brown">
                ស្កេន ឬ ផ្ទុកឡើងរូបភាពហត្ថលេខា (Scan / Upload Signature)
              </span>
            </div>
            
            <p className="text-[11px] text-brand-brown-muted leading-relaxed">
              លោកអ្នកអាចថតរូបហត្ថលេខាពីលើក្រដាសផ្ទាល់ រឺផ្ទុកទ្បើងរូបភាពហត្ថលេខាដែលមានស្រាប់។ ប្រព័ន្ធនឹងធ្វើការស្កេនលុបផ្ទៃខាងក្រោយពណ៌សដោយស្វ័យប្រវត្ត។
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: File/Gallery selection */}
              <label 
                className="border border-brand-clay hover:border-brand-green bg-brand-sand-light/20 hover:bg-brand-sand/30 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative border-dashed"
                id="signature-upload-label"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  title="ផ្ទុកឡើងរូបភាពហត្ថលេខា"
                />
                <Image className="h-5 w-5 text-brand-brown-muted group-hover:text-brand-green mb-1.5 transition-colors" />
                <span className="text-xs font-bold text-brand-brown transition-colors group-hover:text-brand-green">ជ្រើសរើសរូបភាព (Upload Image)</span>
                <span className="text-[10px] text-brand-brown-muted mt-0.5 font-mono">JPG, PNG, WebP</span>
              </label>

              {/* Option 2: Camera Capture */}
              <label 
                className="border border-brand-clay hover:border-brand-green bg-brand-sand-light/20 hover:bg-brand-sand/30 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative border-dashed"
                id="signature-camera-label"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="ថតស្កេនហត្ថលេខា"
                />
                <Camera className="h-5 w-5 text-brand-brown-muted group-hover:text-brand-green mb-1.5 transition-colors" />
                <span className="text-xs font-bold text-brand-brown transition-colors group-hover:text-brand-green">ស្កេនជាមួយកាមេរ៉ា (Scan Camera)</span>
                <span className="text-[10px] text-brand-brown-muted mt-0.5">ថតរូបហត្ថលេខាពីលើក្រដាស</span>
              </label>
            </div>
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
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 ring-2 ring-brand-green/20"
            id="save-signature-modal"
          >
            <ShieldCheck className="h-4 w-4 animate-pulse" />
            <span>បញ្ជូន និងរក្សាទុកវត្តមាន (Submit Attendance)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Printer, ExternalLink, QrCode } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface ShowQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord;
  mode: 'in' | 'out';
}

export default function ShowQrModal({ isOpen, onClose, record, mode }: ShowQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate the check-in url pointing to this specific record/mode
  const protocol = window.location.protocol;
  const host = window.location.host;
  const pathname = window.location.pathname;
  const checkInUrl = `${protocol}//${host}${pathname}?action=qr_sign&teacherId=${record.teacherId}&mode=${mode}&date=${record.date}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(checkInUrl, {
      width: 256,
      margin: 1.5,
      color: {
        dark: '#4A5D45', // Cohesive beautiful brand green
        light: '#FFFFFF'
      }
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR Code:', err);
      });
  }, [isOpen, checkInUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>កូដ QR សម្រាប់ស្កេនវត្តមាន - ${record.name}</title>
          <style>
            body {
              font-family: 'Khmer OS Battambang', 'Inter', sans-serif;
              text-align: center;
              padding: 40px;
              color: #1e293b;
            }
            .container {
              border: 2px solid #4A5D45;
              border-radius: 12px;
              padding: 30px;
              display: inline-block;
              max-width: 400px;
            }
            h1 {
              font-family: 'Khmer OS Muol Light', sans-serif;
              font-size: 16px;
              margin-bottom: 20px;
              color: #4a5d45;
            }
            .meta {
              font-size: 14px;
              margin-bottom: 15px;
            }
            img {
              width: 250px;
              height: 250px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>កូដ QR សម្រាប់ចុះវត្តមាន</h1>
            <div class="meta">
              <strong>ឈ្មោះ៖</strong> ${record.name}<br/>
              <strong>តួនាទី៖</strong> ${record.role}<br/>
              <strong>សាលារៀន៖</strong> ${record.school}<br/>
              <strong>វេនវត្តមាន៖</strong> វត្តមាន ${mode === 'in' ? 'ចូល' : 'ចេញ'}<br/>
              <strong>កាលបរិច្ឆេទ៖</strong> ${record.date}
            </div>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p style="font-size: 11px; color: #64748b; margin-top: 15px;">សូមប្រើប្រាស់កាមេរ៉ាទូរស័ព្ទដៃស្កេន ដើម្បីចុះហត្ថលេខាផ្ទាល់ខ្លួន</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="show-qr-modal-overlay">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-brand-clay w-full max-w-md overflow-hidden relative"
        id="show-qr-modal-container"
      >
        {/* Banner header */}
        <div className="bg-brand-brown text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-brand-accent animate-pulse" />
            <h3 className="font-bold text-sm md:text-base font-khmer-muol text-brand-sand">
              កូដ QR ស្កេនចុះវត្តមាន
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-sand/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            id="close-qr-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 flex flex-col items-center">
          {/* Teacher Details */}
          <div className="w-full text-center mb-4 space-y-1 bg-brand-sand/40 p-4 rounded-xl border border-brand-clay/30">
            <h4 className="font-bold text-lg text-stone-800 font-sans">{record.name}</h4>
            <p className="text-xs text-brand-brown">{record.role}</p>
            <p className="text-xs text-brand-brown-muted">{record.school}</p>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full mt-2 font-sans bg-brand-accent">
              <span>វត្តមាន {mode === 'in' ? 'ចូលប្រជុំ' : 'ចេញប្រជុំ'}</span>
            </div>
            <p className="text-[10px] text-brand-brown-muted font-mono pt-1">កាលបរិច្ឆេទ៖ {record.date}</p>
          </div>

          {/* QR Display */}
          <div className="p-3 bg-white border-2 border-dashed border-brand-green/30 rounded-2xl shadow-sm mb-5 relative group overflow-hidden">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Teacher QR Link" 
                className="w-48 h-48 md:w-56 md:h-56 object-contain"
                id="show-qr-image"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-brand-brown-muted text-xs italic">
                កំពុងបង្កើតកូដ QR...
              </div>
            )}
            <div className="absolute inset-0 bg-brand-brown/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" />
          </div>

          {/* Copy/Print controls */}
          <div className="w-full space-y-3">
            <div className="flex gap-2 w-full">
              <button
                onClick={handleCopy}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  copied 
                    ? 'bg-brand-green/10 text-brand-green border-brand-green/30' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
                id="copy-qr-link-btn"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'បានចំលងតំណភ្ជាប់!' : 'ចំលងតំណភ្ជាប់'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-brown hover:bg-[#4a392c] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                id="print-qr-btn"
              >
                <Printer className="h-4 w-4 text-brand-accent" />
                <span>បោះពុម្ភ QR</span>
              </button>
            </div>

            {/* Simulated direct opening link for safety in debugging */}
            <a
              href={checkInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-brand-green bg-brand-sand hover:bg-brand-sand-light transition-colors flex items-center justify-center gap-1 cursor-pointer border border-brand-green/10 text-center"
              id="test-qr-link-direct"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>បើកសាកល្បងចុះហត្ថលេខា (លើឧបករណ៍ផ្ទាល់ខ្លួន)</span>
            </a>
          </div>
        </div>

        {/* Tip caption */}
        <div className="bg-brand-sand/20 px-5 py-3.5 border-t border-brand-clay/30 text-center">
          <p className="text-[10.5px] leading-relaxed text-brand-brown-muted font-sans">
            លោកគ្រូ-អ្នកគ្រូអាចប្រើប្រាស់ <strong className="text-brand-green">Line, Telegram, Viber</strong> ឬ <strong className="text-brand-green">Camera</strong> ទូរស័ព្ទរបស់ខ្លួន ដើម្បីស្កេនបំពេញវត្តមាន
          </p>
        </div>
      </div>
    </div>
  );
}

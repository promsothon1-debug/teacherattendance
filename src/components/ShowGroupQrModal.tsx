/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Printer, ExternalLink, QrCode, ToggleLeft, ToggleRight, Calendar, ArrowRightLeft } from 'lucide-react';

interface ShowGroupQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
}

export default function ShowGroupQrModal({ isOpen, onClose, date }: ShowGroupQrModalProps) {
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Formatting Khmer helper
  const toKhmerNumber = (num: number | string): string => {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return num.toString().split('').map(char => {
      const idx = parseInt(char, 10);
      return !isNaN(idx) ? khmerDigits[idx] : char;
    }).join('');
  };

  const getKhmerSolarRaw = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const day = d.getDate();
      const month = d.getMonth();
      const year = d.getFullYear();
      const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
      ];
      return `ថ្ងៃទី ${toKhmerNumber(day)} ខែ ${khmerMonths[month]} ឆ្នាំ ${toKhmerNumber(year)}`;
    } catch (e) {
      return '';
    }
  };

  const protocol = window.location.protocol;
  const host = window.location.host;
  const pathname = window.location.pathname;
  
  // Group link points to teacherId = select
  const groupUrl = `${protocol}//${host}${pathname}?action=qr_sign&teacherId=select&mode=${mode}&date=${date}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(groupUrl, {
      width: 256,
      margin: 1.5,
      color: {
        dark: '#4A5D45', // Brand green
        light: '#FFFFFF'
      }
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating group QR Code:', err);
      });
  }, [isOpen, groupUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(groupUrl);
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
          <title>កូដ QR រួមសម្រាប់ស្កេនវត្តមានប្រជុំកម្រង - ${date}</title>
          <style>
            body {
              font-family: 'Khmer OS Battambang', 'Inter', sans-serif;
              text-align: center;
              padding: 40px;
              color: #1e293b;
              background-color: #ffffff;
            }
            .container {
              border: 3px double #4A5D45;
              border-radius: 16px;
              padding: 35px;
              display: inline-block;
              max-width: 480px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            h1 {
              font-family: 'Khmer OS Muol Light', sans-serif;
              font-size: 18px;
              margin-bottom: 5px;
              color: #4a5d45;
              line-height: 1.6;
            }
            .subtitle {
              font-size: 14px;
              font-weight: bold;
              color: #b45309;
              margin-bottom: 25px;
            }
            .meta {
              font-size: 13px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 25px;
              line-height: 1.5;
            }
            img {
              width: 280px;
              height: 280px;
              margin: 10px 0;
            }
            .footer-tip {
              font-size: 11px;
              color: #64748b;
              margin-top: 20px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>កូដ QR រួមស្កេនចុះវត្តមាន</h1>
            <div class="subtitle">កម្រងសាលារៀនអូរស្រឡៅ</div>
            <div class="meta">
              <strong>ប្រភេទវត្តមាន៖</strong> វត្តមាន ${mode === 'in' ? 'ចូលប្រជុំ (Check-in)' : 'ចេញប្រជុំ (Check-out)'}<br/>
              <strong>កាលបរិច្ឆេទប្រជុំ៖</strong> ${getKhmerSolarRaw(date)} (${toKhmerNumber(date)})
            </div>
            <img src="${qrDataUrl}" alt="Group QR Code" />
            <div class="footer-tip">
              <strong>👉 ណែនាំ៖</strong> លោកគ្រូ-អ្នកគ្រូគ្រាន់តែប្រើប្រាស់កាមេរ៉ាទូរស័ព្ទស្កេនកូដនេះ រួចជ្រើសរើសឈ្មោះរបស់ខ្លួន ដើម្បីចុះហត្ថលេខាផ្ទាល់ខ្លួន។
            </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/50 backdrop-blur-sm animate-fade-in" id="show-group-qr-modal-overlay">
      <div 
        className="bg-white rounded-[32px] shadow-2xl border border-brand-clay w-full max-w-lg overflow-hidden relative text-brand-brown animate-fade-in"
        id="show-group-qr-modal-container"
      >
        {/* Banner header */}
        <div className="bg-brand-brown text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-6 w-6 text-brand-accent animate-pulse" />
            <div>
              <h3 className="font-bold text-xs sm:text-sm font-khmer-muol text-brand-sand">
                កូដ QR រួមប្រចាំកិច្ចប្រជុំ
              </h3>
              <p className="text-[10px] text-brand-sand/80 mt-0.5 font-sans">
                កម្រងសាលារៀនអូរស្រឡៅ ({toKhmerNumber(date)})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-sand/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            id="close-group-qr-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 flex flex-col items-center space-y-5">
          {/* Top selection bar */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between p-3.5 bg-brand-sand/35 rounded-2xl border border-brand-clay/30 gap-3">
            <span className="text-xs font-bold text-brand-brown flex items-center gap-1">
              <ArrowRightLeft className="w-4 h-4 text-brand-accent" />
              <span>ជ្រើសរើសប្រភេទស្កេន៖</span>
            </span>
            
            <div className="flex items-center bg-white border border-brand-clay/65 rounded-xl overflow-hidden p-1">
              <button
                onClick={() => setMode('in')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'in' 
                    ? 'bg-brand-green text-white shadow-xs' 
                    : 'text-brand-brown hover:bg-brand-sand/20'
                }`}
              >
                វត្តមានចូល
              </button>
              <button
                onClick={() => setMode('out')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'out' 
                    ? 'bg-brand-accent text-white shadow-xs' 
                    : 'text-brand-brown hover:bg-brand-sand/20'
                }`}
              >
                វត្តមានចេញ
              </button>
            </div>
          </div>

          {/* QR details & instructions */}
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-stone-800">
              កូដ QR សម្រាប់លោកគ្រូ-អ្នកគ្រូស្កេនដោយខ្លួនឯង
            </h4>
            <p className="text-xs text-brand-brown-muted flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-accent" />
              <span>{getKhmerSolarRaw(date)}</span>
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white border-2 border-dashed border-brand-green/30 rounded-3xl shadow-xs relative group overflow-hidden">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Collective QR Code" 
                className="w-52 h-52 md:w-60 md:h-60 object-contain mx-auto"
                id="group-qr-image"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-brand-brown-muted text-xs italic">
                កំពុងបង្កើតកូដ QR...
              </div>
            )}
          </div>

          {/* Copy and Print Buttons */}
          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleCopy}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                copied 
                  ? 'bg-brand-green/10 text-brand-green border-brand-green/30' 
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
              id="copy-group-qr-link-btn"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'បានចំលងតំណ!' : 'ចំលងតំណភ្ជាប់'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-brown hover:bg-[#4a392c] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              id="print-group-qr-btn"
            >
              <Printer className="h-4 w-4 text-brand-accent animate-pulse" />
              <span>បោះពុម្ភ QR ធំ</span>
            </button>
          </div>

          {/* Test Link option */}
          <a
            href={groupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-brand-green bg-brand-sand/40 hover:bg-brand-sand/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-brand-green/10 text-center"
            id="test-group-qr-link-direct"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>សាកល្បងបើកតំណភ្ជាប់ព័ត៌មានរួម (សម្រាប់តេស្តក្នុង iFrame)</span>
          </a>
        </div>

        {/* Informative Footer banner */}
        <div className="bg-brand-sand/30 px-5 py-3.5 border-t border-brand-clay/30 text-center">
          <p className="text-[10.5px] leading-relaxed text-brand-brown-muted font-sans font-medium">
            💡 <strong>គន្លឹះ៖</strong> អ្នកសម្របសម្រួលអាច <strong className="text-brand-green">បោះពុម្ភ ឬចាក់បញ្ចាំង</strong> កូដ QR នេះនៅលើសាលប្រជុំ។ នៅពេលលោកគ្រូ-អ្នកគ្រូស្កេនរួច ពួកគាត់អាចជ្រើសរើសឈ្មោះផ្ទាល់ខ្លួនដើម្បីចុះហត្ថលេខាទូរស័ព្ទ។
          </p>
        </div>
      </div>
    </div>
  );
}

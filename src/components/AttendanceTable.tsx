/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LogIn, 
  LogOut, 
  MapPin, 
  Map, 
  Trash2, 
  Edit3, 
  User, 
  Clock, 
  FileText, 
  ShieldAlert,
  ChevronDown,
  QrCode
} from 'lucide-react';
import { AttendanceRecord, Gender, Shift } from '../types';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onSignInClick: (record: AttendanceRecord) => void;
  onSignOutClick: (record: AttendanceRecord) => void;
  onQrClick: (record: AttendanceRecord, mode: 'in' | 'out') => void;
  onUpdateRemarks: (recordId: string, remarks: string) => void;
  onRemoveRecord: (recordId: string) => void;
  filterShift: string;
  filterGender: string;
  filterSchool: string;
  searchTerm: string;
  schoolList: string[];
}

export default function AttendanceTable({
  records,
  onSignInClick,
  onSignOutClick,
  onQrClick,
  onUpdateRemarks,
  onRemoveRecord,
  filterShift,
  filterGender,
  filterSchool,
  searchTerm,
  schoolList
}: AttendanceTableProps) {
  // Store active inline remarks edit states
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remarkValue, setRemarkValue] = useState('');

  // Handle remarks inline saving
  const startEditingRemarks = (record: AttendanceRecord) => {
    setEditingRemarkId(record.id);
    setRemarkValue(record.remarks || '');
  };

  const saveRemarks = (id: string) => {
    onUpdateRemarks(id, remarkValue);
    setEditingRemarkId(null);
  };

  // Late Threshold times from localStorage or defaults
  const [morningLateThreshold, setMorningLateThreshold] = useState(() => {
    return localStorage.getItem('ou_sralau_morning_late') || '07:30';
  });
  const [afternoonLateThreshold, setAfternoonLateThreshold] = useState(() => {
    return localStorage.getItem('ou_sralau_afternoon_late') || '13:30';
  });

  // Helper to determine if a teacher arrived late based on shift
  const isLateTime = (timeStr: string | undefined, shift: string): boolean => {
    if (!timeStr) return false;
    
    // Standardize Cambodian native numbers to ASCII numerals
    const toStandardDigits = (str: string): string => {
      const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
      let result = str;
      for (let i = 0; i < 10; i++) {
        result = result.replaceAll(khmerDigits[i], i.toString());
      }
      return result;
    };

    const cleanTime = toStandardDigits(timeStr).replace(/[^0-9:]/g, ''); 
    const parts = cleanTime.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
    
    const minutesInDay = parts[0] * 60 + parts[1];
    
    const thresholdStr = shift === Shift.AFTERNOON ? afternoonLateThreshold : morningLateThreshold;
    const cleanThreshold = toStandardDigits(thresholdStr).replace(/[^0-9:]/g, '');
    const thresholdParts = cleanThreshold.split(':').map(Number);
    if (thresholdParts.length < 2 || isNaN(thresholdParts[0]) || isNaN(thresholdParts[1])) return false;
    
    const thresholdMinutes = thresholdParts[0] * 60 + thresholdParts[1];
    
    return minutesInDay > thresholdMinutes;
  };

  // Filter and search application
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = rec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rec.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rec.school.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesShift = filterShift === 'all' || rec.shift === filterShift;
    const matchesGender = filterGender === 'all' || rec.gender === filterGender;
    const matchesSchool = filterSchool === 'all' || rec.school === filterSchool;

    return matchesSearch && matchesShift && matchesGender && matchesSchool;
  });

  return (
    <div className="bg-white rounded-[32px] border border-brand-clay shadow-sm overflow-hidden" id="attendance-table-container">
      {/* Table Header Section */}
      <div className="bg-brand-sand-light px-6 py-4 border-b border-brand-clay flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-green" />
          <h3 className="font-bold text-brand-green text-sm md:text-base">
            តារាងវត្តមានប្រជុំបច្ចេកទេស <span className="text-xs font-semibold text-brand-brown-muted font-mono">({filteredRecords.length}/{records.length} នាក់)</span>
          </h3>
        </div>
        <div className="hidden lg:block text-xs font-semibold text-brand-brown-muted">
          *ចុចប៊ូតុងសកម្មភាព ឬ ស្គែនហត្ថលេខា ដើម្បីដៅវត្តមានចូល និង ចេញ
        </div>
      </div>

      {/* Late Threshold Settings panel */}
      <div className="bg-brand-sand/30 px-6 py-3 border-b border-brand-clay flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-accent animate-pulse" />
          <span className="font-bold text-brand-brown">លក្ខខណ្ឌកំណត់ម៉ោងយឺត (Late Status Clock)៖</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-brand-brown-muted font-bold text-[11px]">វេនព្រឹក៖</span>
            <input 
              type="time" 
              value={morningLateThreshold} 
              onChange={(e) => {
                const val = e.target.value || '07:30';
                setMorningLateThreshold(val);
                localStorage.setItem('ou_sralau_morning_late', val);
              }}
              style={{ padding: '0.15rem 0.4rem' }}
              className="px-2 py-1 text-[11px] border border-brand-clay rounded-lg focus:outline-none focus:border-brand-green font-bold text-brand-brown bg-white shadow-xs"
              title="ម៉ោងចូលចុងក្រោយសម្រាប់វេនព្រឹក"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-brand-brown-muted font-bold text-[11px]">វេនរសៀល៖</span>
            <input 
              type="time" 
              value={afternoonLateThreshold} 
              onChange={(e) => {
                const val = e.target.value || '13:30';
                setAfternoonLateThreshold(val);
                localStorage.setItem('ou_sralau_afternoon_late', val);
              }}
              style={{ padding: '0.15rem 0.4rem' }}
              className="px-2 py-1 text-[11px] border border-brand-clay rounded-lg focus:outline-none focus:border-brand-green font-bold text-brand-brown bg-white shadow-xs"
              title="ម៉ោងចូលចុងក្រោយសម្រាប់វេនរសៀល"
            />
          </div>
          <div className="text-[10px] text-brand-accent font-bold bg-[#F4EDE2] border border-brand-clay/60 px-2 py-0.5 rounded-md">
            * ចូលយឺតជាងម៉ោងកំណត់ នឹងបង្ហាញពណ៌ក្រហមដោយស្វ័យប្រវត្ត
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-brand-sand-light/20" id="no-attendance-found">
          <div className="p-3 bg-brand-sand rounded-full border border-brand-clay text-brand-accent">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-brand-green text-sm md:text-base">រកមិនឃើញទិន្នន័យវត្តមានឡើយ</h4>
            <p className="text-xs text-brand-brown-muted mt-1 max-w-sm mx-auto">
              គ្មានព័ត៌មានគ្រូបង្រៀនត្រូវនឹងលក្ខខណ្ឌស្វែងរកនេះទេ។ សូមសាកល្បងប្តូរការស្វែងរក ឬបន្ថែមឈ្មោះគ្រូថ្មី។
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-brand-brown">
            <thead>
              <tr className="bg-brand-sand-light border-b border-brand-clay text-xs font-semibold text-brand-brown-muted uppercase tracking-wider font-sans">
                <th className="px-4 py-3.5 text-center w-12">ល.រ</th>
                <th className="px-4 py-3.5 min-w-[120px]">ឈ្មោះលោកគ្រូ/អ្នកគ្រូ</th>
                <th className="px-3 py-3.5 text-center w-16">ភេទ</th>
                <th className="px-4 py-3.5 min-w-[160px]">សាលារៀន</th>
                <th className="px-4 py-3.5 min-w-[140px]">តួនាទី / ឯកទេស</th>
                <th className="px-3 py-3.5 text-center w-16">វេន</th>
                <th className="px-4 py-3.5 text-center min-w-[80px]">ម៉ោងចូល</th>
                <th className="px-4 py-3.5 text-center min-w-[110px]">ហត្ថលេខាចូល</th>
                <th className="px-4 py-3.5 text-center min-w-[80px]">ម៉ោងចេញ</th>
                <th className="px-4 py-3.5 text-center min-w-[110px]">ហត្ថលេខាចេញ</th>
                <th className="px-4 py-3.5 min-w-[150px]">ព័ត៌មានផ្សេងៗ / កំណត់សម្គាល់</th>
                <th className="px-4 py-3.5 text-center w-16 print:hidden">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-clay/30 text-xs md:text-sm">
              {filteredRecords.map((rec, index) => {
                const isSignInComplete = !!rec.timeIn && !!rec.signatureIn;
                const isSignOutComplete = !!rec.timeOut && !!rec.signatureOut;
                const isLateIn = rec.timeIn ? isLateTime(rec.timeIn, rec.shift) : false;

                return (
                  <tr 
                    key={rec.id} 
                    className={`hover:bg-brand-sand-light/50 transition-colors group ${
                      isLateIn ? 'bg-red-50/20' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="px-4 py-3 text-center text-brand-brown-muted font-medium font-mono">
                      {index + 1}
                    </td>

                    {/* Teacher Info */}
                    <td className="px-4 py-3 font-bold text-brand-green">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${rec.gender === Gender.FEMALE ? 'bg-pink-50 text-pink-600' : 'bg-brand-sand text-brand-brown'}`}>
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span>{rec.name}</span>
                      </div>
                    </td>

                    {/* Gender */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        rec.gender === Gender.FEMALE 
                          ? 'bg-pink-50 text-pink-700 border border-pink-200/50' 
                          : 'bg-brand-sand text-brand-brown border border-brand-clay/50'
                      }`}>
                        {rec.gender}
                      </span>
                    </td>

                    {/* School */}
                    <td className="px-4 py-3 text-brand-brown font-medium">
                      {rec.school}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 text-brand-green-muted text-xs">
                      {rec.role}
                    </td>

                    {/* Shift */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        rec.shift === Shift.MORNING
                          ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'
                          : 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                      }`}>
                        {rec.shift}
                      </span>
                    </td>

                    {/* Time In */}
                    <td className="px-4 py-3 text-center">
                      {rec.timeIn ? (
                        (() => {
                          const isLate = isLateTime(rec.timeIn, rec.shift);
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                isLate 
                                  ? 'text-red-700 bg-red-50 border-red-200 shadow-xs' 
                                  : 'text-brand-green bg-brand-sand border-brand-clay/30'
                              } font-mono`}>
                                <Clock className={`w-3 h-3 ${isLate ? 'text-red-500 animate-pulse' : 'text-brand-accent'}`} />
                                {rec.timeIn}
                              </span>
                              {isLate && (
                                <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 px-1 py-0.5 rounded tracking-wide font-sans select-none animate-pulse">
                                  យឺត (Late)
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-brand-brown-muted italic">-</span>
                      )}
                    </td>

                    {/* Signature In */}
                    <td className="px-4 py-3 text-center">
                      {rec.signatureIn ? (
                        <div className="flex flex-col items-center justify-center space-y-1.5 select-none text-center">
                          <img 
                            src={rec.signatureIn} 
                            alt="Signature In" 
                            className="h-9 w-auto max-w-[100px] border border-brand-clay rounded bg-white shadow-sm p-0.5 py-1" 
                            referrerPolicy="no-referrer"
                          />
                          {rec.locationIn && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${rec.locationIn.latitude},${rec.locationIn.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-brand-green hover:text-brand-accent hover:underline flex items-center gap-0.5 bg-brand-sand px-1.5 py-0.5 rounded-full font-sans tracking-tight justify-center"
                              title="ចុចដើម្បីមើលលើផែនទីបញ្ជាក់ GPS"
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              <span>Lat/Lng ({rec.locationIn.latitude.toFixed(3)}, {rec.locationIn.longitude.toFixed(3)})</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-1">
                          <button
                            onClick={() => onSignInClick(rec)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-brand-accent hover:bg-brand-accent-hover rounded-lg shadow-sm font-sans flex items-center justify-center gap-1 cursor-pointer transition-colors w-full sm:w-auto"
                            id={`signin-btn-${rec.id}`}
                            title="ចុះវត្តមានចូលផ្ទាល់លើឧបករណ៍នេះ"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>វត្តមានចូល</span>
                          </button>

                          <button
                            onClick={() => onQrClick(rec, 'in')}
                            className="px-2 py-1.5 text-[11px] font-bold text-brand-green bg-brand-sand hover:bg-brand-sand-light border border-brand-clay hover:border-brand-green rounded-lg shadow-sm font-sans flex items-center justify-center gap-1 cursor-pointer transition-colors w-full sm:w-auto"
                            id={`qr-in-btn-${rec.id}`}
                            title="បង្ហាញកូដ QR សម្រាប់ឲ្យគ្រូស្កេនចុះឈ្មោះដោយខ្លួនឯង"
                          >
                            <QrCode className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                            <span>កូដ QR</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Time Out */}
                    <td className="px-4 py-3 text-center">
                      {rec.timeOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-green bg-brand-sand px-2 py-0.5 rounded-full font-mono">
                          <Clock className="w-3 h-3 text-brand-green-muted" />
                          {rec.timeOut}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-brown-muted italic">-</span>
                      )}
                    </td>

                    {/* Signature Out */}
                    <td className="px-4 py-3 text-center">
                      {rec.signatureOut ? (
                        <div className="flex flex-col items-center justify-center space-y-1.5 select-none text-center">
                          <img 
                            src={rec.signatureOut} 
                            alt="Signature Out" 
                            className="h-9 w-auto max-w-[100px] border border-brand-clay rounded bg-white shadow-sm p-0.5 py-1" 
                            referrerPolicy="no-referrer"
                          />
                          {rec.locationOut && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${rec.locationOut.latitude},${rec.locationOut.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-brand-green hover:text-brand-accent hover:underline flex items-center gap-0.5 bg-brand-sand px-1.5 py-0.5 rounded-full font-sans tracking-tight justify-center"
                              title="ចុចដើម្បីមើលលើផែនទីបញ្ជាក់ GPS"
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              <span>Lat/Lng ({rec.locationOut.latitude.toFixed(3)}, {rec.locationOut.longitude.toFixed(3)})</span>
                            </a>
                          )}
                        </div>
                      ) : rec.signatureIn ? (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-1">
                          <button
                            onClick={() => onSignOutClick(rec)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-lg shadow-sm font-sans flex items-center justify-center gap-1 cursor-pointer transition-colors w-full sm:w-auto"
                            id={`signout-btn-${rec.id}`}
                            title="ចុះវត្តមានចេញផ្ទាល់លើឧបករណ៍នេះ"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>វត្តមានចេញ</span>
                          </button>

                          <button
                            onClick={() => onQrClick(rec, 'out')}
                            className="px-2 py-1.5 text-[11px] font-bold text-brand-green bg-brand-sand hover:bg-brand-sand-light border border-brand-clay hover:border-brand-green rounded-lg shadow-sm font-sans flex items-center justify-center gap-1 cursor-pointer transition-colors w-full sm:w-auto"
                            id={`qr-out-btn-${rec.id}`}
                            title="បង្ហាញកូដ QR សម្រាប់ឲ្យគ្រូស្កេនចុះវត្តមានចេញដោយខ្លួនឯង"
                          >
                            <QrCode className="w-3.5 h-3.5 text-brand-green animate-pulse" />
                            <span>កូដ QR</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-[11px] text-brand-brown-muted italic select-none py-1.5">
                          រង់ចាំវត្តមានចូលសិន
                        </div>
                      )}
                    </td>

                    {/* Remarks/Comments Field */}
                    <td className="px-4 py-3">
                      {editingRemarkId === rec.id ? (
                        <div className="flex items-center gap-1" id={`remark-edit-container-${rec.id}`}>
                          <input
                            type="text"
                            value={remarkValue}
                            onChange={(e) => setRemarkValue(e.target.value)}
                            placeholder="បំពេញព័ត៌មានផ្សេងៗ..."
                            className="w-full px-2.5 py-1 text-xs border border-brand-clay rounded focus:outline-none focus:border-brand-green bg-white text-brand-brown"
                            autoFocus
                            id={`remark-input-field-${rec.id}`}
                          />
                          <button
                            onClick={() => saveRemarks(rec.id)}
                            className="bg-brand-green hover:bg-[#3d4d38] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                            id={`remark-save-btn-${rec.id}`}
                          >
                            រក្សាទុក
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group/remark">
                          <span className={`text-xs ${rec.remarks ? 'text-brand-brown' : 'text-brand-brown-muted italic'}`}>
                            {rec.remarks || 'គ្មានកំណត់សម្គាល់'}
                          </span>
                          <button
                            onClick={() => startEditingRemarks(rec)}
                            className="p-1 text-brand-brown-muted hover:text-brand-accent rounded opacity-0 group-hover/remark:opacity-100 transition-opacity bg-transparent"
                            id={`remark-edit-btn-${rec.id}`}
                            title="កែសម្រួលកំណត់សម្គាល់"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-3 text-center print:hidden">
                      <button
                        onClick={() => onRemoveRecord(rec.id)}
                        className="p-1 rounded text-brand-brown-muted hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        id={`delete-record-btn-${rec.id}`}
                        title="លុបឈ្មោះគ្រូនេះចេញពីបញ្ជីវត្តមានថ្ងៃនេះ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

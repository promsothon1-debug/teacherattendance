/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  Award, 
  Users, 
  Percent, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  School, 
  Clock, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { AttendanceRecord, Teacher, Gender, Shift } from '../types';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  records: AttendanceRecord[];
  teachers: Teacher[];
}

export default function DailySummaryModal({
  isOpen,
  onClose,
  date,
  records,
  teachers
}: DailySummaryModalProps) {
  if (!isOpen) return null;

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

  // Calculations
  const totalTeachersCount = records.length;
  const presentRecords = records.filter(r => !!r.signatureIn || !!r.timeIn);
  const presentCount = presentRecords.length;
  
  const presentPercentage = totalTeachersCount > 0 
    ? Math.round((presentCount / totalTeachersCount) * 100) 
    : 0;

  const missingRecords = records.filter(r => !r.signatureIn && !r.timeIn);
  const missingCount = missingRecords.length;

  // Group by school
  const schoolStatsMap: Record<string, { total: number; present: number }> = {};
  
  records.forEach(rec => {
    const schoolName = rec.school || 'មិនសម្គាល់សាលា';
    if (!schoolStatsMap[schoolName]) {
      schoolStatsMap[schoolName] = { total: 0, present: 0 };
    }
    schoolStatsMap[schoolName].total += 1;
    if (rec.signatureIn || rec.timeIn) {
      schoolStatsMap[schoolName].present += 1;
    }
  });

  const schoolSummary = Object.entries(schoolStatsMap).map(([schoolName, stats]) => {
    const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return {
      name: schoolName,
      total: stats.total,
      present: stats.present,
      percentage
    };
  });

  // Sort schools: higher percentage first, if tie, more active present count, if tie, school name alphabetically
  const sortedSchools = [...schoolSummary].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return b.present - a.present;
  });

  // Find school(s) with the highest percentage rate & at least 1 person present
  const maxPercentage = sortedSchools.length > 0 ? Math.max(...sortedSchools.map(s => s.percentage)) : 0;
  const topSchools = sortedSchools.filter(s => s.percentage === maxPercentage && s.present > 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm animate-fade-in"
      id="daily-summary-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-brand-sand-light rounded-[32px] border border-brand-clay shadow-2xl overflow-hidden text-brand-brown animate-fade-in flex flex-col max-h-[90vh]"
        id="daily-summary-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-brand-green text-white p-5 sm:p-6 flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-brand-accent animate-bounce" />
            <div>
              <h2 className="font-khmer-muol text-xs sm:text-sm tracking-wide">
                របាយការណ៍សង្ខេបវត្តមានប្រចាំថ្ងៃ
              </h2>
              <p className="text-xs text-brand-sand/90 flex items-center gap-1.5 mt-1 font-sans">
                <Calendar className="h-3.5 w-3.5" />
                <span>{getKhmerSolarRaw(date)} ({toKhmerNumber(date)})</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 active:bg-white/20 transition-all rounded-full cursor-pointer"
            id="close-summary-modal-btn"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" id="summary-metrics-grid">
            {/* Percentage KPI */}
            <div className="bg-white p-4 rounded-2xl border border-brand-clay/60 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-brand-brown-muted block mb-1">អត្រាវត្តមានរួម</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-brand-green font-mono">{toKhmerNumber(presentPercentage)}</span>
                <span className="text-xs font-bold text-brand-green">%</span>
              </div>
              <div className="w-full bg-brand-sand/40 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-brand-green h-full rounded-full transition-all" 
                  style={{ width: `${presentPercentage}%` }}
                />
              </div>
            </div>

            {/* Total Ratios */}
            <div className="bg-white p-4 rounded-2xl border border-brand-clay/60 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-brand-brown-muted block mb-1">វត្តមានសរុប</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-brand-green font-mono">{toKhmerNumber(presentCount)}</span>
                <span className="text-xs text-brand-brown-muted font-bold">/ {toKhmerNumber(totalTeachersCount)} នាក់</span>
              </div>
              <p className="text-[10px] text-brand-brown-muted font-medium mt-3">
                គិតរួមគ្រប់លោកគ្រូ-អ្នកគ្រូ
              </p>
            </div>

            {/* Missing Count */}
            <div className="bg-white p-4 rounded-2xl border border-brand-clay/60 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-brand-brown-muted block mb-1">អវត្តមានជារួម</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black font-mono ${missingCount > 0 ? 'text-brand-accent' : 'text-brand-green'}`}>
                  {toKhmerNumber(missingCount)}
                </span>
                <span className="text-xs text-brand-brown-muted font-bold"> នាក់</span>
              </div>
              <p className="text-[10px] text-brand-brown-muted font-medium mt-3">
                {missingCount > 0 ? 'ទាមទារការពិនិត្យតាមដាន' : 'វត្តមានពេញលេញឥតខ្ចោះ'}
              </p>
            </div>

            {/* Highest Attendance School */}
            <div className="bg-white p-4 rounded-2xl border border-brand-clay/60 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-brand-brown-muted block mb-1">សាលាវត្តមានខ្ពស់ជាងគេ</span>
              <div className="mt-1">
                {topSchools.length > 0 ? (
                  <div>
                    <h4 className="text-[11px] font-bold text-brand-green truncate" title={topSchools[0].name}>
                      {topSchools[0].name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 mt-1 bg-brand-green/10 text-brand-green text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md">
                      <Percent className="w-3 h-3 text-brand-accent" />
                      <span>{toKhmerNumber(topSchools[0].percentage)}% ( {toKhmerNumber(topSchools[0].present)}/{toKhmerNumber(topSchools[0].total)} )</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-brand-brown-muted italic select-none mt-1">
                    ពុំទាន់មានវត្តមានឡើយ
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* School Breakdowns */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-brand-clay/60 shadow-xs space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-brand-green flex items-center gap-2 border-b border-brand-clay/40 pb-2">
              <School className="h-4.5 w-4.5 text-brand-accent" />
              <span>របាយការណ៍វត្តមានតាមសាលារៀន</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedSchools.map((item, index) => {
                const isTop = topSchools.some(ts => ts.name === item.name);
                return (
                  <div 
                    key={item.name} 
                    className="p-3.5 bg-brand-sand-light/50 border border-brand-clay/40 rounded-xl space-y-2 relative overflow-hidden"
                  >
                    {isTop && (
                      <div className="absolute top-0 right-0 h-4 w-4 bg-brand-accent text-white rounded-bl-lg flex items-center justify-center">
                        <Award className="h-3 w-3" />
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-[11.5px] font-bold text-brand-green truncate max-w-[80%]" title={item.name}>
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-brand-brown-muted bg-brand-sand px-1.5 py-0.5 rounded">
                        {toKhmerNumber(item.present)}/{toKhmerNumber(item.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-brand-sand/40 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            item.percentage === 100 
                              ? 'bg-brand-green' 
                              : item.percentage > 50 
                              ? 'bg-brand-accent' 
                              : 'bg-red-500'
                          }`} 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-brown select-none">
                        {toKhmerNumber(item.percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Absent / Missing Teachers Quick-View container */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-brand-clay/60 shadow-xs space-y-4">
            <h3 className="font-bold text-xs sm:text-sm text-brand-green flex items-center justify-between border-b border-brand-clay/40 pb-2">
              <span className="flex items-center gap-2">
                <AlertCircle className={`h-4.5 w-4.5 ${missingCount > 0 ? 'text-brand-accent' : 'text-brand-green'}`} />
                <span>បញ្ជីឈ្មោះគ្រូបង្រៀនអវត្តមាន (មិនទាន់បញ្ជាក់វត្តមានចូល)</span>
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                missingCount > 0 ? 'bg-red-50 text-red-700 font-mono' : 'bg-brand-green/10 text-brand-green'
              }`}>
                {toKhmerNumber(missingCount)} នាក់
              </span>
            </h3>

            {missingCount === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-brand-green">
                <CheckCircle2 className="h-10 w-10 text-brand-green animate-pulse" />
                <h4 className="font-bold text-sm">វត្តមានពេញលេញ ១០០%!</h4>
                <p className="text-xs text-brand-brown-muted max-w-xs leading-relaxed">
                  លោកគ្រូ អ្នកគ្រូទាំងអស់នៅក្នុងកម្រងសាលារៀនអូរស្រឡៅ បានចុះវត្តមានចូលរួមគ្រប់គ្រាន់ជោគជ័យ។
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-brand-brown">
                  <thead>
                    <tr className="bg-brand-sand-light border-b border-brand-clay/60 text-[10px] font-bold text-brand-brown-muted uppercase tracking-wider">
                      <th className="px-3 py-2 text-center w-10">ល.រ</th>
                      <th className="px-3 py-2">ឈ្មោះលោកគ្រូ/អ្នកគ្រូ</th>
                      <th className="px-3 py-2 text-center w-12">ភេទ</th>
                      <th className="px-3 py-2">សាលារៀន</th>
                      <th className="px-3 py-2">តួនាទី / វេន</th>
                      <th className="px-3 py-2 text-center">លេខទូរស័ព្ទ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-clay/20 text-xs">
                    {missingRecords.map((rec, idx) => {
                      // Match teacher profile to fetch phone number if present
                      const matchedTeacher = teachers.find(t => t.id === rec.teacherId);
                      const phoneNumber = matchedTeacher?.phone;

                      return (
                        <tr key={rec.id} className="hover:bg-brand-sand-light/40 transition-colors">
                          <td className="px-3 py-2.5 text-center text-brand-brown-muted font-bold font-mono">
                            {toKhmerNumber(idx + 1)}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-brand-accent">
                            {rec.name}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              rec.gender === Gender.FEMALE ? 'bg-pink-50 text-pink-700' : 'bg-brand-sand/50 text-brand-brown'
                            }`}>
                              {rec.gender}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium truncate max-w-[120px]" title={rec.school}>
                            {rec.school}
                          </td>
                          <td className="px-3 py-2.5 text-brand-brown-muted">
                            <div className="font-semibold">{rec.role}</div>
                            <div className="text-[10px] text-brand-green-muted">វេន {rec.shift}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {phoneNumber ? (
                              <a 
                                href={`tel:${phoneNumber}`}
                                className="inline-flex items-center gap-1 text-[11px] text-brand-green font-bold bg-brand-sand px-1.5 py-0.5 rounded hover:bg-brand-clay transition-all hover:scale-105"
                                title={`ទូរស័ព្ទទៅ៖ ${rec.name}`}
                              >
                                <Phone className="w-2.5 h-2.5 text-brand-accent" />
                                <span className="font-mono">{toKhmerNumber(phoneNumber)}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-brand-brown-muted italic select-none">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-brand-sand px-5 sm:px-6 py-4 border-t border-brand-clay flex justify-between items-center">
          <div className="text-[10.5px] text-brand-brown-muted font-semibold hidden sm:block select-none">
            * របាយការណ៍ត្រូវបានចងក្រងពីទិន្នន័យជាក់ស្តែងតាមវគ្គនីមួយៗ
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-brand-green hover:bg-[#3d4d38] active:scale-95 transition-all rounded-xl shadow-xs cursor-pointer ml-auto"
            id="close-summary-dismiss-btn"
          >
            បិទរបាយការណ៍
          </button>
        </div>
      </div>
    </div>
  );
}

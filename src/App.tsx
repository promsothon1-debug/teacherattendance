/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Search, 
  MapPin, 
  Users, 
  CheckCircle, 
  Calendar, 
  Settings, 
  Trash2,
  Bookmark,
  ShieldCheck,
  RefreshCw,
  Upload,
  AlertCircle,
  ScanLine,
  School,
  ClipboardList,
  History,
  Send
} from 'lucide-react';

import { 
  Teacher, 
  AttendanceRecord, 
  DEFAULT_TEACHERS, 
  Gender, 
  Shift, 
  SCHOOL_LIST 
} from './types';
import Header from './components/Header';
import AttendanceTable from './components/AttendanceTable';
import SignatureModal from './components/SignatureModal';
import AddTeacherModal from './components/AddTeacherModal';
import QuickScanModal from './components/QuickScanModal';
import ManageSchoolsModal from './components/ManageSchoolsModal';
import ShowQrModal from './components/ShowQrModal';
import QRScannerModal from './components/QRScannerModal';
import MobileSignScreen from './components/MobileSignScreen';
import DailySummaryModal from './components/DailySummaryModal';
import ShowGroupQrModal from './components/ShowGroupQrModal';
import { exportToExcel, exportToWord, printPDFLayout } from './utils/exportUtils';
import { QrCode } from 'lucide-react';
import { calculateMinutesLate, toKhmerNumber } from './utils/timeUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

function getKhmerSolarRaw(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const khmerMonths = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    const toKhmer = (num: number) => num.toString().split('').map(x => {
      const idx = parseInt(x, 10);
      return !isNaN(idx) ? khmerNumbers[idx] : x;
    }).join('');
    return `ថ្ងៃទី ${toKhmer(day)} ខែ ${khmerMonths[month]} ឆ្នាំ ${toKhmer(year)}`;
  } catch (e) {
    return '';
  }
}

export default function App() {
  // Current Selected Date (default to today: YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
  });

  const [meetingTitle, setMeetingTitle] = useState('កិច្ចប្រជុំបច្ចេកទេសកម្រងសាលារៀនអូរស្រឡៅ');

  // Teachers Roster Database (Lazy loading to prevent race conditions during mobile scan loads)
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const savedTeachers = localStorage.getItem('ou_sralau_teachers_roster');
    if (savedTeachers) {
      try { return JSON.parse(savedTeachers); } catch (e) { return DEFAULT_TEACHERS; }
    }
    return DEFAULT_TEACHERS;
  });

  // Historical Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const savedRecords = localStorage.getItem('ou_sralau_attendance_records');
    if (savedRecords) {
      try { return JSON.parse(savedRecords); } catch (e) { return []; }
    }
    return [];
  });

  // Schools list database
  const [schools, setSchools] = useState<string[]>(() => {
    const savedSchools = localStorage.getItem('ou_sralau_schools');
    if (savedSchools) {
      try { return JSON.parse(savedSchools); } catch (e) { return SCHOOL_LIST; }
    }
    return SCHOOL_LIST;
  });

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterSchool, setFilterSchool] = useState('all');

  // Modal Control States
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [isManageSchoolsOpen, setIsManageSchoolsOpen] = useState(false);
  const [activeSignRecord, setActiveSignRecord] = useState<AttendanceRecord | null>(null);
  const [signatureMode, setSignatureMode] = useState<'in' | 'out'>('in');

  // QR Code Feature States
  const [isShowQrOpen, setIsShowQrOpen] = useState(false);
  const [qrActiveRecord, setQrActiveRecord] = useState<AttendanceRecord | null>(null);
  const [qrActiveMode, setQrActiveMode] = useState<'in' | 'out'>('in');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isGroupQrOpen, setIsGroupQrOpen] = useState(false);

  // Daily Summary Report modal state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Telegram integration manual/guide toggle state
  const [showTelegramTips, setShowTelegramTips] = useState(false);

  // Notice alerts messages
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Draft Autosave States
  const [hasDraftToRestore, setHasDraftToRestore] = useState(false);
  const [draftRecords, setDraftRecords] = useState<AttendanceRecord[] | null>(null);
  const [isDraftAutosaved, setIsDraftAutosaved] = useState(false);
  const [lastAutosaveTime, setLastAutosaveTime] = useState<string | null>(null);

  // Store ref for the latest attendanceRecords to prevent stale closure in interval
  const attendanceRecordsRef = useRef(attendanceRecords);
  useEffect(() => {
    attendanceRecordsRef.current = attendanceRecords;
  }, [attendanceRecords]);

  // Check for unsaved draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('draft_storage');
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as AttendanceRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Compare with active loaded attendanceRecords
          const currentSaved = localStorage.getItem('ou_sralau_attendance_records');
          if (currentSaved) {
            try {
              const currentParsed = JSON.parse(currentSaved);
              // Simple check: if different string content or size, offer restore
              if (JSON.stringify(parsed) !== JSON.stringify(currentParsed)) {
                setDraftRecords(parsed);
                setHasDraftToRestore(true);
              }
            } catch (e) {
              setDraftRecords(parsed);
              setHasDraftToRestore(true);
            }
          } else {
            // No saved records at all but draft has some
            setDraftRecords(parsed);
            setHasDraftToRestore(true);
          }
        }
      } catch (e) {
        console.error("Error loading draft_storage", e);
      }
    }
  }, []);

  // Set up 30-second draft autosave interval
  useEffect(() => {
    const interval = setInterval(() => {
      const recordsToSave = attendanceRecordsRef.current;
      if (recordsToSave && recordsToSave.length > 0) {
        try {
          localStorage.setItem('draft_storage', JSON.stringify(recordsToSave));
          const timeString = new Date().toLocaleTimeString('km-KH');
          setLastAutosaveTime(timeString);
          setIsDraftAutosaved(true);
          // Hide feedback badge after 3 seconds
          const timeout = setTimeout(() => setIsDraftAutosaved(false), 3000);
          return () => clearTimeout(timeout);
        } catch (e) {
          console.error("Error autosaving to draft_storage", e);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Handler to Restore Draft
  const handleRestoreDraft = () => {
    if (draftRecords) {
      saveRecordsToStorage(draftRecords);
      triggerAlert('បានស្ដារព័ត៌មានវត្តមានពីឯកសារព្រាងជោគជ័យ!', 'success');
      setHasDraftToRestore(false);
      setDraftRecords(null);
    }
  };

  // Handler to Discard Draft
  const handleDiscardDraft = () => {
    localStorage.removeItem('draft_storage');
    setHasDraftToRestore(false);
    setDraftRecords(null);
    triggerAlert('បានលុបចោលឯកសារព្រាងដោយជោគជ័យ!', 'info');
  };

  // 1. Ensure Initial Data is saved in LocalStorage if blank
  useEffect(() => {
    if (!localStorage.getItem('ou_sralau_teachers_roster')) {
      localStorage.setItem('ou_sralau_teachers_roster', JSON.stringify(DEFAULT_TEACHERS));
    }
    if (!localStorage.getItem('ou_sralau_schools')) {
      localStorage.setItem('ou_sralau_schools', JSON.stringify(SCHOOL_LIST));
    }
  }, []);

  // 2. Synchronize Teachers database to localStorage on changes
  const saveTeachersToStorage = (updatedTeachers: Teacher[]) => {
    setTeachers(updatedTeachers);
    localStorage.setItem('ou_sralau_teachers_roster', JSON.stringify(updatedTeachers));
  };

  // 3. Synchronize All Attendance records to localStorage on changes
  const saveRecordsToStorage = (updatedRecords: AttendanceRecord[]) => {
    setAttendanceRecords(updatedRecords);
    localStorage.setItem('ou_sralau_attendance_records', JSON.stringify(updatedRecords));
  };

  // Telegram integration configurations and state
  const [isTelegramConfigured, setIsTelegramConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/telegram-config')
      .then(res => res.json())
      .then(data => {
        setIsTelegramConfigured(!!data.configured);
      })
      .catch(err => {
        console.error("Error fetching telegram configuration:", err);
      });
  }, []);

  const sendTelegramAlert = async (
    teacherName: string, 
    type: 'in' | 'out', 
    time: string, 
    minutesLate: number | undefined, 
    school: string,
    dateStr: string
  ) => {
    if (!isTelegramConfigured) return;

    try {
      const d = new Date(dateStr);
      const formattedDate = !isNaN(d.getTime()) 
        ? d.toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' })
        : dateStr;

      let statusMsg = "";
      if (type === 'in') {
        if (minutesLate && minutesLate > 0) {
          statusMsg = `⚠️ <b>យឺត ${toKhmerNumber(minutesLate)} នាទី</b>`;
        } else {
          statusMsg = `✅ <b>ទាន់ពេល (ទៀងម៉ោង)</b>`;
        }
      } else {
        statusMsg = `✅ <b>បានចេញរួចរាល់</b>`;
      }

      const text = `🔔 <b>របាយការណ៍វត្តមានថ្មី (កម្រងអូរស្រឡៅ)</b>\n\n` +
        `• ឈ្មោះ៖ <b>${teacherName}</b>\n` +
        `• សាលារៀន៖ <b>${school || 'មិនបញ្ជាក់'}</b>\n` +
        `• កាលបរិច្ឆេទ៖ <b>${formattedDate}</b>\n` +
        `• ម៉ោង៖ <code>${time}</code>\n` +
        `• ប្រភេទវត្តមាន៖ <b>${type === 'in' ? 'ចូល (Check-In)' : 'ចេញ (Check-Out)'}</b>\n` +
        `• ស្ថានភាព៖ ${statusMsg}\n\n` +
        `<i>កត់ត្រាស្វ័យប្រវត្តិតាមរយៈប្រព័ន្ធវត្តមានកម្រងសាលាអូរស្រឡៅ</i>`;

      const response = await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Telegram alert failed to deliver:", errorData.error);
      }
    } catch (e) {
      console.error("Failed sending Telegram message", e);
    }
  };

  // Trigger brief alert banner notifications
  const triggerAlert = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  // 4. Generate records for today if they don't exist yet
  // This executes dynamically whenever selectedDate or teachers count changes
  const currentDaysRecords = (() => {
    const existing = attendanceRecords.filter((r) => r.date === selectedDate);
    
    // If we already have entries saved for this date, return them
    if (existing.length > 0) {
      return existing;
    }

    // Create empty attendance records for the active date based on the current teachers roster
    const newDayDrafts: AttendanceRecord[] = teachers.map((t) => ({
      id: `${t.id}_${selectedDate}`,
      teacherId: t.id,
      name: t.name,
      gender: t.gender,
      school: t.school,
      role: t.role,
      shift: t.shift,
      date: selectedDate
    }));

    return newDayDrafts;
  })();

  // Synchronize new day draft records into the main attendanceRecords array
  useEffect(() => {
    const existingForDate = attendanceRecords.filter((r) => r.date === selectedDate);
    if (existingForDate.length === 0 && teachers.length > 0) {
      const newDayDrafts: AttendanceRecord[] = teachers.map((t) => ({
        id: `${t.id}_${selectedDate}`,
        teacherId: t.id,
        name: t.name,
        gender: t.gender,
        school: t.school,
        role: t.role,
        shift: t.shift,
        date: selectedDate
      }));
      saveRecordsToStorage([...attendanceRecords, ...newDayDrafts]);
    }
  }, [selectedDate, teachers.length, attendanceRecords.length]);

  // 5. Handlers
  const handleAddNewTeacher = (savedTeacher: Teacher) => {
    // Check if it is an edit or duplicate
    const exists = teachers.some((t) => t.id === savedTeacher.id);

    if (exists) {
      // It's an EDIT request!
      const updatedRoster = teachers.map((t) => t.id === savedTeacher.id ? savedTeacher : t);
      saveTeachersToStorage(updatedRoster);

      // Now, update all attendance records for this teacher (including past and currently active records)
      const updatedRecords = attendanceRecords.map((rec) => {
        if (rec.teacherId === savedTeacher.id) {
          return {
            ...rec,
            name: savedTeacher.name,
            gender: savedTeacher.gender,
            school: savedTeacher.school,
            role: savedTeacher.role,
            shift: savedTeacher.shift
          };
        }
        return rec;
      });
      saveRecordsToStorage(updatedRecords);
      triggerAlert(`បានកែសម្រួលព័ត៌មានរបស់លោកគ្រូ/អ្នកគ្រូ៖ ${savedTeacher.name} ដោយជោគជ័យ!`);
    } else {
      // It's an ADD request!
      const updatedRoster = [...teachers, savedTeacher];
      saveTeachersToStorage(updatedRoster);

      const newRecord: AttendanceRecord = {
        id: `${savedTeacher.id}_${selectedDate}`,
        teacherId: savedTeacher.id,
        name: savedTeacher.name,
        gender: savedTeacher.gender,
        school: savedTeacher.school,
        role: savedTeacher.role,
        shift: savedTeacher.shift,
        date: selectedDate
      };

      saveRecordsToStorage([...attendanceRecords, newRecord]);
      triggerAlert(`បានចុះឈ្មោះលោកគ្រូ/អ្នកគ្រូ៖ ${savedTeacher.name} ដោយជោគជ័យ!`);
    }
    
    // Clear editing state
    setEditingTeacher(null);
  };

  const handleEditTeacherClick = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setEditingTeacher(teacher);
      setIsAddTeacherOpen(true);
    } else {
      triggerAlert('រកមិនឃើញព័ត៌មានគ្រូនេះទេ!', 'error');
    }
  };

  const handleOpenSignatureIn = (record: AttendanceRecord) => {
    setActiveSignRecord(record);
    setSignatureMode('in');
    setIsSignatureOpen(true);
  };

  const handleOpenSignatureOut = (record: AttendanceRecord) => {
    setActiveSignRecord(record);
    setSignatureMode('out');
    setIsSignatureOpen(true);
  };

  const handleOpenQrCode = (record: AttendanceRecord, mode: 'in' | 'out') => {
    setQrActiveRecord(record);
    setQrActiveMode(mode);
    setIsShowQrOpen(true);
  };

  const handleSaveSignature = (signatureBase64: string, locationObj?: any) => {
    if (!activeSignRecord) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('km-KH', { hour12: false });

    const updated = attendanceRecords.map((rec) => {
      if (rec.id === activeSignRecord.id) {
        if (signatureMode === 'in') {
          return {
            ...rec,
            timeIn: timeStr,
            minutesLate: calculateMinutesLate(timeStr, rec.shift),
            signatureIn: signatureBase64,
            locationIn: locationObj
          };
        } else {
          return {
            ...rec,
            timeOut: timeStr,
            signatureOut: signatureBase64,
            locationOut: locationObj
          };
        }
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    triggerAlert(`បានកត់ត្រាវត្តមាន ${signatureMode === 'in' ? 'ចូល' : 'ចេញ'} សម្រាប់ ${activeSignRecord.name} រួចរាល់!`);
    
    // Trigger Telegram Notification
    const minsLate = signatureMode === 'in' ? calculateMinutesLate(timeStr, activeSignRecord.shift) : undefined;
    sendTelegramAlert(activeSignRecord.name, signatureMode, timeStr, minsLate, activeSignRecord.school, selectedDate);

    setActiveSignRecord(null);
  };

  const handleUpdateRemarks = (recordId: string, remarks: string) => {
    const updated = attendanceRecords.map((rec) => {
      if (rec.id === recordId) {
        return { ...rec, remarks };
      }
      return rec;
    });
    saveRecordsToStorage(updated);
    triggerAlert('បានរក្សាទុកកំណតសម្គាល់ផ្សេងៗ!');
  };

  const handleRemoveRecord = (recordId: string) => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបលោកគ្រូ/អ្នកគ្រូនេះ ចេញពីបញ្ជីវត្តមានថ្ងៃនេះមែនទេ? (មិនប៉ះពាល់ដល់ថ្ងៃផ្សេងឡើយ)')) {
      const updated = attendanceRecords.filter((rec) => rec.id !== recordId);
      saveRecordsToStorage(updated);
      triggerAlert('បានលុបការចុះឈ្មោះវត្តមានថ្ងៃនេះដោយជោគជ័យ!', 'info');
    }
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    if (window.confirm(`តើអ្នកពិតជាចង់លុបលោកគ្រូ/អ្នកគ្រូ៖ ${teacher.name} ជាអចិន្ត្រៃយ៍ពីបញ្ជីឈ្មោះគ្រូទាំងមូលមែនទេ? (នឹងលុបទិន្នន័យវត្តមានទាំងអស់របស់គាត់)`)) {
      // 1. Remove from master teachers roster
      const updatedRoster = teachers.filter((t) => t.id !== teacherId);
      setTeachers(updatedRoster);
      localStorage.setItem('ou_sralau_teachers_roster', JSON.stringify(updatedRoster));

      // 2. Also remove their attendance records permanently
      const updatedRecords = attendanceRecords.filter((rec) => rec.teacherId !== teacherId);
      saveRecordsToStorage(updatedRecords);

      triggerAlert(`បានលុបលោកគ្រូ/អ្នកគ្រូ៖ ${teacher.name} ចេញពីបញ្ជីគ្រូទាំងស្រុងដោយជោគជ័យ!`, 'info');
    }
  };

  const handleMassCheckIn = (recordIds: string[], mode: 'in' | 'out', signatureBase64: string | null) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('km-KH', { hour12: false });

    const defaultMassSignature = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60' viewBox='0 0 160 60'><rect width='100%' height='100%' fill='%23F4EDE2' rx='8' stroke='%234A5D45' stroke-width='2'/><text x='50%' y='40%' font-size='11' font-family='sans-serif' font-weight='bold' fill='%234A5D45' text-anchor='middle'>MASS CHECK-IN</text><text x='50%' y='70%' font-size='10' font-family='sans-serif' font-weight='bold' fill='%23D48D3B' text-anchor='middle'>វត្តមានរួមគ្នា (Flag)</text></svg>`;

    const finalSignature = signatureBase64 || defaultMassSignature;

    const updated = attendanceRecords.map((rec) => {
      if (recordIds.includes(rec.id)) {
        if (mode === 'in') {
          return {
            ...rec,
            timeIn: rec.timeIn || timeStr,
            minutesLate: rec.timeIn ? rec.minutesLate : calculateMinutesLate(timeStr, rec.shift),
            signatureIn: rec.signatureIn || finalSignature,
          };
        } else {
          return {
            ...rec,
            timeOut: rec.timeOut || timeStr,
            signatureOut: rec.signatureOut || finalSignature,
          };
        }
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    triggerAlert(`បានដៅវត្តមានរួមគ្នា (${mode === 'in' ? 'ចូល' : 'ចេញ'}) សម្រាប់លោកគ្រូ/អ្នកគ្រូចំនួន ${recordIds.length} នាក់ដោយជោគជ័យ!`);
  };

  const handleSaveQuickScan = (teacherId: string, type: 'in' | 'out', signatureBase64: string, locationObj?: any) => {
    const recordId = `${teacherId}_${selectedDate}`;
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('km-KH', { hour12: false });

    const recordExists = attendanceRecords.some(r => r.id === recordId);
    let updated: AttendanceRecord[];

    if (recordExists) {
      updated = attendanceRecords.map((rec) => {
        if (rec.id === recordId) {
          if (type === 'in') {
            return {
              ...rec,
              timeIn: timeStr,
              minutesLate: calculateMinutesLate(timeStr, rec.shift),
              signatureIn: signatureBase64,
              locationIn: locationObj
            };
          } else {
            return {
              ...rec,
              timeOut: timeStr,
              signatureOut: signatureBase64,
              locationOut: locationObj
            };
          }
        }
        return rec;
      });
    } else {
      const newRec: AttendanceRecord = {
        id: recordId,
        teacherId,
        name: teacher.name,
        gender: teacher.gender,
        school: teacher.school,
        role: teacher.role,
        shift: teacher.shift,
        date: selectedDate,
        timeIn: type === 'in' ? timeStr : undefined,
        minutesLate: type === 'in' ? calculateMinutesLate(timeStr, teacher.shift) : undefined,
        signatureIn: type === 'in' ? signatureBase64 : undefined,
        locationIn: type === 'in' ? locationObj : undefined,
        timeOut: type === 'out' ? timeStr : undefined,
        signatureOut: type === 'out' ? signatureBase64 : undefined,
        locationOut: type === 'out' ? locationObj : undefined,
      };
      updated = [...attendanceRecords, newRec];
    }

    saveRecordsToStorage(updated);
    triggerAlert(`បានស្កែនកត់ត្រាវត្តមាន ${type === 'in' ? 'ចូល' : 'ចេញ'} សម្រាប់ ${teacher.name} រួចរាល់!`, 'success');

    // Trigger Telegram Notification
    const minsLate = type === 'in' ? calculateMinutesLate(timeStr, teacher.shift) : undefined;
    sendTelegramAlert(teacher.name, type, timeStr, minsLate, teacher.school, selectedDate);
  };

  const handleQrScanSuccess = (data: {
    teacherId: string;
    date: string;
    mode: 'in' | 'out';
    time: string;
    signature: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    const recordId = `${data.teacherId}_${data.date}`;
    const locationObj = (data.latitude && data.longitude) ? {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.time
    } : undefined;

    let updated: AttendanceRecord[] = [];
    const exists = attendanceRecords.some((r) => r.id === recordId);

    if (exists) {
      updated = attendanceRecords.map((r) => {
        if (r.id === recordId) {
          if (data.mode === 'in') {
            return {
              ...r,
              timeIn: data.time,
              minutesLate: calculateMinutesLate(data.time, r.shift),
              signatureIn: data.signature,
              locationIn: locationObj,
            };
          } else {
            return {
              ...r,
              timeOut: data.time,
              signatureOut: data.signature,
              locationOut: locationObj,
            };
          }
        }
        return r;
      });
    } else {
      const tInfo = teachers.find((t) => t.id === data.teacherId);
      if (!tInfo) return;
      const newRec: AttendanceRecord = {
        id: recordId,
        teacherId: data.teacherId,
        name: tInfo.name,
        gender: tInfo.gender,
        school: tInfo.school,
        role: tInfo.role,
        shift: tInfo.shift,
        date: data.date,
        timeIn: data.mode === 'in' ? data.time : undefined,
        minutesLate: data.mode === 'in' ? calculateMinutesLate(data.time, tInfo.shift) : undefined,
        signatureIn: data.mode === 'in' ? data.signature : undefined,
        locationIn: data.mode === 'in' ? locationObj : undefined,
        timeOut: data.mode === 'out' ? data.time : undefined,
        signatureOut: data.mode === 'out' ? data.signature : undefined,
        locationOut: data.mode === 'out' ? locationObj : undefined,
      };
      updated = [...attendanceRecords, newRec];
    }

    saveRecordsToStorage(updated);
    const teacherObj = teachers.find((t) => t.id === data.teacherId);
    const teacherName = teacherObj?.name || 'គ្រូបង្រៀន';
    const teacherSchool = teacherObj?.school || '';
    triggerAlert(`បានស្កេនបញ្ចូលវត្តមាន [${teacherName}] វេន ${data.mode === 'in' ? 'ចូល' : 'ចេញ'} ដោយជោគជ័យ!`, 'success');

    // Trigger Telegram Notification
    const minsLate = data.mode === 'in' ? (teacherObj ? calculateMinutesLate(data.time, teacherObj.shift) : undefined) : undefined;
    sendTelegramAlert(teacherName, data.mode, data.time, minsLate, teacherSchool, data.date);
  };

  const handleSaveSchools = (updatedSchools: string[], renameMapping?: { oldName: string; newName: string }) => {
    setSchools(updatedSchools);
    localStorage.setItem('ou_sralau_schools', JSON.stringify(updatedSchools));

    if (renameMapping) {
      const { oldName, newName } = renameMapping;

      // Update current Teachers
      const nextTeachers = teachers.map((t) => {
        if (t.school === oldName) {
          return { ...t, school: newName };
        }
        return t;
      });
      saveTeachersToStorage(nextTeachers);

      // Update Attendance records
      const nextRecords = attendanceRecords.map((r) => {
        if (r.school === oldName) {
          return { ...r, school: newName };
        }
        return r;
      });
      saveRecordsToStorage(nextRecords);

      triggerAlert(`បានប្ដូរឈ្មោះសាលាពី "${oldName}" ទៅជា "${newName}" រួចរាល់!`, 'success');
    } else {
      triggerAlert('បានធ្វើបច្ចុប្បន្នភាពបញ្ជីឈ្មោះសាលារៀនជោគជ័យ!', 'success');
    }
  };

  // 6. Reset Database back to factory default teachers
  const handleResetStorage = () => {
    if (window.confirm('តើអ្នកចង់លុបទិន្នន័យទាំងអស់ ហើយកំណត់ប្រព័ន្ធឡើងវិញមែនទេ? (វត្តមានដែលបានស្រង់ពីមុនៗនឹងត្រូវបាត់បង់)')) {
      localStorage.removeItem('ou_sralau_teachers_roster');
      localStorage.removeItem('ou_sralau_attendance_records');
      localStorage.removeItem('ou_sralau_schools');
      setTeachers(DEFAULT_TEACHERS);
      setAttendanceRecords([]);
      setSchools(SCHOOL_LIST);
      localStorage.setItem('ou_sralau_teachers_roster', JSON.stringify(DEFAULT_TEACHERS));
      localStorage.setItem('ou_sralau_schools', JSON.stringify(SCHOOL_LIST));
      triggerAlert('ប្រព័ន្ធត្រូវបានកំណត់ឡើងវិញដូចដើម!', 'info');
    }
  };

  // 7. Backup database (download JSON file)
  const handleBackupData = () => {
    const database = {
      teachers,
      attendanceRecords,
      schools,
      meetingTitle,
      exportedAt: new Date().toISOString()
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(database, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `វត្តមានកម្រងអូរស្រឡៅ_BACKUP_${selectedDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerAlert('បានទាញយកឯកសារ Backup ដោយជោគជ័យ!');
  };

  // 8. Restore database from JSON file
  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.readAsText(files[0], 'UTF-8');
    fileReader.onload = (event) => {
      try {
        if (!event.target?.result) return;
        const parsed = JSON.parse(event.target.result as string);
        if (parsed.teachers && parsed.attendanceRecords) {
          setTeachers(parsed.teachers);
          setAttendanceRecords(parsed.attendanceRecords);
          if (parsed.meetingTitle) setMeetingTitle(parsed.meetingTitle);
          if (parsed.schools) {
            setSchools(parsed.schools);
            localStorage.setItem('ou_sralau_schools', JSON.stringify(parsed.schools));
          }
          
          localStorage.setItem('ou_sralau_teachers_roster', JSON.stringify(parsed.teachers));
          localStorage.setItem('ou_sralau_attendance_records', JSON.stringify(parsed.attendanceRecords));
          triggerAlert('បានតម្លើងទិន្នន័យ Backup ចូលក្នុងប្រព័ន្ធវិញដោយជោគជ័យ!', 'success');
        } else {
          triggerAlert('ឯកសារ Backup មិនត្រឹមត្រូវតាមទម្រង់បច្ចេកទេសទេ!', 'error');
        }
      } catch (err) {
        console.error(err);
        triggerAlert('មិនអាចអានឯកសារនេះបានឡើយ។ សូមពិនិត្យមើលទ្រង់ទ្រាយឡើងវិញ!', 'error');
      }
    };
    // reset input values
    e.target.value = '';
  };

  // 9. Statistics Calculations for currently selected date and days records
  const statistics = (() => {
    const totalTeachers = currentDaysRecords.length;
    const signedIn = currentDaysRecords.filter((r) => !!r.timeIn && !!r.signatureIn);
    const signedOut = currentDaysRecords.filter((r) => !!r.timeOut && !!r.signatureOut);
    
    const womenActiveCount = currentDaysRecords.filter((r) => r.gender === Gender.FEMALE).length;
    const womenSignedIn = signedIn.filter((r) => r.gender === Gender.FEMALE).length;

    // School breakdowns
    const schoolStats = schools.map((sch) => {
      const fromSch = currentDaysRecords.filter((r) => r.school === sch);
      const presentFromSch = fromSch.filter((r) => !!r.timeIn && !!r.signatureIn).length;
      return {
        name: sch,
        total: fromSch.length,
        present: presentFromSch
      };
    });

    return {
      totalTeachers,
      signedInCount: signedIn.length,
      signedOutCount: signedOut.length,
      womenActiveCount,
      womenSignedIn,
      schoolStats
    };
  })();

  // 9.5 Recent Attendance Days List calculations
  const recentDaysList = (() => {
    const datesMap: Record<string, { total: number; present: number }> = {};
    
    // Aggregate status from all saved attendance records
    attendanceRecords.forEach((rec) => {
      if (!datesMap[rec.date]) {
        datesMap[rec.date] = { total: 0, present: 0 };
      }
      datesMap[rec.date].total++;
      if ((rec.timeIn && rec.signatureIn) || (rec.timeOut && rec.signatureOut)) {
        datesMap[rec.date].present++;
      }
    });

    // Get unique dates sorting descending (newest first)
    const uniqueDates = Object.keys(datesMap).sort((a, b) => b.localeCompare(a));

    // Ensure the current selectedDate is included so users can easily toggle and see active stats
    const sliceDays = uniqueDates.slice(0, 5);
    if (!sliceDays.includes(selectedDate)) {
      sliceDays.push(selectedDate);
    }
    
    // Re-sort descending
    sliceDays.sort((a, b) => b.localeCompare(a));

    return sliceDays.slice(0, 5).map((date) => {
      const stats = datesMap[date] || { total: teachers.length, present: 0 };
      return {
        date,
        total: stats.total,
        present: stats.present
      };
    });
  })();

  const getKhmerShortDateChange = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const month = d.getMonth();
      const khmerMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
      ];
      return `ថ្ងៃទី ${toKhmerNumber(day)} ${khmerMonths[month]}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 10. Check URL query parameters for mobile self-signing QR check-in mode
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const paramAction = urlParams.get('action'); // 'qr_sign'
  const paramTeacherId = urlParams.get('teacherId');
  const paramMode = urlParams.get('mode') as 'in' | 'out' | null;
  const paramDate = urlParams.get('date');

  if (paramAction === 'qr_sign' && paramTeacherId && (paramMode === 'in' || paramMode === 'out') && paramDate) {
    return (
      <MobileSignScreen 
        teacherId={paramTeacherId} 
        mode={paramMode} 
        date={paramDate} 
        teachers={teachers} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-brown p-3 sm:p-6 md:p-8 font-sans" id="attendance-app-root">
      {/* Printable Paper Header Layer (Visible ONLY in print media, hidden on screen) */}
      <div id="print-header-letterhead" className="w-full">
        <Header selectedSchool={filterSchool} />
        <div className="text-center font-bold text-brand-green text-lg md:text-xl font-khmer-muol mb-1 uppercase tracking-wide">
          បញ្ជីវត្តមានលោកគ្រូ-អ្នកគ្រូ ចូលរួមប្រជុំបច្ចេកទេស
        </div>
        <div className="text-center text-brand-brown-muted text-xs md:text-sm mb-4">
          កាលបរិច្ឆេទប្រជុំ៖ {new Date(selectedDate).toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' })} | ប្រធានបទ៖ <span className="underline font-bold text-brand-green">{meetingTitle}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner Alert Toast */}
        {alertMessage && (
          <div 
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border animate-fade-in flex items-center gap-3 max-w-sm ${
              alertMessage.type === 'success' 
                ? 'bg-brand-sand-light border-brand-green text-brand-green'
                : alertMessage.type === 'error'
                ? 'bg-brand-accent/10 border-brand-accent text-brand-brown'
                : 'bg-brand-sand border-brand-clay text-brand-brown'
            }`}
          >
            <div className="p-1 rounded-full bg-white shadow-sm flex-shrink-0">
              {alertMessage.type === 'success' ? (
                <ShieldCheck className="h-5 w-5 text-brand-green" />
              ) : alertMessage.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-brand-accent" />
              ) : (
                <AlertCircle className="h-5 w-5 text-brand-brown-muted" />
              )}
            </div>
            <p className="text-xs md:text-sm font-bold">{alertMessage.text}</p>
          </div>
        )}

        {/* Screen Top Header (Ministry etc) */}
        <div className="print:hidden">
          <Header selectedSchool={filterSchool} />
        </div>

        {/* Unsaved draft banner alert */}
        {hasDraftToRestore && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-[32px] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in print:hidden">
            <div className="flex gap-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700 flex-shrink-0 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-brand-brown">
                  រកឃើញទិន្នន័យព្រាងចុងក្រោយក្នុងឧបករណ៍ (Autosaved Draft Detected)
                </h4>
                <p className="text-xs text-brand-brown-muted leading-relaxed">
                  ប្រព័ន្ធបានរកឃើញទិន្នន័យវត្តមានដែលត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តក្នុងឧបករណ៍នេះ ដែលខុសពីទិន្នន័យបច្ចុប្បន្ន។ តើលោកអ្នកចង់ស្ដារទិន្នន័យវត្តមាននោះឡើងវិញដែរឬទេ?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              <button
                onClick={handleDiscardDraft}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                លុបចោល (Discard Draft)
              </button>
              <button
                onClick={handleRestoreDraft}
                className="px-4.5 py-2 text-xs font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="h-3.5 w-3.5 animate-pulse" />
                <span>ស្ដារឡើងវិញ (Restore Draft)</span>
              </button>
            </div>
          </div>
        )}

        {/* Meeting & Backup Controls Strip */}
        <div className="bg-white rounded-[32px] border border-brand-clay shadow-sm p-4 sm:p-6 print:hidden flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4" id="date-selector-container">
          {/* Main Context Setters */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meeting Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-brown-muted uppercase tracking-widest flex items-center gap-1.5">
                <Bookmark className="h-3 w-3 text-brand-green" />
                <span>កម្មវិធី/ប្រធានបទកិច្ចប្រជុំ</span>
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="ឧ. ប្រជុំបច្ចេកទេសប្រចាំខែមិថុនា"
                className="w-full px-3.5 py-1.5 text-sm font-bold text-brand-brown border border-brand-clay rounded-xl bg-brand-sand-light/30 focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors"
                id="input-meeting-title"
              />
            </div>

            {/* Date Pickers */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-brown-muted uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-brand-accent" />
                <span>ថ្ងៃខែឆ្នាំប្រជុំ</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-1.5 text-sm font-bold text-brand-brown border border-brand-clay rounded-xl bg-brand-sand-light/30 focus:outline-none focus:border-brand-green focus:bg-white cursor-pointer hover:border-brand-brown-muted transition-colors"
                id="input-date-selector"
              />
            </div>
          </div>

          {/* Backup Database utilities */}
          <div className="flex items-center md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-brand-clay flex-wrap">
            {isDraftAutosaved ? (
              <span className="text-[11px] font-bold text-brand-green flex items-center gap-1 animate-pulse mr-2 bg-brand-green/5 border border-brand-green/20 px-2.5 py-1 rounded-lg">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>រក្សាទុកព្រាងស្វ័យប្រវត្តរួចរាល់...</span>
              </span>
            ) : lastAutosaveTime ? (
              <span className="text-[10px] text-brand-brown-muted font-medium mr-2 bg-brand-sand-light/60 border border-brand-clay/30 px-2 py-1 rounded-lg">
                រក្សាទុកព្រាងចុងក្រោយ៖ <strong className="font-bold font-mono">{lastAutosaveTime}</strong>
              </span>
            ) : null}

            <button
              onClick={() => setIsManageSchoolsOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-brand-brown bg-white border border-brand-clay hover:bg-brand-sand rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="គ្រប់គ្រងបញ្ជីឈ្មោះសាលារៀន (កែប្រែ ឬបន្ថែមឈ្មោះសាលា)"
              id="manage-schools-btn"
            >
              <School className="h-3.5 w-3.5 text-brand-green" />
              <span>គ្រប់គ្រងសាលា</span>
            </button>

            <button
              onClick={handleBackupData}
              className="px-3.5 py-1.5 text-xs font-bold text-brand-brown bg-white border border-brand-clay hover:bg-brand-sand rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="ទាញយកទិន្នន័យវត្តមាន និងបញ្ជីឈ្មោះទុកជាឯកសារ JSON"
              id="backup-database-btn"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Backup</span>
            </button>

            <label 
              className="px-3.5 py-1.5 text-xs font-bold text-brand-brown bg-white border border-brand-clay hover:bg-brand-sand rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="តម្លើងទិន្នន័យពីឯកសារ Backup ចូលមកវិញ"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreData}
                className="hidden"
                id="restore-database-input"
              />
            </label>

            <button
              onClick={handleResetStorage}
              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
              title="កំណត់ប្រព័ន្ធឡើងវិញ និងលុបទិន្នន័យទាំងអស់"
              id="reset-database-btn"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recent Attendance Days Quick Switcher */}
        <div className="bg-brand-sand-light/50 border border-brand-clay rounded-[32px] p-4 sm:p-5 print:hidden flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 animate-fade-in" id="recent-attendance-switcher">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-green/15 text-brand-green rounded-2xl flex-shrink-0 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-brown font-sans">
                កាលបរិច្ឆេទប្រជុំថ្មីៗ (Recent Meetings)
              </h4>
              <p className="text-[11px] text-brand-brown-muted mt-0.5">
                ជ្រើសរើសដើម្បីប្ដូរទៅកាន់កាលបរិច្ឆេទប្រជុំមុនៗបានរហ័ស
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {recentDaysList.map((item) => {
              const isActive = item.date === selectedDate;
              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                    isActive
                      ? 'bg-brand-green text-white border-brand-green shadow-xs'
                      : 'bg-white text-brand-brown border-brand-clay/70 hover:bg-brand-sand hover:border-brand-brown-muted shadow-2xs'
                  }`}
                  id={`recent-date-btn-${item.date}`}
                  title={`មើលវត្តមានថ្ងៃទី ${item.date}`}
                >
                  <span className="font-sans">{getKhmerShortDateChange(item.date)}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wide leading-none ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-brand-sand-light text-brand-brown-muted border border-brand-clay/40'
                  }`}>
                    {toKhmerNumber(item.present)}/{toKhmerNumber(item.total)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Telegram Bot Notification Status Card & Instructions */}
        <div className="bg-white border border-brand-clay rounded-[32px] p-5 print:hidden space-y-4 animate-fade-in" id="telegram-status-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isTelegramConfigured ? 'bg-sky-50 text-sky-600' : 'bg-brand-sand text-brand-brown-muted'
              }`}>
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-brown flex items-center gap-2">
                  <span>ប្រព័ន្ធផ្ញើរបាយការណ៍ទៅ Telegram (Telegram Notifications)</span>
                  {isTelegramConfigured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-md">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                      សកម្ម (Activated)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                      មិនទាន់រៀបចំ
                    </span>
                  )}
                </h4>
                <p className="text-xs text-brand-brown-muted mt-0.5">
                  {isTelegramConfigured 
                    ? "រាល់ពេលគ្រូៗកត់ត្រាវត្តមាន ព័ត៌មាននឹងត្រូវរុញទៅកាន់ Telegram Channel/Group របស់អ្នកដោយស្វ័យប្រវត្ត។"
                    : "បិទ/បើកសេចក្តីណែនាំដើម្បីកំណត់ភ្ជាប់ប្រព័ន្ធវត្តមានស្វ័យប្រវត្តទៅកាន់ទូរស័ព្ទដៃរបស់លោកអ្នករហ័ស។"
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTelegramTips(!showTelegramTips)}
              className="px-4 py-2 text-xs font-bold text-brand-green bg-brand-sand-light/50 border border-brand-clay hover:bg-brand-sand rounded-xl transition-all select-none cursor-pointer self-start sm:self-auto"
              id="toggle-telegram-instructions-btn"
            >
              {showTelegramTips ? 'លាក់សេចក្ដីណែនាំ (Hide Setup)' : 'របៀបរៀបចំភ្ជាប់ (Show Setup Guide)'}
            </button>
          </div>

          {showTelegramTips && (
            <div className="pt-3 border-t border-brand-clay/55 space-y-3 text-xs leading-relaxed text-brand-brown-muted animate-fade-in">
              <p className="font-bold text-brand-brown">សូមអនុវត្តន៍តាមជំហានទាំង ៤ ខាងក្រោមដើម្បីដំណើរការ Telegram Notifications៖</p>
              <ol className="list-decimal list-inside space-y-2.5 font-sans font-medium text-brand-brown">
                <li>
                  <span className="text-brand-brown-muted font-sans ml-1">បង្កើត Telegram Bot ផ្ទាល់ខ្លួន៖</span>
                  <p className="pl-5 mt-0.5 text-[11px] text-brand-brown-muted leading-relaxed">
                    ស្វែងរកគណនី <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">@BotFather</a> នៅក្នុងកម្មវិធី Telegram រួចផ្ញើសារ <code className="bg-brand-sand px-1.5 py-0.5 rounded font-bold">/newbot</code> ដើម្បីបង្កើត Bot ថ្មី។ អ្នកនឹងទទួលបាន <strong className="text-brand-green">HTTP API Token</strong> (ឧ. <code className="bg-brand-sand px-1.5 py-0.5 rounded font-mono font-bold">123456789:ABC...</code>)។
                  </p>
                </li>
                <li>
                  <span className="text-brand-brown-muted font-sans ml-1">យក Chat ID ឬ Channel ID របស់អ្នក៖</span>
                  <p className="pl-5 mt-0.5 text-[11px] text-brand-brown-muted leading-relaxed">
                    បង្កើត Telegram Group ឬ Channel ថ្មីមួយ រួចបន្ថែម Bot ដែលបានបង្កើតខាងលើចូលជា Admin។ បន្ទាប់មក ផ្ញើសារ ឬ តេស្តយក Chat ID របស់អ្នក (អ្នកអាចប្រើ Bot ជំនួយដូចជា <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">@userinfobot</a> ឬ <a href="https://t.me/myidbot" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-bold">@myidbot</a> រួចវាយ <code className="bg-brand-sand px-1.5 py-0.5 rounded font-bold">/getid</code> ក្នុងគ្រុបនោះ ដើម្បីដឹងលេខសម្គាល់ ឧ. <code className="bg-brand-sand px-1.5 py-0.5 rounded font-mono font-bold">-100123456789</code>)។
                  </p>
                </li>
                <li>
                  <span className="text-brand-brown-muted font-sans ml-1">បំពេញកំណត់តម្លៃ (Secrets Configuration)៖</span>
                  <p className="pl-5 mt-0.5 text-[11px] text-brand-brown-muted leading-relaxed">
                    សូមចូលទៅកាន់ <strong className="text-brand-green">Settings / Secrets</strong> នៅក្នុង AI Studio Panel ផ្នែកខាងស្តាំ/ខាងលើ រួចកំណត់បញ្ចូលតម្លៃពីរខាងក្រោមនេះ៖
                  </p>
                  <ul className="pl-10 list-disc space-y-1 text-[11px] text-brand-brown-muted mt-1.5">
                    <li>កំណត់ឈ្មោះ <code className="bg-brand-sand px-1.5 py-0.5 rounded font-mono font-extrabold text-[#d48d3b]">TELEGRAM_BOT_TOKEN</code> រួចបំពេញតម្លៃម្ជុល Token ដែលចម្លងបានពីរ @BotFather។</li>
                    <li>កំណត់ឈ្មោះ <code className="bg-brand-sand px-1.5 py-0.5 rounded font-mono font-extrabold text-[#d48d3b]">TELEGRAM_CHAT_ID</code> រួចបំពេញលេខសម្គាល់ ID របស់គ្រុប ឬ ឆានែល។</li>
                  </ul>
                </li>
                <li>
                  <span className="text-brand-brown-muted font-sans ml-1">សាកល្បង និងឆែកលទ្ធផល៖</span>
                  <p className="pl-5 mt-0.5 text-[11px] text-brand-brown-muted leading-relaxed">
                    បន្ទាប់ពីបំពេញរួចរាល់ ជ្រើសរើសចុះហត្ថលេខាវត្តមានណាមួយ។ ប្រព័ន្ធនឹងកត់ត្រាទិន្នន័យផង និងផ្ញើសារស្វ័យប្រវត្តជាភាសាខ្មែរទៅកាន់ Telegram បញ្ជាក់ភ្លាមៗ!
                  </p>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Summary Statistics Panel Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden" id="stats-panel">
          {/* Total Teachers Card */}
          <div className="bg-white p-5 rounded-[32px] border border-brand-clay shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-brand-sand-light text-brand-green rounded-2xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-brand-brown-muted uppercase tracking-wider block">គ្រូក្នុងបញ្ជីសរុប</span>
              <strong className="text-xl md:text-2xl font-bold text-brand-green font-mono">{statistics.totalTeachers}</strong>
              <span className="text-[10px] text-brand-brown-muted block mt-0.5">នាក់នៅក្នុងកម្រង</span>
            </div>
          </div>

          {/* Signed In Card */}
          <div className="bg-white p-5 rounded-[32px] border border-brand-clay shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-brand-green/10 text-brand-green rounded-2xl">
              <CheckCircle className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-brand-brown-muted uppercase tracking-wider block">វត្តមានចូលរួម</span>
              <strong className="text-xl md:text-2xl font-bold text-brand-green font-mono">
                {statistics.signedInCount}
                <span className="text-xs text-brand-brown-muted font-normal ml-1">/ {statistics.totalTeachers}</span>
              </strong>
              <span className="text-[10px] text-brand-green font-bold block mt-0.5">
                សម្រេចបាន {statistics.totalTeachers > 0 ? Math.round((statistics.signedInCount / statistics.totalTeachers) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Female Teachers Signed In Card */}
          <div className="bg-white p-5 rounded-[32px] border border-brand-clay shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-pink-50 text-pink-600 rounded-2xl">
              <span className="text-lg font-bold">♀</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-brand-brown-muted uppercase tracking-wider block">វត្តមានលោកគ្រូ/អ្នកគ្រូស្រី</span>
              <strong className="text-xl md:text-2xl font-bold text-brand-brown font-mono">
                {statistics.womenSignedIn}
                <span className="text-xs text-brand-brown-muted font-normal ml-1">/ {statistics.womenActiveCount}</span>
              </strong>
              <span className="text-[10px] text-pink-600 font-bold block mt-0.5">អ្នកគ្រូមានវត្តមាន</span>
            </div>
          </div>

          {/* Checkout Signed Out Card */}
          <div className="bg-white p-5 rounded-[32px] border border-brand-clay shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-brand-accent/10 text-brand-accent rounded-2xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-brand-brown-muted uppercase tracking-wider block">វត្តមានចេញប្រជុំ</span>
              <strong className="text-xl md:text-2xl font-bold text-brand-brown font-mono">
                {statistics.signedOutCount}
                <span className="text-xs text-brand-brown-muted font-normal ml-1">/ {statistics.signedInCount}</span>
              </strong>
              <span className="text-[10px] text-brand-accent block mt-0.5 font-bold">បញ្ចប់ការប្រជុំ</span>
            </div>
          </div>

          {/* Recharts BarChart for school statistics */}
          <div className="col-span-2 md:col-span-4 bg-white p-6 rounded-[32px] border border-brand-clay shadow-sm flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-clay/30 pb-3">
              <div>
                <h4 className="text-sm font-bold text-brand-brown font-sans">
                  ស្ថិតិវត្តមានតាមសាលារៀន (Attendance by School Ratio)
                </h4>
                <p className="text-[11px] text-brand-brown-muted mt-0.5">
                  ការប្រៀបធៀបចំនួនគ្រូមានវត្តមាន ធៀបនឹងចំនួនគ្រូសរុបតាមសាលានីមួយៗ
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-brand-brown-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#4A5D45]"></span>
                  <span>វត្តមាន (Present)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#9A8478]"></span>
                  <span>សរុប (Total)</span>
                </div>
              </div>
            </div>

            <div className="w-full h-[320px] pt-2 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statistics.schoolStats}
                  margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D5" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6B5E55', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600 }}
                    axisLine={{ stroke: '#DED0C1' }} 
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#6B5E55', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#DED0C1' }} 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(232, 225, 213, 0.2)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const ratio = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                        return (
                          <div className="bg-white p-3 border border-brand-clay rounded-2xl shadow-lg space-y-1.5 text-xs">
                            <p className="font-bold text-brand-brown border-b border-brand-clay/40 pb-1">{data.name}</p>
                            <p className="text-brand-brown-muted font-medium">
                              គ្រូសរុប (Total): <span className="font-bold text-brand-brown font-mono">{data.total}</span> នាក់
                            </p>
                            <p className="text-brand-green font-bold">
                              វត្តមាន (Present): <span className="font-bold font-mono">{data.present}</span> នាក់ ({ratio}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="#9A8478" radius={[6, 6, 0, 0]} maxBarSize={45} name="សរុប" />
                  <Bar dataKey="present" fill="#4A5D45" radius={[6, 6, 0, 0]} maxBarSize={45} name="វត្តមាន" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Actions Bar & Quick Exporters (Excel, Word, PDF buttons) */}
        <div className="bg-white rounded-[32px] border border-brand-clay shadow-sm p-4 sm:p-5 print:hidden flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4" id="export-controls-card">
          <div className="text-sm font-bold text-brand-brown">
            ឧបករណ៍នាំចេញ និងរបាយការណ៍សង្ខេប៖
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Daily Summary Report */}
            <button
              onClick={() => setIsSummaryOpen(true)}
              className="px-5 py-2 text-sm font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              id="open-daily-summary-btn"
              title="បង្ហាញរបាយការណ៍សង្ខេបវត្តមានប្រចាំថ្ងៃ និងលោកគ្រូ-អ្នកគ្រូដែលអវត្តមាន"
            >
              <ClipboardList className="h-4.5 w-4.5 text-brand-accent animate-pulse" />
              <span>របាយការណ៍សង្ខេប</span>
            </button>

            {/* Excel Exporter */}
            <button
              onClick={() => exportToExcel(currentDaysRecords, selectedDate)}
              className="px-5 py-2 text-sm font-bold text-brand-green bg-brand-sand-light hover:bg-brand-sand rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-brand-clay transition-colors"
              id="export-excel-btn"
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>នាំចេញជា Excel</span>
            </button>

            {/* Word Exporter */}
            <button
               onClick={() => exportToWord(currentDaysRecords, selectedDate, filterSchool)}
              className="px-5 py-2 text-sm font-bold text-brand-brown bg-brand-sand-light hover:bg-brand-sand rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer border border-brand-clay transition-colors"
              id="export-word-btn"
            >
              <FileText className="h-4.5 w-4.5" />
              <span>នាំចេញជា Word (.doc)</span>
            </button>

            {/* PDF Exporter (Print flow) */}
            <button
              onClick={printPDFLayout}
              className="px-5 py-2 text-sm font-bold text-white bg-brand-accent hover:bg-brand-accent-hover rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              id="export-pdf-btn"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>បោះពុម្ពជា PDF / A4</span>
            </button>
          </div>
        </div>

        {/* Search, Filter, and Register Teachers strip */}
        <div className="bg-white rounded-[32px] border border-brand-clay shadow-sm p-4 sm:p-5 print:hidden space-y-4" id="filters-card">
          <div className="text-xs font-bold text-brand-brown-muted uppercase tracking-widest">
            តម្រងស្វែងរកគ្រូបង្រៀន និងសកម្មភាព
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5">
            {/* Free Search input */}
            <div className="relative md:col-span-3 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-brand-brown-muted pointer-events-none" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ មុខងារ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-brand-clay rounded-xl bg-brand-sand-light/30 text-brand-brown focus:outline-none focus:border-brand-green focus:bg-white hover:border-brand-brown-muted transition-colors font-bold"
                id="search-input"
              />
            </div>

            {/* Shift Filter selector */}
            <div className="md:col-span-2">
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-clay bg-white rounded-xl text-brand-brown focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors cursor-pointer font-bold"
                id="filter-shift-select"
              >
                <option value="all">វេនបង្រៀន៖ ទាំងអស់</option>
                <option value={Shift.MORNING}>វេន {Shift.MORNING}</option>
                <option value={Shift.AFTERNOON}>វេន {Shift.AFTERNOON}</option>
              </select>
            </div>

            {/* Gender Filter Selector */}
            <div className="md:col-span-2">
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-clay bg-white rounded-xl text-brand-brown focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors cursor-pointer font-bold"
                id="filter-gender-select"
              >
                <option value="all">ភេទ៖ ទាំងអស់</option>
                <option value={Gender.MALE}>ភេទ {Gender.MALE}</option>
                <option value={Gender.FEMALE}>ភេទ {Gender.FEMALE}</option>
              </select>
            </div>

            {/* School Filter Selector */}
            <div className="md:col-span-2">
              <select
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-clay bg-white rounded-xl text-brand-brown focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors cursor-pointer font-bold"
                id="filter-school-select"
              >
                <option value="all">សាលារៀន៖ ទាំងអស់</option>
                {schools.map((sch) => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons (Scan QR, Quick Scan & Add Teacher) */}
            <div className="md:col-span-3 flex flex-col sm:flex-row gap-1.5">
              {/* Group QR button */}
              <button
                onClick={() => setIsGroupQrOpen(true)}
                className="px-2 py-2 text-[12px] sm:text-[12.5px] font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1 cursor-pointer w-full"
                id="open-group-qr-btn"
                title="បង្កើតកូដ QR រួមដើម្បីឱ្យលោកគ្រូ-អ្នកគ្រូស្កេនចុះវត្តមានដោយខ្លួនឯង"
              >
                <QrCode className="h-4.5 w-4.5 text-brand-sand" />
                <span>កូដ QR រួម</span>
              </button>

              {/* Scan QR button */}
              <button
                onClick={() => setIsQrScannerOpen(true)}
                className="px-2 py-2 text-[12px] sm:text-[12.5px] font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1 cursor-pointer w-full"
                id="open-qr-scanner-btn"
                title="ស្កេនកូដ QR ហត្ថលេខាបញ្ជាក់ពីទូរស័ព្ទរបស់គ្រូ"
              >
                <QrCode className="h-4.5 w-4.5 text-brand-sand animate-pulse" />
                <span>ស្កេន QR វត្តមាន</span>
              </button>

              {/* Quick Scan button */}
              <button
                onClick={() => setIsQuickScanOpen(true)}
                className="px-2.5 py-2 text-[12.5px] font-bold text-white bg-brand-accent hover:bg-brand-accent-hover active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1 cursor-pointer w-full"
                id="open-quick-scan-btn"
                title="ស្កែនហត្ថលេខានិងដៅទីតាំងវត្តមានភ្លាមៗ"
              >
                <ScanLine className="h-4.5 w-4.5" />
                <span>ស្កែនកាមេរ៉ា</span>
              </button>

              {/* Register New Teacher Trigger button */}
              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="px-2.5 py-2 text-[12.5px] font-bold text-white bg-brand-green hover:bg-[#3d4d38] active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1 cursor-pointer w-full"
                id="open-add-teacher-btn"
              >
                <Plus className="h-4 w-4" />
                <span>ចុះឈ្មោះគ្រូ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Main Interactive Grid */}
        <AttendanceTable 
          records={currentDaysRecords}
          onSignInClick={handleOpenSignatureIn}
          onSignOutClick={handleOpenSignatureOut}
          onQrClick={handleOpenQrCode}
          onUpdateRemarks={handleUpdateRemarks}
          onRemoveRecord={handleRemoveRecord}
          onDeleteTeacher={handleDeleteTeacher}
          onEditTeacher={handleEditTeacherClick}
          onMassCheckIn={handleMassCheckIn}
          filterShift={filterShift}
          filterGender={filterGender}
          filterSchool={filterSchool}
          searchTerm={searchTerm}
          schoolList={schools}
        />

        {/* Printable Paper Footer (Visible ONLY on print layout) */}
        <div id="print-footer-signatures" className="w-full mt-10 print:mt-12">
          <table className="w-full border-collapse border-none">
            <tbody>
              <tr className="border-none text-xs md:text-sm text-center">
                <td className="border-none w-1/2 align-top py-4">
                  <p className="margin-0 font-bold text-brand-green text-sm md:text-md font-khmer-muol uppercase tracking-wide">បានឃើញ និងឯកភាព</p>
                  <p className="margin-0 font-bold text-stone-800 text-xs md:text-sm mt-1">នាយក / នាយិកា</p>
                  <p className="mt-24 text-stone-400 font-sans">............................................................</p>
                </td>
                <td className="border-none w-1/2 align-top py-4">
                  <p className="margin-0 text-stone-605 text-[10px] md:text-xs italic">ថ្ងៃ.................... ១.......កើត/រោច ខែ................ ឆ្នាំ................ ព.ស. ២៥.........</p>
                  <p className="margin-0 text-stone-800 font-semibold text-xs md:text-sm mt-1">អូរស្រឡៅ, {getKhmerSolarRaw(selectedDate)}</p>
                  <p className="margin-0 font-bold text-brand-green text-sm md:text-md mt-2 font-khmer-muol uppercase tracking-wide">អ្នកធ្វើតារាង</p>
                  <p className="mt-24 text-stone-400 font-sans">............................................................</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature overlay Modal */}
      {isSignatureOpen && activeSignRecord && (
        <SignatureModal
          isOpen={isSignatureOpen}
          onClose={() => {
            setIsSignatureOpen(false);
            setActiveSignRecord(null);
          }}
          onSave={handleSaveSignature}
          title={signatureMode === 'in' ? 'ចុះហត្ថលេខាបញ្ជាក់វត្តមាន "ចូលប្រជុំ"' : 'ចុះហត្ថលេខាបញ្ជាក់វត្តមាន "ចេញប្រជុំ"'}
          teacherName={activeSignRecord.name}
        />
      )}

      {/* Register New Teacher Overlay Modal */}
      {isAddTeacherOpen && (
        <AddTeacherModal
          isOpen={isAddTeacherOpen}
          onClose={() => {
            setIsAddTeacherOpen(false);
            setEditingTeacher(null);
          }}
          onSave={handleAddNewTeacher}
          schoolList={schools}
          editingTeacher={editingTeacher}
        />
      )}

      {/* Quick Scan Overlay Modal */}
      {isQuickScanOpen && (
        <QuickScanModal
          isOpen={isQuickScanOpen}
          onClose={() => setIsQuickScanOpen(false)}
          teachers={teachers}
          attendanceRecords={currentDaysRecords}
          onSaveScan={handleSaveQuickScan}
        />
      )}

      {/* Manage Schools Dialog */}
      {isManageSchoolsOpen && (
        <ManageSchoolsModal
          isOpen={isManageSchoolsOpen}
          onClose={() => setIsManageSchoolsOpen(false)}
          schools={schools}
          onSaveSchools={handleSaveSchools}
          teachersCountBySchool={(() => {
            const acc: Record<string, number> = {};
            schools.forEach((s) => {
              acc[s] = teachers.filter((t) => t.school === s).length;
            });
            return acc;
          })()}
        />
      )}

      {/* Show QR Code Modal */}
      {isShowQrOpen && qrActiveRecord && (
        <ShowQrModal
          isOpen={isShowQrOpen}
          onClose={() => {
            setIsShowQrOpen(false);
            setQrActiveRecord(null);
          }}
          record={qrActiveRecord}
          mode={qrActiveMode}
        />
      )}

      {/* QR Code Scanner / Importer Modal */}
      {isQrScannerOpen && (
        <QRScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onScanSuccess={handleQrScanSuccess}
        />
      )}

      {/* Daily Summary Modal */}
      {isSummaryOpen && (
        <DailySummaryModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          date={selectedDate}
          records={currentDaysRecords}
          teachers={teachers}
        />
      )}

      {/* Show Group QR Code Modal */}
      {isGroupQrOpen && (
        <ShowGroupQrModal
          isOpen={isGroupQrOpen}
          onClose={() => setIsGroupQrOpen(false)}
          date={selectedDate}
        />
      )}
    </div>
  );
}

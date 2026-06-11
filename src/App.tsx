/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  ClipboardList
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
import { exportToExcel, exportToWord, printPDFLayout } from './utils/exportUtils';
import { QrCode } from 'lucide-react';

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

  // Daily Summary Report modal state
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Notice alerts messages
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

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
  const handleAddNewTeacher = (newTeacher: Teacher) => {
    // Save to roster list
    const updatedRoster = [...teachers, newTeacher];
    saveTeachersToStorage(updatedRoster);

    // Also immediately insert a record for this teacher on the currently selectedDate
    const newRecord: AttendanceRecord = {
      id: `${newTeacher.id}_${selectedDate}`,
      teacherId: newTeacher.id,
      name: newTeacher.name,
      gender: newTeacher.gender,
      school: newTeacher.school,
      role: newTeacher.role,
      shift: newTeacher.shift,
      date: selectedDate
    };

    saveRecordsToStorage([...attendanceRecords, newRecord]);
    triggerAlert(`បានចុះឈ្មោះលោកគ្រូ/អ្នកគ្រូ៖ ${newTeacher.name} ដោយជោគជ័យ!`);
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

    const updated = attendanceRecords.map((rec) => {
      if (rec.id === activeSignRecord.id) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('km-KH', { hour12: false });
        
        if (signatureMode === 'in') {
          return {
            ...rec,
            timeIn: timeStr,
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
        signatureIn: data.mode === 'in' ? data.signature : undefined,
        locationIn: data.mode === 'in' ? locationObj : undefined,
        timeOut: data.mode === 'out' ? data.time : undefined,
        signatureOut: data.mode === 'out' ? data.signature : undefined,
        locationOut: data.mode === 'out' ? locationObj : undefined,
      };
      updated = [...attendanceRecords, newRec];
    }

    saveRecordsToStorage(updated);
    const teacherName = teachers.find((t) => t.id === data.teacherId)?.name || 'គ្រូបង្រៀន';
    triggerAlert(`បានស្កេនបញ្ចូលវត្តមាន [${teacherName}] វេន ${data.mode === 'in' ? 'ចូល' : 'ចេញ'} ដោយជោគជ័យ!`, 'success');
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
              {/* Scan QR button */}
              <button
                onClick={() => setIsQrScannerOpen(true)}
                className="px-2.5 py-2 text-[12.5px] font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all rounded-xl flex items-center justify-center gap-1 cursor-pointer w-full"
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
          onClose={() => setIsAddTeacherOpen(false)}
          onSave={handleAddNewTeacher}
          schoolList={schools}
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
    </div>
  );
}

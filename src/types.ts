/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Gender {
  MALE = 'ប្រុស',
  FEMALE = 'ស្រី'
}

export enum Shift {
  MORNING = 'ព្រឹក',
  AFTERNOON = 'រសៀល'
}

export interface Teacher {
  id: string;
  name: string;
  gender: Gender;
  school: string;
  role: string;
  phone?: string;
  shift: Shift;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string; // teacherId_date
  teacherId: string;
  name: string;
  gender: Gender;
  school: string;
  role: string;
  shift: Shift;
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:MM:SS
  signatureIn?: string; // Base64 data URL
  locationIn?: GPSLocation;
  timeOut?: string; // HH:MM:SS
  signatureOut?: string; // Base64 data URL
  locationOut?: GPSLocation;
  remarks?: string;
}

// Preloaded list of teachers in Ou Sralau School Cluster (កម្រងសាលារៀនអូរស្រឡៅ)
export const DEFAULT_TEACHERS: Teacher[] = [
  { id: 'T01', name: 'សុខ ម៉ារ៉ា', gender: Gender.MALE, school: 'សាលាបឋមសិក្សាអូរស្រឡៅ', role: 'នាយកសាលា', shift: Shift.MORNING },
  { id: 'T02', name: 'ចាន់ ស្រីនីុ', gender: Gender.FEMALE, school: 'សាលាបឋមសិក្សាអូរស្រឡៅ', role: 'គ្រូបង្រៀនថ្នាក់ទី២', shift: Shift.MORNING },
  { id: 'T03', name: 'វង្ស សុភ័ក្រ', gender: Gender.MALE, school: 'អនុវិទ្យាល័យអូរស្រឡៅ', role: 'នាយករង', shift: Shift.AFTERNOON },
  { id: 'T04', name: 'គង់ សូហ្វី', gender: Gender.FEMALE, school: 'អនុវិទ្យាល័យអូរស្រឡៅ', role: 'គ្រូមុខវិជ្ជាគណិតវិទ្យា', shift: Shift.AFTERNOON },
  { id: 'T05', name: 'សេង ពិសិដ្ឋ', gender: Gender.MALE, school: 'សាលាបឋមសិក្សាភ្នំកូនភ្នំ', role: 'នាយកសាលា', shift: Shift.MORNING },
  { id: 'T06', name: 'ហេង លីដា', gender: Gender.FEMALE, school: 'សាលាបឋមសិក្សាភ្នំកូនភ្នំ', role: 'គ្រូបង្រៀនថ្នាក់ទី៤', shift: Shift.MORNING },
  { id: 'T07', name: 'កែវ សុខា', gender: Gender.MALE, school: 'សាលាបឋមសិក្សាវាលវាសនា', role: 'គ្រូបង្រៀនថ្នាក់ទី៦', shift: Shift.MORNING },
  { id: 'T08', name: 'លឹម ជា', gender: Gender.MALE, school: 'សាលាបឋមសិក្សាអូរល្ហុង', role: 'នាយកសាលា', shift: Shift.AFTERNOON },
  { id: 'T09', name: 'អ៊ុំ វត្តី', gender: Gender.FEMALE, school: 'សាលាបឋមសិក្សាអូរល្ហុង', role: 'គ្រូបង្រៀនថ្នាក់ទី១', shift: Shift.MORNING },
  { id: 'T10', name: 'ជ័យ មង្គល', gender: Gender.MALE, school: 'អនុវិទ្យាល័យអូរស្រឡៅ', role: 'គ្រូមុខវិជ្ជាភាសាខ្មែរ', shift: Shift.AFTERNOON }
];

export const SCHOOL_LIST = [
  'សាលាបឋមសិក្សាអូរស្រឡៅ',
  'អនុវិទ្យាល័យអូរស្រឡៅ',
  'សាលាបឋមសិក្សាភ្នំកូនភ្នំ',
  'សាលាបឋមសិក្សាវាលវាសនា',
  'សាលាបឋមសិក្សាអូរល្ហុង'
];

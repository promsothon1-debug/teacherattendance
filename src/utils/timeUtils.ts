/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shift } from '../types';

/**
 * Standardize Cambodian native numbers (Khmer digits) to standard ASCII numerals.
 */
export const toStandardDigits = (str: string): string => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(khmerDigits[i], i.toString());
  }
  return result;
};

/**
 * Format standard Western number into Khmer numerals.
 */
export const toKhmerNumber = (num: number | string): string => {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return num.toString().split('').map(char => {
    const idx = parseInt(char, 10);
    return !isNaN(idx) ? khmerDigits[idx] : char;
  }).join('');
};

/**
 * Convert a standard time string like "HH:MM:SS" or "HH:MM" to total minutes of the day.
 */
export const timeToMinutes = (timeStr: string): number | null => {
  const cleanTime = toStandardDigits(timeStr).replace(/[^0-9:]/g, '');
  const parts = cleanTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
};

/**
 * Calculate the number of minutes a teacher is late.
 * @param checkInTime - Check-in time string (e.g. "07:45" or "០៧:៤៥:០០")
 * @param shift - Work shift (MORNING vs AFTERNOON)
 * @returns Number of minutes late (0 if they are on time or early)
 */
export const calculateMinutesLate = (checkInTime: string | undefined, shift: Shift): number => {
  if (!checkInTime) return 0;
  
  const checkInMinutes = timeToMinutes(checkInTime);
  if (checkInMinutes === null) return 0;

  // Defaults: 7:30 AM (450 mins), 1:30 PM (810 mins)
  let thresholdStr = shift === Shift.AFTERNOON ? '13:30' : '07:30';

  try {
    const savedMorning = localStorage.getItem('ou_sralau_morning_late');
    const savedAfternoon = localStorage.getItem('ou_sralau_afternoon_late');
    if (shift === Shift.AFTERNOON && savedAfternoon) {
      thresholdStr = savedAfternoon;
    } else if (shift === Shift.MORNING && savedMorning) {
      thresholdStr = savedMorning;
    }
  } catch (e) {
    // Graceful fallback for non-browser/server environments
  }

  const thresholdMinutes = timeToMinutes(thresholdStr);
  if (thresholdMinutes === null) return 0;

  if (checkInMinutes > thresholdMinutes) {
    return checkInMinutes - thresholdMinutes;
  }
  return 0;
};

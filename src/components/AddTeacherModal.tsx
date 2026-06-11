/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, UserPlus, GraduationCap } from 'lucide-react';
import { Teacher, Gender, Shift, SCHOOL_LIST } from '../types';

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  schoolList?: string[];
}

export default function AddTeacherModal({ isOpen, onClose, onSave, schoolList = SCHOOL_LIST }: AddTeacherModalProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [school, setSchool] = useState(schoolList[0] || '');
  const [customSchool, setCustomSchool] = useState('');
  const [useCustomSchool, setUseCustomSchool] = useState(false);
  const [role, setRole] = useState('គ្រូបង្រៀន');
  const [shift, setShift] = useState<Shift>(Shift.MORNING);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTeacher: Teacher = {
      id: 'T_' + Date.now(),
      name: name.trim(),
      gender,
      school: useCustomSchool ? customSchool.trim() : school,
      role: role.trim(),
      shift
    };

    onSave(newTeacher);
    
    // reset form fields
    setName('');
    setGender(Gender.MALE);
    setSchool(schoolList[0] || '');
    setCustomSchool('');
    setUseCustomSchool(false);
    setRole('គ្រូបង្រៀន');
    setShift(Shift.MORNING);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="add-teacher-modal-overlay">
      <div 
        className="bg-white rounded-[32px] shadow-xl border border-brand-clay max-w-md w-full overflow-hidden flex flex-col bg-gradient-to-b from-white to-brand-sand-light/20"
        id="add-teacher-modal-container"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-clay bg-brand-sand-light">
          <h3 className="font-bold text-brand-green text-base md:text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-green" />
            <span>ចុះឈ្មោះលោកគ្រូ-អ្នកគ្រូថ្មី</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-brand-brown-muted hover:text-brand-brown hover:bg-brand-sand transition-colors"
            id="close-add-teacher-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs md:text-sm font-semibold text-brand-brown">គោត្តនាម និងនាម (ឈ្មោះគ្រូ)</label>
            <input
              type="text"
              required
              placeholder="ឧ. សុខ ម៉ារ៉ា"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-brand-clay rounded-xl focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors bg-brand-sand-light/30 text-brand-brown font-semibold"
              id="input-teacher-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-semibold text-brand-brown">ភេទ</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm border border-brand-clay rounded-xl bg-white focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors text-brand-brown font-semibold"
                id="select-teacher-gender"
              >
                <option value={Gender.MALE}>{Gender.MALE}</option>
                <option value={Gender.FEMALE}>{Gender.FEMALE}</option>
              </select>
            </div>

            {/* Shift */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-semibold text-brand-brown">វេនបង្រៀន</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift)}
                className="w-full px-3 py-2 text-sm border border-brand-clay rounded-xl bg-white focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors text-brand-brown font-semibold"
                id="select-teacher-shift"
              >
                <option value={Shift.MORNING}>{Shift.MORNING}</option>
                <option value={Shift.AFTERNOON}>{Shift.AFTERNOON}</option>
              </select>
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs md:text-sm font-semibold text-brand-brown">សាលារៀន</label>
              <button
                type="button"
                onClick={() => setUseCustomSchool(!useCustomSchool)}
                className="text-[11px] text-brand-accent hover:text-brand-accent-hover font-bold hover:underline"
                id="toggle-custom-school"
              >
                {useCustomSchool ? 'ជ្រើសរើសពីកម្រងសាលា' : 'បញ្ចូលឈ្មោះសាលាក្រៅកម្រង'}
              </button>
            </div>
            {useCustomSchool ? (
              <input
                type="text"
                required
                placeholder="សរសេរឈ្មោះសាលារបស់លោកគ្រូ/អ្នកគ្រូ"
                value={customSchool}
                onChange={(e) => setCustomSchool(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-brand-clay rounded-xl focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors bg-brand-sand-light/30 text-brand-brown font-semibold"
                id="input-custom-school"
              />
            ) : (
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brand-clay rounded-xl bg-white focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors text-brand-brown font-semibold"
                id="select-standard-school"
              >
                {schoolList.map((sch) => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs md:text-sm font-semibold text-brand-brown">តួនាទី / ឯកទេស</label>
            <input
              type="text"
              required
              placeholder="ឧ. គ្រូបង្រៀនថ្នាក់ទី២, ជំនួយការថ្នាក់"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-brand-clay rounded-xl focus:outline-none focus:border-brand-green hover:border-brand-brown-muted transition-colors bg-brand-sand-light/30 text-brand-brown font-semibold"
              id="input-teacher-role"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-brand-clay flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-brand-brown bg-white border border-brand-clay rounded-xl hover:bg-brand-sand-light transition-colors"
              id="cancel-add-teacher"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-2"
              id="submit-add-teacher"
            >
              <GraduationCap className="h-4 w-4" />
              <span>កត់ត្រាការចុះឈ្មោះ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

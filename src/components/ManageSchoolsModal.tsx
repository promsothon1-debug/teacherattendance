/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, School, HelpCircle, AlertTriangle } from 'lucide-react';

interface ManageSchoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: string[];
  onSaveSchools: (updatedSchools: string[], renameMapping?: { oldName: string; newName: string }) => void;
  teachersCountBySchool: Record<string, number>;
}

export default function ManageSchoolsModal({
  isOpen,
  onClose,
  schools,
  onSaveSchools,
  teachersCountBySchool
}: ManageSchoolsModalProps) {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = newSchoolName.trim();
    if (!trimmed) return;

    if (schools.includes(trimmed)) {
      setErrorMsg('ឈ្មោះសាលារៀននេះមានរួចរាល់ហើយក្នុងបញ្ជី!');
      return;
    }

    const updated = [...schools, trimmed];
    onSaveSchools(updated);
    setNewSchoolName('');
  };

  const handleStartEdit = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
    setErrorMsg(null);
  };

  const handleSaveEdit = (index: number) => {
    setErrorMsg(null);
    const trimmedNew = editingValue.trim();
    const oldName = schools[index];

    if (!trimmedNew) return;
    if (trimmedNew === oldName) {
      setEditingIndex(null);
      return;
    }

    // Check duplicate
    if (schools.some((s, idx) => s === trimmedNew && idx !== index)) {
      setErrorMsg('ឈ្មោះសាលារៀនថ្មីនេះជាន់គ្នាជាមួយសាលាដទៃ!');
      return;
    }

    const updated = [...schools];
    updated[index] = trimmedNew;

    // Send the update up, specifying that school was renamed
    onSaveSchools(updated, { oldName, newName: trimmedNew });
    setEditingIndex(null);
  };

  const handleDeleteSchool = (index: number) => {
    setErrorMsg(null);
    const schoolName = schools[index];
    const teacherCount = teachersCountBySchool[schoolName] || 0;

    if (teacherCount > 0) {
      if (!window.confirm(`សាលារៀន "${schoolName}" កំពុងមានលោកគ្រូ/អ្នកគ្រូចំនួន ${teacherCount} នាក់។ តើអ្នកពិតជាចង់លុបសាលានេះមែនទេ? (លោកគ្រូ/អ្នកគ្រូទាំងនោះនឹងមិនមានសាលាទេ)`)) {
        return;
      }
    } else {
      if (!window.confirm(`តើអ្នកពិតជាចង់លុបសាលារៀន "${schoolName}" ចេញពីបញ្ជីមែនទេ?`)) {
        return;
      }
    }

    const updated = schools.filter((_, idx) => idx !== index);
    onSaveSchools(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/60 backdrop-blur-sm animate-fade-in" id="manage-schools-overlay">
      <div 
        className="bg-white rounded-[32px] shadow-xl border border-brand-clay max-w-md w-full overflow-hidden flex flex-col bg-gradient-to-b from-white to-brand-sand-light/20"
        id="manage-schools-container"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-clay bg-brand-sand-light">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-green/10 text-brand-green rounded-xl">
              <School className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-brand-green text-sm md:text-md">
                គ្រប់គ្រងបញ្ជីឈ្មោះសាលារៀន
              </h3>
              <p className="text-[10px] text-brand-brown-muted">បន្ថែម កែសម្រួល ឬលុបឈ្មោះសាលារៀនក្នុងកម្រង</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-brand-brown-muted hover:text-brand-brown hover:bg-brand-sand transition-colors"
            id="close-manage-schools-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-xs text-brand-brown flex items-center gap-2 font-bold animate-fade-in">
              <AlertTriangle className="h-4 w-4 text-brand-accent flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add New School Form */}
          <form onSubmit={handleAddSchool} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="បញ្ចូលឈ្មោះសាលារៀនថ្មី..."
              value={newSchoolName}
              onChange={(e) => {
                setNewSchoolName(e.target.value);
                setErrorMsg(null);
              }}
              className="flex-1 px-3.5 py-1.5 text-xs border border-brand-clay rounded-xl focus:outline-none focus:border-brand-green bg-brand-sand-light/30 text-brand-brown font-bold"
              id="new-school-name-input"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand-green hover:bg-[#3d4d38] rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              id="add-school-submit-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>បន្ថែម</span>
            </button>
          </form>

          {/* Schools List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-brand-brown-muted uppercase tracking-wider block">សាលារៀនសរុបក្នុងប្រព័ន្ធ ({schools.length})</span>
            
            <div className="border border-brand-clay rounded-xl bg-white divide-y divide-brand-clay overflow-hidden max-h-[300px] overflow-y-auto shadow-inner">
              {schools.map((school, index) => {
                const isEditing = editingIndex === index;
                const teacherCount = teachersCountBySchool[school] || 0;

                return (
                  <div key={school + index} className="p-3 flex items-center justify-between gap-3 text-xs md:text-sm hover:bg-brand-sand-light/20 transition-colors">
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-brand-green bg-white rounded-lg focus:outline-none font-bold text-brand-brown"
                          autoFocus
                          id={`school-edit-input-${index}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(index)}
                          className="p-1 px-2 bg-brand-green text-white rounded-lg hover:bg-[#3d4d38] flex items-center justify-center transition-colors font-bold text-xs"
                          title="រក្សាទុក"
                          id={`school-save-btn-${index}`}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1 px-2 text-brand-brown bg-brand-sand border border-brand-clay rounded-lg hover:bg-brand-sand-muted flex items-center justify-center transition-colors font-bold text-xs"
                          title="បោះបង់"
                          id={`school-cancel-btn-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-bold text-brand-brown text-xs md:text-sm">{school}</p>
                          <span className="text-[10px] text-brand-brown-muted">មានគ្រូបង្រៀន៖ <strong className="font-bold font-mono text-brand-green">{teacherCount}</strong> នាក់</span>
                        </div>

                        <div className="flex items-center gap-1.5 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index, school)}
                            className="p-1.5 rounded-lg border border-brand-clay bg-brand-sand-light hover:bg-brand-sand text-brand-brown hover:text-brand-green transition-all"
                            title="កែឈ្មោះសាលា"
                            id={`school-start-edit-${index}`}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchool(index)}
                            className="p-1.5 rounded-lg border border-rose-100 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-rose-500 transition-all"
                            title="លុបសាលា"
                            id={`school-delete-${index}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {schools.length === 0 && (
                <div className="p-6 text-center text-xs text-brand-brown-muted italic">
                  មិនទាន់មានសាលារៀនក្នុងបញ្ជីនៅឡើយទេ
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialog footer / informational note */}
        <div className="p-4 px-6 bg-brand-sand-light border-t border-brand-clay text-[10px] text-brand-brown-muted flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-brand-green mt-0.5 flex-shrink-0" />
          <p>
            <strong>សំគាល់៖</strong> ការកែឈ្មោះសាលារៀននៅទីនេះ នឹងធ្វើបច្ចុប្បន្នភាពឈ្មោះសាលាដោយស្វ័យប្រវត្តិចំពោះរាល់ឈ្មោះលោកគ្រូ/អ្នកគ្រូ និងប្រព័ន្ធស្រង់វត្តមានទាំងអស់ដែលកំពុងប្រើប្រាស់ឈ្មោះសាលាចាស់នេះ ដើម្បីកុំឱ្យបាត់បង់ទិន្នន័យ។
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HeaderProps {
  selectedSchool?: string;
}

export default function Header({ selectedSchool }: HeaderProps) {
  return (
    <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-clay pb-5 mb-5 print:border-none print:pb-0 print:mb-2" id="moeys-official-header">
      {/* Screen Mode: Show Ministry details; Print Mode: Show custom group metadata matching exact template */}
      <div className="flex flex-col text-brand-brown font-sans text-xs tracking-wide mb-4 md:mb-0 space-y-0.5 print:mb-0 print:text-[11pt] print:space-y-1">
        {/* On screen / default view */}
        <span className="font-khmer-muol text-brand-green text-[10.5px] uppercase tracking-normal print:hidden">
          ក្រសួងអប់រំ យុវជន និងកីឡា
        </span>
        <span className="font-semibold text-brand-brown text-[11px] print:hidden">
          មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តបាត់ដំបង
        </span>
        <span className="text-brand-brown-muted text-[10.5px] print:hidden">
          ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុកកំរៀង
        </span>
        <span className="font-bold text-brand-accent text-xs md:text-sm pt-0.5 border-t border-brand-clay/35 mt-1 print:hidden">
          កម្រងសាលារៀនអូរស្រឡៅ
        </span>
        {selectedSchool && selectedSchool !== 'all' && (
          <span className="font-khmer-muol text-brand-green text-[10px] pt-1 print:hidden">
            សាលារៀន៖ {selectedSchool}
          </span>
        )}

        {/* On Printable Paper (Matching screenshot exactly) */}
        <span className="hidden print:inline font-sans text-stone-800">
          កម្រងសាលារៀន <span className="font-semibold">{selectedSchool && selectedSchool !== 'all' ? selectedSchool : 'អូរស្រឡៅ..................'}</span>
        </span>
        <span className="hidden print:inline font-sans text-stone-800">
          ឃុំ<span>........................................</span>
        </span>
      </div>

      {/* Kingdom and Slogan Side */}
      <div className="flex flex-col items-center md:items-end text-brand-brown w-full md:w-auto space-y-1 print:items-center print:w-auto">
        <span className="font-khmer-muol text-brand-green text-xs md:text-sm tracking-wide print:text-[13pt] print:text-stone-900">
          ព្រះរាជាណាចក្រកម្ពុជា
        </span>
        <span className="font-khmer-muol text-brand-green text-[11px] md:text-xs tracking-normal print:text-[11pt] print:text-stone-900">
          ជាតិ សាសនា ព្រះមហាក្សត្រ
        </span>
        
        {/* Symmetrical Royal Dual-Wave Ribbon Divider SVG */}
        <div className="flex justify-center md:justify-end w-full pt-1 print:justify-center">
          <svg width="85" height="12" viewBox="0 0 80 12" fill="none" className="text-brand-green opacity-90 print:text-stone-800" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5 C 25 2, 25 8, 40 5 C 55 2, 55 8, 70 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M15 7.5 C 28 4.5, 28 10.5, 40 7.5 C 52 4.5, 52 10.5, 65 7.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
}


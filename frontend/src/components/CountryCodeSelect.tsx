"use client";

import React, { useState, useRef, useEffect } from "react";
import { countryCodes } from "@/lib/countryCodes";

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = countryCodes.find((c) => c.code === value) || countryCodes[0];

  return (
    <div className="relative w-24 sm:w-36 shrink-0" ref={containerRef}>
      <div
        className="w-full flex items-center justify-between rounded-lg border-2 border-outline-variant bg-surface px-2 sm:px-3 py-3 text-sm text-foreground hover:border-outline focus:border-primary transition-colors cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`fi fi-${selectedCountry.iso.toLowerCase()} rounded-sm shrink-0 text-lg`}></span>
          <span className="font-medium text-xs sm:text-sm">{selectedCountry.code}</span>
        </div>
        <span className="material-symbols-rounded text-[16px] sm:text-[18px] text-outline shrink-0">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 max-h-60 overflow-auto rounded-lg border border-outline-variant bg-surface shadow-lg">
          {countryCodes.map((c, idx) => (
            <div
              key={`${c.code}-${idx}`}
              className={`flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-surface-variant transition-colors ${
                value === c.code ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
              }`}
              onClick={() => {
                onChange(c.code);
                setIsOpen(false);
              }}
            >
              <span className={`fi fi-${c.iso.toLowerCase()} rounded-sm shadow-sm text-lg`}></span>
              <span className="w-10">{c.code}</span>
              <span className="truncate text-xs text-outline">{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

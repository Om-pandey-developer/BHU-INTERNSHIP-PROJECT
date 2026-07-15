"use client";

import React, { useState, useRef, useEffect } from "react";
import { countryCodes } from "@/lib/countryCodes";

interface NationalitySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function NationalitySelect({ value, onChange }: NationalitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = countryCodes.find((c) => c.name === value) || (value ? { name: value, iso: "" } : null);
  
  const filteredCountries = countryCodes.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="w-full flex items-center justify-between rounded-lg border-2 border-outline-variant bg-surface pr-4 pl-11 py-3 text-sm text-foreground hover:border-outline focus:border-primary transition-colors cursor-pointer relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
          public
        </span>
        
        {selectedCountry ? (
          <div className="flex items-center gap-2">
            {selectedCountry.iso && (
              <span className={`fi fi-${selectedCountry.iso.toLowerCase()} rounded-sm shadow-sm text-lg`}></span>
            )}
            <span className="text-foreground font-medium">{selectedCountry.name}</span>
          </div>
        ) : (
          <span className="text-outline">Nationality *</span>
        )}

        <span className="material-symbols-rounded text-[20px] text-outline pointer-events-none">
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-hidden flex flex-col rounded-lg border border-outline-variant bg-surface shadow-lg">
          <div className="p-2 border-b border-outline-variant sticky top-0 bg-surface">
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-variant rounded-md">
              <span className="material-symbols-rounded text-[18px] text-outline">search</span>
              <input 
                type="text" 
                placeholder="Search country..." 
                className="w-full bg-transparent outline-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => (
                <div
                  key={c.iso}
                  className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-surface-variant transition-colors ${
                    value === c.name ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                  }`}
                  onClick={() => {
                    onChange(c.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className={`fi fi-${c.iso.toLowerCase()} rounded-sm shadow-sm text-lg`}></span>
                  <span>{c.name}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-outline text-center">
                No country found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

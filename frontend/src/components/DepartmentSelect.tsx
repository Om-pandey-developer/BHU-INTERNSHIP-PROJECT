"use client";

import React, { useState, useRef, useEffect } from "react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface DepartmentSelectProps {
  departments: Department[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  small?: boolean;
  required?: boolean;
  /** Called when user types a custom department name via "Others" */
  onOtherDepartment?: (name: string) => void;
  /** Pre-filled custom department name (when "Others" was previously selected) */
  otherDepartmentName?: string;
}

const OTHERS_SENTINEL = "__OTHERS__";

export default function DepartmentSelect({ departments, value, onChange, placeholder = "Select Department *", disabled = false, small = false, required = false, onOtherDepartment, otherDepartmentName = "" }: DepartmentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isOthersSelected, setIsOthersSelected] = useState(value === OTHERS_SENTINEL);
  const [customName, setCustomName] = useState(otherDepartmentName);
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

  // Sync external value changes
  useEffect(() => {
    setIsOthersSelected(value === OTHERS_SENTINEL);
  }, [value]);

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const selectedDept = safeDepartments.find((d) => d.id === value);
  
  const filteredDepartments = safeDepartments.filter((d) => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayLabel = isOthersSelected
    ? (customName ? `Others: ${customName}` : "Others (Please specify)")
    : selectedDept
      ? selectedDept.name
      : placeholder;

  return (
    <div className={`relative w-full ${disabled ? "pointer-events-none opacity-60" : ""}`} ref={containerRef}>
      <div
        className={`w-full flex items-center justify-between rounded-lg ${small ? 'border py-2 px-3 text-xs bg-white min-w-[320px]' : 'border-2 pr-4 pl-11 py-3 text-sm'} border-outline-variant bg-surface text-foreground transition-colors relative ${disabled ? "cursor-not-allowed bg-surface-variant/50" : "hover:border-outline focus:border-primary cursor-pointer"}`}
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
      >
        {!small && (
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
            apartment
          </span>
        )}
        <span className={selectedDept || isOthersSelected ? "text-foreground" : "text-outline"}>
          {displayLabel}
        </span>
        <span className="material-symbols-rounded text-[20px] text-outline pointer-events-none">
          expand_more
        </span>
      </div>

      {/* Hidden input to enable HTML5 required validation */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        className="absolute opacity-0 pointer-events-none inset-0 w-full h-full z-[-1]"
        tabIndex={-1}
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-hidden flex flex-col rounded-lg border border-outline-variant bg-surface shadow-lg">
          <div className="p-2 border-b border-outline-variant sticky top-0 bg-surface">
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-variant rounded-md">
              <span className="material-symbols-rounded text-[18px] text-outline">search</span>
              <input 
                type="text" 
                placeholder="Search department..." 
                className="w-full bg-transparent outline-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((d) => (
                <div
                  key={d.id}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-surface-variant transition-colors ${
                    value === d.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                  }`}
                  onClick={() => {
                    onChange(d.id);
                    setIsOthersSelected(false);
                    setCustomName("");
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {d.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-outline text-center">
                No departments found
              </div>
            )}

            {/* ── "Others" option ── */}
            <div
              className={`px-4 py-3 text-sm cursor-pointer hover:bg-surface-variant transition-colors border-t border-outline-variant ${
                isOthersSelected ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
              }`}
              onClick={() => {
                onChange(OTHERS_SENTINEL);
                setIsOthersSelected(true);
                setIsOpen(false);
                setSearch("");
              }}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-[18px]">add_circle_outline</span>
                Others (Not in the list)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom department text input (shown when "Others" selected) ── */}
      {isOthersSelected && (
        <div className="mt-2 animate-fade-in">
          <div className="relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">edit</span>
            <input
              type="text"
              placeholder="Please specify your department name"
              value={customName}
              onChange={(e) => {
                const val = e.target.value;
                setCustomName(val);
                onOtherDepartment?.(val);
              }}
              className="w-full rounded-lg border-2 border-outline-variant bg-surface px-4 py-3 text-sm text-foreground pl-11 hover:border-outline focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>
          <p className="text-xs text-outline mt-1">
            This will be sent to the Admin for approval before being added to the system.
          </p>
        </div>
      )}
    </div>
  );
}

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
}

export default function DepartmentSelect({ departments, value, onChange }: DepartmentSelectProps) {
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

  const safeDepartments = Array.isArray(departments) ? departments : [];
  const selectedDept = safeDepartments.find((d) => d.id === value);
  
  const filteredDepartments = safeDepartments.filter((d) => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="w-full flex items-center justify-between rounded-lg border-2 border-outline-variant bg-surface pr-4 pl-11 py-3 text-sm text-foreground hover:border-outline focus:border-primary transition-colors cursor-pointer relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
          apartment
        </span>
        <span className={selectedDept ? "text-foreground" : "text-outline"}>
          {selectedDept ? selectedDept.name : "Select Department *"}
        </span>
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
          </div>
        </div>
      )}
    </div>
  );
}

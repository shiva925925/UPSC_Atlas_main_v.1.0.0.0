import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
    label: string;
    value: string | null;
    options: string[];
    onChange: (value: string | null) => void;
    icon?: React.ReactNode;
    className?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    label,
    value,
    options,
    onChange,
    icon,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm ${value || isOpen
                    ? 'bg-blue-600/20 border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                    : 'bg-card-bg/50 border-card-border text-text-muted hover:bg-white/5 hover:border-card-border/80'
                    }`}
            >
                {icon && <span className={value ? 'text-blue-400' : 'text-text-muted'}>{icon}</span>}
                <span className="truncate max-w-[120px]">{value || label}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} ${value ? 'text-blue-400' : 'text-text-muted'}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-aside-bg border border-card-border rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden backdrop-blur-2xl">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar py-1.5">
                        <button
                            onClick={() => { onChange(null); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors border-b border-card-border/30 mb-1"
                        >
                            Reset Selection
                        </button>
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => { onChange(option); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-xs transition-all ${value === option
                                    ? 'bg-blue-600/30 text-blue-400 font-bold border-l-2 border-blue-500 px-3.5'
                                    : 'text-text-main hover:bg-white/5'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;

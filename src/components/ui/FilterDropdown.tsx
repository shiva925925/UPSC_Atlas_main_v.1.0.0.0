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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${value || isOpen
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-500 shadow-blue-500/10'
                    : 'bg-card-bg/50 border-card-border text-text-muted hover:bg-white/5 hover:border-card-border/80'
                    }`}
            >
                {icon && <span className={value ? 'text-blue-500' : 'text-text-muted'}>{icon}</span>}
                <span className="tracking-tight">{value || label}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${value ? 'text-blue-500' : 'text-text-muted'}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-card-bg/95 border border-card-border rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden backdrop-blur-xl">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar py-1.5">
                        <button
                            onClick={() => { onChange(null); setIsOpen(false); }}
                            className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:bg-white/5 hover:text-red-500 transition-colors border-b border-card-border/30 mb-1"
                        >
                            Reset Selection
                        </button>
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => { onChange(option); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-xs transition-all ${value === option
                                    ? 'bg-blue-600/20 text-blue-500 font-bold'
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

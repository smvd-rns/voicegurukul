import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    email?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /**
     * Defaults to 'name' for backward compatibility.
     */
    valueProperty?: 'id' | 'name';
    triggerClassName?: string;
    showEmail?: boolean;
    searchPlaceholder?: string;
    displayValue?: string;
    allowClear?: boolean;
    allowNone?: boolean;
    noneLabel?: string;
    icon?: React.ReactNode;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className = '',
    valueProperty = 'name',
    triggerClassName = '',
    showEmail = true,
    searchPlaceholder,
    displayValue,
    allowClear = false,
    allowNone = false,
    noneLabel = 'None (Unassigned)',
    icon,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 340, maxHeight: 260, placement: 'bottom' });
    const containerRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);

    // Update coordinates when opening or resizing
    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Prefer bottom, but flip if space is tight (< 250px) and there is more space above
            let placement = 'bottom';
            let maxHeight = 260;
            let top = rect.bottom + window.scrollY;

            if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                placement = 'top';
                maxHeight = Math.min(260, spaceAbove - 20); // 20px buffer
                top = rect.top + window.scrollY - maxHeight - 5; // 5px gap
            } else {
                // Bottom placement: clamp height to available space
                maxHeight = Math.min(260, spaceBelow - 20);
            }

            // Ensure dropdown is comfortably wide to show full names clearly (at least 340px, but within viewport bounds)
            const dropdownWidth = Math.min(Math.max(rect.width, 340), viewportWidth - 24);

            // Position left, but clamp to avoid overflowing right edge of screen
            let left = rect.left + window.scrollX;
            if (rect.left + dropdownWidth > viewportWidth - 12) {
                left = Math.max(12, viewportWidth - dropdownWidth - 12 + window.scrollX);
            }

            setCoords({
                top,
                left,
                width: dropdownWidth,
                maxHeight,
                placement
            });
        }
    };

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            updateCoords();
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside both trigger and portal
            const isOutsideTrigger = containerRef.current && !containerRef.current.contains(event.target as Node);
            const isOutsidePortal = portalRef.current && !portalRef.current.contains(event.target as Node);

            if (isOutsideTrigger && isOutsidePortal) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const shouldShowEmail = showEmail && options.some((opt) => Boolean(opt.email));

    // Filter options based on search (name or email/subtitle)
    const filteredOptions = options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase()) ||
        (option.email && option.email.toLowerCase().includes(search.toLowerCase()))
    );

    let selectedOption = options.find((opt) => opt[valueProperty] === value);

    // Fallback: if valueProperty is 'id' but no match found, try matching by name
    if (!selectedOption && valueProperty === 'id' && value) {
        selectedOption = options.find((opt) => opt.name === value);
    }

    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const displayText = selectedOption?.name || displayValue || (!value ? placeholder : (isUuid(value) ? 'Assigned Devotee' : value));

    const isNoneEnabled = allowNone || allowClear;
    const isNoneMatchingSearch = isNoneEnabled && (
        !search ||
        'none'.includes(search.toLowerCase()) ||
        'unassigned'.includes(search.toLowerCase()) ||
        'clear'.includes(search.toLowerCase()) ||
        'remove'.includes(search.toLowerCase())
    );

    const dropdownList = (
        <div
            ref={portalRef}
            className="fixed z-[999999] mt-1 overflow-hidden rounded-xl bg-white text-base shadow-2xl ring-1 ring-black ring-opacity-10 focus:outline-none sm:text-sm flex flex-col border border-gray-100"
            style={{
                top: `${coords.top - window.scrollY}px`,
                left: `${coords.left - window.scrollX}px`,
                width: `${coords.width || 340}px`,
                minWidth: '280px',
                maxWidth: 'calc(100vw - 24px)',
                height: `${coords.maxHeight}px`
            }}
        >
            <div className="sticky top-0 z-10 bg-white px-2.5 py-2 border-b border-gray-100">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        className="w-full rounded-lg border-0 bg-gray-50 py-1.5 pl-8 pr-8 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-xs"
                        placeholder={searchPlaceholder || (shouldShowEmail ? "Search by name or email..." : "Search by name...")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearch('');
                            }}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-gray-50">
                {isNoneMatchingSearch && (
                    <div
                        className={`
                            relative cursor-pointer select-none py-2 px-3 hover:bg-orange-50/70 hover:text-orange-950 rounded-lg transition-colors border-b border-gray-100 mb-1 flex items-center justify-between
                            ${!value || value === '' ? 'bg-orange-50 text-orange-950 font-semibold' : 'text-gray-500'}
                        `}
                        onClick={() => {
                            onChange('');
                            setIsOpen(false);
                            setSearch('');
                        }}
                    >
                        <div className="flex flex-col pr-6">
                            <span className="block font-medium text-xs sm:text-sm italic text-gray-700">
                                — {noneLabel} —
                            </span>
                            <span className="block text-[10px] text-gray-400">
                                Clear / Unassign
                            </span>
                        </div>
                        {(!value || value === '') && (
                            <span className="text-orange-600">
                                <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                        )}
                    </div>
                )}
                {filteredOptions.length === 0 && !isNoneMatchingSearch ? (
                    <div className="relative cursor-default select-none px-4 py-3 text-gray-500 italic text-xs">
                        No results found.
                    </div>
                ) : (
                    filteredOptions.map((option) => (
                        <div
                            key={option.id || option.name}
                            className={`
                relative cursor-pointer select-none py-2 px-3 hover:bg-orange-50/70 hover:text-orange-950 rounded-lg transition-colors
                ${value === option[valueProperty] ? 'bg-orange-50 text-orange-950 font-semibold' : 'text-gray-900'}
                ${option.id === '' ? 'text-gray-500 font-medium italic border-b border-gray-100 mb-1 bg-gray-50/50' : ''}
              `}
                            onClick={() => {
                                onChange(option[valueProperty]);
                                setIsOpen(false);
                                setSearch('');
                            }}
                        >
                            <div className="flex flex-col pr-6">
                                <span className="block font-medium text-xs sm:text-sm text-gray-900 leading-snug break-words">
                                    {option.name}
                                </span>
                                {shouldShowEmail && option.email && (
                                    <span className="block text-[11px] text-gray-400 mt-0.5 break-all">
                                        {option.email}
                                    </span>
                                )}
                            </div>
                            {value === option[valueProperty] && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-orange-600">
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`
          relative w-full cursor-default rounded-lg bg-white text-left sm:text-xs sm:leading-5
          ${triggerClassName || 'py-2 px-3 shadow-xs ring-1 ring-inset ring-gray-200'}
          ${disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-gray-300'}
        `}
                onClick={toggleOpen}
            >
                {icon && (
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div className={`flex flex-col truncate pr-5 ${icon ? 'pl-7' : ''}`}>
                    <span
                        className={`block truncate ${(!selectedOption && !value && !displayValue) ? 'text-gray-400' : 'text-gray-900 font-medium'}`}
                        title={displayText}
                    >
                        {displayText}
                    </span>
                    {shouldShowEmail && selectedOption?.email && (
                        <span className="block truncate text-[10px] text-gray-400 font-normal">
                            {selectedOption.email}
                        </span>
                    )}
                </div>
                <div className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    {allowClear && value && value !== '' && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            title="Clear assignment"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <ChevronDown className="h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                </div>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(dropdownList, document.body)}
        </div>
    );
}

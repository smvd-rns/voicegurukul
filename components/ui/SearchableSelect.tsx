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
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 240, placement: 'bottom' });
    const containerRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);

    // Update coordinates when opening or resizing
    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Prefer bottom, but flip if space is tight (< 250px) and there is more space above
            let placement = 'bottom';
            let maxHeight = 240;
            let top = rect.bottom + window.scrollY;

            if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                placement = 'top';
                maxHeight = Math.min(240, spaceAbove - 20); // 20px buffer
                top = rect.top + window.scrollY - maxHeight - 5; // 5px gap
            } else {
                // Bottom placement: clamp height to available space
                maxHeight = Math.min(240, spaceBelow - 20);
            }

            setCoords({
                top: top,
                left: rect.left + window.scrollX,
                width: rect.width,
                maxHeight,
                placement
            });
        }
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

    // Filter options based on search (name or email)
    const filteredOptions = options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase()) ||
        (shouldShowEmail && option.email && option.email.toLowerCase().includes(search.toLowerCase()))
    );

    let selectedOption = options.find((opt) => opt[valueProperty] === value);

    // Fallback: if valueProperty is 'id' but no match found, try matching by name
    // This handles cases where we have a name stored but need to resolve to an ID
    if (!selectedOption && valueProperty === 'id' && value) {
        selectedOption = options.find((opt) => opt.name === value);
    }

    const dropdownList = (
        <div
            ref={portalRef}
            className="fixed z-[999999] mt-1 overflow-hidden rounded-md bg-white text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm flex flex-col"
            style={{
                top: `${coords.top - window.scrollY}px`,
                left: `${coords.left - window.scrollX}px`,
                width: `${coords.width}px`,
                height: `${coords.maxHeight}px`
            }}
        >
            <div className="sticky top-0 z-10 bg-white px-2 py-2 border-b border-gray-100">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full rounded-md border-0 bg-gray-50 py-1.5 pl-8 pr-8 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6"
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
                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                    <div className="relative cursor-default select-none px-4 py-2 text-gray-500 italic">
                        No results found.
                    </div>
                ) : (
                    filteredOptions.map((option) => (
                        <div
                            key={option.id || option.name}
                            className={`
                relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-orange-50 hover:text-orange-900
                ${value === option[valueProperty] ? 'bg-orange-50 text-orange-900 font-semibold' : 'text-gray-900'}
              `}
                            onClick={() => {
                                onChange(option[valueProperty]);
                                setIsOpen(false);
                                setSearch('');
                            }}
                        >
                            <div className="flex flex-col">
                                <span className="block truncate">{option.name}</span>
                                {shouldShowEmail && option.email && (
                                    <span className="block truncate text-xs text-gray-400 group-hover:text-orange-700">
                                        {option.email}
                                    </span>
                                )}
                            </div>
                            {value === option[valueProperty] && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`
          relative w-full cursor-default rounded-lg bg-white text-left sm:text-sm sm:leading-6
          ${triggerClassName || 'py-3 pl-3 pr-10 shadow-sm ring-1 ring-inset ring-gray-300'}
          ${disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-600'}
        `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex flex-col truncate">
                    <span className={`block truncate ${(!selectedOption && !value) ? 'text-gray-400' : 'text-gray-900'}`}>
                        {selectedOption ? selectedOption.name : (value || placeholder)}
                    </span>
                    {shouldShowEmail && selectedOption?.email && (
                        <span className="block truncate text-xs text-gray-400 font-normal">
                            {selectedOption.email}
                        </span>
                    )}
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(dropdownList, document.body)}
        </div>
    );
}


import React from 'react';
import { FiSearch } from 'react-icons/fi';
import { TreeSearchProps } from '../../types/tree';
import { cn } from '../../utils/cn';

/**
 * Tree Search Component
 * 
 * Provides search functionality for the Tree component
 */
export const TreeSearch: React.FC<TreeSearchProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className
}) => {
  return (
    <div className="mb-3 relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#43E4FF]"
      />
      <FiSearch
        size={18}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
};

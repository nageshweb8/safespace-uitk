import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { PiSecurityCameraFill, PiPushPinFill, PiPushPin } from 'react-icons/pi';
import type { TreeNodeProps } from '../../types/tree';
import { cn } from '../../utils/cn';

/**
 * Individual Tree Node Component
 *
 * Renders a single node in the tree with expand/collapse functionality
 */
export const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  level,
  isSelected = false,
  onLeafClick,
  onNodeToggle,
  onPinToggle,
  onSelectionChange,
  path,
  searchTerm,
  highlightSearch = true,
  renderNode,
  showExpandIcons = true,
  selectable = false,
  forceExpand = false,
  maxPinnedItems = 4,
  currentPinnedCount = 0,
  alwaysShowPinIcons = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded ?? false);
  const [isPinning, setIsPinning] = useState(false);

  // Sync with node's isExpanded prop changes
  useEffect(() => {
    setIsExpanded(node.isExpanded ?? false);
  }, [node.isExpanded]);

  // Handle force expand when searching
  useEffect(() => {
    if (forceExpand) {
      setIsExpanded(true);
    }
  }, [forceExpand]);

  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren || node.type === 'camera';
  const currentPath = useMemo(() => [...path, node], [path, node]);

  const handleToggle = useCallback(() => {
    if (!hasChildren) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onNodeToggle?.(node, newExpanded);
  }, [hasChildren, isExpanded, node, onNodeToggle]);

  const handleClick = useCallback(() => {
    if (isLeaf && onLeafClick) {
      onLeafClick(node, currentPath);
    } else if (hasChildren) {
      handleToggle();
    }

    if (selectable && onSelectionChange) {
      onSelectionChange(node.key, !isSelected);
    }
  }, [
    isLeaf,
    hasChildren,
    node,
    currentPath,
    onLeafClick,
    handleToggle,
    selectable,
    onSelectionChange,
    isSelected,
  ]);

  const handlePinToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!onPinToggle) return;

      const newPinState = !node.isPinned;

      // Check pin limit when trying to pin a camera
      if (newPinState && currentPinnedCount >= maxPinnedItems) {
        alert(
          `Pin limit exceeded! You can only pin up to ${maxPinnedItems} cameras at a time. Please unpin a camera before pinning this one.`
        );
        return;
      }

      setIsPinning(true);
      try {
        await onPinToggle(node, newPinState);
      } catch (error) {
        console.error('Failed to toggle pin:', error);
        // You might want to show a toast notification here
      } finally {
        setIsPinning(false);
      }
    },
    [node, onPinToggle, currentPinnedCount, maxPinnedItems]
  );

  const highlightText = useCallback(
    (text: string, searchTerm?: string) => {
      if (!searchTerm || !highlightSearch) return text;

      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 rounded px-1"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    [highlightSearch]
  );

  // Custom render function takes precedence
  if (renderNode) {
    return (
      <div style={{ marginLeft: `${level * 8}px` }}>
        {renderNode(node, level, isLeaf)}
      </div>
    );
  }

  // Render leaf nodes (cameras)
  if (isLeaf) {
    return (
      <div
        className="flex items-center py-1 text-sm text-gray-700 hover:text-blue-600 ml-2 group"
        style={{ marginLeft: `${level * 8}px` }}
      >
        <div
          className="flex items-center flex-grow cursor-pointer"
          onClick={handleClick}
        >
          {node.icon || <PiSecurityCameraFill className="mr-2" size={14} />}
          <span
            className={cn(
              'flex-grow',
              isSelected && 'text-blue-700 font-medium'
            )}
          >
            {highlightText(node.label, searchTerm)}
          </span>
        </div>

        {/* Pin/Unpin Button - Only show for camera nodes */}
        {node.type === 'camera' && onPinToggle && (
          <button
            onClick={handlePinToggle}
            disabled={
              isPinning ||
              (!node.isPinned && currentPinnedCount >= maxPinnedItems)
            }
            className={cn(
              'ml-2 p-1 rounded transition-all duration-200',
              alwaysShowPinIcons ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              node.isPinned
                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                : currentPinnedCount >= maxPinnedItems
                  ? 'text-red-400 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
              (isPinning ||
                (!node.isPinned && currentPinnedCount >= maxPinnedItems)) &&
                'opacity-50 cursor-not-allowed'
            )}
            title={
              isPinning
                ? node.isPinned
                  ? 'Unpinning camera...'
                  : 'Pinning camera...'
                : !node.isPinned && currentPinnedCount >= maxPinnedItems
                  ? `Pin limit reached (${maxPinnedItems}/${maxPinnedItems}). Unpin a camera first.`
                  : node.isPinned
                    ? 'Unpin camera'
                    : `Pin camera (${currentPinnedCount}/${maxPinnedItems})`
            }
          >
            {isPinning ? (
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
            ) : node.isPinned ? (
              <PiPushPinFill size={14} />
            ) : (
              <PiPushPin size={14} />
            )}
          </button>
        )}

        {/* Selection indicator */}
        {selectable && (
          <div
            className={cn(
              'w-4 h-4 ml-2 border rounded flex items-center justify-center',
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            )}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render parent nodes (sites/spaces)
  return (
    <div>
      <div
        className="flex items-center cursor-pointer py-1 text-gray-800 font-medium hover:text-blue-600"
        onClick={handleClick}
        style={{ marginLeft: `${level * 8}px` }}
      >
        {hasChildren &&
          showExpandIcons &&
          (isExpanded ? (
            <FiChevronDown size={14} />
          ) : (
            <FiChevronRight size={14} />
          ))}
        <span
          className={cn(
            'ml-1 flex-grow',
            isSelected && 'text-blue-700 font-medium'
          )}
        >
          {highlightText(node.label, searchTerm)}
        </span>

        {/* Selection indicator */}
        {selectable && (
          <div
            className={cn(
              'w-4 h-4 ml-2 border rounded flex items-center justify-center',
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            )}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Children nodes */}
      {isExpanded && hasChildren && (
        <div className="ml-2">
          {node.children!.map(childNode => (
            <TreeNodeComponent
              key={childNode.key}
              node={childNode}
              level={level + 1}
              isSelected={false} // Child selection can be managed by parent
              onLeafClick={onLeafClick}
              onNodeToggle={onNodeToggle}
              onPinToggle={onPinToggle}
              onSelectionChange={onSelectionChange}
              path={currentPath}
              searchTerm={searchTerm}
              highlightSearch={highlightSearch}
              renderNode={renderNode}
              showExpandIcons={showExpandIcons}
              selectable={selectable}
              forceExpand={forceExpand}
              maxPinnedItems={maxPinnedItems}
              currentPinnedCount={currentPinnedCount}
              alwaysShowPinIcons={alwaysShowPinIcons}
            />
          ))}
        </div>
      )}
    </div>
  );
};

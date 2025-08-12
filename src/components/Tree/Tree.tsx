import React, { useState, useMemo, useCallback } from 'react';
import { HiVideoCamera } from 'react-icons/hi2';
import { TreeProps, TreeNode } from '../../types/tree';
import { TreeNodeComponent } from './TreeNode';
import { TreeSearch } from './TreeSearch';
import { cn } from '../../utils/cn';

/**
 * SafeSpace Tree Component
 *
 * A reusable tree component with search functionality, icons, and customizable callbacks.
 * Designed for displaying hierarchical data like prison monitoring structures.
 *
 * @example
 * ```tsx
 * import { Tree } from '@safespace/uitk';
 *
 * const data = [
 *   {
 *     key: 'prisons-vms',
 *     label: 'Prisons-VMS',
 *     children: [
 *       {
 *         key: 'omaha-cc',
 *         label: 'Omaha Correctional Center',
 *         children: [
 *           { key: 'library-12', label: 'Library 12', children: [
 *             { key: 'cam123', label: 'Cam123', icon: <CameraIcon /> },
 *             { key: 'test444', label: 'Test 444', icon: <CameraIcon /> }
 *           ]}
 *         ]
 *       }
 *     ]
 *   }
 * ];
 *
 * <Tree
 *   data={data}
 *   title="Monitoring"
 *   titleIcon={<VideoCameraIcon />}
 *   searchable
 *   onLeafClick={(node, path) => console.log('Selected:', node, path)}
 * />
 * ```
 */
export const Tree: React.FC<TreeProps> = ({
  data,
  title,
  titleIcon,
  searchable = true,
  searchPlaceholder = 'Search...',
  onLeafClick,
  onNodeToggle,
  onPinToggle,
  maxPinnedItems = 4,
  className,
  style,
  showExpandIcons = true,
  renderNode,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  highlightSearch = true,
  loading = false,
  emptyMessage = 'No data available',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(
    []
  );

  // Initialize internal state only once when selectedKeys prop changes
  React.useEffect(() => {
    setInternalSelectedKeys(selectedKeys);
  }, []); // Remove selectedKeys dependency to prevent infinite re-renders

  // Count currently pinned cameras
  const countPinnedItems = useCallback((nodes: TreeNode[]): number => {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'camera' && node.isPinned) {
        count++;
      }
      if (node.children) {
        count += countPinnedItems(node.children);
      }
    }
    return count;
  }, []);

  const currentPinnedCount = useMemo(
    () => countPinnedItems(data),
    [data, countPinnedItems]
  );

  // Filter tree data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesSearch = node.label
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children:
              filteredChildren.length > 0 ? filteredChildren : node.children,
            isExpanded: searchTerm.trim() ? true : node.isExpanded, // Auto-expand when searching
          });
        }

        return acc;
      }, []);
    };

    return filterNodes(data);
  }, [data, searchTerm]);

  const handleSelectionChange = useCallback(
    (nodeKey: string, selected: boolean) => {
      const newSelectedKeys = selected
        ? [...internalSelectedKeys, nodeKey]
        : internalSelectedKeys.filter(key => key !== nodeKey);

      setInternalSelectedKeys(newSelectedKeys);
      onSelectionChange?.(newSelectedKeys);
    },
    [internalSelectedKeys, onSelectionChange]
  );

  const handleNodeToggle = useCallback(
    (node: TreeNode, expanded: boolean) => {
      onNodeToggle?.(node, expanded);
    },
    [onNodeToggle]
  );

  const handleLeafClick = useCallback(
    (node: TreeNode, path: TreeNode[]) => {
      onLeafClick?.(node, path);
    },
    [onLeafClick]
  );

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white rounded-lg shadow-sm border border-gray-200',
          className
        )}
        style={style}
      >
        <div className="p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white min-w-[260px] h-full px-4 box-border border-r border-gray-300 text-sm text-gray-800',
        className
      )}
      style={style}
    >
      {/* Header with title and icon */}
      {title && (
        <div className="border-b border-gray-200 mb-2">
          <div className="px-2 py-2 font-bold text-lg text-[#05162B] flex items-center gap-2">
            {titleIcon ? titleIcon : <HiVideoCamera size={22} />}
            {title}
          </div>
        </div>
      )}

      {/* Search section */}
      {searchable && (
        <TreeSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={searchPlaceholder}
        />
      )}

      {/* Tree content */}
      <div className="overflow-y-auto max-h-[calc(100vh-140px)] mt-2">
        {filteredData.length === 0 ? (
          <div className="text-gray-500 px-2 py-2 text-sm italic">
            {searchTerm ? `No results found` : emptyMessage}
          </div>
        ) : (
          <div>
            {filteredData.map(node => (
              <TreeNodeComponent
                key={node.key}
                node={node}
                level={0}
                isSelected={internalSelectedKeys.includes(node.key)}
                onLeafClick={handleLeafClick}
                onNodeToggle={handleNodeToggle}
                onPinToggle={onPinToggle}
                onSelectionChange={handleSelectionChange}
                path={[]}
                searchTerm={searchTerm}
                highlightSearch={highlightSearch}
                renderNode={renderNode}
                showExpandIcons={showExpandIcons}
                selectable={selectable}
                forceExpand={searchTerm.length > 0}
                maxPinnedItems={maxPinnedItems}
                currentPinnedCount={currentPinnedCount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

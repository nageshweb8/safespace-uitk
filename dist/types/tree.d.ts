import { ReactNode } from 'react';
export interface TreeNode {
    key: string;
    label: string;
    icon?: ReactNode;
    children?: TreeNode[];
    isExpandable?: boolean;
    isExpanded?: boolean;
    metadata?: Record<string, unknown>;
    type?: 'site' | 'space' | 'camera' | string;
    assignCameraId?: number;
    feedURL?: string;
    isPinned?: boolean;
}
export interface TreeProps {
    /**
     * Tree data structure
     */
    data: TreeNode[];
    /**
     * Title to display at the top of the tree
     */
    title?: string;
    /**
     * Icon to display next to the title
     */
    titleIcon?: ReactNode;
    /**
     * Whether to show the search functionality
     */
    searchable?: boolean;
    /**
     * Placeholder text for the search input
     */
    searchPlaceholder?: string;
    /**
     * Callback when a leaf node (final item) is clicked
     */
    onLeafClick?: (node: TreeNode, path: TreeNode[]) => void;
    /**
     * Callback when a node is expanded/collapsed
     */
    onNodeToggle?: (node: TreeNode, expanded: boolean) => void;
    /**
     * Callback when a node is pinned/unpinned
     */
    onPinToggle?: (node: TreeNode, isPinned: boolean) => Promise<void>;
    /**
     * Maximum number of cameras that can be pinned (default: 4)
     */
    maxPinnedItems?: number;
    /**
     * Custom class name for the tree container
     */
    className?: string;
    /**
     * Custom styles for the tree container
     */
    style?: React.CSSProperties;
    /**
     * Whether to show expand/collapse icons
     */
    showExpandIcons?: boolean;
    /**
     * Whether to always show pin icons (default: false - only on hover)
     */
    alwaysShowPinIcons?: boolean;
    /**
     * Custom render function for tree nodes
     */
    renderNode?: (node: TreeNode, level: number, isLeaf: boolean) => ReactNode;
    /**
     * Whether nodes are selectable
     */
    selectable?: boolean;
    /**
     * Selected node keys
     */
    selectedKeys?: string[];
    /**
     * Callback when selection changes
     */
    onSelectionChange?: (selectedKeys: string[]) => void;
    /**
     * Whether to highlight matching search terms
     */
    highlightSearch?: boolean;
    /**
     * Loading state
     */
    loading?: boolean;
    /**
     * Empty state message
     */
    emptyMessage?: string;
}
export interface TreeNodeProps {
    node: TreeNode;
    level: number;
    isSelected?: boolean;
    onLeafClick?: (node: TreeNode, path: TreeNode[]) => void;
    onNodeToggle?: (node: TreeNode, expanded: boolean) => void;
    onPinToggle?: (node: TreeNode, isPinned: boolean) => Promise<void>;
    onSelectionChange?: (nodeKey: string, selected: boolean) => void;
    path: TreeNode[];
    searchTerm?: string;
    highlightSearch?: boolean;
    renderNode?: (node: TreeNode, level: number, isLeaf: boolean) => ReactNode;
    showExpandIcons?: boolean;
    selectable?: boolean;
    forceExpand?: boolean;
    maxPinnedItems?: number;
    currentPinnedCount?: number;
    alwaysShowPinIcons?: boolean;
}
export interface TreeSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}
//# sourceMappingURL=tree.d.ts.map
import type { TreeNode } from '../types/tree';
interface UseTreeStateOptions {
    initialData: TreeNode[];
    initialSelectedKeys?: string[];
    initialExpandedKeys?: string[];
}
interface UseTreeStateReturn {
    data: TreeNode[];
    selectedKeys: string[];
    expandedKeys: string[];
    searchTerm: string;
    filteredData: TreeNode[];
    setSearchTerm: (term: string) => void;
    setSelectedKeys: (keys: string[]) => void;
    setExpandedKeys: (keys: string[]) => void;
    toggleSelection: (key: string) => void;
    toggleExpansion: (key: string) => void;
    expandAll: () => void;
    collapseAll: () => void;
    clearSelection: () => void;
    selectAll: () => void;
    updateData: (newData: TreeNode[]) => void;
}
/**
 * Hook for managing tree component state
 *
 * Provides centralized state management for tree data, selection, expansion, and search
 *
 * @example
 * ```tsx
 * function MyTreeComponent() {
 *   const {
 *     filteredData,
 *     selectedKeys,
 *     searchTerm,
 *     setSearchTerm,
 *     toggleSelection,
 *     expandAll
 *   } = useTreeState({
 *     initialData: treeData,
 *     initialSelectedKeys: ['node1']
 *   });
 *
 *   return (
 *     <Tree
 *       data={filteredData}
 *       selectedKeys={selectedKeys}
 *       onSelectionChange={setSelectedKeys}
 *       // ... other props
 *     />
 *   );
 * }
 * ```
 */
export declare const useTreeState: ({ initialData, initialSelectedKeys, initialExpandedKeys }: UseTreeStateOptions) => UseTreeStateReturn;
export {};
//# sourceMappingURL=useTreeState.d.ts.map
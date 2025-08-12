import { useState, useCallback, useMemo } from 'react';
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
export const useTreeState = ({
  initialData,
  initialSelectedKeys = [],
  initialExpandedKeys = []
}: UseTreeStateOptions): UseTreeStateReturn => {
  const [data, setData] = useState<TreeNode[]>(initialData);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(initialExpandedKeys);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to extract all keys from tree
  const getAllKeys = useCallback((nodes: TreeNode[]): string[] => {
    const keys: string[] = [];
    
    const traverse = (nodeList: TreeNode[]) => {
      nodeList.forEach(node => {
        keys.push(node.key);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return keys;
  }, []);

  // Helper function to get all leaf node keys
  const getAllLeafKeys = useCallback((nodes: TreeNode[]): string[] => {
    const leafKeys: string[] = [];
    
    const traverse = (nodeList: TreeNode[]) => {
      nodeList.forEach(node => {
        if (!node.children || node.children.length === 0) {
          leafKeys.push(node.key);
        } else {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return leafKeys;
  }, []);

  // Filter tree data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
            isExpanded: searchTerm.trim() ? true : expandedKeys.includes(node.key)
          });
        }
        
        return acc;
      }, []);
    };

    return filterNodes(data);
  }, [data, searchTerm, expandedKeys]);

  // Toggle selection for a single key
  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  }, []);

  // Toggle expansion for a single key
  const toggleExpansion = useCallback((key: string) => {
    setExpandedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allKeys = getAllKeys(data);
    setExpandedKeys(allKeys);
  }, [data, getAllKeys]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  // Select all leaf nodes
  const selectAll = useCallback(() => {
    const allLeafKeys = getAllLeafKeys(data);
    setSelectedKeys(allLeafKeys);
  }, [data, getAllLeafKeys]);

  // Update tree data
  const updateData = useCallback((newData: TreeNode[]) => {
    setData(newData);
    // Clear selections and expansions that may no longer be valid
    const newAllKeys = getAllKeys(newData);
    setSelectedKeys(prev => prev.filter(key => newAllKeys.includes(key)));
    setExpandedKeys(prev => prev.filter(key => newAllKeys.includes(key)));
  }, [getAllKeys]);

  return {
    data,
    selectedKeys,
    expandedKeys,
    searchTerm,
    filteredData,
    setSearchTerm,
    setSelectedKeys,
    setExpandedKeys,
    toggleSelection,
    toggleExpansion,
    expandAll,
    collapseAll,
    clearSelection,
    selectAll,
    updateData
  };
};

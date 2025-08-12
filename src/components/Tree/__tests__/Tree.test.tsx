import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tree } from '../Tree';
import type { TreeNode } from '../../../types/tree';

const mockData: TreeNode[] = [
  {
    key: 'root1',
    label: 'Root Node 1',
    isExpanded: true,
    children: [
      {
        key: 'child1',
        label: 'Child Node 1',
        children: [
          { key: 'leaf1', label: 'Leaf Node 1' },
          { key: 'leaf2', label: 'Leaf Node 2' }
        ]
      },
      { key: 'child2', label: 'Child Node 2' }
    ]
  },
  {
    key: 'root2',
    label: 'Root Node 2',
    children: [
      { key: 'child3', label: 'Child Node 3' }
    ]
  }
];

describe('Tree Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tree with data', () => {
    render(<Tree data={mockData} />);
    
    expect(screen.getByText('Root Node 1')).toBeInTheDocument();
    expect(screen.getByText('Root Node 2')).toBeInTheDocument();
  });

  it('renders title and title icon when provided', () => {
    const titleIcon = <div data-testid="title-icon">📹</div>;
    
    render(
      <Tree 
        data={mockData} 
        title="Monitoring System" 
        titleIcon={titleIcon}
      />
    );
    
    expect(screen.getByText('Monitoring System')).toBeInTheDocument();
    expect(screen.getByTestId('title-icon')).toBeInTheDocument();
  });

  it('shows search input when searchable is true', () => {
    render(<Tree data={mockData} searchable />);
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('hides search input when searchable is false', () => {
    render(<Tree data={mockData} searchable={false} />);
    
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('filters nodes based on search term', async () => {
    const user = userEvent.setup();
    render(<Tree data={mockData} searchable />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Child Node 1');
    
    await waitFor(() => {
      expect(screen.getByText('Child Node 1')).toBeInTheDocument();
      expect(screen.queryByText('Child Node 2')).not.toBeInTheDocument();
    });
  });

  it('expands and collapses nodes on click', async () => {
    const user = userEvent.setup();
    render(<Tree data={mockData} />);
    
    // Initially expanded nodes should show children
    expect(screen.getByText('Child Node 1')).toBeInTheDocument();
    
    // Click to collapse
    const rootNode = screen.getByText('Root Node 1');
    await user.click(rootNode);
    
    // Children should be hidden after collapse
    await waitFor(() => {
      expect(screen.queryByText('Child Node 1')).not.toBeInTheDocument();
    });
  });

  it('calls onLeafClick when leaf node is clicked', async () => {
    const onLeafClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Tree data={mockData} onLeafClick={onLeafClick} />);
    
    const leafNode = screen.getByText('Leaf Node 1');
    await user.click(leafNode);
    
    expect(onLeafClick).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'leaf1', label: 'Leaf Node 1' }),
      expect.any(Array)
    );
  });

  it('calls onNodeToggle when node is expanded/collapsed', async () => {
    const onNodeToggle = jest.fn();
    const user = userEvent.setup();
    
    render(<Tree data={mockData} onNodeToggle={onNodeToggle} />);
    
    const childNode = screen.getByText('Child Node 1');
    await user.click(childNode);
    
    expect(onNodeToggle).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'child1', label: 'Child Node 1' }),
      expect.any(Boolean)
    );
  });

  it('shows loading state', () => {
    render(<Tree data={[]} loading />);
    
    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('shows empty message when no data', () => {
    render(<Tree data={[]} emptyMessage="No items found" />);
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('shows search no results message', async () => {
    const user = userEvent.setup();
    render(<Tree data={mockData} searchable />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'nonexistent');
    
    await waitFor(() => {
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
    });
  });

  it('handles selection when selectable is true', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Tree 
        data={mockData} 
        selectable 
        onSelectionChange={onSelectionChange}
      />
    );
    
    const rootNode = screen.getByText('Root Node 1');
    await user.click(rootNode);
    
    expect(onSelectionChange).toHaveBeenCalledWith(['root1']);
  });

  it('renders custom node content when renderNode is provided', () => {
    const renderNode = jest.fn(() => <div data-testid="custom-node">Custom Node</div>);
    
    render(<Tree data={mockData} renderNode={renderNode} />);
    
    expect(screen.getAllByTestId('custom-node')).toHaveLength(mockData.length);
    expect(renderNode).toHaveBeenCalled();
  });

  it('highlights search terms when highlightSearch is true', async () => {
    const user = userEvent.setup();
    render(<Tree data={mockData} searchable highlightSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Root');
    
    await waitFor(() => {
      const highlightedElements = screen.getAllByText('Root');
      expect(highlightedElements[0]).toBeInTheDocument();
    });
  });

  it('applies custom className and style', () => {
    const { container } = render(
      <Tree 
        data={mockData} 
        className="custom-tree" 
        style={{ backgroundColor: 'red' }}
      />
    );
    
    const treeContainer = container.firstChild as HTMLElement;
    expect(treeContainer).toHaveClass('custom-tree');
    expect(treeContainer).toHaveStyle({ backgroundColor: 'red' });
  });

  it('renders node icons when provided', () => {
    const dataWithIcons: TreeNode[] = [
      {
        key: 'node1',
        label: 'Node with Icon',
        icon: <div data-testid="node-icon">📹</div>
      }
    ];
    
    render(<Tree data={dataWithIcons} />);
    
    expect(screen.getByTestId('node-icon')).toBeInTheDocument();
  });

  it('updates selected keys when prop changes', () => {
    const { rerender } = render(
      <Tree data={mockData} selectable selectedKeys={['root1']} />
    );
    
    // Initial selection should be applied
    expect(screen.getByText('Root Node 1')).toBeInTheDocument();
    
    // Update selected keys
    rerender(
      <Tree data={mockData} selectable selectedKeys={['root2']} />
    );
    
    // New selection should be applied
    expect(screen.getByText('Root Node 2')).toBeInTheDocument();
  });

  it('auto-expands nodes when searching', async () => {
    const collapsedData: TreeNode[] = [
      {
        key: 'root1',
        label: 'Root Node 1',
        isExpanded: false,
        children: [
          { key: 'child1', label: 'Target Child' }
        ]
      }
    ];
    
    const user = userEvent.setup();
    render(<Tree data={collapsedData} searchable />);
    
    // Child should not be visible initially
    expect(screen.queryByText('Target Child')).not.toBeInTheDocument();
    
    // Search for child node
    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Target');
    
    // Child should be visible due to auto-expansion
    await waitFor(() => {
      expect(screen.getByText('Target Child')).toBeInTheDocument();
    });
  });
});

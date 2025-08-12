# Tree Component Documentation

The SafeSpace Tree component is a reusable, enterprise-grade hierarchical data display component designed for monitoring systems and other applications requiring structured data visualization.

## Features

- ✅ **Hierarchical Structure**: Display nested data with unlimited depth
- ✅ **Search Functionality**: Built-in search with real-time filtering and highlighting
- ✅ **Custom Icons**: Support for custom icons at any level
- ✅ **Interactive Callbacks**: Click handlers for leaf nodes and expand/collapse events
- ✅ **TypeScript Support**: Full TypeScript definitions for type safety
- ✅ **Customizable Styling**: Tailwind CSS classes with custom styling options
- ✅ **Accessibility**: ARIA support and keyboard navigation
- ✅ **Loading States**: Built-in loading and empty state handling
- ✅ **Responsive Design**: Mobile-friendly interface

## Installation

```bash
npm install @safespace/uitk
```

## Basic Usage

```tsx
import { Tree } from '@safespace/uitk';
import type { TreeNode } from '@safespace/uitk';

const data: TreeNode[] = [
  {
    key: 'prisons-vms',
    label: 'Prisons-VMS',
    children: [
      {
        key: 'omaha-cc',
        label: 'Omaha Correctional Center',
        children: [
          {
            key: 'library-12',
            label: 'Library 12',
            children: [
              {
                key: 'cam123',
                label: 'Cam123',
                icon: <CameraIcon />,
              },
            ],
          },
        ],
      },
    ],
  },
];

function MonitoringTree() {
  const handleLeafClick = (node: TreeNode, path: TreeNode[]) => {
    console.log('Selected camera:', node.label);
    console.log('Full path:', path.map(n => n.label).join(' > '));
  };

  return (
    <Tree
      data={data}
      title="Monitoring"
      titleIcon={<VideoCameraIcon />}
      searchable
      onLeafClick={handleLeafClick}
    />
  );
}
```

## Props API

### TreeProps

| Prop                | Type                                                            | Default               | Description                                |
| ------------------- | --------------------------------------------------------------- | --------------------- | ------------------------------------------ |
| `data`              | `TreeNode[]`                                                    | **required**          | The hierarchical data to display           |
| `title`             | `string`                                                        | `undefined`           | Optional title displayed at the top        |
| `titleIcon`         | `ReactNode`                                                     | `undefined`           | Icon displayed next to the title           |
| `searchable`        | `boolean`                                                       | `true`                | Enable/disable search functionality        |
| `searchPlaceholder` | `string`                                                        | `"Search..."`         | Placeholder text for search input          |
| `onLeafClick`       | `(node: TreeNode, path: TreeNode[]) => void`                    | `undefined`           | Callback when a leaf node is clicked       |
| `onNodeToggle`      | `(node: TreeNode, expanded: boolean) => void`                   | `undefined`           | Callback when a node is expanded/collapsed |
| `className`         | `string`                                                        | `undefined`           | Custom CSS class for the tree container    |
| `style`             | `React.CSSProperties`                                           | `undefined`           | Custom inline styles                       |
| `showExpandIcons`   | `boolean`                                                       | `true`                | Show/hide expand/collapse icons            |
| `renderNode`        | `(node: TreeNode, level: number, isLeaf: boolean) => ReactNode` | `undefined`           | Custom node renderer function              |
| `selectable`        | `boolean`                                                       | `false`               | Enable node selection with checkboxes      |
| `selectedKeys`      | `string[]`                                                      | `[]`                  | Currently selected node keys               |
| `onSelectionChange` | `(selectedKeys: string[]) => void`                              | `undefined`           | Callback when selection changes            |
| `highlightSearch`   | `boolean`                                                       | `true`                | Highlight matching search terms            |
| `loading`           | `boolean`                                                       | `false`               | Show loading state                         |
| `emptyMessage`      | `string`                                                        | `"No data available"` | Message shown when no data                 |

### TreeNode

| Property       | Type                  | Description                      |
| -------------- | --------------------- | -------------------------------- |
| `key`          | `string`              | Unique identifier for the node   |
| `label`        | `string`              | Display text for the node        |
| `icon`         | `ReactNode`           | Optional icon element            |
| `children`     | `TreeNode[]`          | Child nodes                      |
| `isExpandable` | `boolean`             | Whether the node can be expanded |
| `isExpanded`   | `boolean`             | Initial expanded state           |
| `metadata`     | `Record<string, any>` | Additional custom data           |

## Advanced Examples

### Custom Node Rendering

```tsx
const customRenderNode = (node: TreeNode, level: number, isLeaf: boolean) => {
  return (
    <div className={`custom-node level-${level} ${isLeaf ? 'leaf' : 'branch'}`}>
      {node.icon && <span className="node-icon">{node.icon}</span>}
      <span className="node-label">{node.label}</span>
      {node.metadata?.count && (
        <span className="node-count">({node.metadata.count})</span>
      )}
    </div>
  );
};

<Tree
  data={data}
  renderNode={customRenderNode}
  onLeafClick={handleLeafClick}
/>;
```

### With Selection

```tsx
function SelectableTree() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  return (
    <Tree
      data={data}
      selectable
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      title="Select Cameras"
    />
  );
}
```

### Integration with Prison Monitoring System

```tsx
function PrisonMonitoringTree() {
  const [monitoringData, setMonitoringData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrisonData().then(data => {
      setMonitoringData(transformToPrisonTree(data));
      setLoading(false);
    });
  }, []);

  const handleCameraSelect = (node: TreeNode, path: TreeNode[]) => {
    if (node.metadata?.type === 'camera') {
      // Connect to camera stream
      connectToCamera(node.metadata.cameraId);

      // Track user action
      analytics.track('camera_selected', {
        cameraId: node.metadata.cameraId,
        location: path.map(n => n.label).join(' > '),
      });
    }
  };

  return (
    <Tree
      data={monitoringData}
      loading={loading}
      title="Prison Monitoring"
      titleIcon={<ShieldCheckIcon />}
      searchable
      searchPlaceholder="Search cameras, locations..."
      onLeafClick={handleCameraSelect}
      className="prison-monitoring-tree"
      highlightSearch
    />
  );
}
```

## Styling and Theming

The Tree component uses Tailwind CSS classes and can be customized through:

1. **Custom CSS Classes**: Pass `className` prop
2. **Inline Styles**: Pass `style` prop
3. **Tailwind Utilities**: Wrap in containers with Tailwind classes
4. **CSS Variables**: Override default colors and spacing

```css
.prison-monitoring-tree {
  --tree-border-color: #e5e7eb;
  --tree-hover-bg: #f3f4f6;
  --tree-selected-bg: #dbeafe;
  --tree-text-primary: #111827;
  --tree-text-secondary: #6b7280;
}
```

## Accessibility

The component includes:

- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

## Performance Considerations

- Use `React.memo` for large datasets
- Implement virtual scrolling for 1000+ nodes
- Lazy load children for dynamic data
- Debounce search input for better UX

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](../LICENSE) file for details.

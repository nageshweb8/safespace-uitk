import React, { useState } from 'react';
import { Button, Input, Select, ColorPicker, Popover, Space, List, Typography, Card, Row, Col, Switch } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { Zone, ZoneControlsProps } from '../../types/polygon';

const { Text } = Typography;
const { Option } = Select;

const ZONE_TYPES = [
  { value: 'restricted', label: 'Restricted Area', color: '#ef4444' },
  { value: 'monitoring', label: 'Monitoring Zone', color: '#3b82f6' },
  { value: 'alert', label: 'Alert Zone', color: '#f59e0b' },
  { value: 'safe', label: 'Safe Zone', color: '#10b981' }
];

export const ZoneControls: React.FC<ZoneControlsProps> = ({
  zones,
  selectedZoneId,
  onZoneSelect,
  onZoneAdd,
  onZoneDelete,
  onZoneUpdate,
  onZoneDuplicate,
  isDrawing,
  onDrawingToggle,
  readonly = false
}) => {
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Zone>>({});

  const selectedZone = zones.find(zone => zone.id === selectedZoneId);

  const handleEditStart = (zone: Zone) => {
    setEditingZone(zone.id);
    setEditForm({
      name: zone.name,
      color: zone.color,
      metadata: { ...zone.metadata }
    });
  };

  const handleEditSave = () => {
    if (editingZone && editForm) {
      onZoneUpdate(editingZone, editForm);
      setEditingZone(null);
      setEditForm({});
    }
  };

  const handleEditCancel = () => {
    setEditingZone(null);
    setEditForm({});
  };

  const handleColorChange = (color: any) => {
    const hexColor = typeof color === 'string' ? color : color.toHexString();
    setEditForm(prev => ({ ...prev, color: hexColor }));
  };

  const handleVisibilityToggle = (zoneId: string, visible: boolean) => {
    onZoneUpdate(zoneId, { opacity: visible ? 0.3 : 0 });
  };

  return (
    <Card 
      title="Zone Management" 
      size="small"
      className="w-80"
      extra={
        !readonly && (
          <Space>
            <Button
              type={isDrawing ? "primary" : "default"}
              icon={<PlusOutlined />}
              size="small"
              onClick={onDrawingToggle}
              disabled={readonly}
            >
              {isDrawing ? 'Cancel' : 'Add Zone'}
            </Button>
          </Space>
        )
      }
    >
      <div className="space-y-4">
        {/* Zone List */}
        <List
          size="small"
          dataSource={zones}
          renderItem={(zone) => (
            <List.Item
              className={`cursor-pointer rounded p-2 transition-colors ${
                selectedZoneId === zone.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => onZoneSelect(zone.id)}
              actions={
                !readonly ? [
                  <Button
                    key="visibility"
                    type="text"
                    size="small"
                    icon={zone.opacity === 0 ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVisibilityToggle(zone.id, zone.opacity === 0);
                    }}
                  />,
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(zone);
                    }}
                  />,
                  onZoneDuplicate && (
                    <Button
                      key="duplicate"
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoneDuplicate(zone.id);
                      }}
                    />
                  ),
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoneDelete(zone.id);
                    }}
                  />
                ].filter(Boolean) : []
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: zone.color }}
                    />
                    <Text>{zone.name}</Text>
                  </Space>
                }
                description={
                  <Text type="secondary" className="text-xs">
                    {zone.metadata?.type || 'monitoring'} • {zone.points.length} points
                  </Text>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No zones created' }}
        />

        {/* Zone Details/Editor */}
        {selectedZone && (
          <Card size="small" title="Zone Details">
            {editingZone === selectedZone.id ? (
              <div className="space-y-3">
                <div>
                  <Text className="text-xs text-gray-500">Name</Text>
                  <Input
                    size="small"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Zone name"
                  />
                </div>
                
                <div>
                  <Text className="text-xs text-gray-500">Type</Text>
                  <Select
                    size="small"
                    className="w-full"
                    value={editForm.metadata?.type}
                    onChange={(value) => setEditForm(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, type: value }
                    }))}
                  >
                    {ZONE_TYPES.map(type => (
                      <Option key={type.value} value={type.value}>
                        <Space>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Text className="text-xs text-gray-500">Color</Text>
                  <ColorPicker
                    size="small"
                    value={editForm.color}
                    onChange={handleColorChange}
                    showText
                  />
                </div>

                <div>
                  <Text className="text-xs text-gray-500">Description</Text>
                  <Input.TextArea
                    size="small"
                    rows={2}
                    value={editForm.metadata?.description}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, description: e.target.value }
                    }))}
                    placeholder="Zone description"
                  />
                </div>

                <Space>
                  <Button size="small" type="primary" onClick={handleEditSave}>
                    Save
                  </Button>
                  <Button size="small" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                </Space>
              </div>
            ) : (
              <div className="space-y-2">
                <Row>
                  <Col span={8}><Text className="text-xs text-gray-500">Name:</Text></Col>
                  <Col span={16}><Text className="text-xs">{selectedZone.name}</Text></Col>
                </Row>
                <Row>
                  <Col span={8}><Text className="text-xs text-gray-500">Type:</Text></Col>
                  <Col span={16}>
                    <Space>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedZone.color }}
                      />
                      <Text className="text-xs">
                        {ZONE_TYPES.find(t => t.value === selectedZone.metadata?.type)?.label || 'Monitoring Zone'}
                      </Text>
                    </Space>
                  </Col>
                </Row>
                <Row>
                  <Col span={8}><Text className="text-xs text-gray-500">Points:</Text></Col>
                  <Col span={16}><Text className="text-xs">{selectedZone.points.length}</Text></Col>
                </Row>
                {selectedZone.metadata?.description && (
                  <Row>
                    <Col span={8}><Text className="text-xs text-gray-500">Description:</Text></Col>
                    <Col span={16}><Text className="text-xs">{selectedZone.metadata.description}</Text></Col>
                  </Row>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Instructions */}
        <Card size="small" title="Instructions">
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Click "Add Zone" to start drawing</div>
            <div>• Click to add points, click first point to close</div>
            <div>• Click zone to select, drag points to modify</div>
            <div>• Press Delete to remove selected zone</div>
            <div>• Press Escape to cancel drawing</div>
          </div>
        </Card>
      </div>
    </Card>
  );
};

export default ZoneControls;

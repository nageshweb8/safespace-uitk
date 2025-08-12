import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveFeedPlayer } from '../LiveFeedPlayer';
import { CameraStream } from '../../types/video';

const mockStreams: CameraStream[] = [
  {
    id: '1',
    url: 'https://example.com/stream1.m3u8',
    title: 'Camera 1',
    isLive: true,
  },
  {
    id: '2',
    url: 'https://example.com/stream2.m3u8',
    title: 'Camera 2',
    isLive: true,
  },
];

describe('LiveFeedPlayer', () => {
  it('renders without crashing', () => {
    render(<LiveFeedPlayer streams={mockStreams} />);
    expect(screen.getByText('Live Feed')).toBeInTheDocument();
  });

  it('shows empty state when no streams provided', () => {
    render(<LiveFeedPlayer streams={[]} />);
    expect(screen.getByText('No camera streams available')).toBeInTheDocument();
  });

  it('displays stream titles correctly', () => {
    render(<LiveFeedPlayer streams={mockStreams} />);
    expect(screen.getByText('Camera 1')).toBeInTheDocument();
  });
});

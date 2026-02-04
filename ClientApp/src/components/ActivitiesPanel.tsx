import React from 'react';
import { ActivitiesTable } from './ActivitiesTable';
import { ActivitiesControls } from './ActivitiesControls';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControls } from './SpeedControls';
import { DateTimeLocation } from './DateTimeLocation';

interface ActivitiesPanelProps {
  showRoute: boolean;
  onToggleShowRoute: () => void;
  autoCenter: boolean;
  onToggleAutoCenter: () => void;
  onUploadClick: () => void;
}

export const ActivitiesPanel: React.FC<ActivitiesPanelProps> = ({
  showRoute,
  onToggleShowRoute,
  autoCenter,
  onToggleAutoCenter,
  onUploadClick,
}) => {
  return (
    <div id="panel" style={{ display: 'block' }}>
      <ActivitiesTable />
      
      <ActivitiesControls
        showRoute={showRoute}
        onToggleShowRoute={onToggleShowRoute}
        onUploadClick={onUploadClick}
      />
      
      <PlaybackControls
        autoCenter={autoCenter}
        onToggleAutoCenter={onToggleAutoCenter}
      />
      
      <SpeedControls />
      
      <DateTimeLocation />
    </div>
  );
};

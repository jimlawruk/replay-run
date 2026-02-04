import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

interface ActivitiesControlsProps {
  showRoute: boolean;
  onToggleShowRoute: () => void;
  onUploadClick: () => void;
}

export const ActivitiesControls: React.FC<ActivitiesControlsProps> = ({
  showRoute,
  onToggleShowRoute,
  onUploadClick,
}) => {
  const { activities, clearActivities } = usePlayer();
  const hasActivities = activities.length > 0;

  const gaEvent = (action: string) => {
    (window as any).gtag?.("event", action);
  };

  const handleClear = () => {
    clearActivities();
    gaEvent("clear_activities");
  };

  const handleToggleRoute = () => {
    onToggleShowRoute();
    gaEvent("toggle_route");
  };

  return (
    <div id="activities-controls">
      <button
        id="clear"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleClear}
      >
        <i className="bi bi-x-circle-fill"></i>
        <span className="clear text">Clear</span>
        <span className="text"> Activities</span>
      </button>
      
      <button
        id="upload"
        className="btn btn-sm btn-primary"
        onClick={onUploadClick}
      >
        <i className="bi bi-upload"></i>
        <span className="upload text">Upload GPX</span>
      </button>
      
      <button
        id="show-route"
        className={`btn btn-sm btn-primary show-route ${showRoute ? 'active' : ''}`}
        onClick={handleToggleRoute}
      >
        <i className="bi bi-bezier2"></i>
        <span className="text">Show Route</span>
      </button>
    </div>
  );
};

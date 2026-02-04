import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

export const SpeedControls: React.FC = () => {
  const { activities, multiplier, seconds, adjustSpeed, player } = usePlayer();
  const hasActivities = activities.length > 0;

  const gaEvent = (action: string) => {
    (window as any).gtag?.("event", action);
  };

  const handleSlower = () => {
    adjustSpeed(false);
    gaEvent("slower");
  };

  const handleFaster = () => {
    adjustSpeed(true);
    gaEvent("faster");
  };

  const getTimeDisplay = () => {
    return player.getMinutesSeconds(seconds);
  };

  return (
    <div id="speed-controls">
      <span>Speed: </span>
      
      <button
        id="slower"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleSlower}
      >
        <i className="bi bi-arrow-left"></i>
        <span className="text">Slower</span>
      </button>
      
      <i className="x bi bi-x-lg"></i>
      <span id="multiplier">{multiplier}</span>
      
      <button
        id="faster"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleFaster}
      >
        <i className="bi bi-arrow-right"></i>
        <span className="text">Faster</span>
      </button>
      
      <span id="time">{getTimeDisplay()}</span>
    </div>
  );
};

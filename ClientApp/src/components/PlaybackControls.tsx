import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

interface PlaybackControlsProps {
  autoCenter: boolean;
  onToggleAutoCenter: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  autoCenter,
  onToggleAutoCenter,
}) => {
  const { 
    activities, 
    paused, 
    toggleStartPause, 
    reset, 
    goBackward, 
    goForward 
  } = usePlayer();
  
  const hasActivities = activities.length > 0;

  const gaEvent = (action: string) => {
    (window as any).gtag?.("event", action);
  };

  const handleReset = () => {
    toggleStartPause(true);
    reset();
    gaEvent("reset");
  };

  const handleBack = () => {
    goBackward();
    gaEvent("back");
  };

  const handleForward = () => {
    goForward();
    gaEvent("forward");
  };

  const handleStart = () => {
    toggleStartPause(false);
    gaEvent("start");
  };

  const handlePause = () => {
    toggleStartPause(true);
    gaEvent("pause");
  };

  const handleAutoCenter = () => {
    onToggleAutoCenter();
    gaEvent("auto_center");
  };

  return (
    <div id="playback-controls">
      <button
        id="reset"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleReset}
      >
        <i className="bi bi-arrow-repeat"></i>
        <span className="text">Restart</span>
      </button>
      
      <button
        id="back"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleBack}
      >
        <i className="bi bi-skip-backward-fill"></i>
        <span className="text">Backward</span>
      </button>
      
      {paused ? (
        <button
          id="start"
          className="btn btn-sm btn-primary"
          disabled={!hasActivities}
          onClick={handleStart}
        >
          <i className="bi bi-play-fill"></i>
          <span className="text">Start</span>
        </button>
      ) : (
        <button
          id="pause"
          className="btn btn-sm btn-primary"
          onClick={handlePause}
        >
          <i className="bi bi-pause-fill"></i>
          <span className="text">Pause</span>
        </button>
      )}
      
      <button
        id="forward"
        className="btn btn-sm btn-primary"
        disabled={!hasActivities}
        onClick={handleForward}
      >
        <i className="bi bi-skip-forward-fill"></i>
        <span className="text">Forward</span>
      </button>
      
      <button
        id="center"
        className={`btn btn-sm btn-primary auto-center ${autoCenter ? 'active' : ''}`}
        disabled={!hasActivities}
        onClick={handleAutoCenter}
      >
        <i className="bi bi-record2-fill"></i>
        <span className="text">Auto-center</span>
      </button>
    </div>
  );
};

import React from 'react';
import { usePlayer } from '../hooks/usePlayer';

export const DateTimeLocation: React.FC = () => {
  const { activities, seconds, currentDateTime } = usePlayer();

  const getLatLong = () => {
    if (activities.length > 0) {
      const firstActivity = activities[0];
      if (firstActivity.points.length > seconds) {
        const point = firstActivity.points[seconds];
        return `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`;
      }
    }
    return '';
  };

  const hasActivities = activities.length > 0;

  return (
    <div id="date-time-and-location">
      {hasActivities && (
        <>
          <span id="lat-long-label">Lat/Long:</span>
          <span id="lat-long-text">{getLatLong()}</span>
        </>
      )}
      
      {currentDateTime && (
        <>
          <span id="current-time-label">Local Time:</span>
          <span id="current-time-text">{currentDateTime.toLocaleTimeString()}</span>
        </>
      )}
    </div>
  );
};

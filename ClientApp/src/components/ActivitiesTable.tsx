import React, { useState } from 'react';
import { usePlayer } from '../hooks/usePlayer';

const COLORS = [
  [200, 0, 0],
  [0, 200, 0],
  [0, 0, 200],
  [200, 120, 0],
  [100, 0, 0],
  [0, 100, 0],
  [0, 0, 100],
  [255, 165, 0],
];

export const ActivitiesTable: React.FC = () => {
  const { 
    activities, 
    seconds,
    started,
    toggleVisibility, 
    deleteActivity,
    getCurrentPace
  } = usePlayer();
  
  const [openSettingsId, setOpenSettingsId] = useState<number | null>(null);

  const handleToggleSettings = (id: number) => {
    setOpenSettingsId(openSettingsId === id ? null : id);
  };

  const handleZoomTo = (id: number) => {
    const activity = activities.find(a => a.id === id);
    if (activity && activity.points.length > 0) {
      const startPoint = activity.points[0];
      // Dispatch custom event for map to handle
      document.dispatchEvent(new CustomEvent('zoom-to-activity', { 
        detail: { center: [startPoint[0], startPoint[1]], zoom: 15 } 
      }));
    }
    setOpenSettingsId(null);
  };

  const handleDelete = (id: number) => {
    deleteActivity(id);
    setOpenSettingsId(null);
  };

  if (activities.length === 0) {
    return <div id="activities"></div>;
  }

  return (
    <div id="activities">
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Name</th>
            <th>Miles</th>
            <th>Pace</th>
            <th>Avg.</th>
            <th>Time</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity, index) => {
            const color = COLORS[index % COLORS.length];
            const showTime = activity.points.length - 1 <= seconds || !started;
            
            return (
              <tr key={activity.id} id={`tr-${activity.id}`}>
                <td>
                  <input
                    type="checkbox"
                    id={`toggle-${activity.id}`}
                    checked={activity.visible}
                    onChange={(e) => toggleVisibility(activity.id!, e.target.checked)}
                  />
                </td>
                <td className="icon">
                  <span style={{ backgroundColor: `rgb(${color.join(",")})` }}></span>
                </td>
                <td>{activity.title}</td>
                <td>{activity.accumulatedDistance?.toFixed(2) || '0.00'}</td>
                <td>{getCurrentPace(activity)}</td>
                <td>{activity.averagePace || ''}</td>
                <td>{showTime ? activity.timeDisplay || '' : ''}</td>
                <td style={{ position: 'relative' }}>
                  <button 
                    className="settings" 
                    onClick={() => handleToggleSettings(activity.id!)}
                  >
                    <i className="bi bi-gear"></i>
                  </button>
                  <div 
                    className="settings-list" 
                    style={{ display: openSettingsId === activity.id ? 'block' : 'none' }}
                  >
                    <button onClick={() => handleZoomTo(activity.id!)}>Zoom To</button>
                    <button onClick={() => handleDelete(activity.id!)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

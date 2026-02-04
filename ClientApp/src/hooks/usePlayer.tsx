import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Player } from '../player';
import { Activity } from '../models';

interface PlayerContextType {
  player: Player;
  activities: Activity[];
  seconds: number;
  paused: boolean;
  started: boolean;
  multiplier: number;
  currentDateTime?: Date;
  addActivity: (activity: Activity) => void;
  clearActivities: () => void;
  deleteActivity: (id: number) => void;
  toggleVisibility: (id: number, visible: boolean) => void;
  toggleStartPause: (setPause?: boolean) => void;
  reset: () => void;
  adjustSpeed: (faster: boolean) => void;
  goForward: () => void;
  goBackward: () => void;
  refresh: () => void;
  getCenter: () => number[] | null;
  getCurrentPace: (activity: Activity) => string;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const playerRef = useRef(new Player());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(true);
  const [multiplier, setMultiplier] = useState(10);
  const [currentDateTime, setCurrentDateTime] = useState<Date | undefined>();
  const [, forceUpdate] = useState({});

  const refresh = useCallback(() => {
    forceUpdate({});
    setActivities([...playerRef.current.activities]);
    setSeconds(playerRef.current.seconds);
    setPaused(playerRef.current.paused);
    setMultiplier(playerRef.current.multiplier);
    setCurrentDateTime(playerRef.current.currentDateTime);
  }, []);

  useEffect(() => {
    const handleTick = () => {
      refresh();
    };
    
    document.addEventListener('player-tick', handleTick);
    playerRef.current.restartTimer();
    
    return () => {
      document.removeEventListener('player-tick', handleTick);
    };
  }, [refresh]);

  const addActivity = useCallback((activity: Activity) => {
    playerRef.current.addActivity(activity);
    if (!playerRef.current.startDateTime && activity.startDateTime) {
      playerRef.current.startDateTime = activity.startDateTime;
      playerRef.current.currentDateTime = activity.startDateTime;
    }
    refresh();
  }, [refresh]);

  const clearActivities = useCallback(() => {
    playerRef.current.clearActivities();
    refresh();
  }, [refresh]);

  const deleteActivity = useCallback((id: number) => {
    playerRef.current.deleteActivity(id);
    refresh();
  }, [refresh]);

  const toggleVisibility = useCallback((id: number, visible: boolean) => {
    const activity = playerRef.current.activities.find(a => a.id === id);
    if (activity) {
      activity.visible = visible;
      refresh();
    }
  }, [refresh]);

  const toggleStartPause = useCallback((setPause?: boolean) => {
    playerRef.current.toggleStartPause(setPause);
    refresh();
  }, [refresh]);

  const reset = useCallback(() => {
    playerRef.current.reset();
    refresh();
  }, [refresh]);

  const adjustSpeed = useCallback((faster: boolean) => {
    playerRef.current.adjustSpeed(faster);
    refresh();
  }, [refresh]);

  const goForward = useCallback(() => {
    playerRef.current.goForward();
    refresh();
  }, [refresh]);

  const goBackward = useCallback(() => {
    playerRef.current.goBackward();
    refresh();
  }, [refresh]);

  const getCenter = useCallback(() => {
    return playerRef.current.getCenter();
  }, []);

  const getCurrentPace = useCallback((activity: Activity) => {
    return playerRef.current.getCurrentPace(activity, playerRef.current.seconds);
  }, []);

  const value: PlayerContextType = {
    player: playerRef.current,
    activities,
    seconds,
    paused,
    started: !paused || seconds !== 0,
    multiplier,
    currentDateTime,
    addActivity,
    clearActivities,
    deleteActivity,
    toggleVisibility,
    toggleStartPause,
    reset,
    adjustSpeed,
    goForward,
    goBackward,
    refresh,
    getCenter,
    getCurrentPace,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

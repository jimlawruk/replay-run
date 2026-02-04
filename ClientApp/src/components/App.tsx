import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ActivitiesPanel } from './ActivitiesPanel';
import { ChartsContainer } from './ChartsContainer';
import { MapContainer } from './MapContainer';
import { WelcomeModal } from './WelcomeModal';
import { EnterTimeModal } from './EnterTimeModal';
import { PlayerProvider, usePlayer } from '../hooks/usePlayer';
import { GPXParser } from '../gpxParser';
import { Activity } from '../models';

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../style.css";

const AppContent: React.FC = () => {
  const { 
    player, 
    addActivity, 
    refresh
  } = usePlayer();
  
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showEnterTimeModal, setShowEnterTimeModal] = useState(false);
  const [showRoute, setShowRoute] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [currentFileText, setCurrentFileText] = useState<string | undefined>();
  
  const gpxParser = useRef(new GPXParser());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('load')) {
      setShowWelcomeModal(false);
    }
  }, []);

  const processNewGPX = useCallback((fileText: string) => {
    setCurrentFileText(fileText);
    const hasTimestamps = gpxParser.current.doesGPXHaveTimestamps(fileText);
    if (hasTimestamps) {
      createActivityFromTextResult(fileText);
    } else if (hasTimestamps === false) {
      setShowEnterTimeModal(true);
    }
  }, []);

  const createActivityFromTextResult = useCallback((textResult: string, seconds: number | null = null) => {
    let activity: Activity;
    if (seconds) {
      activity = gpxParser.current.getActivitiesFromResultWithoutTimestamps(textResult, seconds);
    } else {
      activity = gpxParser.current.getActivitiesFromResult(textResult);
    }
    addActivity(activity);
    gaEvent("load_activity");
  }, [addActivity]);

  const handleProcessEnteredTime = useCallback((hours: number, minutes: number, secs: number) => {
    const totalSeconds = hours * 3600 + minutes * 60 + secs;
    if (currentFileText) {
      createActivityFromTextResult(currentFileText, totalSeconds);
    }
    setShowEnterTimeModal(false);
  }, [currentFileText, createActivityFromTextResult]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowWelcomeModal(false);
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          processNewGPX(reader.result as string);
        });
        reader.readAsText(files[i]);
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processNewGPX]);

  const handleDrop = useCallback((files: FileList) => {
    setShowWelcomeModal(false);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith(".gpx")) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          processNewGPX(reader.result as string);
        });
        reader.readAsText(file);
      }
    }
  }, [processNewGPX]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleLoadBostonDemo = useCallback(() => {
    setShowWelcomeModal(false);
    fetch("/Boston_Marathon.gpx")
      .then(response => response.text())
      .then(text => {
        createActivityFromTextResult(text);
        setTimeout(() => {
          player.toggleStartPause(false);
          refresh();
        }, 500);
      });
  }, [createActivityFromTextResult, player, refresh]);

  const gaEvent = (action: string) => {
    (window as any).gtag?.("event", action);
  };

  return (
    <div id="box">
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onLoadDemo={handleLoadBostonDemo}
        onUpload={handleUploadClick}
      />
      
      <EnterTimeModal
        isOpen={showEnterTimeModal}
        onClose={() => setShowEnterTimeModal(false)}
        onSubmit={handleProcessEnteredTime}
      />

      <div 
        id="modal-backdrop" 
        className={`modal-backdrop fade ${showWelcomeModal || showEnterTimeModal ? 'show' : ''}`}
        style={{ display: showWelcomeModal || showEnterTimeModal ? 'block' : 'none' }}
      />

      <input 
        ref={fileInputRef}
        id="gpxFile" 
        type="file" 
        accept=".gpx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <ActivitiesPanel
        showRoute={showRoute}
        onToggleShowRoute={() => setShowRoute(!showRoute)}
        autoCenter={autoCenter}
        onToggleAutoCenter={() => setAutoCenter(!autoCenter)}
        onUploadClick={handleUploadClick}
      />

      <MapContainer
        showRoute={showRoute}
        autoCenter={autoCenter}
        onDrop={handleDrop}
      />

      <ChartsContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
};

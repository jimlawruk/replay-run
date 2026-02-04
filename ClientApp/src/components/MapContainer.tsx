import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import { MapUtils } from '../map-utilities';
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

interface MapContainerProps {
  showRoute: boolean;
  autoCenter: boolean;
  onDrop: (files: FileList) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  showRoute,
  autoCenter,
  onDrop,
}) => {
  const { activities, seconds, getCenter } = usePlayer();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const viewDivRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const pointLayerRef = useRef<GraphicsLayer | null>(null);
  const polylineLayerRef = useRef<GraphicsLayer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Initialize map
  useEffect(() => {
    if (!viewDivRef.current) return;

    const map = new Map({ basemap: "streets-vector" });

    const view = new MapView({
      map: map,
      container: viewDivRef.current,
      center: [-76, 42],
      zoom: 6,
    });

    const basemapToggle = new BasemapToggle({
      view: view,
      nextBasemap: "hybrid",
    });
    view.ui.add(basemapToggle, "top-left");

    const pointLayer = new GraphicsLayer({});
    map.add(pointLayer);

    const polylineLayer = new GraphicsLayer({});
    map.add(polylineLayer);

    viewRef.current = view;
    pointLayerRef.current = pointLayer;
    polylineLayerRef.current = polylineLayer;

    // Handle zoom-to-activity events
    const handleZoomTo = (e: CustomEvent) => {
      view.goTo({
        center: e.detail.center,
        zoom: e.detail.zoom,
      }, { duration: 1000 });
    };
    document.addEventListener('zoom-to-activity', handleZoomTo as EventListener);

    return () => {
      document.removeEventListener('zoom-to-activity', handleZoomTo as EventListener);
      view.destroy();
    };
  }, []);

  // Update graphics when activities or seconds change
  useEffect(() => {
    if (!pointLayerRef.current || !polylineLayerRef.current) return;

    pointLayerRef.current.removeAll();
    polylineLayerRef.current.removeAll();

    // Add polylines first so they render underneath points
    activities.forEach((activity, i) => {
      if (activity.visible && showRoute && activity.points?.length > 0) {
        const polylineGraphic = MapUtils.getPolylineGraphic(
          activity.points, 
          COLORS[i % COLORS.length], 
          0.4
        );
        polylineLayerRef.current!.add(polylineGraphic);
      }
    });

    // Add points second so they render on top
    activities.forEach((activity, i) => {
      if (activity.visible && activity.points?.length > seconds) {
        const graphic = MapUtils.getPointGraphic(
          activity.points[seconds], 
          COLORS[i % COLORS.length]
        );
        pointLayerRef.current!.add(graphic);
      }
    });
  }, [activities, seconds, showRoute]);

  // Auto-center
  useEffect(() => {
    if (autoCenter && viewRef.current) {
      const center = getCenter();
      if (center) {
        viewRef.current.center = center as any;
      }
    }
  }, [autoCenter, seconds, getCenter]);

  // Center on first activity when loaded
  useEffect(() => {
    if (activities.length === 1 && viewRef.current) {
      const firstActivity = activities[0];
      if (firstActivity.points.length > 0) {
        viewRef.current.goTo({
          center: firstActivity.points[0],
          zoom: 15,
        });
      }
    }
  }, [activities.length]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onDrop(files);
    }
  }, [onDrop]);

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        id="viewDiv" 
        ref={viewDivRef}
        style={{ opacity: isDragging ? 0.7 : 1 }}
      />
      <div 
        id="drop-overlay" 
        className={`drop-overlay ${isDragging ? 'show' : ''}`}
      >
        <div className="drop-text">Upload .GPX File by Dropping File on to the Map</div>
      </div>
    </div>
  );
};

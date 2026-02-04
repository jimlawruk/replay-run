import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { usePlayer } from '../hooks/usePlayer';

Chart.register(...registerables);

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

export const ChartsContainer: React.FC = () => {
  const { activities, seconds, player } = usePlayer();
  const elevationChartRef = useRef<Chart | null>(null);
  const paceChartRef = useRef<Chart | null>(null);
  const elevationCanvasRef = useRef<HTMLCanvasElement>(null);
  const paceCanvasRef = useRef<HTMLCanvasElement>(null);
  const [elevationExpanded, setElevationExpanded] = useState(true);
  const [paceExpanded, setPaceExpanded] = useState(true);

  const latestActivity = activities.length > 0 ? activities[activities.length - 1] : null;
  const hasElevations = latestActivity?.elevations && latestActivity.elevations.length > 0;

  // Prepare elevation data
  const prepareElevationData = (activity: typeof latestActivity) => {
    if (!activity || !activity.elevations) return { dataPoints: [], maxDistance: 0 };
    
    const elevations = activity.elevations;
    const points = activity.points;
    const metersToFeet = 3.28084;

    // Calculate cumulative distance in miles
    const distances: number[] = [0];
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dist = player.calcCrow(
        points[i - 1][1],
        points[i - 1][0],
        points[i][1],
        points[i][0]
      );
      totalDistance += player.getMiles(dist);
      distances.push(totalDistance);
    }

    // Smooth elevations
    const windowSize = Math.min(30, Math.floor(elevations.length / 10) || 1);
    const smoothedElevations: number[] = [];
    const dataLength = Math.min(points.length, elevations.length);
    for (let i = 0; i < dataLength; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(elevations.length, i + windowSize + 1);
      const window = elevations.slice(start, end);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      smoothedElevations.push(avg * metersToFeet);
    }

    // Sample data for chart
    const sampleInterval = Math.max(1, Math.floor(dataLength / 200));
    const dataPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < dataLength; i += sampleInterval) {
      dataPoints.push({
        x: distances[i],
        y: smoothedElevations[i]
      });
    }

    const lastIndex = dataLength - 1;
    if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].x !== distances[lastIndex]) {
      dataPoints.push({
        x: distances[lastIndex],
        y: smoothedElevations[lastIndex]
      });
    }

    return { dataPoints, maxDistance: distances[dataLength - 1] };
  };

  // Prepare pace data
  const preparePaceData = (activity: typeof latestActivity) => {
    if (!activity) return { paceDataPoints: [], minPace: 6, maxPace: 10 };
    
    const points = activity.points;
    const windowSize = 30;
    const numWindows = 3;

    const distances: number[] = [0];
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dist = player.calcCrow(
        points[i - 1][1],
        points[i - 1][0],
        points[i][1],
        points[i][0]
      );
      totalDistance += player.getMiles(dist);
      distances.push(totalDistance);
    }

    const paceDataPoints: { x: number; y: number }[] = [];
    const sampleInterval = Math.max(1, Math.floor(points.length / 200));

    for (let i = windowSize; i < points.length; i += sampleInterval) {
      let paceSum = 0;
      let validWindows = 0;

      for (let w = 0; w < numWindows; w++) {
        const windowEnd = i - (w * 5);
        const windowStart = windowEnd - windowSize;

        if (windowStart < 0) break;

        let distanceInWindow = 0;
        for (let t = windowStart; t < windowEnd; t++) {
          if (points.length > t + 1) {
            const lastPoint = points[t];
            const currentPoint = points[t + 1];
            distanceInWindow += player.getMiles(
              player.calcCrow(lastPoint[1], lastPoint[0], currentPoint[1], currentPoint[0])
            );
          }
        }

        if (distanceInWindow > 0) {
          const paceInMinutes = windowSize / distanceInWindow / 60;
          paceSum += paceInMinutes;
          validWindows++;
        }
      }

      if (validWindows > 0) {
        paceDataPoints.push({
          x: distances[i],
          y: paceSum / validWindows
        });
      }
    }

    const paceValues = paceDataPoints.map(p => p.y);
    let minPace = Math.max(Math.floor(Math.min(...paceValues) * 2) / 2, 4);
    let maxPace = Math.min(Math.ceil(Math.max(...paceValues) * 2) / 2, 10);

    return { paceDataPoints, minPace, maxPace };
  };

  // Build and update charts
  useEffect(() => {
    if (!latestActivity || !hasElevations) {
      if (elevationChartRef.current) {
        elevationChartRef.current.destroy();
        elevationChartRef.current = null;
      }
      if (paceChartRef.current) {
        paceChartRef.current.destroy();
        paceChartRef.current = null;
      }
      return;
    }

    const { dataPoints, maxDistance } = prepareElevationData(latestActivity);
    const { paceDataPoints, minPace, maxPace } = preparePaceData(latestActivity);

    const elevationValues = dataPoints.map(p => p.y);
    const minElevation = Math.min(...elevationValues);
    const maxElevation = Math.max(...elevationValues);
    let yMin = Math.floor(minElevation / 10) * 10;
    let yMax = Math.ceil(maxElevation / 10) * 10;
    if (yMax - yMin < 100) {
      const center = (yMin + yMax) / 2;
      yMin = Math.floor((center - 50) / 10) * 10;
      yMax = Math.ceil((center + 50) / 10) * 10;
    }

    const xAxisMax = Math.round(maxDistance * 10) / 10;

    // Create position datasets
    const positionDatasets = activities.map((_, index) => ({
      label: `Position`,
      data: [] as { x: number; y: number }[],
      borderColor: `rgb(${COLORS[index % COLORS.length].join(",")})`,
      backgroundColor: `rgb(${COLORS[index % COLORS.length].join(",")})`,
      pointRadius: 5,
      pointStyle: 'circle' as const,
      showLine: false,
    }));

    // Create/update elevation chart
    if (elevationChartRef.current) {
      elevationChartRef.current.destroy();
    }

    if (elevationCanvasRef.current) {
      const ctx = elevationCanvasRef.current.getContext('2d')!;
      elevationChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Elevation (ft)',
              data: dataPoints,
              borderColor: 'grey',
              backgroundColor: 'rgba(200, 200, 200, 0.5)',
              fill: true,
              pointRadius: 0,
              tension: 0.3,
            },
            ...positionDatasets,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'Miles' },
              ticks: { maxTicksLimit: 10 },
              min: 0,
              max: xAxisMax,
            },
            y: {
              title: { display: true, text: 'Elevation (ft)' },
              min: yMin,
              max: yMax,
              ticks: { padding: 5, autoSkip: true, maxTicksLimit: 6 },
            },
          },
        },
      });
    }

    // Parse average pace
    const parseAveragePace = (paceString: string): number => {
      const parts = paceString.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) + parseInt(parts[1]) / 60;
      }
      return 0;
    };

    const avgPaceValue = latestActivity.averagePace ? parseAveragePace(latestActivity.averagePace) : 0;
    const avgPaceLineData = avgPaceValue > 0 ? [
      { x: 0, y: avgPaceValue },
      { x: xAxisMax, y: avgPaceValue }
    ] : [];

    // Create/update pace chart
    if (paceChartRef.current) {
      paceChartRef.current.destroy();
    }

    if (paceCanvasRef.current) {
      const ctx = paceCanvasRef.current.getContext('2d')!;
      paceChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Pace (min/mi)',
              data: paceDataPoints,
              borderColor: 'navy',
              backgroundColor: 'transparent',
              fill: false,
              pointRadius: 0,
              tension: 0.3,
            },
            {
              label: 'Average Pace',
              data: avgPaceLineData,
              borderColor: 'rgba(32, 77, 92, 0.9)',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              borderWidth: 2,
              fill: false,
              pointRadius: 0,
              tension: 0,
            },
            ...positionDatasets,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              type: 'linear',
              display: true,
              ticks: { display: false, maxTicksLimit: 10 },
              grid: { display: true },
              min: 0,
              max: xAxisMax,
            },
            y: {
              title: { display: true, text: 'Pace (min/mi)' },
              reverse: false,
              min: minPace,
              max: maxPace,
              ticks: {
                callback: function (value) {
                  const minutes = Math.floor(value as number);
                  const secs = Math.round(((value as number) - minutes) * 60);
                  return `${minutes}:${secs.toString().padStart(2, '0')}`;
                },
                padding: 5,
                autoSkip: true,
                maxTicksLimit: 6,
              },
            },
          },
        },
      });
    }

    return () => {
      if (elevationChartRef.current) {
        elevationChartRef.current.destroy();
        elevationChartRef.current = null;
      }
      if (paceChartRef.current) {
        paceChartRef.current.destroy();
        paceChartRef.current = null;
      }
    };
  }, [latestActivity?.id, hasElevations]);

  // Update position markers on charts
  useEffect(() => {
    if (!elevationChartRef.current || !paceChartRef.current || !latestActivity) return;

    const elevationDataset = elevationChartRef.current.data.datasets[0].data as { x: number; y: number }[];
    const paceDataset = paceChartRef.current.data.datasets[0].data as { x: number; y: number }[];

    activities.forEach((activity, i) => {
      const elevationPositionDataset = elevationChartRef.current!.data.datasets[i + 1];
      const pacePositionDataset = paceChartRef.current!.data.datasets[i + 2];

      if (!activity.visible || seconds >= activity.points.length) {
        if (elevationPositionDataset) elevationPositionDataset.data = [];
        if (pacePositionDataset) pacePositionDataset.data = [];
        return;
      }

      // Calculate current distance
      let totalDistance = 0;
      for (let j = 1; j <= seconds && j < activity.points.length; j++) {
        const dist = player.calcCrow(
          activity.points[j - 1][1],
          activity.points[j - 1][0],
          activity.points[j][1],
          activity.points[j][0]
        );
        totalDistance += player.getMiles(dist);
      }

      // Find closest elevation Y value
      let elevationY = 0;
      if (elevationDataset.length > 0) {
        let closestIndex = 0;
        let minDiff = Math.abs(elevationDataset[0].x - totalDistance);
        for (let j = 1; j < elevationDataset.length; j++) {
          const diff = Math.abs(elevationDataset[j].x - totalDistance);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = j;
          }
        }
        elevationY = elevationDataset[closestIndex].y;
      }

      if (elevationPositionDataset) {
        elevationPositionDataset.data = [{ x: totalDistance, y: elevationY }];
      }

      // Find closest pace Y value
      let paceY = 0;
      if (paceDataset.length > 0) {
        let closestIndex = 0;
        let minDiff = Math.abs(paceDataset[0].x - totalDistance);
        for (let j = 1; j < paceDataset.length; j++) {
          const diff = Math.abs(paceDataset[j].x - totalDistance);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = j;
          }
        }
        paceY = paceDataset[closestIndex].y;
      }

      if (pacePositionDataset) {
        pacePositionDataset.data = [{ x: totalDistance, y: paceY }];
      }
    });

    elevationChartRef.current.update('none');
    paceChartRef.current.update('none');
  }, [seconds, activities]);

  if (!hasElevations) {
    return null;
  }

  return (
    <div id="charts-container" style={{ display: 'block' }}>
      <div 
        id="pace-panel" 
        style={{ height: paceExpanded ? '120px' : '30px' }}
      >
        <div className="chart-header">
          <button 
            id="toggle-pace" 
            className="btn btn-sm"
            onClick={() => setPaceExpanded(!paceExpanded)}
          >
            <i className={`bi bi-chevron-${paceExpanded ? 'down' : 'up'}`}></i>
          </button>
        </div>
        <canvas 
          id="pace-chart" 
          ref={paceCanvasRef}
          style={{ display: paceExpanded ? 'block' : 'none' }}
        />
      </div>
      
      <div 
        id="elevation-panel" 
        style={{ height: elevationExpanded ? '150px' : '30px' }}
      >
        <div className="chart-header">
          <button 
            id="toggle-elevation" 
            className="btn btn-sm"
            onClick={() => setElevationExpanded(!elevationExpanded)}
          >
            <i className={`bi bi-chevron-${elevationExpanded ? 'down' : 'up'}`}></i>
          </button>
        </div>
        <canvas 
          id="elevation-chart" 
          ref={elevationCanvasRef}
          style={{ display: elevationExpanded ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
};

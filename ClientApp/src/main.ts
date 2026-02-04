import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import { Chart, registerables } from "chart.js";
import { Activities } from "./activities";
import { MapUtils } from "./map-utilities";
import { GPXParser } from "./gpxParser";
import { Player } from "./player";
import { Base } from "./base";

import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./style.css";
import { Activity } from "./models";

Chart.register(...registerables);

export class Main extends Base {
  player: Player = new Player();
  gpxParser: GPXParser = new GPXParser();
  view?: MapView;
  map?: Map;
  colors?: number[][];
  pointLayer?: GraphicsLayer;
  polylineLayer?: GraphicsLayer;
  appendActivityId?: number;
  currentFileText?: string;
  elevationChart?: Chart;
  paceChart?: Chart;
  currentChartActivityId?: number;

  async run() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(<string>prop),
    });

    let start = [-76, 42];
    let zoom = 6;
    if ((<any>params)["default"] === "true") {
      this.player.activities = [Activities.Activity1, Activities.Activity2];
      start = this.player.activities[0].points[0];
      zoom = 15;
    } else if ((<any>params)["load"] === "drchhbgmile2022") {
      this.loadGpxFromUrl("Harrisburg_Mile_2022_Ty.gpx");
      this.loadGpxFromUrl("Harrisburg_Mile_2022_Cem.gpx");
      this.loadGpxFromUrl("Harrisburg_Mile_2022_Jim.gpx");
      this.loadGpxFromUrl("Harrisburg_Mile_2022_David.gpx");
      start = [-76.900068, 40.278698];
      zoom = 17;
    }

    const map = new Map({ basemap: "streets-vector" });

    this.view = new MapView({
      map: map,
      container: "viewDiv",
      center: start,
      zoom: zoom,
    });

    const basemapToggle = new BasemapToggle({
      view: this.view,
      nextBasemap: "hybrid",
    });
    this.view.ui.add(basemapToggle, "top-left");

    this.pointLayer = new GraphicsLayer({});
    map.add(this.pointLayer);

    this.polylineLayer = new GraphicsLayer({});
    map.add(this.polylineLayer);

    this.colors = [
      [200, 0, 0],
      [0, 200, 0],
      [0, 0, 200],
      [200, 120, 0],
      [100, 0, 0],
      [0, 100, 0],
      [0, 0, 100],
      [255, 165, 0],
    ];

    document.addEventListener("player-tick", () => {
      this.refresh();
    });

    this.addClickHandler("upload", () => {
      this.getById("gpxFile").click();
    });

    const showRouteButton = this.getById("show-route");
    this.addClickHandler("show-route", () => {
      if (showRouteButton!.classList.contains("active")) {
        showRouteButton!.classList.remove("active");
      } else {
        showRouteButton!.classList.add("active");
      }
      this.refresh();
      this.gaEvent("toggle_route");
    });

    this.addClickHandler("clear", () => {
      this.player.clearActivities();
      this.refreshActivities();
      this.gaEvent("clear_activities");
    });

    this.addClickHandler("reset", () => {
      this.player.toggleStartPause(true);
      this.player.reset();
      this.gaEvent("reset");
    });

    this.addClickHandler("slower", () => {
      this.player.adjustSpeed(false);
      this.gaEvent("slower");
    });

    this.addClickHandler("faster", () => {
      this.player.adjustSpeed(true);
      this.gaEvent("faster");
    });

    this.addClickHandler("back", () => {
      this.player.goBackward();
      this.gaEvent("back");
    });

    this.addClickHandler("forward", () => {
      this.player.goForward();
      this.gaEvent("forward");
    });

    this.addClickHandler("pause", () => {
      this.player.toggleStartPause(true);
      this.gaEvent("pause");
    });

    this.addClickHandler("start", () => {
      this.player.toggleStartPause(false);
      this.gaEvent("start");
    });

    const centerButton = this.getById("center");
    this.addClickHandler("center", () => {
      if (this.isAutoCenterButtonActive()) {
        centerButton!.classList.remove("active");
      } else {
        centerButton!.classList.add("active");
      }
      this.gaEvent("auto_center");
    });

    this.getById("gpxFile")?.addEventListener("change", () => {
      this.closeModal("modal");
      let reader = new FileReader();
      reader.addEventListener(
        "load",
        () => {
          this.processNewGPX(<any>reader.result);
        },
        false
      );
      const files = (this.getById("gpxFile") as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          reader.readAsText(files[i]);
        }
      }
    });

    this.addClickHandler("activities", (e: MouseEvent) => {
      const element = e.target as HTMLElement;
      if (element.tagName === "INPUT") {
        const htmlInputElement = element as HTMLInputElement;
        const inputActivityId = htmlInputElement.id.split("-")[1];
        const activitiesFound = this.player.activities.filter((x) => x.id === parseInt(inputActivityId));
        if (activitiesFound.length) {
          activitiesFound[0].visible = htmlInputElement.checked;
          this.gaEvent("toggle_visibility");
        }
      }
    });

    this.addClickHandler("close-modal", () => {
      this.closeModal("modal");
    });

    this.addClickHandler("close-modal-enter-time", () => {
      this.closeModal("modal-enter-time");
    });

    this.addClickHandler("upload-gpx-from-modal", () => {
      this.getById("gpxFile").click();
    });

    this.addClickHandler("load-boston-demo", () => {
      this.closeModal("modal");
      this.loadGpxFromUrl("/Boston_Marathon.gpx");
      // Start playback after a short delay to ensure the activity is loaded
      setTimeout(() => {
        if (this.player.activities.length > 0) {
          this.player.toggleStartPause(false);
        }
      }, 500);
    });

    this.addClickHandler("process-entered-time-button", () => {
      this.closeModal("modal-enter-time");
      this.processNewGPXWithTimestamps()
    });

    this.addClickHandler("toggle-elevation", () => {
      this.toggleChartPanel("elevation");
    });

    this.addClickHandler("toggle-pace", () => {
      this.toggleChartPanel("pace");
    });

    this.player.restartTimer();
    this.refresh();

    this.showOrHide("panel", true);

    // Add drag and drop support for GPX files
    const mapContainer = this.getById("map-container");
    const viewDiv = this.getById("viewDiv");
    const dropOverlay = this.getById("drop-overlay");
    let dragCounter = 0;

    mapContainer?.addEventListener("dragenter", (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
        viewDiv!.style.opacity = "0.7";
        dropOverlay!.classList.add("show");
      }
    });

    mapContainer?.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    });

    mapContainer?.addEventListener("dragleave", (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        viewDiv!.style.opacity = "1";
        dropOverlay!.classList.remove("show");
      }
    });

    mapContainer?.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      viewDiv!.style.opacity = "1";
      dropOverlay!.classList.remove("show");
      this.closeModal("modal");
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.name.toLowerCase().endsWith(".gpx")) {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
              this.processNewGPX(<any>reader.result);
            }, false);
            reader.readAsText(file);
          }
        }
      }
    });

    if (!(<any>params)["load"]) {
      this.showModal("modal");
    }
  }

  processNewGPX(fileText: string) {
    this.currentFileText = fileText;
    const hasTimestamps = this.gpxParser.doesGPXHaveTimestamps(fileText);
    if (hasTimestamps) {
      this.createActivityFromTextResult(fileText);
    } else if (hasTimestamps === false) {
      this.getInputById("hours").focus();
      this.getInputById("hours").value = "0";
      this.getInputById("minutes").value = "0";
      this.getInputById("seconds").value = "0";
      this.showModal("modal-enter-time");
    }
  }

  processNewGPXWithTimestamps() {
    const hours = parseInt(this.getInputById("hours").value);
    const minutes = parseInt(this.getInputById("minutes").value);
    const seconds = parseInt(this.getInputById("seconds").value);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    this.createActivityFromTextResult(this.currentFileText!, totalSeconds);
  }

  createActivityFromTextResult(textResult: string, seconds: number | null = null) {
    let activity: Activity;
    if (seconds) {
      activity = this.gpxParser.getActivitiesFromResultWithoutTimestamps(textResult, seconds);
    } else {
      activity = this.gpxParser.getActivitiesFromResult(textResult);
    }
    const existingIds = this.player.activities?.map((x) => x.id || 0);
    const maxId = existingIds.length ? Math.max(...existingIds) : 0;
    activity.id = maxId + 1;
    this.player.activities.push(activity);
    this.player.reset();
    if (!this.player.startDateTime && activity.startDateTime) {
      this.player.startDateTime = activity.startDateTime;
      this.player.currentDateTime = activity.startDateTime;
    }
    this.refreshActivities();
    this.refresh();
    if (this.player.activities.length === 1) {
      this.center(15);
    }
    this.gaEvent("load_activity");
  }

  loadGpxFromUrl(url: string) {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.send(null);
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        const type = request.getResponseHeader("Content-Type");
        if (type?.indexOf("text") !== 1) {
          const text = request.responseText;
          this.createActivityFromTextResult(text);
        }
      }
    };
  }

  enableDisableButtons() {
    const disabled = !this.player.activities.length;
    const buttonIds = ["clear", "reset", "back", "start", "pause", "forward", "center", "faster", "slower"];
    for (const buttonId of buttonIds) {
      this.getButtonById(buttonId).disabled = disabled;
    }
  }

  refreshActivities() {
    this.rebuildActivityTable();
    this.addActivitiesSettingsHandlers();
    this.enableDisableButtons();
    this.updateElevationChart();
  }

  startAppendToActivity(id: number) {
    this.getById("gpxFile").click();
    this.appendActivityId = id;
  }

  deleteActivity(id: number) {
    this.player.deleteActivity(id);
    this.refreshActivities();
  }

  zoomToActivity(id: number) {
    const activity = this.player.activities.find(a => a.id === id);
    if (activity && activity.points.length > 0) {
      const startPoint = activity.points[0];
      (<any>this.view).goTo(
        {
          center: [startPoint[0], startPoint[1]],
          zoom: 15
        },
        {
          duration: 1000
        }
      );
    }
  }

  rebuildActivityTable() {
    let html = "";
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      html += `<tr id="tr-${activity.id}">
                    <td><input type="checkbox" id="toggle-${activity.id}" ${activity.visible ? "checked" : ""}/></td>
                    <td class="icon"><span style="background-color: rgb(${this.colors![i].join(",")})"></td>
                    <td>${activity.title}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <button class="settings" id="settings-button-${activity.id}"><i class="bi bi-gear"></i></button>                      
                        <div id="settings-list-${activity.id}" class="settings-list">
                            <button id="zoom-activity-${activity.id}">Zoom To</button>
                            <button id="append-activity-${activity.id}">Append</button>
                            <button id="delete-activity-${activity.id}">Delete</button>
                        </div>                     
                    </td>
                </tr>`;
    }
    html = `<table class="table">
                <thead>
                  <th></th>
                  <th></th>
                  <th>Name</th>
                  <th>Miles</th>
                  <th>Pace</th>
                  <th>Avg.</th>
                  <th>Time</th>
                  <th>Edit</th>
                </thhead>
                <tbody>${html}</tboday>
              </table>`;
    (<any>this.getById("activities")).innerHTML = html;
    this.enableDisableButtons();
  }

  addActivitiesSettingsHandlers() {
    for (let activity of this.player.activities) {
      this.getById(`settings-button-${activity.id}`).addEventListener("click", () => {
        this.toggleSettings(activity.id!);
      });
      this.addClickHandler(`zoom-activity-${activity.id}`, () => {
        this.zoomToActivity(activity.id!);
        this.showOrHide(`settings-list-${activity.id}`, false);
      });
      this.addClickHandler(`append-activity-${activity.id}`, () => {
        this.startAppendToActivity(activity.id!);
        this.showOrHide(`settings-list-${activity.id}`, false);
      });
      this.addClickHandler(`delete-activity-${activity.id}`, () => {
        this.deleteActivity(activity.id!);
      });
    }
  }

  setActivityText() {
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      if (activity) {
        const tr = this.getById("tr-" + activity.id?.toString());
        if (tr) {
          if (activity.accumulatedDistance === undefined) {
            activity.accumulatedDistance = 0;
          }
          tr.children[3].innerHTML = activity.accumulatedDistance?.toFixed(2);
          
          // Current pace (based on last 10 seconds)
          const currentPace = this.player.getCurrentPace(activity, this.player.seconds);
          tr.children[4].innerHTML = currentPace;
          
          // Average pace
          tr.children[5].innerHTML = activity.averagePace || "";

          if (activity.points.length - 1 <= this.player.seconds || !this.player.started) {
            tr.children[6].innerHTML = activity.timeDisplay || "";
          } else {
            tr.children[6].innerHTML = "";
          }
        }
      }
    }
  }

  setSpeedText() {
    this.getById("multiplier").innerHTML = `${this.player.multiplier}`;
  }

  setStartPauseText() {
    this.showOrHide("start", this.player.paused, "inline-block");
    this.showOrHide("pause", !this.player.paused, "inline-block");
  }

  setTimeText() {
    this.getById("time").innerHTML = this.player.getMinutesSeconds(this.player.seconds);
    if (this.player.currentDateTime) {
      this.showOrHide("current-time-label", true, "inline");
      this.getById("current-time-text").innerHTML = this.player.currentDateTime.toLocaleTimeString();
    } else {
      this.showOrHide("current-time-label", false, "inline");
      this.getById("current-time-text").innerHTML = "";
    }
  }

  setLatLongText() {
    if (this.player.activities.length) {
      this.showOrHide("lat-long-label", true, "inline");
      const firstActivity = this.player.activities[0];
      if (firstActivity.points.length > this.player.seconds) {
        const point = firstActivity.points[this.player.seconds];
        this.getById("lat-long-text").innerHTML = point[0].toFixed(5).toString() + ", " + point[1].toFixed(5).toString();
      }
    } else {
      this.showOrHide("lat-long-label", false);
      this.getById("lat-long-text").innerHTML = "";
    }
  }

  refreshGraphics() {
    this.pointLayer!.removeAll();
    this.polylineLayer!.removeAll();
    const showRoute = this.getById("show-route")?.classList.contains("active");
    
    // Add polylines first so they render underneath points
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      if (activity.visible && showRoute && activity.points?.length > 0) {
        const polylineGraphic = MapUtils.getPolylineGraphic(activity.points, this.colors![i], 0.4);
        this.polylineLayer!.add(polylineGraphic);
      }
    }
    
    // Add points second so they render on top
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      if (activity.visible && activity.points?.length > this.player.seconds) {
        const graphic = MapUtils.getPointGraphic(activity.points[this.player.seconds], this.colors![i]);
        this.pointLayer!.add(graphic);
      }
    }
  }

  resizeMap() {
    if (window.innerWidth < 500) {
      const panel = this.getById("panel");
      const mapContainer = this.getById("map-container");
      if (panel && mapContainer) {
        mapContainer.style.height = (window.innerHeight - panel.offsetHeight).toString() + "px";
      }
    }
  }

  gaEvent(action: string) {
    (<any>window).gtag("event", action);
  }

  refresh() {
    this.refreshGraphics();
    this.setActivityText();
    this.setStartPauseText();
    this.setTimeText();
    this.setLatLongText();
    this.setSpeedText();
    this.updateElevationChartPosition();
    if (this.isAutoCenterButtonActive()) {
      this.center();
    }
    this.resizeMap();
  }

  center(zoom?: number) {
    const centerFromPlayer = this.player.getCenter();
    if (zoom) {
      (<any>this.view).goTo({
        center: centerFromPlayer,
        zoom: zoom,
      });
    } else {
      (<any>this.view).center = centerFromPlayer;
    }
  }

  isAutoCenterButtonActive() {
    return this.getById("center")?.classList.contains("active");
  }

  showModal(id: string) {
    this.getById(id)?.setAttribute("style", "display:block");
    this.getById(id)?.classList.add("show");
    this.getById("modal-backdrop")?.setAttribute("style", "display:block");
    this.getById("modal-backdrop")?.classList.add("show");
  }

  closeModal(id: string) {
    this.getById(id)?.setAttribute("style", "display:none");
    this.getById(id)?.classList.remove("show");
    this.getById("modal-backdrop")?.setAttribute("style", "display:none");
    this.getById("modal-backdrop")?.classList.remove("show");
  }

  updateElevationChart() {
    const chartsContainer = this.getById("charts-container");
    const elevationPanel = this.getById("elevation-panel");
    
    if (this.player.activities.length === 0) {
      chartsContainer!.style.display = "none";
      if (this.elevationChart) {
        this.elevationChart.destroy();
        this.elevationChart = undefined;
      }
      if (this.paceChart) {
        this.paceChart.destroy();
        this.paceChart = undefined;
      }
      return;
    }

    // Show the latest activity's elevation
    const latestActivity = this.player.activities[this.player.activities.length - 1];
    if (!latestActivity.elevations || latestActivity.elevations.length === 0) {
      chartsContainer!.style.display = "none";
      return;
    }

    chartsContainer!.style.display = "block";
    elevationPanel!.style.display = "block";
    this.currentChartActivityId = latestActivity.id;

    // Prepare data: smooth and convert to feet and miles
    const { dataPoints, maxDistance } = this.prepareElevationData(latestActivity);

    // Calculate min and max elevation to ensure at least 100 feet range
    const elevationValues = dataPoints.map(p => p.y);
    const minElevation = Math.min(...elevationValues);
    const maxElevation = Math.max(...elevationValues);
    const range = maxElevation - minElevation;
    
    let yMin = minElevation;
    let yMax = maxElevation;
    
    if (range < 100) {
      const center = (minElevation + maxElevation) / 2;
      yMin = center - 50;
      yMax = center + 50;
    }
    
    // Round to nearest 10
    yMin = Math.floor(yMin / 10) * 10;
    yMax = Math.ceil(yMax / 10) * 10;
    
    // Ensure at least 100 feet range after rounding
    if (yMax - yMin < 100) {
      const center = (yMin + yMax) / 2;
      yMin = Math.floor((center - 50) / 10) * 10;
      yMax = Math.ceil((center + 50) / 10) * 10;
    }

    const xAxisMax = Math.round((maxDistance) * 10) / 10;

    // Destroy existing chart if any
    if (this.elevationChart) {
      this.elevationChart.destroy();
    }

    const ctx = (this.getById("elevation-chart") as HTMLCanvasElement).getContext("2d")!;
    
    // Create position datasets for all activities
    const positionDatasets = this.player.activities.map((activity, index) => ({
      label: `Position: ${activity.title}`,
      data: [],
      borderColor: `rgb(${this.colors![index].join(",")})`,
      backgroundColor: `rgb(${this.colors![index].join(",")})`,
      pointRadius: 5,
      pointStyle: "circle",
      showLine: false,
    }));
    
    this.elevationChart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Elevation (ft)",
            data: dataPoints,
            borderColor: "grey",
            backgroundColor: "rgba(200, 200, 200, 0.5)",
            fill: true,
            pointRadius: 0,
            tension: 0.3,
            order: 2,
          },
          ...positionDatasets.map(ds => ({ ...ds, order: 1 })),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: "Miles",
            },
            ticks: {
              maxTicksLimit: 10,
            },
            min: 0,
            max: xAxisMax,
          },
          y: {
            title: {
              display: true,
              text: "Elevation (ft)",
            },
            min: yMin,
            max: yMax,
            ticks: {
              padding: 5,
              autoSkip: true,
              maxTicksLimit: 6
            }
          },
        },
      },
    });

    // Update pace chart
    this.updatePaceChart(latestActivity, xAxisMax);
  }

  updatePaceChart(activity: Activity, xAxisMax: number) {
    const pacePanel = this.getById("pace-panel");
    pacePanel!.style.display = "block";

    // Prepare pace data using the same smoothing as getCurrentPace
    const { paceDataPoints, minPace, maxPace } = this.preparePaceData(activity);

    // Calculate average pace for the horizontal line
    const avgPaceValue = activity.averagePace ? this.parseAveragePace(activity.averagePace) : 0;
    const avgPaceLineData = avgPaceValue > 0 ? [
      { x: 0, y: avgPaceValue },
      { x: xAxisMax, y: avgPaceValue }
    ] : [];

    // Destroy existing chart if any
    if (this.paceChart) {
      this.paceChart.destroy();
    }

    const ctx = (this.getById("pace-chart") as HTMLCanvasElement).getContext("2d")!;

    // Create position datasets for all activities with labels
    const positionDatasets = this.player.activities.map((act, index) => ({
      label: `Position: ${act.title}`,
      data: [],
      borderColor: `rgb(${this.colors![index].join(",")})`,
      backgroundColor: `rgb(${this.colors![index].join(",")})`,
      pointRadius: 5,
      pointStyle: "circle",
      showLine: false,
    }));

    // Custom plugin to draw pace labels
    const paceLabelsPlugin = {
      id: 'paceLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          if (dataset.data && dataset.data.length > 0 && datasetIndex > 1) {
            const dataPoint = dataset.data[0];
            if (dataPoint && dataPoint.x !== undefined && dataPoint.y !== undefined) {
              const meta = chart.getDatasetMeta(datasetIndex);
              if (meta.data[0]) {
                const x = meta.data[0].x;
                const y = meta.data[0].y;
                const label = dataPoint.label || '';
                
                ctx.save();
                ctx.font = 'bold 11px Arial';
                ctx.fillStyle = dataset.borderColor;
                ctx.textAlign = 'center';
                ctx.fillText(label, x, y - 10);
                ctx.restore();
              }
            }
          }
        });
      }
    };

    this.paceChart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Pace (min/mi)",
            data: paceDataPoints,
            borderColor: "navy",
            backgroundColor: "transparent",
            fill: false,
            pointRadius: 0,
            tension: 0.3,
            order: 3,
          },
          {
            label: "Average Pace",
            data: avgPaceLineData,
            borderColor: "rgba(32, 77, 92, 0.9)",
            backgroundColor: "transparent",
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0,
            order: 2,
          },
          ...positionDatasets.map(ds => ({ ...ds, order: 1 })),
        ],
      },
      plugins: [paceLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: -3
          }
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            type: "linear",
            display: true,
            ticks: {
              display: false,
              maxTicksLimit: 10,
            },
            grid: {
              display: true,
            },
            min: 0,
            max: xAxisMax,
          },
          y: {
            title: {
              display: true,
              text: "Pace (min/mi)",              
            },
            reverse: false, // Faster pace at bottom
            min: minPace,
            max: maxPace,
            ticks: {
              callback: function(value) {
                const minutes = Math.floor(value as number);
                const seconds = Math.round(((value as number) - minutes) * 60);
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
              },
              padding: 5,
              autoSkip: true,
              maxTicksLimit: 6
            }
          },
        },
      },
    });
  }

  preparePaceData(activity: Activity): { paceDataPoints: {x: number, y: number}[], minPace: number, maxPace: number } {
    const points = activity.points;
    const windowSize = 30; // Same as getCurrentPace
    const numWindows = 3;

    // Calculate cumulative distances
    const distances: number[] = [0];
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dist = this.player.calcCrow(
        points[i - 1][1],
        points[i - 1][0],
        points[i][1],
        points[i][0]
      );
      totalDistance += this.player.getMiles(dist);
      distances.push(totalDistance);
    }

    // Calculate smoothed pace at each point using same algorithm as getCurrentPace
    const paceDataPoints: {x: number, y: number}[] = [];
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
            distanceInWindow += this.player.getMiles(
              this.player.calcCrow(lastPoint[1], lastPoint[0], currentPoint[1], currentPoint[0])
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
        const avgPace = paceSum / validWindows;
        // Include all paces, even if they exceed 9 min/mile (chart will clip them)
        paceDataPoints.push({
          x: distances[i],
          y: avgPace
        });
      }
    }

    // Calculate min/max for y-axis
    const paceValues = paceDataPoints.map(p => p.y);
    let minPace = Math.min(...paceValues);
    let maxPace = Math.max(...paceValues);
    
    // Cap at 9 min/mile but don't add padding - tight range
    minPace = Math.max(Math.floor(minPace * 2) / 2, 4); // Don't go below 4 min/mile
    maxPace = Math.min(Math.ceil(maxPace * 2) / 2, 10); // Cap at 10 min/mile

    return { paceDataPoints, minPace, maxPace };
  }

  prepareElevationData(activity: Activity): { dataPoints: {x: number, y: number}[], maxDistance: number } {
    const elevations = activity.elevations || [];
    const points = activity.points;
    const metersToFeet = 3.28084;

    // Calculate cumulative distance in miles
    const distances: number[] = [0];
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dist = this.player.calcCrow(
        points[i - 1][1],
        points[i - 1][0],
        points[i][1],
        points[i][0]
      );
      totalDistance += this.player.getMiles(dist);
      distances.push(totalDistance);
    }

    // Smooth elevations with a simple moving average
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

    // Sample data for chart (reduce to ~200 points for performance)
    const sampleInterval = Math.max(1, Math.floor(dataLength / 200));
    const dataPoints: {x: number, y: number}[] = [];
    for (let i = 0; i < dataLength; i += sampleInterval) {
      dataPoints.push({
        x: distances[i],
        y: smoothedElevations[i]
      });
    }
    
    // Always include the last point to show the full distance
    const lastIndex = dataLength - 1;
    if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].x !== distances[lastIndex]) {
      dataPoints.push({
        x: distances[lastIndex],
        y: smoothedElevations[lastIndex]
      });
    }

    return { dataPoints, maxDistance: distances[dataLength - 1] };
  }

  updateElevationChartPosition() {
    if (!this.elevationChart || !this.currentChartActivityId) return;

    const chartActivity = this.player.activities.find((a) => a.id === this.currentChartActivityId);
    if (!chartActivity || !chartActivity.elevations) return;

    const currentSecond = this.player.seconds;

    // Get the elevation dataset
    const elevationDataset = this.elevationChart.data.datasets[0].data as {x: number, y: number}[];

    // Update position for each activity
    for (let i = 0; i < this.player.activities.length; i++) {
      const activity = this.player.activities[i];
      const positionDataset = this.elevationChart.data.datasets[i + 1]; // +1 because elevation is dataset 0

      if (!activity.visible || !activity.elevations || currentSecond >= activity.points.length) {
        positionDataset.data = [];
        continue;
      }

      // Calculate current distance for this activity
      let totalDistance = 0;
      for (let j = 1; j <= currentSecond && j < activity.points.length; j++) {
        const dist = this.player.calcCrow(
          activity.points[j - 1][1],
          activity.points[j - 1][0],
          activity.points[j][1],
          activity.points[j][0]
        );
        totalDistance += this.player.getMiles(dist);
      }

      // Find the corresponding y value from the elevation graph at this x (distance)
      let elevationY = 0;
      if (elevationDataset.length > 0) {
        // Find the closest point or interpolate
        let closestIndex = 0;
        let minDiff = Math.abs(elevationDataset[0].x - totalDistance);
        
        for (let j = 1; j < elevationDataset.length; j++) {
          const diff = Math.abs(elevationDataset[j].x - totalDistance);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = j;
          }
        }
        
        // Interpolate if between two points
        if (closestIndex > 0 && closestIndex < elevationDataset.length - 1) {
          const prev = elevationDataset[closestIndex - 1];
          const curr = elevationDataset[closestIndex];
          const next = elevationDataset[closestIndex + 1];
          
          if (totalDistance < curr.x && prev) {
            // Interpolate between prev and curr
            const ratio = (totalDistance - prev.x) / (curr.x - prev.x);
            elevationY = prev.y + ratio * (curr.y - prev.y);
          } else if (totalDistance > curr.x && next) {
            // Interpolate between curr and next
            const ratio = (totalDistance - curr.x) / (next.x - curr.x);
            elevationY = curr.y + ratio * (next.y - curr.y);
          } else {
            elevationY = curr.y;
          }
        } else {
          elevationY = elevationDataset[closestIndex].y;
        }
      }

      // Update the position point
      positionDataset.data = [
        {
          x: totalDistance,
          y: elevationY,
        },
      ] as any;
    }

    this.elevationChart.update("none");

    // Update pace chart position as well
    if (this.paceChart) {
      const paceDataset = this.paceChart.data.datasets[0].data as {x: number, y: number}[];
      
      for (let i = 0; i < this.player.activities.length; i++) {
        const activity = this.player.activities[i];
        const positionDataset = this.paceChart.data.datasets[i + 2];

        if (!activity.visible || currentSecond >= activity.points.length) {
          positionDataset.data = [];
          continue;
        }

        // Calculate current distance for this activity
        let activityTotalDistance = 0;
        for (let j = 1; j <= currentSecond && j < activity.points.length; j++) {
          const dist = this.player.calcCrow(
            activity.points[j - 1][1],
            activity.points[j - 1][0],
            activity.points[j][1],
            activity.points[j][0]
          );
          activityTotalDistance += this.player.getMiles(dist);
        }

        // Find the corresponding y value from the pace graph
        let paceY = 0;
        if (paceDataset.length > 0) {
          let closestIndex = 0;
          let minDiff = Math.abs(paceDataset[0].x - activityTotalDistance);
          
          for (let j = 1; j < paceDataset.length; j++) {
            const diff = Math.abs(paceDataset[j].x - activityTotalDistance);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = j;
            }
          }
          
          paceY = paceDataset[closestIndex].y;
        }

        positionDataset.data = [
          {
            x: activityTotalDistance,
            y: paceY,
            label: this.player.getCurrentPace(activity, currentSecond)
          },
        ] as any;
      }

      this.paceChart.update("none");
    }
  }

  parseAveragePace(paceString: string): number {
    // Parse "MM:SS" format to decimal minutes
    const parts = paceString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes + (seconds / 60);
    }
    return 0;
  }

  toggleChartPanel(chartType: "elevation" | "pace") {
    const chart = this.getById(`${chartType}-chart`);
    const panel = this.getById(`${chartType}-panel`);
    const button = this.getById(`toggle-${chartType}`);
    const expandedHeight = chartType === "elevation" ? "150px" : "120px";
    
    if (chart?.style.display === "none") {
      chart.style.display = "block";
      panel!.style.height = expandedHeight;
      button!.innerHTML = '<i class="bi bi-chevron-down"></i>';
    } else {
      chart!.style.display = "none";
      panel!.style.height = "30px";
      button!.innerHTML = '<i class="bi bi-chevron-up"></i>';
    }
  }

  toggleSettings(activityId: number) {
    const id = `settings-list-${activityId}`;
    const settings = this.getById(id);
    const visible = settings?.style?.display === "block";
    this.showOrHide(id, !visible);
  }
}

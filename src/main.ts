import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import { Activities } from "./activities";
import { MapUtils } from "./map-utilities";
import { GPXParser } from "./gpxParser";
import { Player } from "./player";
import { Base } from "./base";

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

export class Main extends Base {
  player: Player = new Player;
  gpxParser: GPXParser = new GPXParser;
  view?: MapView;
  map?: Map;
  colors?: number[][];
  pointLayer?: GraphicsLayer;

  async run() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(<string>prop),
    });

    let start = [-76, 42];
    let zoom = 6;
    if ((<any>params)['default'] === 'true') {
      this.player.activities = [Activities.Activity1, Activities.Activity2];
      start = this.player.activities[0].points[0];
      zoom = 16;
    } else if ((<any>params)['load'] === 'drchhbgmile2022') {
      this.loadGpxFromUrl('Harrisburg_Mile_2022_Ty.gpx');
      this.loadGpxFromUrl('Harrisburg_Mile_2022_Cem.gpx');
      this.loadGpxFromUrl('Harrisburg_Mile_2022_Jim.gpx');
      this.loadGpxFromUrl('Harrisburg_Mile_2022_David.gpx');
      start = [-76.9000680, 40.2786980];
      zoom = 17;
    }

    const map = new Map(
      { basemap: "streets-vector" }
    );

    this.view = new MapView({
      map: map,
      container: 'viewDiv',
      center: start,
      zoom: zoom
    });

    const basemapToggle = new BasemapToggle({
      view: this.view,
      nextBasemap: 'hybrid'
    });
    this.view.ui.add(basemapToggle, "bottom-left");

    this.pointLayer = new GraphicsLayer({});
    map.add(this.pointLayer);

    this.colors = [
      [200, 0, 0],
      [0, 200, 0],
      [0, 0, 200],
      [200, 120, 0],
      [100, 0, 0],
      [0, 100, 0],
      [0, 0, 100],
      [255, 165, 0]
    ];

    document.addEventListener('player-tick', () => {
      this.refresh();
    });

    this.addClickHandler('clear', () => {
      this.player.clearActivities();
      this.refreshActivities();
      this.gaEvent('clear_activities');
    });

    this.addClickHandler('reset', () => {
      this.player.toggleStartPause(true);
      this.player.reset();
      this.gaEvent('reset');
    });

    this.addClickHandler('slower', () => {
      this.player.adjustSpeed(false);
      this.gaEvent('slower');
    });

    this.addClickHandler('faster', () => {
      this.player.adjustSpeed(true);
      this.gaEvent('faster');
    });

    this.addClickHandler('back', () => {
      this.player.goBackward();
      this.gaEvent('back');
    });

    this.addClickHandler('forward', () => {
      this.player.goForward();
      this.gaEvent('forward');
    });

    this.addClickHandler('pause', () => {
      this.player.toggleStartPause(true);
      this.gaEvent('pause');
    });

    this.addClickHandler('start', () => {
      this.player.toggleStartPause(false);
      this.gaEvent('start');
    });

    const centerButton = this.getById('center');
    this.addClickHandler('center', () => {
      if (this.isAutoCenterButtonActive()) {
        centerButton!.classList.remove('active');
      } else {
        centerButton!.classList.add('active');
      }
      this.gaEvent('auto_center');
    });

    this.getById("gpxFile")?.addEventListener('change', () => {
      this.closeModal();
      let reader = new FileReader();
      reader.addEventListener("load", () => {
        this.createActivityFromTextResult(<any>reader.result);
      }, false);
      const files = (this.getById('gpxFile') as HTMLInputElement).files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          reader.readAsText(files[i]);
        }
      }
    });

    this.addClickHandler('activities', (e: MouseEvent) => {
      const element = e.target as HTMLElement;
      if (element.tagName === 'INPUT') {
        const htmlInputElement = element as HTMLInputElement;
        const inputActivityId = htmlInputElement.id.split('-')[1];
        const activitiesFound = this.player.activities.filter(x => x.id === parseInt(inputActivityId));
        if (activitiesFound.length) {
          activitiesFound[0].visible = htmlInputElement.checked;
          this.gaEvent('toggle_visibility');
        }
      }
    });

    this.addClickHandler('close-modal', () => {
      this.closeModal();
    });

    this.addClickHandler('upload-gpx-from-modal', () => {
      this.getById('gpxFile').click();
    });

    this.player.restartTimer();
    this.refresh();

    this.showOrHide('panel', true);

    if (!(<any>params)['load']) {
      this.showModal();
    }
  }

  createActivityFromTextResult(textResult: string) {
    const activity = this.gpxParser.getActivitiesFromResult(textResult);
    const existingIds = this.player.activities?.map(x => x.id || 0);
    const maxId = existingIds.length ? Math.max(...existingIds) : 0;
    activity.id = maxId + 1;
    this.player.activities.push(activity);
    this.player.reset();
    this.refreshActivities();
    this.refresh();
    if (this.player.activities.length === 1) {
      this.center(16);
    }
    this.gaEvent('load_activity');
  };

  loadGpxFromUrl(url: string) {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        const type = request.getResponseHeader('Content-Type');
        if (type?.indexOf("text") !== 1) {
          const text = request.responseText;
          this.createActivityFromTextResult(text);
        }
      }
    }
  }

  enableDisableButtons() {
    const disabled = !this.player.activities.length;
    const buttonIds = ['clear', 'reset', 'back', 'start', 'pause', 'forward', 'center', 'faster', 'slower'];
    for (const buttonId of buttonIds) {
      this.getButtonById(buttonId).disabled = disabled;
    }
  }

  refreshActivities() {
    this.rebuildActivityTable();
    this.enableDisableButtons();
  }

  rebuildActivityTable() {
    let html = '';
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      html += `<tr id="tr-${activity.id}">
                    <td><input type="checkbox" id="toggle-${activity.id}" ${activity.visible ? 'checked' : ''}/></td>
                    <td class="icon"><span style="background-color: rgb(${this.colors![i].join(',')})"></td>
                    <td>${activity.title}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>`;
    }
    html = `<table class="table">
                <thead>
                  <th></th>
                  <th></th>
                  <th>Name</th>
                  <th>Miles</th>
                  <th>Pace</th>
                  <th>Time</th>
                </thhead>
                <tbody>${html}</tboday>
              </table>`;
    (<any>this.getById('activities')).innerHTML = html;
    this.enableDisableButtons();
  };

  setActivityText() {
    for (let i = 0; i < this.player.activities.length; i++) {
      let activity = this.player.activities[i];
      if (activity) {
        const tr = this.getById('tr-' + activity.id?.toString());
        if (tr) {
          if (activity.accumulatedDistance === undefined) {
            activity.accumulatedDistance = 0;
          }
          tr.children[3].innerHTML = activity.accumulatedDistance?.toFixed(2);
          tr.children[4].innerHTML = activity.averagePace || '';

          if (activity.points.length - 1 <= this.player.seconds || !this.player.started) {
            tr.children[5].innerHTML = activity.timeDisplay || '';
          } else {
            tr.children[5].innerHTML = '';
          }
        }
      }
    }
  };

  setSpeedText() {
    this.getById('multiplier').innerHTML = `${this.player.multiplier}`;
  }

  setStartPauseText() {
    this.showOrHide('start', this.player.paused, 'inline-block');
    this.showOrHide('pause', !this.player.paused, 'inline-block');
  }

  setTimeText() {
    const timeElement = document.querySelector<HTMLDivElement>('#time');
    (<any>timeElement).innerHTML = this.player.getMinutesSeconds(this.player.seconds);
  };

  refreshGraphics() {
    this.pointLayer!.removeAll();
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
      const panel = this.getById('panel');
      const mapContainer = this.getById('map-container');
      if (panel && mapContainer) {
        mapContainer.style.height = (window.innerHeight - panel.offsetHeight).toString() + 'px';
      }
    }
  }

  gaEvent(action: string) {
    (<any>window).gtag('event', action);
  }

  refresh() {
    this.refreshGraphics();
    this.setActivityText();
    this.setStartPauseText();
    this.setTimeText();
    this.setSpeedText();
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
        zoom: zoom
      });
    } else {
      (<any>this.view).center = centerFromPlayer;
    }
  }

  isAutoCenterButtonActive() {
    return this.getById('center')?.classList.contains('active');
  }

  showModal() {
    this.getById('modal')?.setAttribute('style', 'display:block');
    this.getById('modal')?.classList.add('show');
    this.getById('modal-backdrop')?.setAttribute('style', 'display:block');
    this.getById('modal-backdrop')?.classList.add('show');
  }

  closeModal() {
    this.getById('modal')?.setAttribute('style', 'display:none');
    this.getById('modal')?.classList.remove('show');
    this.getById('modal-backdrop')?.setAttribute('style', 'display:none');
    this.getById('modal-backdrop')?.classList.remove('show');
  }

}
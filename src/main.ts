import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import { Activities } from "./activities";
import { MapUtils } from "./map-utilities";
import { GPXParser } from "./gpxParser";
import { Player } from "./player";

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

const player = new Player;
const gpxParser = new GPXParser;

player.activities = [Activities.Activity1, Activities.Activity2];
const start = player.activities[0].points[0];

const map = new Map(
    { basemap: "hybrid" }
);

const view = new MapView({
    map: map,
    container: 'viewDiv',
    center: start,
    zoom: 16
});

const basemapToggle = new BasemapToggle({
    view: view,
    nextBasemap: 'streets-vector'
});
view.ui.add(basemapToggle, "bottom-left");

const pointLayer = new GraphicsLayer({});
map.add(pointLayer);

let colors = [
    [200, 0, 0],
    [200, 200, 0],
    [0, 0, 200],
    [200, 0, 200]
];

let setActivityText = () => {
    let html = '';
    for (let i = 0; i < player.activities.length; i++) {
        let activity = player.activities[i];
        if (activity.accumulatedDistance === undefined) {
            activity.accumulatedDistance = 0;
            activity.averagePace = '';
        }
        html += `<tr>
                <td class="icon"><span style="background-color: rgb(${colors[i].join(',')})"></td>
                <td>${activity.title}</td>
                <td>${activity.accumulatedDistance.toFixed(2)}</td>
                <td>${activity.averagePace}</td>
            </tr>`;
    }
    html = `<table class="table">
            <thead>
              <th></th>
              <th>Activity Name</th>
              <th>Miles</th>
              <th>Avg. Pace</th>
            </thhead>
            <tbody>${html}</tboday>
          </table>`;
    (<any>document.getElementById('activities')).innerHTML = html;
};

let setSpeedText = () => {
    const multiplierElement = document.querySelector<HTMLDivElement>('#multiplier');
    (<any>multiplierElement).innerHTML = `${player.multiplier}`;
};

let setStartPauseText = () => {
    document.getElementById('start')?.style.setProperty('display', player.paused ? 'inline-block' : 'none');
    document.getElementById('pause')?.style.setProperty('display', !player.paused ? 'inline-block' : 'none');
};

const setTimeText = () => {
    const timeElement = document.querySelector<HTMLDivElement>('#time');
    (<any>timeElement).innerHTML = player.getMinutesSeconds(player.seconds)
};

let refreshGraphics = () => {
    pointLayer.removeAll();
    for (let i = 0; i < player.activities.length; i++) {
        let activity = player.activities[i];
        if (activity.points?.length > player.seconds) {
            const graphic = MapUtils.getPointGraphic(activity.points[player.seconds], colors[i]);
            pointLayer.add(graphic);
        }
    }
}

let refresh = () => {
    refreshGraphics();
    setActivityText();
    setStartPauseText();
    setTimeText();
    setSpeedText();
}

const center = () => {
    if (player.activities.length && player.activities[0].points.length > player.seconds) {
        (<any>view).center = player.activities[0].points[player.seconds];
    }
    player.calculateDistances();
    refresh();
}

const createActivityFromTextResult = (textResult: any) => {
    var activity = gpxParser.getActivitiesFromResult(textResult);
    player.activities.push(activity);
    player.seconds = 0;
    refresh();
    if (player.activities.length === 1) {
        center();
    }
};

document.addEventListener('player-tick', () => {
    refresh();
});

document.getElementById('clear')?.addEventListener('click', () => {
    player.clearActivities();
    refresh();
});

document.getElementById('reset')?.addEventListener('click', () => {
    player.toggleStartPause(true);
    player.seconds = 0;
    refresh();
});

document.getElementById('slower')?.addEventListener('click', () => {
    player.adjustSpeed(false);
    refresh();
});

document.getElementById('faster')?.addEventListener('click', () => {
    player.adjustSpeed(true);
    refresh();
});

document.getElementById('back')?.addEventListener('click', () => {
    player.seconds = player.seconds - player.multiplier;
    refresh();
});

document.getElementById('forward')?.addEventListener('click', () => {
    player.seconds = player.seconds + player.multiplier;
    refresh();
});

document.getElementById('pause')?.addEventListener('click', () => {
    player.toggleStartPause(true);
    refresh();
});

document.getElementById('start')?.addEventListener('click', () => {
    player.toggleStartPause(false);
    refresh();
});

document.getElementById('center')?.addEventListener('click', () => {
    center();
});

document.getElementById("gpxFile")?.addEventListener('change', () => {
    let reader = new FileReader();
    reader.addEventListener("load", () => {
        createActivityFromTextResult(reader.result);
    }, false);
    const files = (document.getElementById('gpxFile') as HTMLInputElement).files;
    if (files) {
        for (let i = 0; i < files.length; i++) {
            reader.readAsText(files[i]);
        }
    }
});

player.restartTimer();
refresh();

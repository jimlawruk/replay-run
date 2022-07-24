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

const createActivityFromTextResult = (textResult: string) => {
    var activity = gpxParser.getActivitiesFromResult(textResult);
    player.activities.push(activity);
    player.seconds = 0;
    refresh();
    if (player.activities.length === 1) {
        center();
    }
};

const loadGpxFromUrl = (url: string) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.send(null);
    request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status === 200) {
            const type = request.getResponseHeader('Content-Type');
            if (type?.indexOf("text") !== 1) {
                const text = request.responseText;
                createActivityFromTextResult(text);
            }
        }
    }
}

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(<string>prop),
});

let start = [-76, 42];
let zoom = 6;
if ((<any>params)['default'] === 'true') {
    player.activities = [Activities.Activity1, Activities.Activity2];
    start = player.activities[0].points[0];
    zoom = 16;
} else if ((<any>params)['load'] === 'drchhbgmile2022') {
    loadGpxFromUrl('Harrisburg_Mile_2022_Ty.gpx');
    loadGpxFromUrl('Harrisburg_Mile_2022_Cem.gpx');
    loadGpxFromUrl('Harrisburg_Mile_2022_Jim.gpx');
    loadGpxFromUrl('Harrisburg_Mile_2022_David.gpx');
    start = [-76.9000680, 40.2786980];
    zoom = 17;
}

const map = new Map(
    { basemap: "hybrid" }
);

const view = new MapView({
    map: map,
    container: 'viewDiv',
    center: start,
    zoom: zoom
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
    [0, 200, 0]
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

const resizeMap = () => {
    if (window.innerWidth < 500) {
        const panel = document.getElementById('panel');
        const mapContainer = document.getElementById('map-container');
        if (panel && mapContainer) {
            mapContainer.style.height = (window.innerHeight - panel.offsetHeight).toString() + 'px';
        }
    }
}

let refresh = () => {
    refreshGraphics();
    setActivityText();
    setStartPauseText();
    setTimeText();
    setSpeedText();
    if (isAutoCenterButtonActive()) {
        center();
    }
    resizeMap();
}

const center = () => {
    const centerFromPlayer = player.getCenter();
    if (centerFromPlayer) {
        (<any>view).center = centerFromPlayer;
    }
}

const isAutoCenterButtonActive = () => {
    return document.getElementById('center')?.classList.contains('active');
}

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

const centerButton = document.getElementById('center');
centerButton?.addEventListener('click', () => {
    if (isAutoCenterButtonActive()) {
        centerButton.classList.remove('active');
    } else {
        centerButton.classList.add('active');
    }
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

document.getElementById('panel')?.setAttribute('style', 'display:block');
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
    const activity = gpxParser.getActivitiesFromResult(textResult);
    const existingIds = player.activities?.map(x => x.id || 0);
    const maxId = existingIds.length ? Math.max(...existingIds) : 0;
    activity.id = maxId + 1;
    player.activities.push(activity);
    player.reset();
    refreshActivities();
    refresh();
    if (player.activities.length === 1) {
        center(16);
    }
    gaEvent('load_activity');
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
    { basemap: "streets-vector" }
);

const view = new MapView({
    map: map,
    container: 'viewDiv',
    center: start,
    zoom: zoom
});

const basemapToggle = new BasemapToggle({
    view: view,
    nextBasemap: 'hybrid'
});
view.ui.add(basemapToggle, "bottom-left");

const pointLayer = new GraphicsLayer({});
map.add(pointLayer);

let colors = [
    [200, 0, 0],
    [0, 200, 0],
    [0, 0, 200],
    [200, 120, 0],
    [100, 0, 0],
    [0, 100, 0],
    [0, 0, 100],
    [255, 165, 0]
];

let getButton = (id: string): HTMLButtonElement => {
    return (<HTMLButtonElement>document.getElementById(id));
};

let enableDisableButtons = () => {
    const disabled = !player.activities.length;
    const buttonIds = ['clear', 'reset', 'back', 'start', 'pause', 'forward', 'center', 'faster', 'slower'];
    for (const buttonId of buttonIds) {
        getButton(buttonId).disabled = disabled;
    }
}

let refreshActivities = () => {
    rebuildActivityTable();
    enableDisableButtons();
}

let rebuildActivityTable = () => {
    let html = '';
    for (let i = 0; i < player.activities.length; i++) {
        let activity = player.activities[i];
        html += `<tr id="tr-${activity.id}">
                <td><input type="checkbox" id="toggle-${activity.id}" ${activity.visible ? 'checked' : ''}/></td>
                <td class="icon"><span style="background-color: rgb(${colors[i].join(',')})"></td>
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
    (<any>document.getElementById('activities')).innerHTML = html;
    enableDisableButtons();
};

let setActivityText = () => {
    for (let i = 0; i < player.activities.length; i++) {
        let activity = player.activities[i];
        if (activity) {
            const tr = document.getElementById('tr-' + activity.id?.toString());
            if (tr) {
                if (activity.accumulatedDistance === undefined) {
                    activity.accumulatedDistance = 0;
                }
                tr.children[3].innerHTML = activity.accumulatedDistance?.toFixed(2);
                tr.children[4].innerHTML = activity.averagePace || '';

                if (activity.points.length - 1 <= player.seconds || !player.started) {
                    tr.children[5].innerHTML = activity.timeDisplay || '';
                } else {
                    tr.children[5].innerHTML = '';
                }
            }
        }
    }
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
    (<any>timeElement).innerHTML = player.getMinutesSeconds(player.seconds);
};

let refreshGraphics = () => {
    pointLayer.removeAll();
    for (let i = 0; i < player.activities.length; i++) {
        let activity = player.activities[i];
        if (activity.visible && activity.points?.length > player.seconds) {
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

const gaEvent = (action: string) => {
    (<any>window).gtag('event', action);
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

const center = (zoom?: number) => {
    const centerFromPlayer = player.getCenter();
    if (zoom) {
        (<any>view).goTo({
            center: centerFromPlayer,
            zoom: zoom
        });
    } else {
        (<any>view).center = centerFromPlayer;
    }
}

const isAutoCenterButtonActive = () => {
    return document.getElementById('center')?.classList.contains('active');
}

const showModal = () => {
    document.getElementById('modal')?.setAttribute('style', 'display:block');
    document.getElementById('modal')?.classList.add('show');
    document.getElementById('modal-backdrop')?.setAttribute('style', 'display:block');
    document.getElementById('modal-backdrop')?.classList.add('show');
}

const closeModal = () => {
    document.getElementById('modal')?.setAttribute('style', 'display:none');
    document.getElementById('modal')?.classList.remove('show');
    document.getElementById('modal-backdrop')?.setAttribute('style', 'display:none');
    document.getElementById('modal-backdrop')?.classList.remove('show');
}

document.addEventListener('player-tick', () => {
    refresh();
});

document.getElementById('clear')?.addEventListener('click', () => {
    player.clearActivities();
    refreshActivities();
    refresh();
    gaEvent('clear_activities');
});

document.getElementById('reset')?.addEventListener('click', () => {
    player.toggleStartPause(true);
    player.reset();
    refresh();
    gaEvent('reset');
});

document.getElementById('slower')?.addEventListener('click', () => {
    player.adjustSpeed(false);
    refresh();
    gaEvent('slower');
});

document.getElementById('faster')?.addEventListener('click', () => {
    player.adjustSpeed(true);
    refresh();
    gaEvent('faster');
});

document.getElementById('back')?.addEventListener('click', () => {
    player.goBackward();
    refresh();
    gaEvent('back');
});

document.getElementById('forward')?.addEventListener('click', () => {
    player.goForward();
    refresh();
    gaEvent('forward');
});

document.getElementById('pause')?.addEventListener('click', () => {
    player.toggleStartPause(true);
    refresh();
    gaEvent('pause');
});

document.getElementById('start')?.addEventListener('click', () => {
    player.toggleStartPause(false);
    refresh();
    gaEvent('start');
});

const centerButton = document.getElementById('center');
centerButton?.addEventListener('click', () => {
    if (isAutoCenterButtonActive()) {
        centerButton.classList.remove('active');
    } else {
        centerButton.classList.add('active');
    }
    gaEvent('auto_center');
});

document.getElementById("gpxFile")?.addEventListener('change', () => {
    closeModal();
    let reader = new FileReader();
    reader.addEventListener("load", () => {
        createActivityFromTextResult(<any>reader.result);
    }, false);
    const files = (document.getElementById('gpxFile') as HTMLInputElement).files;
    if (files) {
        for (let i = 0; i < files.length; i++) {
            reader.readAsText(files[i]);
        }
    }
});

document.getElementById('activities')?.addEventListener('click', (e: MouseEvent) => {
    const element = e.target as HTMLElement;
    if (element.tagName === 'INPUT') {
        const htmlInputElement = element as HTMLInputElement;
        const inputActivityId = htmlInputElement.id.split('-')[1];
        const activitiesFound = player.activities.filter(x => x.id === parseInt(inputActivityId));
        if (activitiesFound.length) {
            activitiesFound[0].visible = htmlInputElement.checked;
                refresh();
            gaEvent('toggle_visibility');
            }
        }
});

document.getElementById('close-modal')?.addEventListener('click', (e: MouseEvent) => {
    closeModal();
});

document.getElementById('upload-gpx-from-modal')?.addEventListener('click', (e: MouseEvent) => {
    document.getElementById('gpxFile')?.click();
});

player.restartTimer();
refresh();

document.getElementById('panel')?.setAttribute('style', 'display:block');

if (!(<any>params)['load']) {
    showModal();
}
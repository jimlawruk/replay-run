import { Activity } from "./models";

export class GPXParser {

    domParser = new DOMParser();

    getActivitiesFromResult(fileText: string): Activity {
        const xmlDoc = this.domParser.parseFromString(fileText, 'text/xml');
        const trkPoints = xmlDoc.getElementsByTagName('trkpt');
        const longLatArray: Array<Array<number>> = [];
        let intervalTime = 1;
        const intervalTimeElements = xmlDoc.getElementsByTagName('intervalTime');
        if (intervalTimeElements.length > 0) {
            intervalTime = parseInt(intervalTimeElements[0].innerHTML);
        }
        let title = xmlDoc.getElementsByTagName('name')[0].innerHTML;
        for (let i = 0; i < trkPoints.length; i++) {
            const lon = this.getFloatVal(trkPoints[i], 'lon');
            const lat = this.getFloatVal(trkPoints[i], 'lat');
            if (i === 0) {
                longLatArray.push([lon, lat]);
            } else {
                for (let j = 0; j < intervalTime; j++) {
                    longLatArray.push([lon, lat]);
                }
            }
        }
        return { title: title, points: longLatArray, visible: true };
    }

    getFloatVal(element: Element, key: string) {
        const value = this.getAttrVal(element, key);
        return parseFloat(value);
    }

    getAttrVal(element: Element, key: string): string {
        return element.attributes.getNamedItem(key)?.value || '';
    }

}
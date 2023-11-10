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
        let previousTime: Date | null = null;
        let previousLonLat: Array<number> | null = null;
        for (let i = 0; i < trkPoints.length; i++) {
            const lon = this.getFloatVal(trkPoints[i], 'lon');
            const lat = this.getFloatVal(trkPoints[i], 'lat');
            const currentLonLat = [lon, lat];
            const time = this.getTimeVal(trkPoints[i]);
            if (previousTime && time) {
                intervalTime = (time!.valueOf() - previousTime!.valueOf()) / 1000;
            }
            if (i === 0) {
                longLatArray.push([lon, lat]);
            } else {
                const derivedLonLats = this.getDerivedLatLongs(previousLonLat!, currentLonLat, intervalTime);
                for (let j = 0; j < derivedLonLats.length; j++) {
                    longLatArray.push(derivedLonLats[j]);
                }
            }
            previousTime = time;
            previousLonLat = [lon, lat];
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

    getTimeVal(element: Element): Date | null {
        const timeValue = this.getChildElementValue(element, "time");
        if (timeValue) {
            return new Date(timeValue);
        }
        return null;
    }

    getChildElementValue(element: Element, key: string): string | null {
        let i = 0;
        for (i = 0; i < element.childNodes.length; i++) {
            let node = element.childNodes[i];
            if (node.nodeName === key) {
                return (<any>node).innerHTML;
            }
        }
        return null;
    }

    getDerivedLatLongs(previousLonLat: Array<number>, currentLonLat: Array<number>, intervalTime: number) {
        const longLatArray: Array<Array<number>> = [];
        const longSequence = this.getSequenceOfNumbers(previousLonLat[0], currentLonLat[0], intervalTime);
        const latSequence = this.getSequenceOfNumbers(previousLonLat[1], currentLonLat[1], intervalTime);
        for (let j = 0; j < intervalTime; j++) {
            longLatArray.push([longSequence[j], latSequence[j]]);
        }
        return longLatArray;
    }

    getSequenceOfNumbers(start: number, end: number, count: number) {
        const totalDiff = end - start;
        const average = totalDiff / count;
        let i;
        const sequence: Array<number> = [];
        for (i = 1; i <= count; i++) {
            const newValue = start + (average * i);
            sequence.push(newValue);
        }
        return sequence;
    }

}
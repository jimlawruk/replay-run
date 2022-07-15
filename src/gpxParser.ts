import { Activity } from "./models";

export class GPXParser {

    getActivitiesFromResult(fileText: string): Activity {
        const lines: string[] = fileText.split('\n');
        const longLatArray: Array<Array<number>> = [];
        let title = 'New Activity';
        for (const line of lines) {
            if (line.indexOf('<trkpt lat="') >= 0) {
                const values = line.trim().replace('<trkpt lat="', '').replace('" lon="', ',').replace('">', '').split(',');
                longLatArray.push([parseFloat(values[1]), parseFloat(values[0])]);
            } else if (line.indexOf('<name>') >= 0) {
                title = line.replace('<name>', '').replace('</name>', '').trim();
            }
        }
        return { title: title, points: longLatArray }
    }

}
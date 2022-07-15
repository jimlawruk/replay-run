import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Point from "@arcgis/core/geometry/Point";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

export class MapUtils {

    static getPointLayer(colorArray: Array<number>, pointsArray: Array<Array<number>>) {
        const graphics = [];
        for (let i = 0; i < pointsArray.length; i++) {
            const pointArray = pointsArray[i];
            let point = new Point({
                'longitude': pointArray[1],
                'latitude': pointArray[0],
                'spatialReference': new SpatialReference({ 'wkid': 4326 })
            });

            const graphicDefinition = {
                geometry: point,
                symbol: this.getPointSymbol(colorArray),
                attributes: {},
                popupTemplate: {
                    title: "Segment",
                    content: [{
                        type: "fields",
                        fieldInfos: []
                    }]
                }
            };
            const pointGraphic = new Graphic(graphicDefinition);
            graphics.push(pointGraphic);
        }
        const pointLayer = new GraphicsLayer({});
        graphics.forEach(function (graphic) {
            pointLayer.add(graphic);
        });
        return pointLayer;
    }

    static getPointSymbol(colorArray: Array<number>) {
        return {
            type: "simple-marker",
            color: colorArray,
            size: 8,
            outline: {
                color: colorArray,
                width: 2
            }
        };
    }

    static getPointGraphicDefinition(pointArray: Array<number>, colorArray: Array<number>) {
        let point = new Point({
            'longitude': pointArray[0],
            'latitude': pointArray[1],
            'spatialReference': new SpatialReference({ 'wkid': 4326 })
        });
        const graphicDefinition = {
            geometry: point,
            symbol: this.getPointSymbol(colorArray),
            attributes: {},
            popupTemplate: {
                title: "Segment",
                content: [{
                    type: "fields",
                    fieldInfos: []
                }]
            }
        };
        return graphicDefinition;
    }

    static getPointGraphic(pointArray: Array<number>, colorArray: Array<number>) {
        const graphicDefinition = this.getPointGraphicDefinition(pointArray, colorArray);
        return new Graphic(graphicDefinition);
    }
}
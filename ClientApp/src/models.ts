export interface Activity {
    id?: number;
    title?: string;
    points: number[][];
    lastTimeUsedForDistance?: number;
    accumulatedDistance?: number;
    pace?: number;
    averagePace?: string;
    timeDisplay?: string;
    visible?: boolean;
}
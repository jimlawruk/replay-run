export interface Activity {
    title?: string;
    points: number[][];
    lastTimeUsedForDistance?: number;
    accumulatedDistance?: number;
    pace?: number;
    averagePace?: string;
    timeDisplay?: string;
}
import { Activity } from "./models";

export class Player {

    activities: Activity[] = [];
    multiplier: number = 10;
    seconds: number = 0;
    timerEventName: string = 'player-tick';
    timerEvent: Event = new Event(this.timerEventName);
    timer: any = null;
    paused: boolean = true;
    done: boolean = false;

    clearActivities() {
        this.activities.length = 0;
        this.toggleStartPause(true);
        this.seconds = 0;
    }

    restartTimer() {
        if (!this.paused) {
            if (this.timer) {
                clearInterval(this.timer);
            }
            this.timer = setInterval(() => {
                const lengths = this.activities.map(x => x.points.length);
                const maxSecondsOfAnyActivity = Math.max.apply(Math, lengths);
                this.done = this.seconds >= maxSecondsOfAnyActivity;
                if (!this.done) {
                    this.seconds++;
                } else {
                    this.paused = true;
                }
                if (this.seconds % 10 === 0) {
                    this.calculateDistances();
                }
                document.dispatchEvent(this.timerEvent);
                if (this.done) {
                    clearInterval(this.timer);
                }
            }, 1000 / this.multiplier);
        }
    }

    toggleStartPause(setToPause?: boolean) {
        if (setToPause === undefined) {
            this.paused = !this.paused;
        } else {
            this.paused = setToPause;
        }

        if (this.timer) {
            clearInterval(this.timer);
        }
        this.restartTimer();
    }

    adjustSpeed(add: boolean) {
        let multiplier = this.multiplier;
        if (add) {
            if (multiplier >= 50) {
                multiplier = multiplier + 10;
            }
            else if (multiplier >= 10) {
                multiplier = multiplier + 5;
            } else {
                multiplier++;
            }
        } else
            if (multiplier > 50) {
                multiplier = multiplier - 5;
            }
            else if (multiplier > 10) {
                multiplier = multiplier - 5;
            } else if (multiplier > 1) {
                multiplier--;
            } else {
                multiplier = 1;
            }
        this.multiplier = multiplier;
        this.restartTimer();
    }

    getCenter() {
        let ySum: number = 0;
        let xSum: number = 0;
        let count: number = 0;
        for (let i = 0; i < this.activities.length; i++) {
            if (this.activities.length && this.activities[i].points.length > this.seconds) {
                ySum += this.activities[i].points[this.seconds][0];
                xSum += this.activities[i].points[this.seconds][0];
                count++;
            }
        }
        if (count) {
            return [ySum / count, xSum / count];
        } else {
            return null;
        }
    }

    calculateDistances() {
        for (let i = 0; i < this.activities.length; i++) {
            let activity = this.activities[i];
            activity.accumulatedDistance = 0;
            for (let t = 1; t < this.seconds; t++) {
                if (activity.points.length > t) {
                    const lastPoint = activity.points[t - 1];
                    const currentPoint = activity.points[t];
                    activity.accumulatedDistance += this.getMiles(this.calcCrow(lastPoint[1], lastPoint[0], currentPoint[1], currentPoint[0]));
                }
            }
            activity.averagePace = this.getAveragePace(this.seconds, activity.accumulatedDistance);
        }
    }

    toRad(value: number) {
        return value * Math.PI / 180;
    }

    calcCrow(lat1: number, lon1: number, lat2: number, lon2: number) {
        var R = 6371; // km
        var dLat = this.toRad(lat2 - lat1);
        var dLon = this.toRad(lon2 - lon1);
        var lat1 = this.toRad(lat1);
        var lat2 = this.toRad(lat2);

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }

    getMiles(km: number) {
        return km * 0.621371192;
    }

    getMinutesSeconds(totalSeconds: number) {
        const hours = Math.floor(totalSeconds / 3600);
        let minutesSeconds = totalSeconds;
        if (hours > 0) {
            minutesSeconds = minutesSeconds - (hours * 3600);
        }
        const minutes = Math.floor(minutesSeconds / 60);
        const seconds = totalSeconds - minutes * 60;
        const hoursText = hours > 0 ? hours.toString() + ':' : '';
        return `${hoursText}${this.getPaddedValue(minutes)}:${this.getPaddedValue(seconds)}`;
    }

    getAveragePace(totalSeconds: number, distance: number) {
        const averagePace = totalSeconds / distance / 60;
        const minutes = Math.trunc(averagePace);
        const seconds = Math.trunc((averagePace - minutes) * 60);
        return `${this.getPaddedValue(minutes)}:${this.getPaddedValue(seconds)}`;
    }

    getPaddedValue(value: number) {
        return ('00' + value).slice(-2);
    }

}
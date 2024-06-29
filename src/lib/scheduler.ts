// This is a variant of Anki's algorithm which is based on the SM-2 algorithm.
// Pulled from this plugin:
// https://github.com/st3v3nmw/obsidian-spaced-repetition/blob/master/src/scheduling.ts

import { SRSettings } from "./settings";

export enum ReviewResponse {
    Easy,
    Good,
    Hard,
    Again,
}

// Flashcards

export function schedule(
    response: ReviewResponse,
    interval: number,
    ease: number,
    delayBeforeReview: number,
    settingsObj: SRSettings,
    dueDates?: Record<number, number>,
): Record<string, number> {
    delayBeforeReview = Math.max(0, Math.floor(delayBeforeReview / (24 * 3600 * 1000)));

    if (response === ReviewResponse.Easy) {
        ease += 20;
        interval = ((interval + delayBeforeReview) * ease) / 100;
        interval *= settingsObj.easyBonus;
    } else if (response === ReviewResponse.Good) {
        interval = ((interval + delayBeforeReview / 2) * ease) / 100;
    } else if (response === ReviewResponse.Hard) {
        ease = Math.max(130, ease - 20);
        interval = Math.max(
            1,
            (interval + delayBeforeReview / 4) * settingsObj.lapsesIntervalChange,
        );
    } else if (response === ReviewResponse.Again) {
        ease = Math.max(130, ease - 20);
        interval = 0;
    } 

    // replaces random fuzz with load balancing over the fuzz interval
    if (dueDates !== undefined) {
        interval = Math.round(interval);
        if (!Object.prototype.hasOwnProperty.call(dueDates, interval)) {
            dueDates[interval] = 0;
        } else {
            // disable fuzzing for small intervals
            if (interval > 4) {
                let fuzz = 0;
                if (interval < 7) fuzz = 1;
                else if (interval < 30) fuzz = Math.max(2, Math.floor(interval * 0.15));
                else fuzz = Math.max(4, Math.floor(interval * 0.05));

                const originalInterval = interval;
                outer: for (let i = 1; i <= fuzz; i++) {
                    for (const ivl of [originalInterval - i, originalInterval + i]) {
                        if (!Object.prototype.hasOwnProperty.call(dueDates, ivl)) {
                            dueDates[ivl] = 0;
                            interval = ivl;
                            break outer;
                        }
                        if (dueDates[ivl] < dueDates[interval]) interval = ivl;
                    }
                }
            }
        }

        dueDates[interval]++;
    }

    interval = Math.min(interval, settingsObj.maximumInterval);

    return { interval: Math.round(interval * 10) / 10, ease };
}

export function textInterval(interval: number): string {
    if (interval === undefined) {
        return "New";
    }

    const days: number = Math.round(interval);
    const hours: number = Math.round(interval);
    const minutes: number = Math.round(interval * 525600);

    const months: number = Math.round(interval / 3.04375) / 10;
    const years: number = Math.round(interval / 36.525) / 10;

    if (minutes <= 1) return `< 1 minute`;
    if (minutes < 60) return `${minutes} minutes`;
    else if (hours === 1) return `1 hour`;
    else if (hours < 24) return `${hours} hours`;
    else if (days === 1) return `1 day`;
    else if (days < 30) return `${days} days`;
    else if (months === 1.0) return `1 month`;
    else if (years < 1.0) return `${months} months`;
    else if (years === 1.0) return `1 year`;
    else return `${years} years`;
}
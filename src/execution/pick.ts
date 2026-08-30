import {RegionInstance} from "../state/RegionInstance";

export function pick_regions(locations: Record<string, RegionInstance>): RegionInstance[] {
    return Object.values(locations);
}

/**
 * Randomly select from the given options.
 * @param options The options to select from.
 * @param number_to_pick How many options to pick.
 * @param replace_after_pick If options remain in the pool after being picked, allowing them to be picked multiple times.
 */
export function pick_random<T>(options: T[], number_to_pick: number = 1, replace_after_pick: boolean = false): T[] {
    if (number_to_pick <= 0 || options.length === 0) {
        return [];
    }

    if (replace_after_pick) {
        return Array.from({length: number_to_pick}, () => {
            const index = Math.floor(Math.random() * options.length);
            return options[index];
        });
    }

    const pool = [...options];
    for (let index = pool.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
    }

    return pool.slice(0, Math.min(number_to_pick, pool.length));
}
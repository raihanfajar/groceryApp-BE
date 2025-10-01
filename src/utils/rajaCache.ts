// src/utils/rajaCache.ts
import nodePersist from 'node-persist';

let initDone = false;

export const rajaCache = {
    async init() {
        if (initDone) return;
        await nodePersist.init({
            dir: './cache',
            ttl: false,
            stringify: JSON.stringify,
            parse: JSON.parse,
        });
        initDone = true;
    },

    has(key: string) {
        return nodePersist.getItem(key).then((v) => v !== undefined);
    },

    get(key: string) {
        return nodePersist.getItem(key);
    },

    set(key: string, value: any) {
        return nodePersist.setItem(key, value);
    },
};
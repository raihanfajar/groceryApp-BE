// src/utils/rajaCache.ts
import nodePersist from 'node-persist';

let initDone = false;

export const rajaCache = {
    async init() {
        if (initDone) return;
        await nodePersist.init({
            dir: process.env.NODE_ENV === 'production' ? '/tmp/cache' : './cache',
            ttl: false,
            stringify: JSON.stringify,
            parse: JSON.parse,
            expiredInterval: 2 * 60 * 1000, // Check expired items every 2 minutes
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
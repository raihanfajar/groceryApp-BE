// rajongRequests.ts
let provincesCache: { ts: number; data: any[] } | null = null;
const citiesCache = new Map<number, { ts: number; data: any[] }>();
const districtsCache = new Map<number, { ts: number; data: any[] }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const withCache = async <T>(
    cacheKey: { ts: number; data: T[] } | null,
    loadFn: () => Promise<T[]>
) => {
    if (cacheKey && Date.now() - cacheKey.ts < CACHE_TTL_MS) return cacheKey.data;
    const data = await loadFn();
    return data;
};

export const getProvinceIdFromRajaOngkir = async () => {
    if (provincesCache && Date.now() - provincesCache.ts < CACHE_TTL_MS) {
        return provincesCache.data;
    }
    const res = await fetch("https://rajaongkir.komerce.id/api/v1/destination/province/", {
        method: "GET",
        headers: {
            key: process.env.RAJA_ONGKIR_API_KEY as string,
        },
    });
    if (!res.ok) throw new Error("Failed to fetch provinces");
    const response = await res.json() as { data: any[] };
    provincesCache = { ts: Date.now(), data: response.data };
    return response.data;
};

export const getCityIdByProvinceIdFromRajaOngkir = async (provinceId: number) => {
    const cached = citiesCache.get(provinceId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

    const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`, {
        method: "GET",
        headers: {
            key: process.env.RAJA_ONGKIR_API_KEY as string,
        },
    });
    if (!res.ok) throw new Error("Failed to fetch cities");
    const response = await res.json() as { data: any[] };
    citiesCache.set(provinceId, { ts: Date.now(), data: response.data });
    return response.data;
};

export const getDistrictIdByCityIdFromRajaOngkir = async (cityId: number) => {
    const cached = districtsCache.get(cityId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

    const res = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`, {
        method: "GET",
        headers: {
            key: process.env.RAJA_ONGKIR_API_KEY as string,
        },
    });
    if (!res.ok) throw new Error("Failed to fetch districts");
    const response = await res.json() as { data: any[] };
    districtsCache.set(cityId, { ts: Date.now(), data: response.data });
    return response.data;
};

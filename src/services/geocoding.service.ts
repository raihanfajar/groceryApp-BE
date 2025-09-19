import { ApiError } from "../utils/ApiError";

export const rgcService = async (lat: string, lon: string) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    // console.log(`lat: ${lat}, lon: ${lon}`);

    const r = await fetch(url, {
        headers: { "User-Agent": "FreshNear/1.0 (fnsupport@gmail.com)" }
    });

    if (!r.ok) throw new ApiError(404, "Nominatim Error");

    return r.json();
}

export const fgcService = async (q: string, limit: string | undefined) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${limit ?? 5}&countrycodes=id`;

    const r = await fetch(url, {
        headers: { "User-Agent": "FreshNear/1.0 (fnsupport@gmail.com)" },
    });

    if (!r.ok) throw new ApiError(404, "Nominatim Error");

    return r.json();
};
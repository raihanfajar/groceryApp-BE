// getLocationIdsFromNominatim.ts
import {
    getProvinceIdFromRajaOngkir,
    getCityIdByProvinceIdFromRajaOngkir,
    getDistrictIdByCityIdFromRajaOngkir,
} from "./rajongRequests";

const normalize = (raw?: string) => {
    if (!raw) return "";
    return raw
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")   // remove diacritics
        .replace(/\(.*?\)/g, "")           // remove parentheses and contents
        .replace(/\bKABUPATEN\b|\bKAB\b|\bKOTA\b/gi, "") // remove kab/kabupaten/kota
        .replace(/[.\-_/\\,]/g, " ")       // replace punctuation with space
        .replace(/[^A-Z0-9 ]/g, "")        // keep alphanum + space
        .replace(/\s+/g, " ")              // collapse multiple spaces
        .trim();
};

const tolerantMatch = (candidate: string, target: string) => {
    if (!candidate || !target) return false;
    // Both normalized
    const a = normalize(candidate);
    const b = normalize(target);
    if (!a || !b) return false;
    // direct includes both ways
    if (a === b || a.includes(b) || b.includes(a)) return true;
    // try removing common suffixes like "REGENCY", "CITY" (if present in the dataset)
    const cleanup = (s: string) => s.replace(/\b(REGENCY|CITY|PROVINCE)\b/g, "").trim();
    const ca = cleanup(a);
    const cb = cleanup(b);
    return ca === cb || ca.includes(cb) || cb.includes(ca);
};

export const getLocationIdsFromNominatim = async (
    provinceName?: string | null,
    cityName?: string | null,
    districtName?: string | null
) => {
    // return null IDs by default
    let provinceId: number | null = null;
    let cityId: number | null = null;
    let districtId: number | null = null;

    try {
        if (!provinceName) {
            return { provinceId, cityId, districtId };
        }

        // 1) Province
        const provinces = await getProvinceIdFromRajaOngkir();
        const nProvince = normalize(provinceName);
        const province = provinces.find((p: any) =>
            tolerantMatch(p.name, nProvince)
        );
        if (!province) {
            // try looser search: find by acronym inside parentheses in rajaongkir name
            const byAcronym = provinces.find((p: any) => {
                const acrMatch = p.name.match(/\((.*?)\)/);
                if (acrMatch?.[1]) {
                    return normalize(acrMatch[1]) === nProvince || nProvince.includes(normalize(acrMatch[1]));
                }
                return false;
            });
            if (byAcronym) {
                provinceId = byAcronym.id;
            } else {
                // fails: return with null ids (caller can decide)
                return { provinceId: null, cityId: null, districtId: null };
            }
        } else {
            provinceId = province.id;
        }

        // 2) City (if we have provinceId and cityName)
        if (provinceId && cityName) {
            const cities = await getCityIdByProvinceIdFromRajaOngkir(provinceId);
            const nCity = normalize(cityName);
            const city = cities.find((c: any) => tolerantMatch(c.name, nCity));
            if (city) {
                cityId = city.id;
            } else {
                // try partial matches (remove "KAB"/"KOTA" already done by normalize)
                const fallback = cities.find((c: any) => normalize(c.name).includes(nCity) || nCity.includes(normalize(c.name)));
                if (fallback) cityId = fallback.id;
            }
        }

        // 3) District (if we have cityId and districtName)
        if (cityId && districtName) {
            const districts = await getDistrictIdByCityIdFromRajaOngkir(cityId);
            const nDistrict = normalize(districtName);
            const district = districts.find((d: any) => tolerantMatch(d.name, nDistrict));
            if (district) {
                districtId = district.id;
            } else {
                const fallback = districts.find((d: any) => normalize(d.name).includes(nDistrict) || nDistrict.includes(normalize(d.name)));
                if (fallback) districtId = fallback.id;
            }
        }

        return { provinceId, cityId, districtId };
    } catch (err) {
        // swallow and return  ids (caller can log)
        console.warn("getLocationIdsFromNominatim error", err);
        return { provinceId: null, cityId: null, districtId: null };
    }
};

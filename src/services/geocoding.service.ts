import prisma from "../config";
import { getLocationIdsFromNominatim } from "../helper/getLocationIdsFromNominatim";
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

interface IaddNewUserAddress {
    userId: string;
    addressLabel: string;
    receiverName: string;
    receiverPhoneNumber: string;
    addressDisplayName: string;
    addressDetails: string;
    lat: number;
    lon: number;
    isDefault: boolean;
}

export const addNewUserAddressService = async (body: IaddNewUserAddress, userId: string) => {
    const { addressLabel, receiverName, receiverPhoneNumber, addressDetails, lat, lon, isDefault, } = body;
    // TODO: PROVINCE, CITY, DISTRICT --- CHECK RAJAONGKIR API

    const rgcResponse = await rgcService(lat.toString(), lon.toString()).then((res) => res);


    // !Extra validation
    const existingAddress = await prisma.userAddress.findFirst({ where: { userId, addressLabel } });
    if (existingAddress) throw new ApiError(409, "Address label already in use");

    // !Determining address level
    // Province level
    const provinceLevel =
        rgcResponse?.address?.state ??
        rgcResponse?.address?.region ??
        rgcResponse?.address?.province ??
        rgcResponse?.address?.county ?? "This precise location has no province";

    // City level
    const cityLevel =
        rgcResponse?.address?.city ??
        rgcResponse?.address?.town ??
        rgcResponse?.address?.municipality ??
        rgcResponse?.address?.village ??
        "This precise location has no city";

    // District / Subdistrict level
    const districtLevel =
        rgcResponse?.address?.city_district ??
        rgcResponse?.address?.suburb ??
        rgcResponse?.address?.neighbourhood ??
        "This precise location has no district";

    console.log(rgcResponse);
    console.log(provinceLevel?.toUpperCase());
    console.log(cityLevel?.toUpperCase());
    console.log(districtLevel?.toUpperCase());

    // !Get location ids
    const { provinceId, cityId, districtId } = await getLocationIdsFromNominatim(provinceLevel, cityLevel, districtLevel);
    console.log(provinceId, cityId, districtId);

    //  !Add new address
    const newAddress = await prisma.userAddress.create({
        data: {
            userId,
            addressLabel,
            receiverName,
            receiverPhoneNumber,
            addressDisplayName: rgcResponse.display_name,
            addressDetails,
            lat,
            lon,
            isDefault,
            province: provinceLevel?.toUpperCase(),
            provinceId: provinceId ?? 1,
            city: cityLevel?.toUpperCase(),
            cityId: cityId ?? 1,
            district: districtLevel?.toUpperCase(),
            districtId: districtId ?? 1,
        },
    })

    // !Return
    return newAddress;
}

export const getUserAddressService = async (userId: string) => {
    const address = await prisma.users.findUnique({ where: { id: userId }, include: { addresses: true } });
    if (!address) throw new ApiError(404, "User Address not found");

    // !Return
    return address;
}
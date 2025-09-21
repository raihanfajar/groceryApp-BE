import prisma from "../config";
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
    province: string;
    provinceId: number;
    city: string;
    cityId: number;
    district: string;
    districtId: number;
}

export const addNewUserAddressService = async (body: IaddNewUserAddress, userId: string) => {
    const { addressLabel, receiverName, receiverPhoneNumber, addressDetails, lat, lon, isDefault, province, provinceId = 1, city, cityId = 1, district, districtId = 1 } = body;
    // TODO: PROVINCE, CITY, DISTRICT --- CHECK RAJAONGKIR API

    const rgcResponse = await rgcService(lat.toString(), lon.toString()).then((res) => res);

    console.log(rgcResponse?.address?.city);
    console.log(rgcResponse?.address?.state);
    console.log(rgcResponse?.address?.city_district);

    // !Extra validation
    const existingAddress = await prisma.userAddress.findFirst({ where: { userId, addressLabel } });
    if (existingAddress) throw new ApiError(409, "Address label already in use");

    //    !Add new address
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
            province: rgcResponse?.address?.state || "This precise location has no province",
            provinceId,
            city: rgcResponse?.address?.city || "This precise location has no city",
            cityId,
            district: rgcResponse?.address?.city_district || "This precise location has no district",
            districtId
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
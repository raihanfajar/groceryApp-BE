import { ApiError } from "../utils/ApiError";
import prisma from "../config";


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
    district: string;
    city: string;
    province: string;
    districtId: number;
    cityId: number;
    provinceId: number;
}

export const addNewUserAddressService = async (body: IaddNewUserAddress, userId: string) => {
    const { addressLabel, receiverName, receiverPhoneNumber, addressDetails, lat, lon, isDefault, district, city, province, districtId, cityId, provinceId } = body;

    const addressDisplayName = await rgcService(lat.toString(), lon.toString()).then((res) => res.display_name);

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
            addressDisplayName,
            addressDetails,
            lat,
            lon,
            isDefault,
            district,
            city,
            province,
            districtId,
            cityId,
            provinceId
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
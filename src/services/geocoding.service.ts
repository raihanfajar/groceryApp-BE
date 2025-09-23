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
    provinceId: number;
    cityId: number;
    districtId: number;
}

export const addNewUserAddressService = async (body: IaddNewUserAddress, userId: string) => {
    const { addressLabel, receiverName, receiverPhoneNumber, addressDetails, lat, lon, isDefault, provinceId = 1, cityId = 1, districtId = 1 } = body;

    const rgcResponse = await rgcService(lat.toString(), lon.toString()).then((res) => res);

    // !Extra validation
    const existingAddress = await prisma.userAddress.findFirst({ where: { userId, addressLabel } });
    if (existingAddress) throw new ApiError(409, "Address label already in use");
    // !If isDefault is true, set all other address to false first
    if (isDefault) {
        await prisma.userAddress.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }

    // !Determining address level
    // Province level
    const provinceLevel =
        rgcResponse?.address?.state ??
        rgcResponse?.address?.region ??
        rgcResponse?.address?.province ??
        rgcResponse?.address?.county ?? "This precise location has no province from nominatim";

    // City level
    const cityLevel =
        rgcResponse?.address?.city ??
        rgcResponse?.address?.town ??
        rgcResponse?.address?.municipality ??
        rgcResponse?.address?.village ??
        "This precise location has no city from nominatim";

    // District / Subdistrict level
    const districtLevel =
        rgcResponse?.address?.city_district ??
        rgcResponse?.address?.suburb ??
        rgcResponse?.address?.neighbourhood ??
        "This precise location has no district from nominatim";

    console.log(rgcResponse);
    console.log(provinceLevel?.toUpperCase());
    console.log(cityLevel?.toUpperCase());
    console.log(districtLevel?.toUpperCase());

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
            provinceId,
            city: cityLevel?.toUpperCase(),
            cityId,
            district: districtLevel?.toUpperCase(),
            districtId,
        },
    })

    // !Return
    return newAddress;
}

export const getUserAddressService = async (userId: string) => {
    const address = await prisma.users.findUnique({
        where: { id: userId },
        select: {
            addresses: {
                select: {
                    id: true,
                    addressLabel: true,
                    receiverName: true,
                    receiverPhoneNumber: true,
                    addressDisplayName: true,
                    addressDetails: true,
                    lat: true,
                    lon: true,
                    isDefault: true,
                    provinceId: true,
                    province: true,
                    cityId: true,
                    city: true,
                    district: true,
                    districtId: true,
                },
            },
        },
    });

    if (!address) throw new ApiError(404, "User Address not found");

    const { addresses } = address;

    return addresses;
};

export const setUserDefaultAddressService = async (addressId: string, userId: string) => {
    // !Extra validation
    const address = await prisma.userAddress.findUnique({ where: { id: addressId } });
    if (!address) throw new ApiError(404, "Address not found");

    // !Set all other address to false first
    await prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
    });

    await prisma.userAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
    });

    // !Return
    return address;
}

export const deleteUserAddressService = async (addressId: string, userId: string) => {
    // !Extra validation
    const address = await prisma.userAddress.findUnique({ where: { id: addressId } });
    if (!address) throw new ApiError(404, "Address not found");

    await prisma.userAddress.delete({
        where: { id: addressId },
    });

    // !Return
    return address;
}

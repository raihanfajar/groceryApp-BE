import { Request, Response } from "express";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";
import { addNewUserAddressService, deleteUserAddressService, fgcService, getAllStoreService, getUserAddressService, rgcService, setUserDefaultAddressService } from "../services/geocoding.service";
import { catchAsync } from "../utils/catchAsync";
import { rajaCache } from "../utils/rajaCache";

export const rgcController = catchAsync(async (req: Request, res: Response) => {
    const { lat, lon } = req.query as { lat: string, lon: string };
    const result = await rgcService(lat, lon);
    return res.status(200).json({ status: "success", message: "Geo info retrieved successfully", data: result });
});

export const fgcController = catchAsync(async (req: Request, res: Response) => {
    const { q, limit } = req.query as { q: string; limit?: string };
    const result = await fgcService(q, limit);
    return res.status(200).json({ status: "success", message: "Forward geocode retrieved successfully", data: result });
});

export const addNewUserAddressController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await addNewUserAddressService(req.body, req.payload!.userId);
    return res.status(200).json({ status: "success", message: "User address added successfully", data: result });
});

export const getUserAddressController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await getUserAddressService(req.payload!.userId);
    return res.status(200).json({ status: "success", message: "User address retrieved successfully", data: result });
});

export const setUserDefaultAddressController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    await setUserDefaultAddressService(req.payload!.userId, req.body.addressId);
    return res.status(200).json({ status: "success", message: "Address set as default" });
});

export const deleteUserAddressController = catchAsync(async (req: Request, res: Response) => {
    await deleteUserAddressService(req.query.addressId as string);
    return res.status(200).json({ status: "success", message: "Address deleted successfully" });
});

export const getAllStoreController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await getAllStoreService(req.payload!.userId);
    return res.status(200).json({ status: "success", message: "All stores retrieved successfully", data: result });
});

// !WARNING:RAJONG STUFFS BELOW
export const getRajongProvince = catchAsync(async (req: Request, res: Response) => {
    const key = 'province';

    if (await rajaCache.has(key)) {
        const list = await rajaCache.get(key);
        return res.status(200).json({ status: 'success', data: list });
    }

    const rajaRes = await fetch(
        'https://rajaongkir.komerce.id/api/v1/destination/province',
        { headers: { key: process.env.RAJAONGKIR_API_KEY! } }
    );

    if (!rajaRes.ok) {
        console.log('RajaOngkir province error:', rajaRes.status, await rajaRes.text());
        return res.status(rajaRes.status).json({ status: 'error', message: `RajaOngkir ${rajaRes.status}` });
    }

    const json = await rajaRes.json() as { rajaongkir?: { results: any[] } };
    const list = json.rajaongkir?.results || json;
    await rajaCache.set(key, list);
    return res.status(200).json({ status: 'success', data: list });
});

export const getRajongCityByProvinceId = catchAsync(async (req: Request, res: Response) => {
    const { provinceId } = req.query as { provinceId: string };
    const key = `city-${provinceId}`;

    if (await rajaCache.has(key)) {
        const list = await rajaCache.get(key);
        return res.status(200).json({ status: 'success', data: list });
    }

    const rajaRes = await fetch(
        `https://rajaongkir.komerce.id/api/v1/destination/city/${provinceId}`,
        { headers: { key: process.env.RAJAONGKIR_API_KEY! } }
    );

    if (!rajaRes.ok) {
        console.log('RajaOngkir city error:', rajaRes.status, await rajaRes.text());
        return res.status(rajaRes.status).json({ status: 'error', message: `RajaOngkir ${rajaRes.status}` });
    }

    const json = await rajaRes.json() as { rajaongkir?: { results: any[] } };
    const list = json.rajaongkir?.results || json;
    await rajaCache.set(key, list);
    return res.status(200).json({ status: 'success', data: list });
});

export const getRajongDistrictByCityId = catchAsync(async (req: Request, res: Response) => {
    const { cityId } = req.query as { cityId: string };
    const key = `district-${cityId}`;

    if (await rajaCache.has(key)) {
        const list = await rajaCache.get(key);
        return res.status(200).json({ status: 'success', data: list });
    }

    const rajaRes = await fetch(
        `https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`,
        { headers: { key: process.env.RAJAONGKIR_API_KEY! } }
    );

    if (!rajaRes.ok) {
        console.log('RajaOngkir district error:', rajaRes.status, await rajaRes.text());
        return res.status(rajaRes.status).json({ status: 'error', message: `RajaOngkir ${rajaRes.status}` });
    }

    const json = await rajaRes.json() as { rajaongkir?: { results: any[] } };
    const list = json.rajaongkir?.results || json;
    await rajaCache.set(key, list);
    return res.status(200).json({ status: 'success', data: list });
});
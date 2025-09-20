import { Request, Response } from "express";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";
import { addNewUserAddressService, fgcService, getUserAddressService, rgcService } from "../services/geocoding.service";
import { catchAsync } from "../utils/catchAsync";

export const rgcController = catchAsync(async (req: Request, res: Response) => {
    const { lat, lon } = req.query as { lat: string, lon: string };
    const result = await rgcService(lat, lon);
    // console.log("rgcResult");
    // console.log(result);
    res.status(200).json({ status: "success", message: "Geo info retrieved successfully", data: result });
});

export const fgcController = catchAsync(async (req: Request, res: Response) => {
    const { q, limit } = req.query as { q: string; limit?: string };
    const result = await fgcService(q, limit);
    res.status(200).json({ status: "success", message: "Forward geocode retrieved successfully", data: result });
});

export const addNewUserAddressController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await addNewUserAddressService(req.body, req.payload!.userId);
    res.status(200).json({ status: "success", message: "User address added successfully", data: result });
});

export const getUserAddressController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await getUserAddressService(req.payload!.userId);
    res.status(200).json({ status: "success", message: "User address retrieved successfully", data: result });
});

import { Request, Response } from "express";
import { addStoreService, getStoreProductsService, updateStoreService } from "../services/store.service";
import { catchAsync } from "../utils/catchAsync";


export const getStoreProductsController = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const data = await getStoreProductsService(storeId);
    res.status(200).json({ status: "success", data });
});

export const addStoreController = catchAsync(async (req: Request, res: Response) => {
    const result = await addStoreService(req.body);
    res.status(200).json({ status: "success", message: "Store added successfully", data: result });
});

export const updateStoreController = catchAsync(async (req: Request, res: Response) => {
    const { storeId } = req.params
    const result = await updateStoreService(storeId, req.body);
    res.status(200).json({ status: "success", message: "Store updated successfully", data: result });
});
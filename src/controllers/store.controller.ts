import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { getStoreProductsService } from "../services/store.service";


export const getStoreProductsController = catchAsync(
    async (req: Request, res: Response) => {
        const { storeId } = req.params;
        const data = await getStoreProductsService(storeId);
        res.status(200).json({ status: "success", data });
    }
);
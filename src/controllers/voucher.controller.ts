import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { VoucherService } from "../services/voucher.service";

export class VoucherController {
	private cartService = new VoucherService();

    voucherProduct = catchAsync(async (req: Request, res: Response) => {
        const code = req.query.code as string;
        const voucher = await this.cartService.getVoucherProduct(code);
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        res.status(200).json({
            message: "Voucher retrieved successfully",
            data: { voucher },
        });
    });

    voucherDelivery = catchAsync(async (req: Request, res: Response) => {
        const code = req.query.code as string;
        const voucher = await this.cartService.getVoucherDelivery(code);
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        res.status(200).json({
            message: "Voucher retrieved successfully",
            data: { voucher },
        });
    });
}

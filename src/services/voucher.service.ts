import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export class VoucherService {
    async getVoucherProduct(code: string) {
        const voucher = await prisma.voucherProduct.findUnique({
            where: { code: code },
        });
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        return voucher;
    }

    async getVoucherDelivery(code: string) {
        const voucher = await prisma.voucherDelivery.findUnique({
            where: { code: code },
        });
        if (!voucher) {
            throw new ApiError(404, "Voucher not found");
        }
        return voucher;
    }
}

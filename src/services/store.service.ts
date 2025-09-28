import prisma from "../config";
import { ApiError } from "../utils/ApiError";

export const getStoreProductsService = async (storeId: string) => {
    const storeExists = await prisma.store.findUnique({ where: { id: storeId } });
    if (!storeExists) throw new ApiError(404, "Store not found");
    const raw = await prisma.storeProduct.findMany({
        where: { storeId, deletedAt: null },
        select: {
            stock: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    picture1: true,
                    weight: true,
                    category: {
                        select: {
                            name: true,
                            slug: true,
                            icon: true,
                        },
                    },
                    discountProducts: {
                        where: {
                            discount: {
                                isActive: true,
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() },
                            },
                        },
                        select: {
                            discount: {
                                select: {
                                    type: true,
                                    valueType: true,
                                    value: true,
                                    maxDiscountAmount: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    // shape it into a tiny card-friendly object
    return raw.map(({ stock, product }) => {
        const { discountProducts, category, ...p } = product;
        const discount = discountProducts[0]?.discount ?? null; // take first active discount
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            picture1: p.picture1,
            weight: p.weight,
            stock,
            category: { name: category.name, slug: category.slug },
            discount: discount
                ? {
                    type: discount.type,
                    valueType: discount.valueType,
                    value: discount.value,
                    maxDiscountAmount: discount.maxDiscountAmount,
                }
                : null,
        };
    });
};
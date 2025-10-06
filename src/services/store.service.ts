import prisma from "../config";
import { Store } from "../generated/prisma";
import { ApiError } from "../utils/ApiError";
import { rgcService } from "./geocoding.service";

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

export const addStoreService = async (body: Omit<Store, "id" | "createdAt" | "updatedAt" | "deletedAt" | "radiusKm" | "address">) => {
    const { name, lat, lng, province, provinceId, city, cityId, district, districtId } = body;

    const existingStore = await prisma.store.findFirst({ where: { name: name.toUpperCase() } });
    if (existingStore) throw new ApiError(409, "Store name already in use");

    const rgcResponse = await rgcService(String(lat), String(lng)) as { display_name: string };
    console.log(rgcResponse);

    const newStore = await prisma.store.create({
        data: {
            name: name.toUpperCase(),
            lat: Number(lat),
            lng: Number(lng),
            province,
            provinceId: Number(provinceId),
            city,
            cityId: Number(cityId),
            district,
            districtId: Number(districtId),
            radiusKm: 20,
            address: rgcResponse.display_name || "Fallback address",
        },
    });

    // !Return
    return newStore;
};

export const updateStoreService = async (storeId: string, body: Omit<Store, "id" | "createdAt" | "updatedAt" | "deletedAt" | "radiusKm" | "address">) => {
    const { name, lat, lng, province, provinceId, city, cityId, district, districtId } = body;
    const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: {
            name: name.toUpperCase(),
            lat: Number(lat),
            lng: Number(lng),
            province,
            provinceId: Number(provinceId),
            city,
            cityId: Number(cityId),
            district,
            districtId: Number(districtId),
        },
    });
    return updatedStore;
};
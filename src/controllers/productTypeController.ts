// Product Type Controller

import { Request, Response } from "express";
import {prisma} from "../utils/prisma";

export const ProductTypeController = {
    getAllProductTypes: async (req: Request, res: Response) => {
        const productTypes = await prisma.productType.findMany();
        res.json(productTypes);
    },
    getProductTypeById: async (req: Request, res: Response) => {
        const { id } = req.params;
        const productType = await prisma.productType.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(productType);
    },
    createProductType: async (req: Request, res: Response) => {
        const { name } = req.body;
        const productType = await prisma.productType.create({
            data: { name },
        });
        res.json(productType);
    },
    updateProductType: async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name } = req.body;
        const productType = await prisma.productType.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(productType);
    },
    deleteProductType: async (req: Request, res: Response) => {
        const { id } = req.params;
        await prisma.productType.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Category deleted successfully" });
    },
};








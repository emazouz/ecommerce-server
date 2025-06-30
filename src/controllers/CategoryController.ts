// Category Controller

import { Request, Response } from "express";
import {prisma} from "../utils/prisma";

export const CategoryController = {
    getAllCategories: async (req: Request, res: Response) => {
        const categories = await prisma.category.findMany();
        res.json(categories);
    },
    getCategoryById: async (req: Request, res: Response) => {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(category);
    },
    createCategory: async (req: Request, res: Response) => {
        const { name } = req.body;
        const category = await prisma.category.create({
            data: { name },
        });
        res.json(category);
    },
    updateCategory: async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name } = req.body;
        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(category);
    },
    deleteCategory: async (req: Request, res: Response) => {
        const { id } = req.params;
        await prisma.category.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Category deleted successfully" });
    },
};








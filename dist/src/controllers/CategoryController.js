"use strict";
// Category Controller
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const prisma_1 = require("../utils/prisma");
exports.CategoryController = {
    getAllCategories: async (req, res) => {
        const categories = await prisma_1.prisma.category.findMany();
        res.json(categories);
    },
    getCategoryById: async (req, res) => {
        const { id } = req.params;
        const category = await prisma_1.prisma.category.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(category);
    },
    createCategory: async (req, res) => {
        const { name } = req.body;
        const category = await prisma_1.prisma.category.create({
            data: { name },
        });
        res.json(category);
    },
    updateCategory: async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        const category = await prisma_1.prisma.category.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(category);
    },
    deleteCategory: async (req, res) => {
        const { id } = req.params;
        await prisma_1.prisma.category.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Category deleted successfully" });
    },
};

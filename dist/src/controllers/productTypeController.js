"use strict";
// Product Type Controller
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTypeController = void 0;
const prisma_1 = require("../utils/prisma");
exports.ProductTypeController = {
    getAllProductTypes: async (req, res) => {
        const productTypes = await prisma_1.prisma.productType.findMany();
        res.json(productTypes);
    },
    getProductTypeById: async (req, res) => {
        const { id } = req.params;
        const productType = await prisma_1.prisma.productType.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(productType);
    },
    createProductType: async (req, res) => {
        const { name } = req.body;
        const productType = await prisma_1.prisma.productType.create({
            data: { name },
        });
        res.json(productType);
    },
    updateProductType: async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        const productType = await prisma_1.prisma.productType.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(productType);
    },
    deleteProductType: async (req, res) => {
        const { id } = req.params;
        await prisma_1.prisma.productType.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: "Category deleted successfully" });
    },
};

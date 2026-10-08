const express = require('express');
const { body } = require('express-validator');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  calculatePrice,
  resolveConfiguration,
} = require('../controllers/productController');

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required.'),
  body('sku').trim().notEmpty().withMessage('SKU is required.'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a non-negative number.'),
];

router.post('/', productValidation, createProduct);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/calculate-price', calculatePrice);
router.post('/:id/configuration', resolveConfiguration);

module.exports = router;

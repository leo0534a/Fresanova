// Rutas de productos, categorías, toppings y salsas
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middlewares/auth');

// === Rutas públicas (para el catálogo) ===
router.get('/public/categories', (req, res, next) => productController.getCategories(req, res, next));
router.get('/public/products', (req, res, next) => productController.getProducts(req, res, next));
router.get('/public/toppings', (req, res, next) => productController.getToppings(req, res, next));
router.get('/public/sauces', (req, res, next) => productController.getSauces(req, res, next));

// === Rutas protegidas (admin) ===
router.use(authenticate);

// Productos
router.get('/', (req, res, next) => productController.getProducts(req, res, next));
router.get('/:id', (req, res, next) => productController.getProduct(req, res, next));
router.post('/', (req, res, next) => productController.createProduct(req, res, next));
router.put('/:id', (req, res, next) => productController.updateProduct(req, res, next));
router.delete('/:id', (req, res, next) => productController.deleteProduct(req, res, next));

// Categorías
router.get('/categories/all', (req, res, next) => productController.getCategories(req, res, next));
router.post('/categories', (req, res, next) => productController.createCategory(req, res, next));
router.put('/categories/:id', (req, res, next) => productController.updateCategory(req, res, next));
router.delete('/categories/:id', (req, res, next) => productController.deleteCategory(req, res, next));

// Toppings
router.get('/toppings/all', (req, res, next) => productController.getToppings(req, res, next));
router.post('/toppings', (req, res, next) => productController.createTopping(req, res, next));
router.put('/toppings/:id', (req, res, next) => productController.updateTopping(req, res, next));
router.delete('/toppings/:id', (req, res, next) => productController.deleteTopping(req, res, next));

// Salsas
router.get('/sauces/all', (req, res, next) => productController.getSauces(req, res, next));
router.post('/sauces', (req, res, next) => productController.createSauce(req, res, next));
router.put('/sauces/:id', (req, res, next) => productController.updateSauce(req, res, next));
router.delete('/sauces/:id', (req, res, next) => productController.deleteSauce(req, res, next));

module.exports = router;

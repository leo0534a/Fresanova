// Controlador de productos (CRUD completo)
const { Product, Category, Topping, Sauce } = require('../models');
const { validateProductData, validateCategoryData, validateToppingData } = require('../validations/productValidation');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

class ProductController {
  // ==================== PRODUCTOS ====================

  // GET /api/products
  async getProducts(req, res, next) {
    try {
      const { category, search, active } = req.query;
      const filter = {};

      if (category) filter.category = category;
      if (active !== undefined) filter.isActive = active === 'true';
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }

      const products = await Product.find(filter)
        .populate('category', 'name emoji')
        .sort('category displayOrder');

      ApiResponse.success(res, products);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/:id
  async getProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id).populate('category');
      if (!product) return next(AppError.notFound('Producto no encontrado'));
      ApiResponse.success(res, product);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/products
  async createProduct(req, res, next) {
    try {
      validateProductData(req.body);
      const product = await Product.create(req.body);
      await product.populate('category');
      logger.info(`Producto creado: ${product.name}`);
      ApiResponse.created(res, product, 'Producto creado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/products/:id
  async updateProduct(req, res, next) {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('category');

      if (!product) return next(AppError.notFound('Producto no encontrado'));
      logger.info(`Producto actualizado: ${product.name}`);
      ApiResponse.success(res, product, 'Producto actualizado');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/products/:id
  async deleteProduct(req, res, next) {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return next(AppError.notFound('Producto no encontrado'));
      logger.info(`Producto eliminado: ${product.name}`);
      ApiResponse.success(res, null, 'Producto eliminado');
    } catch (error) {
      next(error);
    }
  }

  // ==================== CATEGORÍAS ====================

  // GET /api/categories
  async getCategories(req, res, next) {
    try {
      const categories = await Category.find().sort('displayOrder');
      ApiResponse.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/categories
  async createCategory(req, res, next) {
    try {
      validateCategoryData(req.body);
      const category = await Category.create(req.body);
      logger.info(`Categoría creada: ${category.name}`);
      ApiResponse.created(res, category, 'Categoría creada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/categories/:id
  async updateCategory(req, res, next) {
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!category) return next(AppError.notFound('Categoría no encontrada'));
      logger.info(`Categoría actualizada: ${category.name}`);
      ApiResponse.success(res, category, 'Categoría actualizada');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/categories/:id
  async deleteCategory(req, res, next) {
    try {
      // Verificar que no tenga productos asociados
      const productCount = await Product.countDocuments({ category: req.params.id });
      if (productCount > 0) {
        return next(AppError.badRequest(
          `No se puede eliminar: tiene ${productCount} producto(s) asociado(s)`
        ));
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) return next(AppError.notFound('Categoría no encontrada'));
      logger.info(`Categoría eliminada: ${category.name}`);
      ApiResponse.success(res, null, 'Categoría eliminada');
    } catch (error) {
      next(error);
    }
  }

  // ==================== TOPPINGS ====================

  // GET /api/toppings
  async getToppings(req, res, next) {
    try {
      const toppings = await Topping.find().sort('price displayOrder');
      ApiResponse.success(res, toppings);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/toppings
  async createTopping(req, res, next) {
    try {
      validateToppingData(req.body);
      // Asignar grupo de precio automáticamente
      req.body.priceGroup = String(req.body.price);
      const topping = await Topping.create(req.body);
      logger.info(`Topping creado: ${topping.name}`);
      ApiResponse.created(res, topping, 'Topping creado exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/toppings/:id
  async updateTopping(req, res, next) {
    try {
      if (req.body.price) req.body.priceGroup = String(req.body.price);
      const topping = await Topping.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!topping) return next(AppError.notFound('Topping no encontrado'));
      ApiResponse.success(res, topping, 'Topping actualizado');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/toppings/:id
  async deleteTopping(req, res, next) {
    try {
      const topping = await Topping.findByIdAndDelete(req.params.id);
      if (!topping) return next(AppError.notFound('Topping no encontrado'));
      ApiResponse.success(res, null, 'Topping eliminado');
    } catch (error) {
      next(error);
    }
  }

  // ==================== SALSAS ====================

  // GET /api/sauces
  async getSauces(req, res, next) {
    try {
      const sauces = await Sauce.find().sort('displayOrder');
      ApiResponse.success(res, sauces);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/sauces
  async createSauce(req, res, next) {
    try {
      const sauce = await Sauce.create(req.body);
      logger.info(`Salsa creada: ${sauce.name}`);
      ApiResponse.created(res, sauce, 'Salsa creada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/sauces/:id
  async updateSauce(req, res, next) {
    try {
      const sauce = await Sauce.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!sauce) return next(AppError.notFound('Salsa no encontrada'));
      ApiResponse.success(res, sauce, 'Salsa actualizada');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/sauces/:id
  async deleteSauce(req, res, next) {
    try {
      const sauce = await Sauce.findByIdAndDelete(req.params.id);
      if (!sauce) return next(AppError.notFound('Salsa no encontrada'));
      ApiResponse.success(res, null, 'Salsa eliminada');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();

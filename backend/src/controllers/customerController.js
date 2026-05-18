// Controlador de clientes
const { Customer, Order } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class CustomerController {
  // GET /api/customers — Listar clientes con paginación
  async getCustomers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const filter = {};

      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { whatsappNumber: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [customers, total] = await Promise.all([
        Customer.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Customer.countDocuments(filter)
      ]);

      ApiResponse.paginated(res, customers, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/customers/:id
  async getCustomer(req, res, next) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) return next(AppError.notFound('Cliente no encontrado'));

      // Obtener pedidos del cliente
      const orders = await Order.find({ customer: customer._id })
        .sort('-createdAt')
        .limit(10)
        .select('orderNumber status total createdAt paymentMethod');

      ApiResponse.success(res, { customer, orders });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/customers/:id
  async updateCustomer(req, res, next) {
    try {
      const { notes, isActive } = req.body;
      const updateData = {};

      if (notes !== undefined) updateData.notes = notes;
      if (isActive !== undefined) updateData.isActive = isActive;

      const customer = await Customer.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!customer) return next(AppError.notFound('Cliente no encontrado'));
      ApiResponse.success(res, customer, 'Cliente actualizado');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();

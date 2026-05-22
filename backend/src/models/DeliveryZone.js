// Modelo de Zona de Domicilio (barrios y tarifas)
const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    // Nombre de la zona (ej: "Zona turística / Centro histórico")
    zoneName: {
      type: String,
      required: [true, 'El nombre de la zona es obligatorio'],
      trim: true
    },
    // Barrios dentro de esta zona
    neighborhoods: [
      {
        name: {
          type: String,
          required: [true, 'El nombre del barrio es obligatorio'],
          trim: true
        },
        price: {
          type: Number,
          required: [true, 'El precio del domicilio es obligatorio'],
          min: [0, 'El precio no puede ser negativo']
        },
        isActive: {
          type: Boolean,
          default: true
        }
      }
    ],
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Índice para búsqueda rápida por nombre de barrio
deliveryZoneSchema.index({ 'neighborhoods.name': 1 });

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);

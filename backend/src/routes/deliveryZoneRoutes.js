// Rutas de zonas de domicilio
const express = require('express');
const router = express.Router();
const deliveryZoneController = require('../controllers/deliveryZoneController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', (req, res, next) => deliveryZoneController.getZones(req, res, next));
router.get('/:id', (req, res, next) => deliveryZoneController.getZone(req, res, next));
router.post('/', (req, res, next) => deliveryZoneController.createZone(req, res, next));
router.put('/:id', (req, res, next) => deliveryZoneController.updateZone(req, res, next));
router.delete('/:id', (req, res, next) => deliveryZoneController.deleteZone(req, res, next));

// Barrios dentro de una zona
router.post('/:id/neighborhoods', (req, res, next) => deliveryZoneController.addNeighborhood(req, res, next));
router.put('/:id/neighborhoods/:neighborhoodId', (req, res, next) => deliveryZoneController.updateNeighborhood(req, res, next));
router.delete('/:id/neighborhoods/:neighborhoodId', (req, res, next) => deliveryZoneController.deleteNeighborhood(req, res, next));

module.exports = router;

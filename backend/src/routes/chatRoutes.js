// Rutas del chat en vivo y gestión de transferencias
const { Router } = require('express');
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Chat en vivo
router.get('/conversations', chatController.getActiveChats.bind(chatController));
router.get('/:whatsappNumber/messages', chatController.getMessages.bind(chatController));
router.post('/send', chatController.sendMessage.bind(chatController));

// Transferencias
router.get('/pending-transfers', chatController.getPendingTransfers.bind(chatController));
router.post('/confirm-transfer-by-phone', chatController.confirmTransferByPhone.bind(chatController));

module.exports = router;

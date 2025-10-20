const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');
const authMiddleware = require('../middleware/auth');

router.get('/:userId', connectionsController.getUserConnections);
router.get('/status/:userId', authMiddleware, connectionsController.getConnectionStatus);
router.get('/pending/received', authMiddleware, connectionsController.getPendingRequests);
router.get('/pending/sent', authMiddleware, connectionsController.getSentRequests);

router.post('/request', authMiddleware, connectionsController.sendConnectionRequest);
router.put('/:connectionId/accept', authMiddleware, connectionsController.acceptConnectionRequest);
router.put('/:connectionId/reject', authMiddleware, connectionsController.rejectConnectionRequest);
router.delete('/:connectionId', authMiddleware, connectionsController.removeConnection);

module.exports = router;

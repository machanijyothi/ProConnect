const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Add console.log to debug
console.log('userController:', userController);

router.get('/', userController.getAllUsers);
router.get('/search', userController.searchUsers);
router.get('/:userId', userController.getUserProfile);
router.put('/:userId', authMiddleware, userController.updateUserProfile); // Line 9 - causing the error

module.exports = router;

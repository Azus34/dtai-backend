// backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.verifyToken, authController.logout);

// Rutas protegidas
router.get('/users', authController.verifyToken, authController.checkRole('administrador'), userController.getAllUsers);
router.post('/users', authController.verifyToken, authController.checkRole('administrador'), userController.createUser);
router.put('/users/:id', authController.verifyToken, authController.checkRole('administrador'), userController.updateUser);
router.delete('/users/:id', authController.verifyToken, authController.checkRole('administrador'), userController.deleteUser);
router.post('/change-password', authController.verifyToken, userController.changePassword);

// Ruta de verificación de token
router.get('/verify', authController.verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
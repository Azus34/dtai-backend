// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool, testConnection } = require('./config/database');

const app = express();

// ✅ CORS bien configurado y aplicado antes de cualquier ruta
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Middlewares
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Probar conexión a la base de datos al iniciar
testConnection().then(isConnected => {
  if (!isConnected) {
    console.error('No se pudo establecer conexión con la base de datos');
    process.exit(1);
  }
});

// ✅ Asegúrate de que esta ruta existe
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Puerto
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

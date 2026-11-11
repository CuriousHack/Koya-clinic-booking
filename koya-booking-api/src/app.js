const express = require('express');
const cors = require('cors');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Global API Key authentication for all incoming requests
app.use(apiKeyAuth);

// Link all routes (accessible directly or via /api prefix)
app.use('/', routes);
app.use('/api', routes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;

const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health');
const historicalRouter = require('./routes/historical');
const predictionsRouter = require('./routes/predictions');
const alertsRouter = require('./routes/alerts');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/historical', historicalRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/alerts', alertsRouter);

module.exports = app;

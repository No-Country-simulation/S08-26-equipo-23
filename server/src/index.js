const app = require('./app');
const { ensureSchema } = require('./db/ensureSchema');
const { PORT } = require('./db/pool');

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`HealthDemand API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();


const express = require('express');
const app = express();
const config = require('./config');

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

function keepAlive() {
  const PORT = process.env.PORT || config.keepAlivePort || 8181; // Ensure consistent port
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server running on port ${PORT}`);
  });
}

module.exports = keepAlive;

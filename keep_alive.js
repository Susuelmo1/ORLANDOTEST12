
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

function keepAlive() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server running on port ${PORT}`);
  });
}

module.exports = keepAlive;

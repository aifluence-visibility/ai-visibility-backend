const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());

app.get('/health', (req, res) => {
  res.json({ "status": "OK", "port": 4000 });
});

app.listen(4000, () => {
  console.log('Test server running on port 4000');
});
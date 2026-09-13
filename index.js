require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const photosRouter = require('./routes/photos');

const app = express();
const port = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', indexRouter);
app.use('/api', photosRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

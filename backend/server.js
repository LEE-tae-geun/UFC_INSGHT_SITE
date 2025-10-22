const express = require('express');
const path = require('path');
const fs = require('fs');
const { crawlFighterDetails } = require('./crawl_fighter_details');

const app = express();
const port = process.env.PORT || 3001;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API endpoint to serve rankings.json
app.get('/api/rankings', (req, res) => {
  fs.readFile(path.join(__dirname, 'rankings.json'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading rankings.json:', err);
      return res.status(500).send('An error occurred');
    }
    res.json(JSON.parse(data));
  });
});

// API endpoint to serve korean_fighters.json
app.get('/api/korean-fighters', (req, res) => {
  const filePath = path.join(__dirname, 'korean_fighters.json');
  console.log(`Attempting to read korean_fighters.json from: ${filePath}`);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading korean_fighters.json:', err);
      return res.status(500).send('An error occurred');
    }
    res.json(data);
  });
});

app.get('/api/fighter/:fighterName', async (req, res) => {
  const fighterName = req.params.fighterName;
  try {
    const details = await crawlFighterDetails(fighterName);
    if (details) {
      res.json(details);
    } else {
      res.status(404).send('Fighter not found');
    }
  } catch (error) {
    res.status(500).send('An error occurred while fetching fighter details.');
  }
});


// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
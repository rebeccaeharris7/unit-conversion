const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Connect to SQLite DB or create it if not exists
const db = new sqlite3.Database('./conversions.db');

// 2. Create the conversions table if it doesn't exist yet
db.run(`
  CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    fromUnit TEXT,
    toUnit TEXT,
    inputValue REAL,
    result REAL,
    direction TEXT,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Conversion logic table
const conversionRates = {
  length: {
    meter:      { meter: 1, kilometer: 0.001, foot: 3.28084, mile: 0.000621371 },
    kilometer:  { meter: 1000, kilometer: 1, foot: 3280.84, mile: 0.621371 },
    foot:       { meter: 0.3048, kilometer: 0.0003048, foot: 1, mile: 0.000189394 },
    mile:       { meter: 1609.34, kilometer: 1.60934, foot: 5280, mile: 1 }
  },
  volume: {
    liter:      { liter: 1, milliliter: 1000, cup: 4.22675, gallon: 0.264172 },
    milliliter: { liter: 0.001, milliliter: 1, cup: 0.00422675, gallon: 0.000264172 },
    cup:        { liter: 0.236588, milliliter: 236.588, cup: 1, gallon: 0.0625 },
    gallon:     { liter: 3.78541, milliliter: 3785.41, cup: 16, gallon: 1 }
  }
};

// 4. Conversion endpoint (does math, saves to DB)
app.post('/api/convert', (req, res) => {
  const { type, fromUnit, toUnit, value, direction } = req.body;
  if (!type || !fromUnit || !toUnit || isNaN(value)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  let result;
  if (direction === "from") {
    result = value * conversionRates[type][fromUnit][toUnit];
  } else {
    result = value * conversionRates[type][toUnit][fromUnit];
  }
  result = +result.toFixed(6);

  // Save conversion to DB
  db.run(
    `INSERT INTO conversions (type, fromUnit, toUnit, inputValue, result, direction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [type, fromUnit, toUnit, value, result, direction],
    function(err) {
      if (err) {
        console.error("DB Error:", err);
      }
      res.json({ result });
    }
  );
});

// 5. History endpoint (get last 10 conversions)
app.get('/api/history', (req, res) => {
  db.all(
    `SELECT id, type, fromUnit, toUnit, inputValue, result, direction, ts
     FROM conversions
     ORDER BY ts DESC
     LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "DB error" });
      }
      res.json({ history: rows });
    }
  );
});

// 6. Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
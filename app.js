const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// SQLite DB setup (for saving conversions)
const db = new sqlite3.Database('./conversions.db');
db.run(`
  CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    fromUnit TEXT,
    toUnit TEXT,
    inputValue REAL,
    result REAL,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Comprehensive conversion rates for new units
const conversionRates = {
  length: {
    // all rates are relative to their own units
    cm:        { cm: 1, inch: 0.393701, foot: 0.0328084, yard: 0.0109361, mile: 0.0000062137, mm: 10, m: 0.01, km: 0.00001 },
    inch:      { cm: 2.54, inch: 1, foot: 0.0833333, yard: 0.0277778, mile: 0.0000157828, mm: 25.4, m: 0.0254, km: 0.0000254 },
    foot:      { cm: 30.48, inch: 12, foot: 1, yard: 0.333333, mile: 0.000189394, mm: 304.8, m: 0.3048, km: 0.0003048 },
    yard:      { cm: 91.44, inch: 36, foot: 3, yard: 1, mile: 0.000568182, mm: 914.4, m: 0.9144, km: 0.0009144 },
    mile:      { cm: 160934, inch: 63360, foot: 5280, yard: 1760, mile: 1, mm: 1.609e+6, m: 1609.34, km: 1.60934 },
    mm:        { cm: 0.1, inch: 0.0393701, foot: 0.00328084, yard: 0.00109361, mile: 0.000000621371, mm: 1, m: 0.001, km: 0.000001 },
    m:         { cm: 100, inch: 39.3701, foot: 3.28084, yard: 1.09361, mile: 0.000621371, mm: 1000, m: 1, km: 0.001 },
    km:        { cm: 100000, inch: 39370.1, foot: 3280.84, yard: 1093.61, mile: 0.621371, mm: 1e6, m: 1000, km: 1 },
  },
  volume: {
    fl_oz:      { fl_oz: 1, cup: 0.125, pint: 0.0625, quart: 0.03125, gallon: 0.0078125, tablespoon: 2, teaspoon: 6, ml: 29.5735, l: 0.0295735 },
    cup:        { fl_oz: 8, cup: 1, pint: 0.5, quart: 0.25, gallon: 0.0625, tablespoon: 16, teaspoon: 48, ml: 236.588, l: 0.236588 },
    pint:       { fl_oz: 16, cup: 2, pint: 1, quart: 0.5, gallon: 0.125, tablespoon: 32, teaspoon: 96, ml: 473.176, l: 0.473176 },
    quart:      { fl_oz: 32, cup: 4, pint: 2, quart: 1, gallon: 0.25, tablespoon: 64, teaspoon: 192, ml: 946.353, l: 0.946353 },
    gallon:     { fl_oz: 128, cup: 16, pint: 8, quart: 4, gallon: 1, tablespoon: 256, teaspoon: 768, ml: 3785.41, l: 3.78541 },
    tablespoon: { fl_oz: 0.5, cup: 0.0625, pint: 0.03125, quart: 0.015625, gallon: 0.00390625, tablespoon: 1, teaspoon: 3, ml: 14.7868, l: 0.0147868 },
    teaspoon:   { fl_oz: 0.166667, cup: 0.0208333, pint: 0.0104167, quart: 0.00520833, gallon: 0.00130208, tablespoon: 0.333333, teaspoon: 1, ml: 4.92892, l: 0.00492892 },
    ml:         { fl_oz: 0.033814, cup: 0.00422675, pint: 0.00211338, quart: 0.00105669, gallon: 0.000264172, tablespoon: 0.067628, teaspoon: 0.202884, ml: 1, l: 0.001 },
    l:          { fl_oz: 33.814, cup: 4.22675, pint: 2.11338, quart: 1.05669, gallon: 0.264172, tablespoon: 67.628, teaspoon: 202.884, ml: 1000, l: 1 }
  }
};

// Conversion endpoint (only does math, does not save)
app.post('/api/convert', (req, res) => {
  const { type, fromUnit, toUnit, value, direction } = req.body;
  if (!type || !fromUnit || !toUnit || isNaN(value)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  // Defensive: check units exist
  if (!conversionRates[type] || !conversionRates[type][fromUnit] || typeof conversionRates[type][fromUnit][toUnit] !== "number") {
    return res.status(400).json({ error: "Conversion not supported for selected units." });
  }

  let result;
  // "direction" can be "from" or "to" for bi-directional
  if (direction === "from") {
    result = value * conversionRates[type][fromUnit][toUnit];
  } else {
    result = value * conversionRates[type][toUnit][fromUnit];
  }
  result = +result.toFixed(6);

  res.json({ result });
});

// Save conversion to DB (triggered by Convert button)
app.post('/api/save', (req, res) => {
  const { type, fromUnit, toUnit, inputValue, result } = req.body;
  if (!type || !fromUnit || !toUnit || isNaN(inputValue) || isNaN(result)) {
    return res.status(400).json({ error: "Invalid input" });
  }
  db.run(
    `INSERT INTO conversions (type, fromUnit, toUnit, inputValue, result)
     VALUES (?, ?, ?, ?, ?)`,
    [type, fromUnit, toUnit, inputValue, result],
    function(err) {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ saved: true });
    }
  );
});

// History endpoint
app.get('/api/history', (req, res) => {
  db.all(
    `SELECT id, type, fromUnit, toUnit, inputValue, result, ts
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
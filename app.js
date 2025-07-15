// 1. Import dependencies
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 2. Middleware: parse incoming JSON
app.use(express.json());

// 3. Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 4. Conversion logic (for demo purposes, simple factors)
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

// 5. API endpoint for conversion
app.post('/api/convert', (req, res) => {
    /*
      Expects payload:
      {
        type: "length" or "volume",
        fromUnit: "meter", toUnit: "foot",
        value: 3.5,
        direction: "from" or "to"
      }
    */
    const { type, fromUnit, toUnit, value, direction } = req.body;
    if (!type || !fromUnit || !toUnit || isNaN(value)) {
        return res.status(400).json({ error: "Invalid input" });
    }

    let result;
    if (direction === "from") {
        // Convert from 'fromUnit' to 'toUnit'
        result = value * conversionRates[type][fromUnit][toUnit];
    } else {
        // Convert from 'toUnit' to 'fromUnit' (reverse direction)
        result = value * conversionRates[type][toUnit][fromUnit];
    }

    // Round result for display
    result = +result.toFixed(6);

    res.json({ result });
});

// 6. Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
const unitDefinitions = {
  volume: {
    units: [
      { value: "fl_oz", label: "Fluid ounce" },
      { value: "cup", label: "Cup" },
      { value: "pint", label: "Pint" },
      { value: "quart", label: "Quart" },
      { value: "gallon", label: "Gallon" },
      { value: "tablespoon", label: "Tablespoon" },
      { value: "teaspoon", label: "Teaspoon" },
      { value: "ml", label: "Milliliter" },
      { value: "l", label: "Liter" },
    ],
    defaultFromUnit: "tablespoon",
    defaultToUnit: "cup",
    defaultFromValue: "16",
    defaultToValue: "1",
  },
  length: {
    units: [
      { value: "cm", label: "Centimeter" },
      { value: "inch", label: "Inch" },
      { value: "foot", label: "Foot" },
      { value: "yard", label: "Yard" },
      { value: "mile", label: "Mile" },
      { value: "mm", label: "Millimeter" },
      { value: "m", label: "Meter" },
      { value: "km", label: "Kilometer" },
    ],
    defaultFromUnit: "cm",
    defaultToUnit: "inch",
    defaultFromValue: "10",
    defaultToValue: "3.93701",
  }, 
}

let lastConversion = null;

// Populate unit options
function populateUnitOptions(type) {
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  const fromValue = document.getElementById("fromValue");
  const toValue = document.getElementById("toValue");
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';
  unitDefinitions[type].units.forEach(unit => {
    fromSelect.innerHTML += `<option value="${unit.value}">${unit.label}</option>`;
    toSelect.innerHTML += `<option value="${unit.value}">${unit.label}</option>`;
  });
  // toSelect.selectedIndex = 1;
  fromValue.value = unitDefinitions[type].defaultFromValue;
  toValue.value = unitDefinitions[type].defaultToValue;
  fromSelect.value = unitDefinitions[type].defaultFromUnit;
  toSelect.value = unitDefinitions[type].defaultToUnit;
}

document.getElementById('type').addEventListener('change', e => {
  populateUnitOptions(e.target.value);
  triggerConversion("from");
});

populateUnitOptions('volume');

// Conversion logic (bi-directional)
async function triggerConversion(direction) {
  const type = document.getElementById('type').value;
  const fromUnit = document.getElementById('fromUnit').value;
  const toUnit = document.getElementById('toUnit').value;
  let fromValue = parseFloat(document.getElementById('fromValue').value);
  let toValue = parseFloat(document.getElementById('toValue').value);
  
  if (fromUnit === toUnit || (!fromValue && !toValue)) {
    document.getElementById('message').textContent = "";
    lastConversion = null;
    return;
  }

  let value, payload;
  if (direction === "from") {
    value = fromValue;
    payload = { type, fromUnit, toUnit, value, direction };
  } else {
    value = toValue;
    payload = { type, fromUnit, toUnit, value, direction: "to" };
  }

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (data.error) {
    document.getElementById('message').textContent = "Error: " + data.error;
    lastConversion = null;
  } else {
    if (direction === "from") {
      document.getElementById('toValue').value = data.result;
    } else {
      document.getElementById('fromValue').value = data.result;
    }
    document.getElementById('message').textContent = "";
    // Save last conversion for the "Convert" button
    lastConversion = {
      type,
      fromUnit,
      toUnit,
      inputValue: direction === "from" ? fromValue : toValue,
      result: data.result
    };
  }
}

// Event listeners for bi-directional conversion
document.getElementById('fromValue').addEventListener('input', () => triggerConversion("from"));
document.getElementById('fromUnit').addEventListener('change', () => triggerConversion("from"));
document.getElementById('toValue').addEventListener('input', () => triggerConversion("to"));
document.getElementById('toUnit').addEventListener('change', () => triggerConversion("to"));

// Convert button saves to history
document.getElementById('convertButton').addEventListener('click', async () => {
  if (!lastConversion) {
    document.getElementById('message').textContent = "Enter a valid conversion first.";
    return;
  }
  // Save to DB
  const response = await fetch('/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(lastConversion)
  });
  const data = await response.json();
  if (data.saved) {
    document.getElementById('message').textContent = "Conversion saved to history!";
    fetchHistory();
  } else {
    document.getElementById('message').textContent = "Error saving conversion.";
  }
});

// Fetch and show history
async function fetchHistory() {
  const res = await fetch('/api/history');
  const data = await res.json();
  const el = document.getElementById('history');
  el.innerHTML = data.history.map(row =>
    `<li>[${row.ts}] ${row.inputValue} ${row.fromUnit} &rarr; ${row.result} ${row.toUnit} (${row.type})</li>`
  ).join('');
}

// Load history on page load
fetchHistory();
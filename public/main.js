const units = {
  length: ["meter", "kilometer", "foot", "mile"],
  volume: ["liter", "milliliter", "cup", "gallon"]
};

let lastConversion = null;

// Populate unit options
function populateUnitOptions(type) {
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';
  units[type].forEach(unit => {
    fromSelect.innerHTML += `<option value="${unit}">${unit}</option>`;
    toSelect.innerHTML += `<option value="${unit}">${unit}</option>`;
  });
  toSelect.selectedIndex = 1;
}

document.getElementById('type').addEventListener('change', e => {
  populateUnitOptions(e.target.value);
  triggerConversion("from");
});

populateUnitOptions('length');

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
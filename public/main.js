// Units for each type
const units = {
  length: ["meter", "kilometer", "foot", "mile"],
  volume: ["liter", "milliliter", "cup", "gallon"]
};

function populateUnitOptions(type) {
  const fromSelect = document.getElementById('fromUnit');
  const toSelect = document.getElementById('toUnit');
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';
  units[type].forEach(unit => {
    fromSelect.innerHTML += `<option value="${unit}">${unit}</option>`;
    toSelect.innerHTML += `<option value="${unit}">${unit}</option>`;
  });
  toSelect.selectedIndex = 1; // default to second unit for "to"
}

// Handle type change
document.getElementById('type').addEventListener('change', e => {
  populateUnitOptions(e.target.value);
});

// Initial options
populateUnitOptions('length');

// Handle form submit
document.getElementById('convert-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const fromUnit = document.getElementById('fromUnit').value;
  const toUnit = document.getElementById('toUnit').value;
  const value = parseFloat(document.getElementById('value').value);

  if (fromUnit === toUnit) {
    document.getElementById('result').textContent = "Please choose different units.";
    return;
  }

  const direction = "from"; // could add UI for reverse, but always 'from' here

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ type, fromUnit, toUnit, value, direction })
  });
  const data = await response.json();
  if (data.error) {
    document.getElementById('result').textContent = "Error: " + data.error;
  } else {
    document.getElementById('result').textContent = `${value} ${fromUnit} = ${data.result} ${toUnit}`;
    fetchHistory();
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
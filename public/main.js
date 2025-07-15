// --- Define supported units ---
const units = {
    length: [
        { label: "Meters", value: "meter" },
        { label: "Kilometers", value: "kilometer" },
        { label: "Feet", value: "foot" },
        { label: "Miles", value: "mile" }
    ],
    volume: [
        { label: "Liters", value: "liter" },
        { label: "Milliliters", value: "milliliter" },
        { label: "Cups", value: "cup" },
        { label: "Gallons", value: "gallon" }
    ]
};

const typeSelect = document.getElementById("type");
const fromUnitSelect = document.getElementById("fromUnit");
const toUnitSelect = document.getElementById("toUnit");
const fromValueInput = document.getElementById("fromValue");
const toValueInput = document.getElementById("toValue");

let lastChanged = null; // Track which field was last changed to avoid loop

// --- Populate unit dropdowns based on type ---
function populateUnitDropdowns(type) {
    fromUnitSelect.innerHTML = "";
    toUnitSelect.innerHTML = "";
    units[type].forEach(unit => {
        const option1 = document.createElement("option");
        option1.value = unit.value;
        option1.textContent = unit.label;
        fromUnitSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = unit.value;
        option2.textContent = unit.label;
        toUnitSelect.appendChild(option2);
    });
    // Default: different units selected
    toUnitSelect.selectedIndex = 1;
}

// --- Conversion handler ---
async function handleConversion(direction) {
    // direction: "from" means user changed the "from" field; "to" = changed "to" field
    lastChanged = direction;

    let fromValue = parseFloat(fromValueInput.value);
    let toValue = parseFloat(toValueInput.value);

    const payload = {
        type: typeSelect.value,
        fromUnit: fromUnitSelect.value,
        toUnit: toUnitSelect.value,
        value: direction === "from" ? fromValue : toValue,
        direction // tells backend which direction
    };

    // Only send if input is not empty
    if (isNaN(payload.value)) {
        if (direction === "from") toValueInput.value = "";
        else fromValueInput.value = "";
        return;
    }

    try {
        const res = await fetch("/api/convert", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (direction === "from") {
            toValueInput.value = data.result;
        } else {
            fromValueInput.value = data.result;
        }
    } catch (e) {
        // Optionally display error
        console.error("Conversion error:", e);
    }
}

// --- Event listeners ---

// Re-populate units when type changes
typeSelect.addEventListener("change", () => {
    populateUnitDropdowns(typeSelect.value);
    // Trigger a conversion to update the fields
    fromValueInput.value = "";
    toValueInput.value = "";
});

// Listen for changes on "from" value/unit
fromValueInput.addEventListener("input", () => {
    if (lastChanged === "to") return; // Prevent loop
    handleConversion("from");
});
fromUnitSelect.addEventListener("change", () => {
    if (lastChanged === "to") return;
    handleConversion("from");
});

// Listen for changes on "to" value/unit
toValueInput.addEventListener("input", () => {
    if (lastChanged === "from") return;
    handleConversion("to");
});
toUnitSelect.addEventListener("change", () => {
    if (lastChanged === "from") return;
    handleConversion("to");
});

// On blur, reset lastChanged (so changing fields after switching is not blocked)
fromValueInput.addEventListener("blur", () => { lastChanged = null; });
toValueInput.addEventListener("blur", () => { lastChanged = null; });
fromUnitSelect.addEventListener("blur", () => { lastChanged = null; });
toUnitSelect.addEventListener("blur", () => { lastChanged = null; });

// --- Initial setup ---
populateUnitDropdowns(typeSelect.value);
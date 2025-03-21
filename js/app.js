// Global variables
let ocafFactors = {}; // Will store our OCAF factors
let customRowCount = 0; // Counter for custom added rows

// DOM elements
const stateSelect = document.getElementById('state-select');
const currentDebtService = document.getElementById('current-debt-service');
const unitMatrix = document.getElementById('unit-matrix');
const addRowBtn = document.getElementById('add-row-btn');
const calculateBtn = document.getElementById('calculate-btn');
const resetBtn = document.getElementById('reset-btn');
const resultsSection = document.getElementById('results-section');
const resultState = document.getElementById('result-state');
const resultOcafFactor = document.getElementById('result-ocaf-factor');
const resultDebtService = document.getElementById('result-debt-service');
const resultAdjustedAmount = document.getElementById('result-adjusted-amount');
const unitMatrixResults = document.getElementById('unit-matrix-results').querySelector('tbody');
const resultTotalCurrent = document.getElementById('result-total-current');
const resultTotalAdjusted = document.getElementById('result-total-adjusted');
const resultAnnualCurrent = document.getElementById('result-annual-current');
const resultAnnualAdjusted = document.getElementById('result-annual-adjusted');
const exportPdfBtn = document.getElementById('export-pdf');
const exportExcelBtn = document.getElementById('export-excel');
const selectedOcafDisplay = document.getElementById('selected-ocaf-display');
const selectedOcafFactor = document.getElementById('selected-ocaf-factor');
const totalRentPotential = document.getElementById('total-rent-potential');
const annualRentPotential = document.getElementById('annual-rent-potential');

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initialize);

// Format currency with commas and two decimal places
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Parse currency string to number
function parseCurrency(currencyString) {
    if (!currencyString) return 0;
    return parseFloat(currencyString.replace(/[$,]/g, '')) || 0;
}

function initialize() {
    // Load OCAF factors from JSON file
    loadOcafFactors();
    
    // Set up event listeners
    addRowBtn.addEventListener('click', addUnitMatrixRow);
    calculateBtn.addEventListener('click', performCalculation);
    resetBtn.addEventListener('click', resetForm);
    exportPdfBtn.addEventListener('click', exportAsPdf);
    exportExcelBtn.addEventListener('click', exportAsExcel);
    
    // Add event listener for state selection change
    stateSelect.addEventListener('change', updateSelectedOcafFactor);
    
    // Add event listeners for real-time calculation updates in the unit matrix
    const tbody = unitMatrix.querySelector('tbody');
    tbody.addEventListener('input', updateUnitMatrixCalculations);
    
    // Set up currency input formatting
    setupCurrencyInputs();
    
    // Initial calculation update
    updateUnitMatrixCalculations();
}

// Set up currency input formatting
function setupCurrencyInputs() {
    // Set up formatters for all currency inputs
    const currencyInputs = document.querySelectorAll('.currency-input');
    currencyInputs.forEach(input => {
        // Format when input loses focus
        input.addEventListener('blur', function() {
            const value = parseCurrency(this.value);
            if (!isNaN(value)) {
                this.value = formatCurrency(value).replace('$', '');
            }
        });
        
        // Clear formatting when input gets focus
        input.addEventListener('focus', function() {
            const value = parseCurrency(this.value);
            if (!isNaN(value)) {
                this.value = value.toFixed(2);
            }
        });
    });
}

// Load OCAF factors from JSON file
function loadOcafFactors() {
    fetch('data/ocaf-factors.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load OCAF factors');
            }
            return response.json();
        })
        .then(data => {
            // Access the nested state factors inside the "2025factors" object
            ocafFactors = data["2025factors"];
            populateStateDropdown();
        })
        .catch(error => {
            console.error('Error loading OCAF factors:', error);
            alert('Error loading OCAF factors. Please try refreshing the page.');
        });
}

// Populate state dropdown with options from the OCAF factors
function populateStateDropdown() {
    // Get states and sort by full name
    const states = Object.keys(ocafFactors);
    states.sort((a, b) => {
        return ocafFactors[a].name.localeCompare(ocafFactors[b].name);
    });
    
    // Create and append options to the dropdown
    states.forEach(stateCode => {
        const option = document.createElement('option');
        option.value = stateCode;
        option.textContent = ocafFactors[stateCode].name + ' (' + stateCode + ')';
        stateSelect.appendChild(option);
    });
}

// Add a new row to the Unit Matrix
function addUnitMatrixRow() {
    customRowCount++;
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td><input type="text" class="unit-type" placeholder="Custom Unit ${customRowCount}"></td>
        <td><input type="number" class="unit-count" min="0"></td>
        <td><input type="text" class="unit-rent currency-input" min="0" step="0.01"></td>
        <td class="calculated-cell rent-potential">$0.00</td>
        <td><button class="remove-row-btn">Remove</button></td>
    `;
    
    // Add event listener to the remove button
    const removeBtn = newRow.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', function() {
        unitMatrix.querySelector('tbody').removeChild(newRow);
        updateUnitMatrixCalculations();
    });
    
    // Add the new row to the table
    unitMatrix.querySelector('tbody').appendChild(newRow);
    
    // Set up currency formatting for the new row
    setupCurrencyInputs();
}

// Update calculations in the Unit Matrix
function updateUnitMatrixCalculations() {
    const rows = unitMatrix.querySelectorAll('tbody tr');
    let monthlyTotal = 0;
    
    // Process each row
    rows.forEach(row => {
        const unitCount = parseInt(row.querySelector('.unit-count').value) || 0;
        const unitRent = parseCurrency(row.querySelector('.unit-rent').value) || 0;
        
        // Calculate rent potential (B x C)
        const rentPotential = unitCount * unitRent;
        monthlyTotal += rentPotential;
        
        // Update the cell with formatted currency
        row.querySelector('.rent-potential').textContent = formatCurrency(rentPotential);
    });
    
    // Calculate annual total (E x 12)
    const annualTotal = monthlyTotal * 12;
    
    // Update the totals with formatted currency
    totalRentPotential.textContent = formatCurrency(monthlyTotal);
    annualRentPotential.textContent = formatCurrency(annualTotal);
}

// Update the OCAF factor display when state selection changes
function updateSelectedOcafFactor() {
    const selectedState = stateSelect.value;
    
    if (selectedState) {
        const ocafFactor = ocafFactors[selectedState].factor;
        selectedOcafFactor.textContent = ocafFactor.toFixed(3);
        selectedOcafDisplay.classList.remove('hidden');
    } else {
        selectedOcafDisplay.classList.add('hidden');
    }
}

// Perform the calculation
function performCalculation() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }
    
    // Get selected state and its OCAF factor
    const selectedState = stateSelect.value;
    const selectedStateData = ocafFactors[selectedState];
    const ocafFactor = selectedStateData.factor;
    
    // Get current debt service
    const debtService = parseCurrency(currentDebtService.value);
    
    // Calculate adjusted amount
    const adjustedAmount = debtService * ocafFactor;
    
    // Display results
    resultState.textContent = selectedStateData.name + ' (' + selectedState + ')';
    resultOcafFactor.textContent = ocafFactor.toFixed(3);
    resultDebtService.textContent = formatCurrency(debtService);
    resultAdjustedAmount.textContent = formatCurrency(adjustedAmount);
    
    // Calculate and display unit matrix results
    calculateUnitMatrixResults(ocafFactor);
    
    // Show results section
    resultsSection.classList.remove('hidden');
}

// Validate all inputs before calculation
function validateInputs() {
    // Check if state is selected
    if (!stateSelect.value) {
        alert('Please select a state.');
        stateSelect.focus();
        return false;
    }
    
    // Check if current debt service is provided
    if (!currentDebtService.value || isNaN(parseCurrency(currentDebtService.value))) {
        alert('Please enter a valid Current Debt Service amount.');
        currentDebtService.focus();
        return false;
    }
    
    // Check if there's at least one unit with data in the matrix
    const unitCounts = document.querySelectorAll('.unit-count');
    let hasUnitData = false;
    
    for (let i = 0; i < unitCounts.length; i++) {
        if (unitCounts[i].value && parseInt(unitCounts[i].value) > 0) {
            hasUnitData = true;
            break;
        }
    }
    
    if (!hasUnitData) {
        alert('Please enter data for at least one unit type in the Unit Matrix.');
        return false;
    }
    
    return true;
}

// Calculate results for the unit matrix
function calculateUnitMatrixResults(ocafFactor) {
    // Clear previous results
    unitMatrixResults.innerHTML = '';
    
    // Get all rows from the unit matrix
    const rows = unitMatrix.querySelectorAll('tbody tr');
    
    let totalCurrentPotential = 0;
    let totalAdjustedPotential = 0;
    
    // Process each row
    rows.forEach(row => {
        // Get values from the row
        const unitType = row.querySelector('.unit-type').value || 'Unit';
        const unitCount = parseInt(row.querySelector('.unit-count').value) || 0;
        const unitRent = parseCurrency(row.querySelector('.unit-rent').value) || 0;
        
        // Skip rows with no units
        if (unitCount === 0) {
            return;
        }
        
        // Calculate rent potentials
        const currentPotential = unitCount * unitRent;
        const adjustedRent = unitRent * ocafFactor;
        const adjustedPotential = unitCount * adjustedRent;
        
        // Add to totals
        totalCurrentPotential += currentPotential;
        totalAdjustedPotential += adjustedPotential;
        
        // Create a new row for results
        const resultRow = document.createElement('tr');
        resultRow.innerHTML = `
            <td>${unitType}</td>
            <td>${unitCount}</td>
            <td>${formatCurrency(unitRent)}</td>
            <td>${formatCurrency(currentPotential)}</td>
            <td>${formatCurrency(adjustedRent)}</td>
            <td>${formatCurrency(adjustedPotential)}</td>
        `;
        
        // Add the row to results table
        unitMatrixResults.appendChild(resultRow);
    });
    
    // Calculate annual totals
    const annualCurrentPotential = totalCurrentPotential * 12;
    const annualAdjustedPotential = totalAdjustedPotential * 12;
    
    // Update totals in the results
    resultTotalCurrent.textContent = formatCurrency(totalCurrentPotential);
    resultTotalAdjusted.textContent = formatCurrency(totalAdjustedPotential);
    resultAnnualCurrent.textContent = formatCurrency(annualCurrentPotential);
    resultAnnualAdjusted.textContent = formatCurrency(annualAdjustedPotential);
}

// Reset the form
function resetForm() {
    // Reset dropdown and inputs
    stateSelect.value = '';
    currentDebtService.value = '';
    
    // Hide OCAF factor display
    selectedOcafDisplay.classList.add('hidden');
    
    // Reset unit matrix to default state
    const tbody = unitMatrix.querySelector('tbody');
    
    // Remove all custom rows (with remove buttons)
    const customRows = tbody.querySelectorAll('tr:has(.remove-row-btn)');
    customRows.forEach(row => {
        tbody.removeChild(row);
    });
    
    // Clear all inputs in the remaining rows
    const inputs = tbody.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Reset calculated values
    const calculatedCells = tbody.querySelectorAll('.calculated-cell');
    calculatedCells.forEach(cell => {
        cell.textContent = '$0.00';
    });
    
    // Reset the totals
    totalRentPotential.textContent = '$0.00';
    annualRentPotential.textContent = '$0.00';
    
    // Reset custom row counter
    customRowCount = 0;
    
    // Hide results section
    resultsSection.classList.add('hidden');
}

// Export results as PDF
function exportAsPdf() {
    alert('PDF export functionality will be implemented in Phase 3 of the project.');
    // This will be implemented later with jsPDF library
}

// Export results as Excel
function exportAsExcel() {
    alert('Excel export functionality will be implemented in Phase 3 of the project.');
    // This will be implemented later with SheetJS library
}
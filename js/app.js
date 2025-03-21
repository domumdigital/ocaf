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
const exportPdfBtn = document.getElementById('export-pdf');
const exportExcelBtn = document.getElementById('export-excel');

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
    // Load OCAF factors from JSON file
    loadOcafFactors();
    
    // Set up event listeners
    addRowBtn.addEventListener('click', addUnitMatrixRow);
    calculateBtn.addEventListener('click', performCalculation);
    resetBtn.addEventListener('click', resetForm);
    exportPdfBtn.addEventListener('click', exportAsPdf);
    exportExcelBtn.addEventListener('click', exportAsExcel);
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
            ocafFactors = data;
            populateStateDropdown();
        })
        .catch(error => {
            console.error('Error loading OCAF factors:', error);
            alert('Error loading OCAF factors. Please try refreshing the page.');
        });
}

// Populate state dropdown with options from the OCAF factors
function populateStateDropdown() {
    // Sort states alphabetically
    const states = Object.keys(ocafFactors).sort();
    
    // Create and append options to the dropdown
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Add a new row to the Unit Matrix
function addUnitMatrixRow() {
    customRowCount++;
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td>
            <input type="text" class="unit-type" placeholder="Custom Unit ${customRowCount}">
        </td>
        <td><input type="number" class="unit-count" min="0"></td>
        <td><input type="number" class="unit-sqft" min="0"></td>
        <td><input type="number" class="unit-rent" min="0" step="0.01"></td>
        <td><button class="remove-row-btn">Remove</button></td>
    `;
    
    // Add event listener to the remove button
    const removeBtn = newRow.querySelector('.remove-row-btn');
    removeBtn.addEventListener('click', function() {
        unitMatrix.querySelector('tbody').removeChild(newRow);
    });
    
    // Add the new row to the table
    unitMatrix.querySelector('tbody').appendChild(newRow);
}

// Perform the calculation
function performCalculation() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }
    
    // Get selected state and its OCAF factor
    const selectedState = stateSelect.value;
    const ocafFactor = ocafFactors[selectedState];
    
    // Get current debt service
    const debtService = parseFloat(currentDebtService.value);
    
    // Calculate adjusted amount
    const adjustedAmount = debtService * ocafFactor;
    
    // Display results
    resultState.textContent = selectedState;
    resultOcafFactor.textContent = ocafFactor.toFixed(3);
    resultDebtService.textContent = '$' + debtService.toFixed(2);
    resultAdjustedAmount.textContent = '$' + adjustedAmount.toFixed(2);
    
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
    if (!currentDebtService.value || isNaN(parseFloat(currentDebtService.value))) {
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
    
    // Process each row
    rows.forEach(row => {
        // Get values from the row
        const unitType = row.querySelector('td:first-child').textContent || row.querySelector('.unit-type').value;
        const unitCount = parseInt(row.querySelector('.unit-count').value) || 0;
        const unitSqft = parseInt(row.querySelector('.unit-sqft').value) || 0;
        const unitRent = parseFloat(row.querySelector('.unit-rent').value) || 0;
        
        // Skip rows with no units
        if (unitCount === 0) {
            return;
        }
        
        // Calculate adjusted rent
        const adjustedRent = unitRent * ocafFactor;
        
        // Create a new row for results
        const resultRow = document.createElement('tr');
        resultRow.innerHTML = `
            <td>${unitType}</td>
            <td>${unitCount}</td>
            <td>${unitSqft}</td>
            <td>$${unitRent.toFixed(2)}</td>
            <td>$${adjustedRent.toFixed(2)}</td>
        `;
        
        // Add the row to results table
        unitMatrixResults.appendChild(resultRow);
    });
}

// Reset the form
function resetForm() {
    // Reset dropdown and inputs
    stateSelect.value = '';
    currentDebtService.value = '';
    
    // Reset unit matrix to default state
    const tbody = unitMatrix.querySelector('tbody');
    
    // Remove all custom rows
    const rows = tbody.querySelectorAll('tr');
    for (let i = 3; i < rows.length; i++) {
        tbody.removeChild(rows[i]);
    }
    
    // Clear all inputs in the remaining rows
    const inputs = tbody.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = '';
    });
    
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
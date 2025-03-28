// Global variables
let ocafFactors = {}; // Will store our OCAF factors
let customRowCount = 0; // Counter for custom added rows

// Flag to track when the page is unloading
window.isPageUnloading = false;

// Set the flag when the page begins to unload
window.addEventListener('beforeunload', function() {
    window.isPageUnloading = true;
});

// DOM elements - using null checks to prevent errors on non-calculator pages
const stateSelect = document.getElementById('state-select') || null;
const currentDebtService = document.getElementById('current-debt-service') || null;
const nonExpiringRentPotential = document.getElementById('non-expiring-rent-potential') || null;
const nonSection8RentPotential = document.getElementById('non-section8-rent-potential') || null;
const unitMatrix = document.getElementById('unit-matrix') || null;
const addRowBtn = document.getElementById('add-row-btn') || null;
const calculateBtn = document.getElementById('calculate-btn') || null;
const resetBtn = document.getElementById('reset-btn') || null;
const resultsSection = document.getElementById('results-section') || null;
const totalRentPotential = document.getElementById('total-rent-potential') || null;
const annualRentPotential = document.getElementById('annual-rent-potential') || null;
const exportPdfBtn = document.getElementById('export-pdf') || null;
const exportExcelBtn = document.getElementById('export-excel') || null;
const selectedOcafDisplay = document.getElementById('selected-ocaf-display') || null;
const selectedOcafFactor = document.getElementById('selected-ocaf-factor') || null;
const adjustedRentsTable = document.getElementById('adjusted-rents-table') || null;
const annualAdjustedRentPotential = document.getElementById('annual-adjusted-rent-potential') || null;

// Initialize the application when the DOM is fully loaded, but only if we're on the calculator page
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the calculator elements exist on this page
    if (document.getElementById('unit-matrix') && document.getElementById('calculate-btn')) {
        initialize();
    }
});

// Format number with commas (no dollar sign)
function formatNumber(number) {
    if (isNaN(number)) return '';
    
    // Ensure we have a proper number with 2 decimal places
    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format currency with commas and dollar sign
function formatCurrency(amount) {
    if (isNaN(amount)) return '$0.00';
    
    return '$' + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Parse formatted number string to number
function parseFormattedNumber(formattedString) {
    if (!formattedString || formattedString.trim() === '') return 0;
    // Remove all commas and any non-numeric characters except decimal point
    return parseFloat(formattedString.replace(/[^\d.-]/g, '')) || 0;
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
    
    // Set up number formatting for inputs
    setupNumberFormatting();
    
    // Initial calculation update
    updateUnitMatrixCalculations();

    // Add a cleanup handler for page navigation
window.addEventListener('beforeunload', function() {
    // Remove all event listeners that might trigger errors during navigation
    const tbody = unitMatrix?.querySelector('tbody');
    if (tbody) {
        tbody.removeEventListener('input', updateUnitMatrixCalculations);
    }
    
    if (addRowBtn) addRowBtn.removeEventListener('click', addUnitMatrixRow);
    if (calculateBtn) calculateBtn.removeEventListener('click', performCalculation);
    if (resetBtn) resetBtn.removeEventListener('click', resetForm);
    if (exportPdfBtn) exportPdfBtn.removeEventListener('click', exportAsPdf);
    if (exportExcelBtn) exportExcelBtn.removeEventListener('click', exportAsExcel);
    if (stateSelect) stateSelect.removeEventListener('change', updateSelectedOcafFactor);
});
}

// Setup number formatting for all relevant inputs
function setupNumberFormatting() {
    // Set up the current debt service input
    setupNumberInput(currentDebtService);
    
    // Set up the new inputs
    setupNumberInput(nonExpiringRentPotential);
    setupNumberInput(nonSection8RentPotential);
    
    // Set up all unit count inputs
    const unitCounts = document.querySelectorAll('.unit-count');
    unitCounts.forEach(input => {
        setupNumberInput(input);
    });
    
    // Set up all unit rent inputs
    const unitRents = document.querySelectorAll('.unit-rent');
    unitRents.forEach(input => {
        setupNumberInput(input);
    });
}

// Set up formatting for a single number input
function setupNumberInput(input) {
    // When the input loses focus
    input.addEventListener('blur', function() {
        // Only format if there's a value
        if (this.value && this.value.trim() !== '') {
            const numValue = parseFormattedNumber(this.value);
            if (!isNaN(numValue)) {
                this.value = formatNumber(numValue);
            }
        }
    });
    
    // When the input gets focus
    input.addEventListener('focus', function() {
        // Only convert if there's a value and it contains formatting
        if (this.value && this.value.includes(',')) {
            const numValue = parseFormattedNumber(this.value);
            if (!isNaN(numValue)) {
                // Just remove the commas but keep the decimal places
                this.value = numValue.toString();
            }
        }
    });
    
    // Fix for initial values (if any)
    if (input.value && input.value.trim() !== '') {
        const numValue = parseFormattedNumber(input.value);
        if (!isNaN(numValue)) {
            input.value = formatNumber(numValue);
        }
    }
}

// Load OCAF factors from JSON file
function loadOcafFactors() {
    // Create an AbortController to manage the fetch request
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Flag to track if the page is being unloaded
    let isUnloading = false;
    
    // Handler for navigation events
    const handleNavigation = () => {
        isUnloading = true;
        controller.abort();
    };
    
    // Listen for navigation events
    window.addEventListener('beforeunload', handleNavigation);
    
    // Use absolute path for fetch to ensure it works from any page
    const fetchPath = window.location.pathname.includes('/ocaf/') 
        ? '/ocaf/data/ocaf-factors.json' 
        : '/data/ocaf-factors.json';
    
    fetch(fetchPath, { signal })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load OCAF factors');
            }
            return response.json();
        })
        .then(data => {
            // Clean up event listeners
            window.removeEventListener('beforeunload', handleNavigation);
            
            // Access the nested state factors inside the "2025factors" object
            ocafFactors = data["2025factors"];
            populateStateDropdown();
        })
        .catch(error => {
            // Clean up event listeners
            window.removeEventListener('beforeunload', handleNavigation);
            
            // Only show alert if:
            // 1. It's not an AbortError (which happens during navigation)
            // 2. The page isn't being unloaded
            // 3. The document is still visible
            if (!isUnloading && 
                error.name !== 'AbortError' && 
                document.visibilityState !== 'hidden') {
                
                console.error('Error loading OCAF factors:', error);
                alert('Error loading OCAF factors. Please try refreshing the page.');
            }
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
        <td><input type="text" class="unit-count number-input" min="0"></td>
        <td><input type="text" class="unit-rent number-input" min="0" step="0.01"></td>
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
    
    // Set up number formatting for the new inputs
    setupNumberInput(newRow.querySelector('.unit-count'));
    setupNumberInput(newRow.querySelector('.unit-rent'));
}

// Update calculations in the Unit Matrix
function updateUnitMatrixCalculations() {
    const rows = unitMatrix.querySelectorAll('tbody tr');
    let monthlyTotal = 0;
    
    // Process each row
    rows.forEach(row => {
        // Parse values from inputs
        const unitCountInput = row.querySelector('.unit-count');
        const unitRentInput = row.querySelector('.unit-rent');
        
        const unitCount = parseFormattedNumber(unitCountInput.value) || 0;
        const unitRent = parseFormattedNumber(unitRentInput.value) || 0;
        
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

// Perform the calculation - Updated with the corrected formulas and adding Step 3 calculations
function performCalculation() {
    // Validate inputs
    if (!validateInputs()) {
        return;
    }
    
    // Get selected state and its OCAF factor
    const selectedState = stateSelect.value;
    const selectedStateData = ocafFactors[selectedState];
    const ocafFactor = selectedStateData.factor;
    
    // Get values from inputs
    const annualSect8RentPotential = parseFormattedNumber(annualRentPotential.textContent); // (F)
    const annualNonExpiringRentPotential = parseFormattedNumber(nonExpiringRentPotential.value); // (G)
    const annualNonSect8RentPotential = parseFormattedNumber(nonSection8RentPotential.value); // (H)
    const debtService = parseFormattedNumber(currentDebtService.value); // (K)
    
    // Step 2: Perform calculations
    // (I) = (F) + (G) + (H) - Total Annual Project Rent Potential
    const totalAnnualProjectRentPotential = annualSect8RentPotential + annualNonExpiringRentPotential + annualNonSect8RentPotential;
    
    // (J) = (F) / (I) - Expiring Section 8 Percentage of Total
    const expiringSect8Percentage = totalAnnualProjectRentPotential > 0 ? 
        annualSect8RentPotential / totalAnnualProjectRentPotential : 0;
    
    // (L) = (J) * (K) - Section 8 Portion of Current Debt Service
    const sect8PortionOfDebtService = expiringSect8Percentage * debtService;
    
    // (M) = (F) - (L) - Annual Expiring Section 8 Contract Rent Potential minus Section 8 Portion of Current Debt Service
    const annualExpiringSect8MinusDebtService = annualSect8RentPotential - sect8PortionOfDebtService;
    
    // (O) = (M) * (N) - Annual Expiring Section 8 Rent Potential Attributed to Operations Multiplied by Published OCAF
    const sect8RentPotentialOperations = annualExpiringSect8MinusDebtService * ocafFactor;
    
    // (P) = (L) + (O) - Adjusted Contract Rent Potential
    const adjustedContractRentPotential = sect8PortionOfDebtService + sect8RentPotentialOperations;
    
    // (Q) = (P) - Lesser of (P) or Comparable Rent Potential From Rent Comparability Study
    // For now, just setting (Q) = (P) as requested
    const lesserOfPOrComparableRent = adjustedContractRentPotential;
    
    // (R) = (Q) / (F) - Increase Factor
    const increaseFactor = annualSect8RentPotential > 0 ? 
        lesserOfPOrComparableRent / annualSect8RentPotential : 0;
    
    // Update the DOM with calculation results
    document.getElementById('result-state').textContent = selectedStateData.name + ' (' + selectedState + ')';
    document.getElementById('result-ocaf-factor').textContent = ocafFactor.toFixed(3);
    document.getElementById('result-current-debt').textContent = formatCurrency(debtService);
    
    // Update Step 2 calculations
    document.getElementById('total-annual-project-rent').textContent = formatCurrency(totalAnnualProjectRentPotential);
    document.getElementById('expiring-section8-percentage').textContent = (expiringSect8Percentage * 100).toFixed(2) + '%';
    document.getElementById('section8-portion-debt').textContent = formatCurrency(sect8PortionOfDebtService);
    document.getElementById('ocaf-adjusted-section8-debt').textContent = formatCurrency(annualExpiringSect8MinusDebtService);
    document.getElementById('ocaf-adjustment').textContent = ocafFactor.toFixed(3);
    document.getElementById('section8-rent-operations').textContent = formatCurrency(sect8RentPotentialOperations);
    document.getElementById('adjusted-contract-rent').textContent = formatCurrency(adjustedContractRentPotential);
    document.getElementById('lesser-of-p-or-comparable').textContent = formatCurrency(lesserOfPOrComparableRent);
    document.getElementById('increase-factor').textContent = increaseFactor.toFixed(4);
    
    // Update Step 3 results - Generate the Adjusted Rents table
    populateAdjustedRentsTable(increaseFactor);
    
    // Show results section
    resultsSection.classList.remove('hidden');
}

// Populate the Adjusted Rents table in Step 3
function populateAdjustedRentsTable(increaseFactor) {
    // Get all rows from the Unit Matrix in Step 1
    const unitMatrixRows = unitMatrix.querySelectorAll('tbody tr');
    
    // Clear existing rows in the Adjusted Rents table
    const adjustedRentsTbody = adjustedRentsTable.querySelector('tbody');
    adjustedRentsTbody.innerHTML = '';
    
    // Total for column X (to calculate Y)
    let totalAnnualAdjustedRentPotential = 0;
    
    // Process each row from the Unit Matrix
    unitMatrixRows.forEach(row => {
        // Get data from Step 1
        const unitType = row.querySelector('.unit-type').value || 'Unnamed Unit';
        const unitCount = parseFormattedNumber(row.querySelector('.unit-count').value) || 0;
        const currentRent = parseFormattedNumber(row.querySelector('.unit-rent').value) || 0;
        
        // Only add rows that have both unit count and current rent
        if (unitCount > 0 && currentRent > 0) {
            // Calculate new values for Step 3
            // (V) = (R) * (U), rounded to nearest whole dollar
            const adjustedRent = Math.round(increaseFactor * currentRent);
            
            // (W) = (V) * 12, using the already rounded value from (V)
            const annualAdjustedRent = adjustedRent * 12;
            
            // (X) = (T) * (W), using the value from (W)
            const annualRentPotential = unitCount * annualAdjustedRent;
            
            // Add to total
            totalAnnualAdjustedRentPotential += annualRentPotential;
            
            // Create new row
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${unitType}</td>
                <td>${unitCount}</td>
                <td>${formatCurrency(currentRent)}</td>
                <td>${formatCurrency(adjustedRent)}</td>
                <td>${formatCurrency(annualAdjustedRent)}</td>
                <td>${formatCurrency(annualRentPotential)}</td>
            `;
            
            // Add row to table
            adjustedRentsTbody.appendChild(newRow);
        }
    });
    
    // Update the total (Y)
    annualAdjustedRentPotential.textContent = formatCurrency(Math.round(totalAnnualAdjustedRentPotential));
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
    if (!currentDebtService.value || parseFormattedNumber(currentDebtService.value) <= 0) {
        alert('Please enter a valid Current Debt Service amount.');
        currentDebtService.focus();
        return false;
    }
    
    // Check if there's at least one unit with data in the matrix
    const unitCounts = document.querySelectorAll('.unit-count');
    let hasUnitData = false;
    
    for (let i = 0; i < unitCounts.length; i++) {
        if (unitCounts[i].value && parseFormattedNumber(unitCounts[i].value) > 0) {
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

// Reset the form
function resetForm() {
    // Reset dropdown and inputs
    stateSelect.value = '';
    currentDebtService.value = '';
    nonExpiringRentPotential.value = '';
    nonSection8RentPotential.value = '';
    
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

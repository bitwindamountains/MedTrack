/**
 * MedTrack Medical Inventory System
 * Complete implementation with:
 * - Dark mode toggle
 * - Working filters
 * - Fullscreen UI fixes
 * - Enhanced editing functionality
 */

// ===== Data Management =====
let inventoryData = {
  inventory: [],
  usageHistory: []
};

// Chart instances
let inventoryChart, usageChart, depletionChart;

/**
 * Load data from localStorage or initialize with sample data
 * @returns {Object} The loaded inventory data
 */
function loadData() {
  try {
    const savedData = localStorage.getItem('medtrack-data');
    if (savedData) {
      inventoryData = JSON.parse(savedData);
      console.log('Data loaded from localStorage');
    } else {
      // Initialize with sample data
      inventoryData = {
        inventory: [
          {
            id: 1,
            name: "Paracetamol 500mg",
            category: "Medication",
            quantity: 150,
            threshold: 50,
            supplier: "Pharma Inc.",
            expiryDate: "2025-12-31",
            location: "Shelf A1",
            usageRate: 10
          },
          {
            id: 2,
            name: "Medical Gloves",
            category: "PPE",
            quantity: 200,
            threshold: 100,
            supplier: "Safety Supplies",
            expiryDate: null,
            location: "Storage B",
            usageRate: 15
          },
          {
            id: 3,
            name: "Bandages",
            category: "Supplies",
            quantity: 120,
            threshold: 40,
            supplier: "MediCorp",
            expiryDate: "2025-01-15",
            location: "Shelf C1",
            usageRate: 8
          },
          {
            id: 4,
            name: "Antiseptic Solution",
            category: "Medication",
            quantity: 45,
            threshold: 20,
            supplier: "Pharma Inc.",
            expiryDate: "2025-09-15",
            location: "Shelf A3",
            usageRate: 3
          }
        ],
        usageHistory: [
          {
            id: 1,
            itemId: 1,
            itemName: "Paracetamol 500mg",
            quantity: 30,
            patientId: "PT12345",
            prescriber: "Dr. Smith",
            notes: "Prescribed for fever",
            date: new Date().toISOString()
          },
          {
            id: 2,
            itemId: 2,
            itemName: "Medical Gloves",
            quantity: 5,
            patientId: null,
            prescriber: "Nurse Williams",
            notes: "Procedure room restock",
            date: new Date(Date.now() - 86400000).toISOString() // Yesterday
          }
        ]
      };
      console.log('Initialized with sample data');
      saveData();
    }
    return inventoryData;
  } catch (error) {
    console.error('Error loading data:', error);
    throw new Error('Failed to load inventory data');
  }
}

/**
 * Save data to localStorage
 * @returns {boolean} True if save was successful
 */
function saveData() {
  try {
    localStorage.setItem('medtrack-data', JSON.stringify(inventoryData));
    console.log('Data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    throw new Error('Failed to save inventory data');
  }
}

// ===== Inventory Management =====
/**
 * Get all inventory items with optional filtering
 * @param {string} category - Category filter
 * @param {string} status - Status filter
 * @returns {Array} Filtered array of inventory items
 */
function getInventory(category = '', status = '') {
  let items = [...inventoryData.inventory];
  
  // Apply category filter if specified
  if (category) {
    items = items.filter(item => item.category === category);
  }
  
  // Apply status filter if specified
  if (status) {
    items = items.filter(item => {
      const itemStatus = getItemStatus(item);
      return itemStatus === status;
    });
  }
  
  return items;
}

/**
 * Get inventory item by ID
 * @param {number} id - The item ID to find
 * @returns {Object|null} The found item or null if not found
 */
function getInventoryItem(id) {
  const item = inventoryData.inventory.find(item => item.id === id);
  if (!item) {
    console.error(`Item with ID ${id} not found`);
    return null;
  }
  return item;
}

/**
 * Add or update inventory item
 * @param {Object} itemData - The item data to save
 * @returns {number} The saved item ID
 */
function saveInventoryItem(itemData) {
  try {
    // Validate required fields
    if (!itemData.name || !itemData.category || 
        isNaN(itemData.quantity) || isNaN(itemData.threshold)) {
      throw new Error('Missing required fields');
    }

    // Convert ID to number if it exists
    const itemId = itemData.id ? parseInt(itemData.id) : null;

    if (itemId) {
      // Update existing item
      const index = inventoryData.inventory.findIndex(item => item.id === itemId);
      if (index === -1) {
        throw new Error(`Item with ID ${itemId} not found for update`);
      }
      
      // Preserve existing usageRate if not provided
      const existingItem = inventoryData.inventory[index];
      itemData.usageRate = itemData.usageRate || existingItem.usageRate || 0;
      
      inventoryData.inventory[index] = { ...existingItem, ...itemData };
    } else {
      // Add new item
      const newId = inventoryData.inventory.length > 0 
        ? Math.max(...inventoryData.inventory.map(item => item.id)) + 1 
        : 1;
      
      itemData.id = newId;
      itemData.usageRate = itemData.usageRate || 0;
      inventoryData.inventory.push(itemData);
    }
    
    saveData();
    return itemData.id;
  } catch (error) {
    console.error('Error saving item:', error);
    throw error;
  }
}

/**
 * Delete inventory item
 * @param {number} id - The ID of the item to delete
 * @returns {boolean} True if deletion was successful
 */
function deleteInventoryItem(id) {
  try {
    const initialLength = inventoryData.inventory.length;
    inventoryData.inventory = inventoryData.inventory.filter(item => item.id !== id);
    
    if (inventoryData.inventory.length === initialLength) {
      throw new Error('Item not found');
    }
    
    saveData();
    return true;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// ===== Usage Tracking =====
/**
 * Record medication usage
 * @param {Object} usageData - The usage data to record
 * @returns {number} The new usage record ID
 */
function recordUsage(usageData) {
  try {
    // Validate required fields
    if (!usageData.itemId || isNaN(usageData.quantity) || !usageData.date) {
      throw new Error('Missing required usage data');
    }

    const item = getInventoryItem(parseInt(usageData.itemId));
    if (!item) throw new Error('Item not found');
    
    // Validate quantity
    const quantity = parseInt(usageData.quantity);
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (item.quantity < quantity) throw new Error('Insufficient stock');
    
    // Update stock
    item.quantity -= quantity;
    
    // Create usage record with proper date handling
    const usageDate = new Date(usageData.date);
    if (isNaN(usageDate.getTime())) {
      throw new Error('Invalid date format');
    }

    const newRecord = {
      id: inventoryData.usageHistory.length + 1,
      itemId: usageData.itemId,
      itemName: item.name,
      quantity: quantity,
      patientId: usageData.patientId || null,
      prescriber: usageData.prescriber || null,
      notes: usageData.notes || null,
      date: usageDate.toISOString()
    };
    
    inventoryData.usageHistory.push(newRecord);
    saveData();
    return newRecord.id;
  } catch (error) {
    console.error('Error recording usage:', error);
    throw error;
  }
}

// ===== UI Functions =====
/**
 * Initialize the application UI
 */
async function initUI() {
  try {
    // Load data
    await loadData();
    
    // Initialize theme
    initTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Set current date in usage form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('usage-date').value = today;
    
    // Render initial views
    renderInventoryTable();
    renderUsageForm();
    updateDashboardMetrics();
    renderInventoryChart();
    renderUsageChart();
    renderDepletionChart();
    renderAlerts();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    showAlert(`Failed to initialize application: ${error.message}`, 'error');
  }
}

/**
 * Initialize theme from localStorage or prefer-color-scheme
 */
function initTheme() {
  const savedTheme = localStorage.getItem('medtrack-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  updateThemeButton();
}

/**
 * Update theme toggle button text and icon
 */
function updateThemeButton() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  themeToggle.innerHTML = isDark 
    ? '<i class="fas fa-sun"></i> Light Mode' 
    : '<i class="fas fa-moon"></i> Dark Mode';
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('medtrack-theme', newTheme);
  updateThemeButton();
  
  // Re-render charts to update their styles
  renderInventoryChart();
  renderUsageChart();
  renderDepletionChart();
}

/**
 * Render inventory table with current data and filters
 */
function renderInventoryTable() {
  const tableBody = document.getElementById('inventory-items');
  if (!tableBody) {
    console.error('Inventory table body not found');
    return;
  }
  
  // Get current filter values
  const categoryFilter = document.getElementById('category-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  
  // Get filtered inventory
  const filteredInventory = getInventory(categoryFilter, statusFilter);
  
  // Render table rows
  tableBody.innerHTML = filteredInventory.map(item => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${item.quantity}</td>
      <td>${item.threshold}</td>
      <td>${getStatusBadge(item)}</td>
      <td>${item.expiryDate ? formatDate(item.expiryDate) : 'N/A'}</td>
      <td class="actions">
        <button class="btn-edit" data-id="${item.id}" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-history" data-id="${item.id}" title="Usage History">
          <i class="fas fa-history"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Get status badge HTML for an item
 * @param {Object} item - The inventory item
 * @returns {string} HTML for the status badge
 */
function getItemStatus(item) {
  if (item.quantity <= 0) return 'critical';
  if (item.quantity <= item.threshold) return 'critical';
  if (item.quantity <= item.threshold * 2) return 'warning';
  return 'good';
}

/**
 * Get status badge HTML for an item
 * @param {Object} item - The inventory item
 * @returns {string} HTML for the status badge
 */
function getStatusBadge(item) {
  const status = getItemStatus(item);
  const statusText = status === 'good' ? 'Adequate' : 
                    status === 'warning' ? 'Low' : 'Critical';
  
  return `<span class="status-badge status-${status}">${statusText}</span>`;
}

/**
 * Render usage form with current medication options
 */
function renderUsageForm() {
  const dropdown = document.getElementById('usage-item');
  if (!dropdown) {
    console.error('Usage item dropdown not found');
    return;
  }
  
  // Clear existing options
  dropdown.innerHTML = '<option value="">Select Medication</option>';
  
  // Add current medications with positive stock
  getInventory()
    .filter(item => item.quantity > 0 && item.category === 'Medication')
    .forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} (${item.quantity} available)`;
      dropdown.appendChild(option);
    });
}

/**
 * Update dashboard metrics
 */
function updateDashboardMetrics() {
  // Total items
  document.getElementById('total-items').textContent = inventoryData.inventory.length;
  
  // Low stock items (quantity <= threshold)
  const lowStockItems = inventoryData.inventory.filter(item => item.quantity <= item.threshold);
  document.getElementById('low-stock-count').textContent = lowStockItems.length;
  
  // Expiring soon items (within 30 days)
  const today = new Date();
  const expiringItems = inventoryData.inventory.filter(item => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });
  document.getElementById('expiring-count').textContent = expiringItems.length;
  
  // Today's usage
  const todayISO = today.toISOString().split('T')[0];
  const todaysUsage = inventoryData.usageHistory
    .filter(record => record.date.startsWith(todayISO))
    .reduce((sum, record) => sum + record.quantity, 0);
  document.getElementById('todays-usage').textContent = todaysUsage;
}

/**
 * Render inventory chart
 */
function renderInventoryChart() {
  const ctx = document.getElementById('inventory-chart').getContext('2d');
  
  // Group by category and calculate totals
  const categories = {};
  inventoryData.inventory.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = {
        total: 0,
        low: 0,
        critical: 0
      };
    }
    categories[item.category].total += item.quantity;
    if (item.quantity <= item.threshold) {
      categories[item.category].critical += item.quantity;
    } else if (item.quantity <= item.threshold * 2) {
      categories[item.category].low += item.quantity;
    }
  });
  
  const categoryNames = Object.keys(categories);
  
  // Destroy previous chart instance if it exists
  if (inventoryChart) {
    inventoryChart.destroy();
  }
  
  // Get current theme for chart colors
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#E1E8ED' : '#2C3E50';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Create new chart
  inventoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categoryNames,
      datasets: [
        {
          label: 'Adequate Stock',
          data: categoryNames.map(cat => categories[cat].total - categories[cat].low - categories[cat].critical),
          backgroundColor: isDark ? '#38BF70' : '#27AE60',
          stack: 'stack'
        },
        {
          label: 'Low Stock',
          data: categoryNames.map(cat => categories[cat].low),
          backgroundColor: isDark ? '#FFAC2D' : '#F39C12',
          stack: 'stack'
        },
        {
          label: 'Critical Stock',
          data: categoryNames.map(cat => categories[cat].critical),
          backgroundColor: isDark ? '#F05D4C' : '#E74C3C',
          stack: 'stack'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Categories',
            color: textColor
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Quantity',
            color: textColor
          },
          beginAtZero: true,
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const category = context.label;
              const items = inventoryData.inventory.filter(item => item.category === category);
              const criticalItems = items.filter(item => item.quantity <= item.threshold);
              if (criticalItems.length === 0) return '';
              return `Critical items: ${criticalItems.map(item => item.name).join(', ')}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Render usage chart
 */
function renderUsageChart() {
  const ctx = document.getElementById('usage-chart').getContext('2d');
  
  // Get usage statistics for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const usageStats = {};
  inventoryData.usageHistory.forEach(record => {
    const recordDate = new Date(record.date);
    if (recordDate < thirtyDaysAgo) return;
    
    if (!usageStats[record.itemId]) {
      usageStats[record.itemId] = {
        name: record.itemName,
        total: 0
      };
    }
    usageStats[record.itemId].total += record.quantity;
  });
  
  const sortedItems = Object.values(usageStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // Top 5 most used
  
  // Destroy previous chart instance if it exists
  if (usageChart) {
    usageChart.destroy();
  }
  
  // Get current theme for chart colors
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#E1E8ED' : '#2C3E50';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Create new chart
  usageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedItems.map(item => item.name),
      datasets: [{
        label: 'Quantity Used (Last 30 Days)',
        data: sortedItems.map(item => item.total),
        backgroundColor: isDark ? '#3A6DB0' : '#2B579A'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Quantity Used',
            color: textColor
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      }
    }
  });
}

/**
 * Render depletion chart
 */
function renderDepletionChart() {
  const ctx = document.getElementById('depletion-chart').getContext('2d');
  
  // Calculate days until depletion for items with usage rate
  const depletionData = inventoryData.inventory
    .filter(item => item.usageRate > 0)
    .map(item => ({
      name: item.name,
      daysLeft: Math.floor(item.quantity / item.usageRate)
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10); // Top 10 closest to depletion
  
  // Destroy previous chart instance if it exists
  if (depletionChart) {
    depletionChart.destroy();
  }
  
  // Get current theme for chart colors
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#E1E8ED' : '#2C3E50';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  // Create new chart
  depletionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: depletionData.map(item => item.name),
      datasets: [{
        label: 'Days Until Depletion',
        data: depletionData.map(item => item.daysLeft),
        backgroundColor: depletionData.map(item => 
          item.daysLeft <= 7 ? (isDark ? '#F05D4C' : '#E74C3C') :
          item.daysLeft <= 30 ? (isDark ? '#FFAC2D' : '#F39C12') :
          (isDark ? '#38BF70' : '#27AE60')
        )
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Days Remaining',
            color: textColor
          },
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor
          }
        },
        y: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const itemName = context.label;
              const item = inventoryData.inventory.find(i => i.name === itemName);
              return `Current stock: ${item.quantity}\nDaily usage: ${item.usageRate.toFixed(1)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Render alerts
 */
function renderAlerts() {
  // Low stock items
  const lowStockItems = inventoryData.inventory.filter(item => item.quantity <= item.threshold);
  const lowStockList = document.getElementById('low-stock-items');
  if (lowStockList) {
    lowStockList.innerHTML = lowStockItems.map(item => `
      <li>
        <span>${escapeHtml(item.name)} (${item.quantity}/${item.threshold})</span>
        <button class="btn-edit" data-id="${item.id}">
          <i class="fas fa-edit"></i>
        </button>
      </li>
    `).join('');
    document.getElementById('low-stock-badge').textContent = lowStockItems.length;
  }
  
  // Expiring soon items
  const today = new Date();
  const expiringItems = inventoryData.inventory.filter(item => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });
  
  const expiringList = document.getElementById('expiring-items');
  if (expiringList) {
    expiringList.innerHTML = expiringItems.map(item => `
      <li>
        <span>${escapeHtml(item.name)} (${formatDate(item.expiryDate)})</span>
        <button class="btn-edit" data-id="${item.id}">
          <i class="fas fa-edit"></i>
        </button>
      </li>
    `).join('');
    document.getElementById('expiring-badge').textContent = expiringItems.length;
  }
  
  // Depletion alerts
  const depletionAlerts = inventoryData.inventory
    .filter(item => {
      if (item.usageRate <= 0) return false;
      const daysLeft = Math.floor(item.quantity / item.usageRate);
      return daysLeft <= 14 && item.quantity > item.threshold;
    })
    .sort((a, b) => {
      const aDays = Math.floor(a.quantity / a.usageRate);
      const bDays = Math.floor(b.quantity / b.usageRate);
      return aDays - bDays;
    });
  
  const depletionList = document.getElementById('depletion-alerts');
  if (depletionList) {
    depletionList.innerHTML = depletionAlerts.map(item => {
      const daysLeft = Math.floor(item.quantity / item.usageRate);
      return `
        <li>
          <span>${escapeHtml(item.name)} (${daysLeft} days)</span>
          <button class="btn-edit" data-id="${item.id}">
            <i class="fas fa-edit"></i>
          </button>
        </li>
      `;
    }).join('');
    document.getElementById('depletion-badge').textContent = depletionAlerts.length;
  }
}

// ===== Helper Functions =====
/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, error, warning)
 */
function showAlert(message, type = 'success') {
  // In a real app, you'd implement a proper notification system
  console.log(`[${type}] ${message}`);
  alert(message);
}

/**
 * Close all modals
 */
function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

/**
 * Refresh all UI components
 */
function refreshUI() {
  renderInventoryTable();
  renderUsageForm();
  updateDashboardMetrics();
  renderInventoryChart();
  renderUsageChart();
  renderDepletionChart();
  renderAlerts();
}

// ===== Event Listeners =====
/**
 * Setup all event listeners for the application
 */
function setupEventListeners() {
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  
  // Add item button
  document.getElementById('add-item-btn')?.addEventListener('click', () => {
    document.getElementById('item-form').reset();
    document.getElementById('item-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Item';
    document.getElementById('item-modal').style.display = 'flex';
  });
  
  // Item form submission
  document.getElementById('item-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        id: document.getElementById('item-id').value || undefined,
        name: document.getElementById('item-name').value.trim(),
        category: document.getElementById('item-category').value,
        quantity: parseInt(document.getElementById('item-quantity').value),
        threshold: parseInt(document.getElementById('item-threshold').value),
        supplier: document.getElementById('item-supplier').value.trim(),
        expiryDate: document.getElementById('item-expiry').value || null,
        location: document.getElementById('item-location').value.trim()
      };
      
      // Validate required fields
      if (!formData.name || !formData.category || 
          isNaN(formData.quantity) || isNaN(formData.threshold)) {
        throw new Error('Please fill all required fields');
      }
      
      await saveInventoryItem(formData);
      showAlert(`Item ${formData.id ? 'updated' : 'added'} successfully!`);
      closeModal();
      refreshUI();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'error');
    }
  });
  
  // Usage form submission
  document.getElementById('usage-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        itemId: document.getElementById('usage-item').value,
        quantity: document.getElementById('usage-quantity').value,
        date: document.getElementById('usage-date').value,
        patientId: document.getElementById('usage-patient').value.trim() || null,
        prescriber: document.getElementById('usage-prescriber').value.trim() || null,
        notes: document.getElementById('usage-notes').value.trim() || null
      };
      
      // Validate required fields
      if (!formData.itemId || !formData.quantity || !formData.date) {
        throw new Error('Please fill all required fields');
      }
      
      await recordUsage(formData);
      showAlert('Usage recorded successfully!');
      document.getElementById('usage-form').reset();
      // Reset date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('usage-date').value = today;
      refreshUI();
    } catch (error) {
      showAlert(`Error: ${error.message}`, 'error');
    }
  });
  
  // Filter controls
  document.getElementById('category-filter')?.addEventListener('change', renderInventoryTable);
  document.getElementById('status-filter')?.addEventListener('change', renderInventoryTable);
  document.getElementById('reset-filters')?.addEventListener('click', () => {
    document.getElementById('category-filter').value = '';
    document.getElementById('status-filter').value = '';
    renderInventoryTable();
  });
  
  // Modal close buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Click outside modal to close
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal();
    }
  });
  
  // Delegated event for edit buttons
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const id = parseInt(editBtn.dataset.id);
      const item = getInventoryItem(id);
      if (item) {
        // Fill the form with item data
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-threshold').value = item.threshold;
        document.getElementById('item-supplier').value = item.supplier || '';
        document.getElementById('item-expiry').value = item.expiryDate || '';
        document.getElementById('item-location').value = item.location || '';
        document.getElementById('modal-title').textContent = 'Edit Item';
        document.getElementById('item-modal').style.display = 'flex';
      }
    }
    
    // Delegated event for history buttons
    const historyBtn = e.target.closest('.btn-history');
    if (historyBtn) {
      const id = parseInt(historyBtn.dataset.id);
      const item = getInventoryItem(id);
      if (item) {
        const history = inventoryData.usageHistory
          .filter(record => record.itemId === id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        document.getElementById('history-title').textContent = `Usage History: ${item.name}`;
        const tbody = document.getElementById('history-items');
        tbody.innerHTML = history.map(record => `
          <tr>
            <td>${formatDate(record.date)}</td>
            <td>${record.quantity}</td>
            <td>${record.patientId || 'N/A'}</td>
            <td>${escapeHtml(record.notes || '')}</td>
          </tr>
        `).join('');
        
        document.getElementById('history-modal').style.display = 'flex';
      }
    }
  });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);

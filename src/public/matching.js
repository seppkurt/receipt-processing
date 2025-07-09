// Global variables
let allItems = [];
let filteredItems = [];
let currentItem = null;
let brands = [];
let categories = [];
let products = [];

// DOM elements
const statsElements = {
  totalItems: document.getElementById('total-items'),
  matchedItems: document.getElementById('matched-items'),
  unmatchedItems: document.getElementById('unmatched-items'),
  totalReceipts: document.getElementById('total-receipts')
};

const filterElements = {
  statusFilter: document.getElementById('status-filter'),
  searchFilter: document.getElementById('search-filter'),
  refreshBtn: document.getElementById('refresh-btn')
};

const tableElements = {
  selectAll: document.getElementById('select-all'),
  tableBody: document.getElementById('items-table-body'),
  bulkMatchBtn: document.getElementById('bulk-match-btn'),
  exportBtn: document.getElementById('export-btn')
};

const modalElements = {
  matchingModal: document.getElementById('matching-modal'),
  brandModal: document.getElementById('brand-modal'),
  categoryModal: document.getElementById('category-modal')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  await initializePage();
  setupEventListeners();
});

async function initializePage() {
  try {
    // Load all data
    await Promise.all([
      loadStatistics(),
      loadItems(),
      loadBrands(),
      loadCategories(),
      loadProducts()
    ]);

    // Render initial data
    renderItemsTable();
    updateStatistics();
  } catch (error) {
    console.error('Error initializing page:', error);
    showNotification('Error loading data. Please refresh the page.', 'error');
  }
}

function setupEventListeners() {
  // Filter controls
  filterElements.statusFilter.addEventListener('change', filterItems);
  filterElements.searchFilter.addEventListener('input', debounce(filterItems, 300));
  filterElements.refreshBtn.addEventListener('click', initializePage);

  // Table controls
  tableElements.selectAll.addEventListener('change', toggleSelectAll);
  tableElements.bulkMatchBtn.addEventListener('click', openBulkMatchModal);
  tableElements.exportBtn.addEventListener('click', exportToCSV);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Modal cancel buttons
  document.getElementById('cancel-match-btn').addEventListener('click', closeAllModals);
  document.getElementById('cancel-brand-btn').addEventListener('click', closeAllModals);
  document.getElementById('cancel-category-btn').addEventListener('click', closeAllModals);

  // Modal save buttons
  document.getElementById('save-match-btn').addEventListener('click', saveMatch);
  document.getElementById('save-brand-btn').addEventListener('click', saveBrand);
  document.getElementById('save-category-btn').addEventListener('click', saveCategory);

  // New brand/category buttons
  document.getElementById('new-brand-btn').addEventListener('click', () => openModal(modalElements.brandModal));
  document.getElementById('new-category-btn').addEventListener('click', () => openModal(modalElements.categoryModal));

  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
}

// Data loading functions
async function loadStatistics() {
  const response = await fetch('/api/stats');
  const stats = await response.json();
  
  statsElements.totalItems.textContent = stats.total_items || 0;
  statsElements.matchedItems.textContent = stats.matched_items || 0;
  statsElements.unmatchedItems.textContent = stats.unmatched_items || 0;
  statsElements.totalReceipts.textContent = stats.total_receipts || 0;
}

async function loadItems() {
  const response = await fetch('/api/items');
  allItems = await response.json();
  filteredItems = [...allItems];
}

async function loadBrands() {
  const response = await fetch('/api/brands');
  brands = await response.json();
  populateBrandSelect();
}

async function loadCategories() {
  const response = await fetch('/api/categories');
  categories = await response.json();
  populateCategorySelect();
  populateParentCategorySelect();
}

async function loadProducts() {
  const response = await fetch('/api/products');
  products = await response.json();
}

// Filtering functions
function filterItems() {
  const statusFilter = filterElements.statusFilter.value;
  const searchTerm = filterElements.searchFilter.value.toLowerCase();

  filteredItems = allItems.filter(item => {
    // Status filter
    if (statusFilter === 'matched' && !item.matched) return false;
    if (statusFilter === 'unmatched' && item.matched) return false;

    // Search filter
    if (searchTerm) {
      const searchFields = [
        item.item_code,
        item.product_name,
        item.brand,
        item.category,
        item.store_name
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchFields.includes(searchTerm)) return false;
    }

    return true;
  });

  renderItemsTable();
  updateStatistics();
}

function updateStatistics() {
  const matched = filteredItems.filter(item => item.matched).length;
  const unmatched = filteredItems.filter(item => !item.matched).length;
  
  statsElements.matchedItems.textContent = matched;
  statsElements.unmatchedItems.textContent = unmatched;
  statsElements.totalItems.textContent = filteredItems.length;
}

// Table rendering
function renderItemsTable() {
  tableElements.tableBody.innerHTML = '';

  if (filteredItems.length === 0) {
    tableElements.tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
          No items found matching your criteria
        </td>
      </tr>
    `;
    return;
  }

  filteredItems.forEach(item => {
    const row = createTableRow(item);
    tableElements.tableBody.appendChild(row);
  });

  updateBulkMatchButton();
}

function createTableRow(item) {
  const row = document.createElement('tr');
  row.dataset.itemId = item.id;

  const statusBadge = item.matched ? 
    '<span class="status-badge matched-badge">✓ Matched</span>' : 
    '<span class="status-badge unmatched-badge">? Unmatched</span>';

  row.innerHTML = `
    <td><input type="checkbox" class="item-checkbox" data-item-id="${item.id}"></td>
    <td><span class="item-code">${item.item_code || '-'}</span></td>
    <td class="product-name">${item.product_name}</td>
    <td class="quantity">${item.quantity}</td>
    <td class="unit-price">€${item.unit_price?.toFixed(2) || '0.00'}</td>
    <td class="total-price">€${item.total_price?.toFixed(2) || '0.00'}</td>
    <td class="brand">${item.brand || '-'}</td>
    <td>${statusBadge}</td>
    <td>
      <div class="action-buttons">
        ${!item.matched ? `<button class="btn btn-small btn-match" onclick="openMatchModal(${item.id})">Match</button>` : ''}
        <button class="btn btn-small btn-edit" onclick="editItem(${item.id})">Edit</button>
      </div>
    </td>
  `;

  // Add checkbox event listener
  const checkbox = row.querySelector('.item-checkbox');
  checkbox.addEventListener('change', updateBulkMatchButton);

  return row;
}

// Modal functions
function openMatchModal(itemId) {
  currentItem = allItems.find(item => item.id === itemId);
  if (!currentItem) return;

  // Populate item details
  document.getElementById('modal-item-code').textContent = currentItem.item_code || 'N/A';
  document.getElementById('modal-item-name').textContent = currentItem.product_name;
  document.getElementById('modal-item-brand').textContent = currentItem.brand || 'N/A';
  document.getElementById('modal-item-receipt').textContent = currentItem.store_name || 'N/A';

  // Load suggestions
  loadSuggestions(itemId);

  // Reset form
  resetMatchForm();

  openModal(modalElements.matchingModal);
}

async function loadSuggestions(itemId) {
  try {
    const response = await fetch(`/api/items/${itemId}/suggestions`);
    const data = await response.json();
    
    const suggestionsContainer = document.getElementById('quick-match-suggestions');
    suggestionsContainer.innerHTML = '';

    if (data.suggestions.length === 0) {
      suggestionsContainer.innerHTML = '<p>No suggestions found. Use manual match instead.</p>';
      return;
    }

    data.suggestions.forEach(product => {
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      card.dataset.productId = product.id;
      card.innerHTML = `
        <h6>${product.name}</h6>
        <p>${product.description || 'No description'}</p>
        <div class="brand-category">
          <span>${product.brand_name || 'No brand'}</span>
          <span>${product.category_name || 'No category'}</span>
        </div>
      `;

      card.addEventListener('click', () => selectSuggestion(product));
      suggestionsContainer.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading suggestions:', error);
  }
}

function selectSuggestion(product) {
  // Remove previous selection
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Select current card
  event.target.closest('.suggestion-card').classList.add('selected');

  // Pre-fill form with product data
  document.getElementById('brand-select').value = product.brand_id || '';
  document.getElementById('category-select').value = product.category_id || '';
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('unit-size').value = product.unit_size || '';
  document.getElementById('unit-type').value = product.unit_type || '';
}

async function saveMatch() {
  try {
    const selectedSuggestion = document.querySelector('.suggestion-card.selected');
    let productId = null;

    if (selectedSuggestion) {
      // Use existing product
      productId = parseInt(selectedSuggestion.dataset.productId);
    } else {
      // Create new product
      const productData = {
        name: document.getElementById('product-name').value,
        brand_id: document.getElementById('brand-select').value || null,
        category_id: document.getElementById('category-select').value || null,
        description: document.getElementById('product-description').value,
        unit_size: document.getElementById('unit-size').value,
        unit_type: document.getElementById('unit-type').value
      };

      if (!productData.name) {
        showNotification('Product name is required', 'error');
        return;
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const result = await response.json();
      productId = result.id;
    }

    // Match item to product
    await fetch(`/api/items/${currentItem.id}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, confidenceScore: 1.0 })
    });

    showNotification('Item matched successfully!', 'success');
    closeAllModals();
    await initializePage(); // Refresh data
  } catch (error) {
    console.error('Error saving match:', error);
    showNotification('Error saving match', 'error');
  }
}

async function saveBrand() {
  try {
    const brandData = {
      name: document.getElementById('new-brand-name').value,
      description: document.getElementById('new-brand-description').value,
      website: document.getElementById('new-brand-website').value,
      country: document.getElementById('new-brand-country').value
    };

    if (!brandData.name) {
      showNotification('Brand name is required', 'error');
      return;
    }

    await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData)
    });

    showNotification('Brand created successfully!', 'success');
    closeAllModals();
    await loadBrands(); // Refresh brands
  } catch (error) {
    console.error('Error saving brand:', error);
    showNotification('Error creating brand', 'error');
  }
}

async function saveCategory() {
  try {
    const categoryData = {
      name: document.getElementById('new-category-name').value,
      parent_id: document.getElementById('new-category-parent').value || null,
      description: document.getElementById('new-category-description').value,
      color: document.getElementById('new-category-color').value,
      icon: document.getElementById('new-category-icon').value
    };

    if (!categoryData.name) {
      showNotification('Category name is required', 'error');
      return;
    }

    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });

    showNotification('Category created successfully!', 'success');
    closeAllModals();
    await loadCategories(); // Refresh categories
  } catch (error) {
    console.error('Error saving category:', error);
    showNotification('Error creating category', 'error');
  }
}

// Form population functions
function populateBrandSelect() {
  const select = document.getElementById('brand-select');
  select.innerHTML = '<option value="">Select Brand</option>';
  
  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand.id;
    option.textContent = brand.name;
    select.appendChild(option);
  });
}

function populateCategorySelect() {
  const select = document.getElementById('category-select');
  select.innerHTML = '<option value="">Select Category</option>';
  
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
}

function populateParentCategorySelect() {
  const select = document.getElementById('new-category-parent');
  select.innerHTML = '<option value="">No Parent (Top Level)</option>';
  
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
}

// Utility functions
function openModal(modal) {
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  document.body.style.overflow = 'auto';
  currentItem = null;
}

function resetMatchForm() {
  document.getElementById('brand-select').value = '';
  document.getElementById('category-select').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('unit-size').value = '';
  document.getElementById('unit-type').value = '';
  
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.classList.remove('selected');
  });
}

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.item-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = tableElements.selectAll.checked;
  });
  updateBulkMatchButton();
}

function updateBulkMatchButton() {
  const selectedItems = document.querySelectorAll('.item-checkbox:checked');
  tableElements.bulkMatchBtn.disabled = selectedItems.length === 0;
}

function openBulkMatchModal() {
  const selectedItems = document.querySelectorAll('.item-checkbox:checked');
  if (selectedItems.length === 0) return;

  // For now, just show a notification
  showNotification(`Bulk matching for ${selectedItems.length} items - coming soon!`, 'info');
}

function exportToCSV() {
  const headers = ['Code', 'Product Name', 'Quantity', 'Unit Price', 'Total', 'Brand', 'Status', 'Receipt Date', 'Store'];
  const csvContent = [
    headers.join(','),
    ...filteredItems.map(item => [
      item.item_code || '',
      `"${item.product_name}"`,
      item.quantity,
      item.unit_price || 0,
      item.total_price || 0,
      `"${item.brand || ''}"`,
      item.matched ? 'Matched' : 'Unmatched',
      item.receipt_date || '',
      `"${item.store_name || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-items-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

function editItem(itemId) {
  showNotification('Edit functionality - coming soon!', 'info');
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  // Set background color based on type
  const colors = {
    success: '#4CAF50',
    error: '#F44336',
    info: '#2196F3',
    warning: '#FF9800'
  };
  notification.style.backgroundColor = colors[type] || colors.info;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style); 
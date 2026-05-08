document.addEventListener('DOMContentLoaded', () => {
  const productGrid = document.getElementById('productGrid');
  const searchInput = document.getElementById('searchInput');
  const authControls = document.getElementById('authControls');
  const filterControls = document.getElementById('filterControls');
  const sortSelect = document.getElementById('sortSelect');
  const greetingText = document.getElementById('greetingText');
  const toastEl = document.getElementById('toast');

  // Modals
  const detailsModal = document.getElementById('detailsModal');
  const authModal = document.getElementById('authModal');
  const productFormModal = document.getElementById('productFormModal');

  // Auth Elements
  const authForm = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleText = document.getElementById('authToggleText');
  const authToggleLink = document.getElementById('authToggleLink');
  
  // Auth Form Fields
  const nameGroup = document.getElementById('nameGroup');
  const passwordConfirmGroup = document.getElementById('passwordConfirmGroup');
  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authPasswordConfirm = document.getElementById('authPasswordConfirm');

  // Product Form Elements
  const productForm = document.getElementById('productForm');
  const productFormTitle = document.getElementById('productFormTitle');
  const prodIdInput = document.getElementById('productId');
  const prodName = document.getElementById('prodName');
  const prodPrice = document.getElementById('prodPrice');
  const prodCategory = document.getElementById('prodCategory');
  const prodSeller = document.getElementById('prodSeller');
  const prodDesc = document.getElementById('prodDesc');

  // State
  let allProducts = [];
  let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  let isSignupMode = false;
  let currentActiveProduct = null;

  // -- TOAST NOTIFICATIONS --
  const showToast = (message, type = 'success') => {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  };

  // -- RENDER AUTH UI --
  const updateAuthUI = () => {
    if (currentUser) {
      filterControls.style.display = 'flex';
      greetingText.textContent = `Welcome back, ${currentUser.name}!`;
      authControls.innerHTML = `
        <button class="btn-primary" id="addBtn">Add Product</button>
        <button class="btn-secondary" id="logoutBtn">Logout</button>
      `;
      document.getElementById('addBtn').addEventListener('click', () => openProductForm());
      document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } else {
      filterControls.style.display = 'none';
      greetingText.textContent = `Find the best local items around you.`;
      authControls.innerHTML = `
        <button class="btn-primary" id="loginBtn">Login / Sign Up</button>
      `;
      document.getElementById('loginBtn').addEventListener('click', () => {
        isSignupMode = false;
        updateAuthFormMode();
        authModal.classList.add('active');
      });
    }
  };

  // -- AUTH LOGIC --
  const handleLogout = () => {
    // The backend clears cookie on logout, or we just drop local state
    // Let's clear local state and reload
    localStorage.removeItem('currentUser');
    currentUser = null;
    showToast('Logged out successfully');
    updateAuthUI();
    fetchProducts();
  };

  const updateAuthFormMode = () => {
    if (isSignupMode) {
      authTitle.textContent = 'Create Account';
      authSubmitBtn.textContent = 'Sign Up';
      authToggleText.textContent = 'Already have an account?';
      authToggleLink.textContent = 'Login';
      nameGroup.style.display = 'block';
      passwordConfirmGroup.style.display = 'block';
      authName.required = true;
      authPasswordConfirm.required = true;
    } else {
      authTitle.textContent = 'Login';
      authSubmitBtn.textContent = 'Login';
      authToggleText.textContent = "Don't have an account?";
      authToggleLink.textContent = 'Sign up';
      nameGroup.style.display = 'none';
      passwordConfirmGroup.style.display = 'none';
      authName.required = false;
      authPasswordConfirm.required = false;
    }
  };

  authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    updateAuthFormMode();
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const endpoint = isSignupMode ? '/api/v1/users/signup' : '/api/v1/users/login';
    const payload = {
      email: authEmail.value,
      password: authPassword.value
    };

    if (isSignupMode) {
      payload.name = authName.value;
      payload.passwordConfirm = authPasswordConfirm.value;
      // Assign an admin role for easy testing of delete features
      // In production, users shouldn't pass role here
      payload.role = 'admin'; 
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status === 'success') {
        currentUser = data.data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast(isSignupMode ? 'Account created!' : 'Logged in successfully!');
        authModal.classList.remove('active');
        authForm.reset();
        updateAuthUI();
        fetchProducts();
      } else {
        showToast(data.message || 'Authentication failed', 'error');
      }
    } catch (err) {
      showToast('Network error during auth', 'error');
    }
  });

  // -- CRUD LOGIC --
  const fetchProducts = async () => {
    if (!currentUser) {
      productGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" style="margin-bottom: 1rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <h2 class="glass-text" style="font-size: 1.5rem; margin-bottom: 0.5rem;">Members Only</h2>
          <p class="glass-text-sub" style="margin-bottom: 1.5rem;">Please log in or create an account to view local products.</p>
          <button class="btn-primary" onclick="document.getElementById('loginBtn').click()">Login to Continue</button>
        </div>
      `;
      return;
    }

    try {
      const res = await fetch('/api/v1/products');
      const data = await res.json();
      
      if (data.status === 'success') {
        allProducts = data.data.products;
        applyFiltersAndSort();
      } else {
        showToast('Failed to load products', 'error');
        renderProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Network error loading products', 'error');
      renderProducts([]);
    }
  };

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return showToast('Please login first', 'error');

    const id = prodIdInput.value;
    const isEdit = !!id;
    const endpoint = isEdit ? `/api/v1/products/${id}` : '/api/v1/products';
    const method = isEdit ? 'PATCH' : 'POST';

    const payload = {
      name: prodName.value,
      price: parseFloat(prodPrice.value),
      category: prodCategory.value,
      seller: prodSeller.value,
      description: prodDesc.value
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' }, // Cookies sent automatically
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status === 'success') {
        showToast(isEdit ? 'Product updated!' : 'Product created!');
        productFormModal.classList.remove('active');
        fetchProducts(); // Refresh list
        if (isEdit && currentActiveProduct) {
           closeModal(); // Close details modal if editing
        }
      } else {
        showToast(data.message || 'Failed to save product', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  });

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/v1/products/${id}`, { method: 'DELETE' });
      // 204 No Content
      if (res.ok || res.status === 204) {
        showToast('Product deleted');
        closeModal();
        fetchProducts();
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to delete (Admin only?)', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  };

  // -- UI RENDERING --
  const renderProducts = (products) => {
    productGrid.innerHTML = '';
    if (products.length === 0) {
      productGrid.innerHTML = '<p class="glass-text-sub" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No items found in database.</p>';
      return;
    }

    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const iconSvg = getIconForCategory(product.category);

      card.innerHTML = `
        <div class="card-icon-container">${iconSvg}</div>
        <div class="card-category">${product.category || 'Item'}</div>
        <h3 class="card-title">${product.name}</h3>
        <div class="card-price">$${product.price.toLocaleString()}</div>
      `;

      card.addEventListener('click', () => openModal(product));
      productGrid.appendChild(card);
    });
  };

  const openModal = (product) => {
    currentActiveProduct = product;
    document.getElementById('modalCategory').textContent = product.category || 'N/A';
    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalPrice').textContent = `$${product.price.toLocaleString()}`;
    document.getElementById('modalDesc').textContent = product.description || 'No description provided.';
    document.getElementById('modalSeller').textContent = product.seller || 'Unknown seller';
    
    // Setup Action Buttons
    const actionsContainer = document.getElementById('modalActions');
    actionsContainer.innerHTML = '<button class="buy-btn">Message Seller</button>';
    
    // Only show Edit if logged in. Show Delete if logged in as Admin.
    if (currentUser) {
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => openProductForm(product);
      actionsContainer.appendChild(editBtn);

      if (currentUser.role === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteProduct(product._id || product.id);
        actionsContainer.appendChild(deleteBtn);
      }
    }

    detailsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const openProductForm = (product = null) => {
    productForm.reset();
    if (product) {
      productFormTitle.textContent = 'Edit Product';
      prodIdInput.value = product._id || product.id;
      prodName.value = product.name;
      prodPrice.value = product.price;
      prodCategory.value = product.category || '';
      prodSeller.value = product.seller || '';
      prodDesc.value = product.description || '';
    } else {
      productFormTitle.textContent = 'Add Product';
      prodIdInput.value = '';
    }
    productFormModal.classList.add('active');
  };

  const closeModal = () => {
    detailsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentActiveProduct = null;
  };

  // Close Buttons
  document.getElementById('closeDetailsModal').addEventListener('click', closeModal);
  document.getElementById('closeAuthModal').addEventListener('click', () => authModal.classList.remove('active'));
  document.getElementById('closeProductFormModal').addEventListener('click', () => productFormModal.classList.remove('active'));
  
  // Overlay clicks
  [detailsModal, authModal, productFormModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if(modal === detailsModal) document.body.style.overflow = 'auto';
      }
    });
  });

  const applyFiltersAndSort = () => {
    const term = searchInput.value.toLowerCase();
    const sortValue = sortSelect.value;
    
    // Filter by search
    let filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.category && p.category.toLowerCase().includes(term))
    );
    
    // Sort
    if (sortValue === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortValue === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortValue === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortValue === 'top-3-cheapest') {
      filtered.sort((a, b) => a.price - b.price);
      filtered = filtered.slice(0, 3);
    } else if (sortValue === 'top-3-expensive') {
      filtered.sort((a, b) => b.price - a.price);
      filtered = filtered.slice(0, 3);
    }
    
    renderProducts(filtered);
  };

  searchInput.addEventListener('input', applyFiltersAndSort);
  sortSelect.addEventListener('change', applyFiltersAndSort);

  function getIconForCategory(category) {
    const cat = category ? category.toLowerCase() : '';
    if (cat.includes('electronic') || cat.includes('tech') || cat.includes('peripheral') || cat.includes('cooling')) {
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>`;
    }
    if (cat.includes('furniture') || cat.includes('home')) {
       return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 10V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"></path><path d="M19 10H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"></path></svg>`;
    }
    return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline></svg>`;
  }

  // Initialize
  updateAuthUI();
  fetchProducts();
});

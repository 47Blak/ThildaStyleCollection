// Default Fallback Configurations
const DEFAULT_CONFIG = {
    siteTitle: "AuraStore",
    siteLogoIcon: "fa-bolt",
    whatsappPhone: "15551234567",
    categories: ["Electronics", "Fashion", "Home"],
    supportEmail: "support@aurastore.com",
    supportPhone: "+1 (555) 019-2831"
};

// Initial Default Products with Empty Images
const defaultProducts = [
    {
        id: 1,
        name: "Aura Noise-Canceling Headphones",
        category: "Electronics",
        price: 249.99,
        rating: 4.9,
        reviews: 128,
        images: ["", "", ""],
        description: "Experience spatial high-fidelity audio with active noise control and up to 40 hours of continuous battery life.",
        isNew: true
    },
    {
        id: 2,
        name: "Minimalist Chronograph Watch",
        category: "Fashion",
        price: 135.00,
        rating: 4.7,
        reviews: 84,
        images: ["", "", ""],
        description: "Clean aesthetic stainless steel body with a genuine Italian leather strap and Japanese quartz precision movement."
    },
    {
        id: 3,
        name: "Ergonomic Mechanical Keyboard",
        category: "Electronics",
        price: 119.50,
        rating: 4.8,
        reviews: 95,
        images: ["", "", ""],
        description: "Wireless RGB compact mechanical keyboard featuring hot-swappable custom tactile switches.",
        isNew: true
    },
    {
        id: 4,
        name: "Ceramic Minimalist Desk Lamp",
        category: "Home",
        price: 45.00,
        rating: 4.5,
        reviews: 42,
        images: ["", "", ""],
        description: "Soft warm dimmable LED ambiance lighting encapsulated inside a matte textured handcrafted ceramic shell."
    }
];

// Load settings & products from local storage or defaults
let storeConfig = JSON.parse(localStorage.getItem('storeConfig')) || DEFAULT_CONFIG;
let products = JSON.parse(localStorage.getItem('products')) || defaultProducts;

// Global Slides Tracker
let cardImageIndexes = {};
let heroSpotlightIndex = 0;
let modalImageIndex = 0;

// State Management
let cart = [];
let wishlist = [];
let activeCategory = 'All';
let searchQuery = '';

// Helper function to extract valid uploaded non-empty image URLs (Max 3)
function getValidImages(images) {
    if (!images || !Array.isArray(images)) return [];
    return images.filter(img => img && img.trim() !== '');
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    applySiteSettings();
    renderSpotlightHero();
    renderCategoriesUI();
    renderProducts(products);
    updateCartUI();
    setupSwipeListeners();
});

function applySiteSettings() {
    document.title = `${storeConfig.siteTitle} — Modern E-Commerce`;
    
    const logoTexts = document.querySelectorAll('.site-title-text');
    logoTexts.forEach(el => el.innerText = storeConfig.siteTitle);
    
    const logoIcons = document.querySelectorAll('.site-logo-icon');
    logoIcons.forEach(el => {
        el.className = `site-logo-icon fa-solid ${storeConfig.siteLogoIcon}`;
    });
}

function renderSpotlightHero() {
    const DEFAULT_SPOTLIGHT = {
        badge: "Featured Spotlight",
        title: "Aura Noise-Canceling Headphones",
        price: 249.99,
        images: ["", "", ""]
    };

    const spotlight = JSON.parse(localStorage.getItem('spotlightConfig')) || DEFAULT_SPOTLIGHT;
    const validImages = getValidImages(spotlight.images);
    const displayImages = validImages.length > 0 ? validImages : [''];

    const heroImg = document.querySelector('#heroSpotlightImage');
    const heroTitle = document.querySelector('#heroSpotlightTitle');
    const heroBadge = document.querySelector('#heroSpotlightBadge');
    const heroPrice = document.querySelector('#heroSpotlightPrice');
    const heroDots = document.querySelector('#heroSpotlightDots');

    if (heroSpotlightIndex >= displayImages.length) heroSpotlightIndex = 0;

    if (heroImg) heroImg.src = displayImages[heroSpotlightIndex] || '';
    if (heroTitle) heroTitle.innerText = spotlight.title;
    if (heroBadge) heroBadge.innerText = spotlight.badge;
    if (heroPrice) heroPrice.innerText = `₦${Number(spotlight.price).toFixed(2)}`;

    if (heroDots) {
        heroDots.innerHTML = displayImages.map((_, i) => `
            <span class="w-2 h-2 rounded-full transition-all ${i === heroSpotlightIndex ? 'bg-white w-5' : 'bg-white/50'}"></span>
        `).join('');
    }
}

function slideHeroSpotlight(direction) {
    const spotlight = JSON.parse(localStorage.getItem('spotlightConfig')) || {};
    const validImages = getValidImages(spotlight.images);
    const images = validImages.length > 0 ? validImages : [''];

    heroSpotlightIndex = (heroSpotlightIndex + direction + images.length) % images.length;
    renderSpotlightHero();
}

function renderCategoriesUI() {
    const container = document.getElementById('categories-section');
    if (!container) return;

    const categories = ['All', ...storeConfig.categories];
    container.innerHTML = categories.map(cat => `
        <button onclick="filterCategory('${cat}')" class="cat-btn ${cat === activeCategory ? 'active bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'} border px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shadow-sm">
            ${cat === 'All' ? 'All Items' : cat}
        </button>
    `).join('');
}

function getFilteredProducts() {
    return products.filter(product => {
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              product.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        const priceFilter = document.getElementById('priceFilter')?.value || 'all';
        let matchesPrice = true;
        if (priceFilter === 'under50') matchesPrice = product.price < 50;
        else if (priceFilter === '50to150') matchesPrice = product.price >= 50 && product.price <= 150;
        else if (priceFilter === 'over150') matchesPrice = product.price > 150;

        return matchesCategory && matchesSearch && matchesPrice;
    });
}

function applyFilters() {
    let filtered = getFilteredProducts();
    const sortBy = document.getElementById('sortSelect')?.value;

    if (sortBy === 'low-high') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-low') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    renderProducts(filtered);
}

function filterCategory(category) {
    activeCategory = category;
    renderCategoriesUI();
    applyFilters();
}

function handleSearch(isMobile = false) {
    const inputId = isMobile ? 'mobileSearchInput' : 'searchInput';
    searchQuery = document.getElementById(inputId).value;
    applyFilters();
}

function resetFilters() {
    searchQuery = '';
    activeCategory = 'All';
    if(document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if(document.getElementById('mobileSearchInput')) document.getElementById('mobileSearchInput').value = '';
    if(document.getElementById('priceFilter')) document.getElementById('priceFilter').value = 'all';
    if(document.getElementById('sortSelect')) document.getElementById('sortSelect').value = 'featured';
    filterCategory('All');
}

// Render Cards
function renderProducts(items) {
    const grid = document.getElementById('productGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = '';
        if(emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if(emptyState) emptyState.classList.add('hidden');
    grid.innerHTML = items.map(product => {
        const isWishlisted = wishlist.includes(product.id);
        const validImgs = getValidImages(product.images);
        const images = validImgs.length > 0 ? validImgs : [product.image || ''];
        const currentIdx = (cardImageIndexes[product.id] || 0) % images.length;

        return `
        <div class="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div class="relative bg-slate-100 aspect-square overflow-hidden cursor-pointer swipe-card-container" data-product-id="${product.id}" onclick="openProductModal(${product.id})">
                <img 
                    id="card-img-${product.id}"
                    src="${images[currentIdx]}" 
                    alt="${product.name}" 
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'"
                >
                ${product.isNew ? `<span class="absolute top-3 left-3 bg-brand-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider z-10">New</span>` : ''}
                
                <button onclick="event.stopPropagation(); toggleWishlist(${product.id})" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-rose-500 transition-all shadow-sm z-10">
                    <i class="${isWishlisted ? 'fa-solid text-rose-500' : 'fa-regular'} fa-heart text-sm"></i>
                </button>

                <!-- Dynamic swipe indicators for uploaded images -->
                ${images.length > 1 ? `
                    <div id="card-dots-${product.id}" class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        ${images.map((_, i) => `
                            <span class="w-1.5 h-1.5 rounded-full ${i === currentIdx ? 'bg-brand-600 w-3' : 'bg-white/70'} transition-all"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="p-5 flex-grow flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>${product.category}</span>
                        <span class="flex items-center gap-1 text-amber-500 font-semibold">
                            <i class="fa-solid fa-star text-[10px]"></i> ${product.rating || 5.0} (${product.reviews || 0})
                        </span>
                    </div>
                    <h3 onclick="openProductModal(${product.id})" class="font-bold text-slate-900 text-base leading-snug group-hover:text-brand-600 cursor-pointer transition-colors line-clamp-1">
                        ${product.name}
                    </h3>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">${product.description}</p>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-400 font-medium block">Price</span>
                        <span class="text-lg font-extrabold text-slate-900">₦${Number(product.price).toFixed(2)}</span>
                    </div>
                    <button onclick="addToCart(${product.id})" class="px-4 py-2 bg-slate-900 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95">
                        <i class="fa-solid fa-cart-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    setupSwipeListeners();
}

function slideCardImage(productId, direction) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const validImgs = getValidImages(product.images);
    const images = validImgs.length > 0 ? validImgs : [product.image];

    let current = cardImageIndexes[productId] || 0;
    current = (current + direction + images.length) % images.length;
    cardImageIndexes[productId] = current;

    const imgEl = document.getElementById(`card-img-${productId}`);
    if (imgEl) imgEl.src = images[current];

    const dotsEl = document.getElementById(`card-dots-${productId}`);
    if (dotsEl) {
        dotsEl.innerHTML = images.map((_, i) => `
            <span class="w-1.5 h-1.5 rounded-full ${i === current ? 'bg-brand-600 w-3' : 'bg-white/70'} transition-all"></span>
        `).join('');
    }
}

// Touch Swipe Event Listeners
function setupSwipeListeners() {
    // Touch Swipe for Hero Spotlight Banner
    const heroSpotlightEl = document.getElementById('heroSpotlightContainer');
    if (heroSpotlightEl && !heroSpotlightEl.dataset.swipeBound) {
        let touchStartX = 0;
        let touchEndX = 0;

        heroSpotlightEl.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        heroSpotlightEl.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 40) slideHeroSpotlight(1);
            if (touchEndX - touchStartX > 40) slideHeroSpotlight(-1);
        }, { passive: true });

        heroSpotlightEl.dataset.swipeBound = "true";
    }

    // Touch Swipe for Product Cards
    document.querySelectorAll('.swipe-card-container').forEach(el => {
        let touchStartX = 0;
        let touchEndX = 0;

        el.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        el.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const productId = parseInt(el.dataset.productId);
            if (touchStartX - touchEndX > 30) slideCardImage(productId, 1);
            if (touchEndX - touchStartX > 30) slideCardImage(productId, -1);
        }, { passive: true });
    });
}

// Cart Drawer Operations
function toggleCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if(!drawer || !overlay) return;
    
    const isOpen = !drawer.classList.contains('translate-x-full');
    if (isOpen) {
        drawer.classList.add('translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
    } else {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
    }
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
    showToast(`Added <strong>${product.name}</strong> to cart!`);
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }

    updateCartUI();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartUI();
    showToast("Item removed from cart");
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15.00;
    const tax = subtotal * 0.08;
    const grandTotal = subtotal + shipping + tax;

    if(document.getElementById('cartBadge')) document.getElementById('cartBadge').innerText = totalItems;
    if(document.getElementById('drawerCountBadge')) document.getElementById('drawerCountBadge').innerText = `${totalItems} items`;
    if(document.getElementById('cartTotalHeader')) document.getElementById('cartTotalHeader').innerText = `₦${subtotal.toFixed(2)}`;

    const list = document.getElementById('cartItemsList');
    const emptyState = document.getElementById('cartEmptyState');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.length === 0) {
        if(list) list.innerHTML = '';
        if(emptyState) emptyState.classList.remove('hidden');
        if(cartFooter) cartFooter.classList.add('hidden');
    } else {
        if(emptyState) emptyState.classList.add('hidden');
        if(cartFooter) cartFooter.classList.remove('hidden');

        if(list) {
            list.innerHTML = cart.map(item => {
                const validImgs = getValidImages(item.images);
                const img = validImgs.length > 0 ? validImgs[0] : item.image;
                return `
                <div class="flex items-center gap-3 pt-3">
                    <img src="${img}" alt="${item.name}" class="w-16 h-16 object-cover rounded-xl bg-slate-100 flex-shrink-0" onerror="this.src='https://via.placeholder.com/100'">
                    <div class="flex-grow min-w-0">
                        <h4 class="font-bold text-sm text-slate-900 truncate">${item.name}</h4>
                        <p class="text-xs text-brand-600 font-semibold mt-0.5">₦${Number(item.price).toFixed(2)}</p>
                        
                        <div class="flex items-center gap-2 mt-2">
                            <div class="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                                <button onclick="updateQuantity(${item.id}, -1)" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900">-</button>
                                <span class="text-xs font-semibold px-2">${item.quantity}</span>
                                <button onclick="updateQuantity(${item.id}, 1)" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="removeFromCart(${item.id})" class="text-slate-300 hover:text-rose-500 p-1">
                        <i class="fa-solid fa-trash-can text-sm"></i>
                    </button>
                </div>
            `}).join('');
        }
    }

    if(document.getElementById('cartSubtotal')) document.getElementById('cartSubtotal').innerText = `₦${subtotal.toFixed(2)}`;
    if(document.getElementById('cartShipping')) document.getElementById('cartShipping').innerText = shipping === 0 ? 'FREE' : `₦${shipping.toFixed(2)}`;
    if(document.getElementById('cartTax')) document.getElementById('cartTax').innerText = `₦${tax.toFixed(2)}`;
    if(document.getElementById('cartGrandTotal')) document.getElementById('cartGrandTotal').innerText = `₦${grandTotal.toFixed(2)}`;
}

function checkoutViaWhatsApp() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15.00;
    const tax = subtotal * 0.08;
    const grandTotal = subtotal + shipping + tax;

    let text = `🛒 *New Order from ${storeConfig.siteTitle}*\n\n`;
    text += `*Order Items:*\n`;
    cart.forEach((item, idx) => {
        text += `${idx + 1}. *${item.name}* (x${item.quantity}) - ₦${(item.price * item.quantity).toFixed(2)}\n`;
    });

    text += `\n----------------------------\n`;
    text += `*Subtotal:* ₦${subtotal.toFixed(2)}\n`;
    text += `*Shipping:* ${shipping === 0 ? 'FREE' : '₦' + shipping.toFixed(2)}\n`;
    text += `*Tax (8%):* ₦${tax.toFixed(2)}\n`;
    text += `*Total Amount:* ₦${grandTotal.toFixed(2)}\n`;
    text += `----------------------------\n`;
    text += `Please process my order. Thank you!`;

    const encodedText = encodeURIComponent(text);
    const phoneNumber = storeConfig.whatsappPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
}

function toggleWishlist(productId) {
    const idx = wishlist.indexOf(productId);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast("Removed from wishlist");
    } else {
        wishlist.push(productId);
        showToast("Saved to your wishlist!");
    }
    
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
        if (wishlist.length > 0) {
            badge.innerText = wishlist.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    applyFilters();
}

// Modal View Pop-Up
let currentModalProductId = null;

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if(!product) return;

    currentModalProductId = productId;
    modalImageIndex = 0;

    renderModalContent(product);

    const modal = document.getElementById('productModal');
    const card = document.getElementById('productModalCard');

    if(modal && card) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
    }
}

function renderModalContent(product) {
    const container = document.getElementById('productModalContent');
    if (!container) return;

    const validImgs = getValidImages(product.images);
    const images = validImgs.length > 0 ? validImgs : [product.image || ''];

    container.innerHTML = `
        <div id="modalImageContainer" class="relative bg-slate-100 aspect-square flex items-center justify-center overflow-hidden">
            <img id="modalProductImage" src="${images[modalImageIndex]}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/400'">
            
            ${images.length > 1 ? `
                <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    ${images.map((_, i) => `
                        <span class="w-2 h-2 rounded-full ${i === modalImageIndex ? 'bg-brand-600 w-4' : 'bg-white/80'} transition-all"></span>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="p-6 sm:p-8 flex flex-col justify-between">
            <div>
                <span class="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1 block">${product.category}</span>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">${product.name}</h2>
                <div class="flex items-center gap-2 mb-4 text-xs text-amber-500 font-bold">
                    <div class="flex"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
                    <span class="text-slate-500 font-normal">(${product.reviews || 0} reviews)</span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed mb-6">${product.description}</p>
            </div>

            <div>
                <div class="text-3xl font-extrabold text-slate-900 mb-6">₦${Number(product.price).toFixed(2)}</div>
                <div class="flex gap-3">
                    <button onclick="addToCart(${product.id}); closeProductModal()" class="flex-grow py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm">
                        <i class="fa-solid fa-bag-shopping"></i> Add To Cart
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add Swipe controls to Modal Image container
    const modalImgContainer = document.getElementById('modalImageContainer');
    if (modalImgContainer) {
        let touchStartX = 0;
        let touchEndX = 0;

        modalImgContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        modalImgContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 30) slideModalImage(1);
            if (touchEndX - touchStartX > 30) slideModalImage(-1);
        }, { passive: true });
    }
}

function slideModalImage(direction) {
    const product = products.find(p => p.id === currentModalProductId);
    if (!product) return;
    const validImgs = getValidImages(product.images);
    const images = validImgs.length > 0 ? validImgs : [product.image];

    modalImageIndex = (modalImageIndex + direction + images.length) % images.length;
    renderModalContent(product);
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    const card = document.getElementById('productModalCard');
    if(modal && card) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        card.classList.add('scale-95');
    }
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 toast-enter';
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-brand-400"></i> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-enter-active'), 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Live Storage Event Listener (Syncs changes made in admin.html live across browser tabs)
window.addEventListener('storage', (e) => {
    if (e.key === 'products') {
        products = JSON.parse(e.newValue) || defaultProducts;
        applyFilters();
    }
    if (e.key === 'storeConfig') {
        storeConfig = JSON.parse(e.newValue) || DEFAULT_CONFIG;
        applySiteSettings();
        renderCategoriesUI();
    }
    if (e.key === 'spotlightConfig') {
        renderSpotlightHero();
    }
});
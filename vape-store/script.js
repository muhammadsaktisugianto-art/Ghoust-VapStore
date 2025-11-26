/**
 * Ghoust VapStore - Main Script
 * Handles IndexedDB interactions and UI logic
 */

// --- Configuration ---
const DB_NAME = 'VapeStoreDB';
const DB_VERSION = 1;
const STORES = {
    PRODUCTS: 'products',
    CART: 'cart'
};

// --- State ---
let db;
let cart = [];

// --- Initial Data (Seeding) ---
const INITIAL_PRODUCTS = [
    {
        id: 1,
        name: 'Ghoust X-200 Mod',
        price: 1200000,
        category: 'Mods',
        image: 'https://placehold.co/400x400/262626/39FF14?text=Ghoust+X-200',
        description: 'High-performance 200W box mod with temperature control.'
    },
    {
        id: 2,
        name: 'Cosmic Berry Juice',
        price: 150000,
        category: 'Liquids',
        image: 'https://placehold.co/400x400/262626/BF00FF?text=Cosmic+Berry',
        description: 'A sweet blend of mixed berries with a cooling finish.'
    },
    {
        id: 3,
        name: 'Void Tank Pro',
        price: 450000,
        category: 'Accessories',
        image: 'https://placehold.co/400x400/262626/00F3FF?text=Void+Tank',
        description: 'Leak-proof sub-ohm tank for massive cloud production.'
    },
    {
        id: 4,
        name: 'Stardust Pod System',
        price: 350000,
        category: 'Pods',
        image: 'https://placehold.co/400x400/262626/FFFFFF?text=Stardust+Pod',
        description: 'Compact and portable pod system for salt nic.'
    },
    {
        id: 5,
        name: 'Neon Green E-Liquid',
        price: 160000,
        category: 'Liquids',
        image: 'https://placehold.co/400x400/262626/39FF14?text=Neon+Green',
        description: 'Sour apple and lime fusion that glows in the dark.'
    },
    {
        id: 6,
        name: 'Titan Mech Mod',
        price: 2500000,
        category: 'Mods',
        image: 'https://placehold.co/400x400/262626/FF0000?text=Titan+Mech',
        description: 'Pure mechanical power for advanced users only.'
    }
];

// --- IndexedDB Setup ---
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error: " + event.target.errorCode);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create Products Store
            if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
                productStore.createIndex('category', 'category', { unique: false });

                // Seed data immediately on upgrade
                productStore.transaction.oncomplete = () => {
                    const productTransaction = db.transaction(STORES.PRODUCTS, 'readwrite').objectStore(STORES.PRODUCTS);
                    INITIAL_PRODUCTS.forEach(product => {
                        productTransaction.add(product);
                    });
                };
            }

            // Create Cart Store
            if (!db.objectStoreNames.contains(STORES.CART)) {
                db.createObjectStore(STORES.CART, { keyPath: 'id' });
            }
        };
    });
};

// --- Data Access Layer ---
const getProducts = async () => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.PRODUCTS], 'readonly');
        const store = transaction.objectStore(STORES.PRODUCTS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getCart = async () => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CART], 'readonly');
        const store = transaction.objectStore(STORES.CART);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const addToCartDB = async (product) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CART], 'readwrite');
        const store = transaction.objectStore(STORES.CART);

        // Check if item exists
        const getRequest = store.get(product.id);

        getRequest.onsuccess = () => {
            const existingItem = getRequest.result;
            if (existingItem) {
                existingItem.quantity += 1;
                store.put(existingItem);
            } else {
                store.add({ ...product, quantity: 1 });
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const removeFromCartDB = async (id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CART], 'readwrite');
        const store = transaction.objectStore(STORES.CART);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const updateCartQuantityDB = async (id, change) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.CART], 'readwrite');
        const store = transaction.objectStore(STORES.CART);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (item) {
                item.quantity += change;
                if (item.quantity <= 0) {
                    store.delete(id);
                } else {
                    store.put(item);
                }
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- UI Logic ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

const renderProducts = async () => {
    const products = await getProducts();
    const grid = document.getElementById('product-grid');

    if (products.length === 0) {
        // If empty (maybe first run didn't seed fast enough or cleared), re-seed manually for demo
        grid.innerHTML = '<div class="col-span-full text-center text-white">No products found. Please refresh to seed data.</div>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="group relative bg-dark-card rounded-2xl overflow-hidden border border-white/5 hover:border-neon-green/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(57,255,20,0.1)] flex flex-col">
            <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-800 xl:aspect-w-7 xl:aspect-h-8 relative">
                <img src="${product.image}" alt="${product.name}" class="w-full h-64 object-cover object-center group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="app.addToCart(${product.id})" class="bg-neon-green text-black font-bold py-2 px-6 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-white">
                        Add to Cart
                    </button>
                </div>
            </div>
            <div class="p-6 flex-1 flex flex-col">
                <h3 class="mt-1 text-lg font-semibold text-white group-hover:text-neon-green transition-colors">${product.name}</h3>
                <p class="mt-1 text-sm text-gray-400">${product.category}</p>
                <div class="mt-4 flex items-center justify-between mt-auto">
                    <p class="text-xl font-bold text-white">${formatCurrency(product.price)}</p>
                </div>
            </div>
        </div>
    `).join('');
};

const renderCart = async () => {
    const cartItems = await getCart();
    const cartList = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

    // Update Badge
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = totalItems;
    cartCount.classList.toggle('opacity-0', totalItems === 0);
    cartCount.classList.toggle('scale-100', totalItems > 0);

    // Calculate Total
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.innerText = formatCurrency(total);

    if (cartItems.length === 0) {
        cartList.innerHTML = '<li class="py-10 text-center text-gray-500 flex flex-col items-center"><svg class="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>Your cart is empty</li>';
        return;
    }

    cartList.innerHTML = cartItems.map(item => `
        <li class="flex py-6">
            <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-white/10">
                <img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover object-center">
            </div>

            <div class="ml-4 flex flex-1 flex-col">
                <div>
                    <div class="flex justify-between text-base font-medium text-white">
                        <h3>${item.name}</h3>
                        <p class="ml-4">${formatCurrency(item.price * item.quantity)}</p>
                    </div>
                    <p class="mt-1 text-sm text-gray-400">${item.category}</p>
                </div>
                <div class="flex flex-1 items-end justify-between text-sm">
                    <div class="flex items-center border border-white/20 rounded-lg">
                        <button onclick="app.updateQuantity(${item.id}, -1)" class="px-2 py-1 text-gray-400 hover:text-white">-</button>
                        <span class="px-2 text-white">${item.quantity}</span>
                        <button onclick="app.updateQuantity(${item.id}, 1)" class="px-2 py-1 text-gray-400 hover:text-white">+</button>
                    </div>

                    <button type="button" onclick="app.removeFromCart(${item.id})" class="font-medium text-red-400 hover:text-red-300">Remove</button>
                </div>
            </div>
        </li>
    `).join('');
};

const showToast = (message) => {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    msg.innerText = message;

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
};

// --- Event Handlers & Exports ---
const app = {
    async init() {
        await initDB();
        await renderProducts();
        await renderCart();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Cart Modal Toggle
        const cartBtn = document.getElementById('cart-btn');
        const closeCartBtn = document.getElementById('close-cart');
        const cartModal = document.getElementById('cart-modal');
        const cartBackdrop = document.getElementById('cart-backdrop');
        const cartPanel = document.getElementById('cart-panel');

        const toggleCart = (show) => {
            if (show) {
                cartModal.classList.remove('hidden');
                // Small delay to allow display:block to apply before transition
                setTimeout(() => {
                    cartBackdrop.classList.remove('opacity-0');
                    cartPanel.classList.remove('opacity-0', 'scale-95');
                }, 10);
            } else {
                cartBackdrop.classList.add('opacity-0');
                cartPanel.classList.add('opacity-0', 'scale-95');
                setTimeout(() => {
                    cartModal.classList.add('hidden');
                }, 300); // Wait for transition
            }
        };

        cartBtn.addEventListener('click', () => toggleCart(true));
        closeCartBtn.addEventListener('click', () => toggleCart(false));
        cartBackdrop.addEventListener('click', () => toggleCart(false));
    },

    async addToCart(id) {
        const products = await getProducts();
        const product = products.find(p => p.id === id);
        if (product) {
            await addToCartDB(product);
            await renderCart();
            showToast(`Added ${product.name} to cart`);
        }
    },

    async removeFromCart(id) {
        await removeFromCartDB(id);
        await renderCart();
    },

    async updateQuantity(id, change) {
        await updateCartQuantityDB(id, change);
        await renderCart();
    },

    async checkout() {
        const cartItems = await getCart();
        if (cartItems.length === 0) {
            showToast('Your cart is empty!');
            return;
        }

        let message = "Halo Ghoust VapStore, saya ingin memesan:\n\n";
        let total = 0;

        cartItems.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            message += `${index + 1}. ${item.name} (${item.quantity}x) - ${formatCurrency(itemTotal)}\n`;
        });

        message += `\nTotal: ${formatCurrency(total)}`;
        message += "\n\nMohon info ketersediaan dan ongkirnya. Terima kasih!";

        const phoneNumber = "6285695097246";
        // Use window.open to open in new tab
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    },

    renderHome() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Start the app
window.app = app; // Expose to global scope for HTML onclick handlers
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

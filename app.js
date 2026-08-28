// app.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const WHATSAPP_NUMBER = "254782250055";
const CACHE_KEY = "nuru_products_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let allProducts = [];
let allCategories = [];
let currentCategoryId = null;
let searchTerm = "";
let currentSlideIndex = 0;
let currentProductImages = [];

const productsContainer = document.getElementById("productsContainer");
const categoriesContainer = document.getElementById("categoriesContainer");
const searchInput = document.getElementById("searchInput");
const viewAllButton = document.getElementById("viewAllButton");
const modal = document.getElementById("imageModal");
const modalSlides = document.getElementById("modalSlides");
const modalDots = document.getElementById("modalDots");

function createWhatsAppLink(productName) {
  const msg = `Hello Nuru Comfort, I would like to order ${productName}. Is it available?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// Load data from cache or Firestore
async function loadData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.timestamp && Date.now() - data.timestamp < CACHE_TTL) {
        allProducts = data.products;
        allCategories = data.categories;
        renderCategories();
        renderProducts();
        return;
      }
    } catch (e) {
      console.warn("Cache parse error", e);
    }
  }
  await fetchFreshData();
}

async function fetchFreshData() {
  try {
    // Fetch categories
    const catSnapshot = await getDocs(collection(db, "categories"));
    allCategories = [];
    catSnapshot.forEach((doc) =>
      allCategories.push({ id: doc.id, ...doc.data() }),
    );
    allCategories.sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        a.name.localeCompare(b.name),
    );

    // Fetch products (only active)
    const q = query(collection(db, "products"), where("is_active", "==", true));
    const prodSnapshot = await getDocs(q);
    allProducts = [];
    prodSnapshot.forEach((doc) =>
      allProducts.push({ id: doc.id, ...doc.data() }),
    );
    allProducts.sort(
      (a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0),
    );

    // Save to cache
    const cacheData = {
      timestamp: Date.now(),
      products: allProducts,
      categories: allCategories,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    renderCategories();
    renderProducts();
  } catch (error) {
    console.error("Error loading data:", error);
    if (allProducts.length === 0) {
      productsContainer.innerHTML =
        "<p>Error loading products. Please try again later.</p>";
    }
  }
}

function renderCategories() {
  categoriesContainer.innerHTML = "";
  // All Products card
  const allCard = document.createElement("div");
  allCard.className = "category all-products";
  allCard.innerHTML = `<div class="category-icon">🛍️</div><h3>All Products</h3><p>View everything</p>`;
  allCard.style.cursor = "pointer";
  allCard.addEventListener("click", () => {
    currentCategoryId = null;
    renderProducts();
    setActiveCategoryCard(allCard);
  });
  categoriesContainer.appendChild(allCard);

  // Top-level categories
  allCategories
    .filter((c) => !c.parent_id)
    .forEach((cat) => {
      const card = document.createElement("div");
      card.className = "category";
      card.innerHTML = `<div class="category-icon">${cat.icon || "🛍️"}</div><h3>${cat.name}</h3><p>${cat.description || ""}</p>`;
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        currentCategoryId = cat.id;
        renderProducts();
        setActiveCategoryCard(card);
      });
      categoriesContainer.appendChild(card);
    });

  setActiveCategoryCard(allCard);
}

function setActiveCategoryCard(activeCard) {
  document
    .querySelectorAll(".category")
    .forEach((card) => card.classList.remove("active"));
  activeCard.classList.add("active");
}

function renderProducts() {
  let productsToShow = allProducts;
  if (currentCategoryId) {
    const subIds = getAllSubcategoryIds(currentCategoryId);
    productsToShow = productsToShow.filter((p) =>
      subIds.includes(p.category_id),
    );
  }
  if (searchTerm) {
    productsToShow = productsToShow.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(searchTerm) ||
        (p.description || "").toLowerCase().includes(searchTerm),
    );
  }

  productsContainer.innerHTML = "";
  if (productsToShow.length === 0) {
    productsContainer.innerHTML = "<p>No products found.</p>";
    return;
  }

  productsToShow.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product";
    const images =
      product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : product.image_url
          ? [product.image_url]
          : [];
    const mainImage =
      images[0] || "https://via.placeholder.com/300x230?text=Product";
    card.innerHTML = `
      <div class="product-image" style="cursor:pointer;">
        <img src="${mainImage}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">
        ${images.length > 1 ? '<span class="image-count">' + images.length + " photos</span>" : ""}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description || ""}</p>
        <div class="price">KES ${product.price.toLocaleString()}</div>
        <a href="${createWhatsAppLink(product.name)}" class="whatsapp" target="_blank">ORDER ON WHATSAPP</a>
      </div>
    `;
    const imageDiv = card.querySelector(".product-image");
    imageDiv.addEventListener("click", () => {
      openModal(images);
    });
    productsContainer.appendChild(card);
  });
}

function getAllSubcategoryIds(parentId) {
  let ids = [parentId];
  const children = allCategories.filter((c) => c.parent_id === parentId);
  children.forEach((child) => {
    ids = ids.concat(getAllSubcategoryIds(child.id));
  });
  return ids;
}

// Image gallery modal functions
function openModal(images) {
  currentProductImages = images;
  currentSlideIndex = 0;
  modal.style.display = "block";
  showSlide(currentSlideIndex);
}

function closeModal() {
  modal.style.display = "none";
}

function showSlide(index) {
  if (index < 0) index = currentProductImages.length - 1;
  if (index >= currentProductImages.length) index = 0;
  currentSlideIndex = index;
  modalSlides.innerHTML = `<img src="${currentProductImages[index]}" alt="Product view">`;
  modalDots.innerHTML = "";
  currentProductImages.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "modal-dot" + (i === currentSlideIndex ? " active" : "");
    dot.addEventListener("click", () => showSlide(i));
    modalDots.appendChild(dot);
  });
}

function changeSlide(direction) {
  showSlide(currentSlideIndex + direction);
}

// Make modal functions global for inline onclick
window.closeModal = closeModal;
window.changeSlide = changeSlide;

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }
  if (viewAllButton) {
    viewAllButton.addEventListener("click", () => {
      currentCategoryId = null;
      searchTerm = "";
      if (searchInput) searchInput.value = "";
      renderProducts();
      // Optionally scroll to products container
      productsContainer.scrollIntoView({ behavior: "smooth" });
    });
  }
  // Close modal if clicking outside content
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
});

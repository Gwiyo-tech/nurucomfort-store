import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const WHATSAPP_NUMBER = "254782250055";
let allProducts = [];
let allCategories = [];
let currentCategoryId = null;
let searchTerm = "";

const productsContainer = document.getElementById("productsContainer");
const categoriesContainer = document.getElementById("categoriesContainer");
const searchInput = document.getElementById("searchInput");
const viewAllButton = document.getElementById("viewAllButton");

function createWhatsAppLink(productName) {
  const msg = `Hello Nuru Comfort, I would like to order ${productName}. Is it available?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

async function loadCategories() {
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    allCategories = [];
    snapshot.forEach((doc) =>
      allCategories.push({ id: doc.id, ...doc.data() }),
    );
    allCategories.sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        a.name.localeCompare(b.name),
    );
    renderCategories();
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

function renderCategories() {
  categoriesContainer.innerHTML = "";
  // "All Products" card
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

async function loadProducts() {
  try {
    const q = query(collection(db, "products"), where("is_active", "==", true));
    const snapshot = await getDocs(q);
    allProducts = [];
    snapshot.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));
    allProducts.sort(
      (a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0),
    );
    renderProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = "<p>Error loading products.</p>";
  }
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
  // Show limited products on homepage, but all if "view all" clicked
  // For simplicity, we'll show all in the container
  productsContainer.innerHTML = "";
  if (productsToShow.length === 0) {
    productsContainer.innerHTML = "<p>No products found.</p>";
    return;
  }
  productsToShow.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product";
    const mainImage =
      product.image_urls && product.image_urls.length > 0
        ? product.image_urls[0]
        : product.image_url;
    card.innerHTML = `
      <div class="product-image">
        <img src="${mainImage || "https://via.placeholder.com/300x230?text=Product"}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.description || ""}</p>
        <div class="price">KES ${product.price.toLocaleString()}</div>
        <a href="${createWhatsAppLink(product.name)}" class="whatsapp" target="_blank">ORDER ON WHATSAPP</a>
      </div>
    `;
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

document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  await loadProducts();
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
    });
  }
});

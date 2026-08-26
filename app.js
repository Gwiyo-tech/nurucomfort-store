// app.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const WHATSAPP_NUMBER = "254782250055";

function createWhatsAppLink(productName) {
  const msg = `Hello Nuru Comfort, I would like to order ${productName}. Is it available?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

let allProducts = [];
let allCategories = [];
let currentCategoryId = null; // null means all

const productsContainer = document.getElementById("productsContainer");
const categoriesContainer = document.getElementById("categoriesContainer");

async function loadCategories() {
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    allCategories = [];
    snapshot.forEach((doc) => {
      allCategories.push({ id: doc.id, ...doc.data() });
    });
    allCategories.sort(
      (a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        a.name.localeCompare(b.name),
    );

    // Render only top-level categories
    categoriesContainer.innerHTML = "";
    allCategories
      .filter((c) => !c.parent_id)
      .forEach((cat) => {
        const card = document.createElement("div");
        card.className = "category";
        card.innerHTML = `
          <div class="category-icon">${cat.icon || "🛍️"}</div>
          <h3>${cat.name}</h3>
          <p>${cat.description || ""}</p>
        `;
        card.style.cursor = "pointer";
        card.addEventListener("click", () => filterByCategory(cat.id));
        categoriesContainer.appendChild(card);
      });

    // Add "All Products" card at the beginning
    addAllProductsCard();
  } catch (error) {
    console.error("Error loading categories:", error);
  }
}

function addAllProductsCard() {
  const allCard = document.createElement("div");
  allCard.className = "category all-products";
  allCard.innerHTML = `
    <div class="category-icon">🛍️</div>
    <h3>All Products</h3>
    <p>View everything</p>
  `;
  allCard.style.cursor = "pointer";
  allCard.addEventListener("click", () => {
    currentCategoryId = null;
    renderProducts();
    setActiveCategoryCard(allCard);
  });
  categoriesContainer.prepend(allCard);
  // Set active by default
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
    snapshot.forEach((doc) => {
      allProducts.push({ id: doc.id, ...doc.data() });
    });
    allProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    });
    renderProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML =
      "<p>Error loading products. Please try again later.</p>";
  }
}

function renderProducts() {
  let productsToShow = allProducts;
  if (currentCategoryId) {
    const subcategoryIds = getAllSubcategoryIds(currentCategoryId);
    productsToShow = allProducts.filter((p) =>
      subcategoryIds.includes(p.category_id),
    );
  }
  productsToShow = productsToShow.slice(0, 6); // keep max 6 for featured

  productsContainer.innerHTML = "";
  if (productsToShow.length === 0) {
    productsContainer.innerHTML = "<p>No products found in this category.</p>";
    return;
  }
  productsToShow.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product";
    card.innerHTML = `
      <div class="product-image">
        <img src="${product.image_url || "https://via.placeholder.com/300x230?text=Product"}" 
             alt="${product.name}" 
             style="width:100%; height:100%; object-fit:cover;">
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

function filterByCategory(categoryId) {
  currentCategoryId = categoryId;
  renderProducts();
  // Find the clicked card and set active
  const cards = document.querySelectorAll(".category");
  cards.forEach((card) => {
    if (
      card.textContent.includes(
        allCategories.find((c) => c.id === categoryId)?.name,
      )
    ) {
      setActiveCategoryCard(card);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  await loadProducts();
});

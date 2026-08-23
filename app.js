// app.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const productsContainer = document.getElementById("productsContainer");
const WHATSAPP_NUMBER = "254782250055"; // your WhatsApp number

function createWhatsAppLink(productName) {
  const msg = `Hello Nuru Comfort, I would like to order ${productName}. Is it available?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

async function loadProducts() {
  try {
    // Fetch latest 6 products (adjust limit as needed)
    const q = query(
      collection(db, "products"),
      orderBy("created_at", "desc"),
      limit(6),
    );
    const snapshot = await getDocs(q);
    productsContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const product = doc.data();
      const card = document.createElement("div");
      card.className = "product";
      card.innerHTML = `
        <div class="product-image">
          <img src="${product.image_url || "https://via.placeholder.com/300x230?text=Product"}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">
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
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML =
      "<p>Error loading products. Please try again later.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadProducts);

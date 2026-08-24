// admin.js
import { authDomain, db, storageBucket } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// DOM elements
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const productForm = document.getElementById("productForm");
const productList = document.getElementById("productList");
const cancelEditBtn = document.getElementById("cancelEdit");

let currentUser = null;
let editingProductId = null;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    loadProducts();
  } else {
    currentUser = null;
    loginSection.classList.remove("hidden");
    adminSection.classList.add("hidden");
  }
});

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.textContent = "";
  } catch (error) {
    loginError.textContent = error.message;
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Load products into list
async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);
  productList.innerHTML = "";
  snapshot.forEach((doc) => {
    const product = doc.data();
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `
      <div style="display:flex; align-items:center;">
        <img src="${product.image_url || "https://via.placeholder.com/50"}" alt="${product.name}">
        <div>
          <strong>${product.name}</strong> - KES ${product.price.toLocaleString()}
          <br><small>Stock: ${product.stock_quantity}</small>
        </div>
      </div>
      <div>
        <button onclick="editProduct('${doc.id}')">Edit</button>
        <button onclick="deleteProduct('${doc.id}')">Delete</button>
      </div>
    `;
    productList.appendChild(item);
  });
}

// Make functions globally accessible for inline onclick
window.editProduct = function (id) {
  const docRef = doc(db, "products", id);
  getDoc(docRef).then((docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("productId").value = id;
      document.getElementById("name").value = data.name;
      document.getElementById("description").value = data.description || "";
      document.getElementById("price").value = data.price;
      document.getElementById("originalPrice").value =
        data.original_price || "";
      document.getElementById("stock").value = data.stock_quantity;
      editingProductId = id;
      cancelEditBtn.classList.remove("hidden");
    }
  });
};

window.deleteProduct = async function (id) {
  if (confirm("Delete this product?")) {
    await deleteDoc(doc(db, "products", id));
    loadProducts();
  }
};

// Handle form submission (add or update)
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const description = document.getElementById("description").value;
  const price = parseFloat(document.getElementById("price").value);
  const originalPrice = document.getElementById("originalPrice").value
    ? parseFloat(document.getElementById("originalPrice").value)
    : null;
  const stock = parseInt(document.getElementById("stock").value);
  const photoFile = document.getElementById("photo").files[0];

  let imageUrl = "";
  if (photoFile) {
    // Upload to Firebase Storage
    const storageRef = ref(storage, `products/${Date.now()}-${photoFile.name}`);
    await uploadBytes(storageRef, photoFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  const productData = {
    name,
    description,
    price,
    original_price: originalPrice,
    stock_quantity: stock,
    updated_at: new Date().toISOString(),
  };

  if (editingProductId) {
    // Update existing product
    const productRef = doc(db, "products", editingProductId);
    if (!imageUrl) {
      // If no new photo, keep old image
      const oldSnap = await getDoc(productRef);
      productData.image_url = oldSnap.data().image_url;
    } else {
      productData.image_url = imageUrl;
    }
    await updateDoc(productRef, productData);
  } else {
    // Add new product
    productData.created_at = new Date().toISOString();
    productData.image_url = imageUrl || null;
    await addDoc(collection(db, "products"), productData);
  }

  // Reset form
  productForm.reset();
  editingProductId = null;
  cancelEditBtn.classList.add("hidden");
  loadProducts();
});

cancelEditBtn.addEventListener("click", () => {
  productForm.reset();
  editingProductId = null;
  cancelEditBtn.classList.add("hidden");
});

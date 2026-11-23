
"use strict";

const $ = id => document.getElementById(id);

const CATEGORIES = [
  ["Fashion","👠"],
  ["Beauty","💄"],
  ["Travel","✈️"],
  ["Cars","🏎️"],
  ["Technology","💻"],
  ["Luxury","💎"],
  ["Lifestyle","☕"],
  ["Home","🛋️"],
  ["Fitness","🎾"],
  ["Food","🍰"]
];

const DEMO_PEOPLE = [
  {
    id:1,
    name:"Sophie Laurent",
    username:"sophiesedit",
    bio:"Collecting beautiful things and little moments.",
    pins:[
      {
        title:"Dream handbag",
        category:"Fashion",
        image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
        achieved:false
      },
      {
        title:"Paris weekend",
        category:"Travel",
        image:"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
        achieved:true
      }
    ]
  },
  {
    id:2,
    name:"Mia Chen",
    username:"miadreams",
    bio:"Fashion, travel and the art of dreaming.",
    pins:[
      {
        title:"Signature perfume",
        category:"Beauty",
        image:"https://images.unsplash.com/photo-1541643600914-78b084683601?w=600",
        achieved:true
      },
      {
        title:"London getaway",
        category:"Travel",
        image:"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600",
        achieved:false
      }
    ]
  },
  {
    id:3,
    name:"Emma Rose",
    username:"emmarose",
    bio:"Big dreams, one little step at a time.",
    pins:[
      {
        title:"Porsche 911",
        category:"Cars",
        image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600",
        achieved:false
      },
      {
        title:"Dream camera",
        category:"Technology",
        image:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        achieved:true
      }
    ]
  }
];

const STARTER_PINS = [
  {
    id:"starter-paris",
    title:"Paris getaway",
    category:"Travel",
    image:"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600",
    tags:"paris france travel holiday"
  },
  {
    id:"starter-handbag",
    title:"Dream designer handbag",
    category:"Fashion",
    image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
    tags:"handbag purse fashion bag"
  },
  {
    id:"starter-porsche",
    title:"Porsche 911",
    category:"Cars",
    image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600",
    tags:"porsche sports car luxury"
  },
  {
    id:"starter-london",
    title:"London getaway",
    category:"Travel",
    image:"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600",
    tags:"london england travel"
  },
  {
    id:"starter-perfume",
    title:"Signature perfume",
    category:"Beauty",
    image:"https://images.unsplash.com/photo-1541643600914-78b084683601?w=600",
    tags:"perfume fragrance beauty"
  },
  {
    id:"starter-camera",
    title:"Dream camera",
    category:"Technology",
    image:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
    tags:"camera photography technology"
  },
  {
    id:"starter-jewelry",
    title:"Gold jewelry",
    category:"Fashion",
    image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600",
    tags:"gold jewelry accessories"
  },
  {
    id:"starter-sneakers",
    title:"Dream sneakers",
    category:"Fashion",
    image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    tags:"shoes sneakers fashion"
  },
  {
    id:"starter-skincare",
    title:"Skincare essentials",
    category:"Beauty",
    image:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600",
    tags:"skincare cosmetics beauty"
  }
];

const DB_NAME = "cravin_upload_database";
const DB_VERSION = 1;

let db = null;
let profile = null;
let interests = [];
let collections = [];
let pins = [];
let follows = [];

let currentPage = "discover";
let activeCategory = "All";
let activeCollection = "all";
let feedMode = "forYou";
let searchText = "";

const objectURLs = new Map();

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[character]);
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getSaved(key, fallback) {
  try {
    const raw = localStorage.getItem("cravin_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem("cravin_profile", JSON.stringify(profile));
  localStorage.setItem("cravin_interests", JSON.stringify(interests));
  localStorage.setItem("cravin_collections", JSON.stringify(collections));
  localStorage.setItem("cravin_follows", JSON.stringify(follows));
}

// INDEXEDDB FOR IMAGE UPLOADS AND PINS

function openDatabase() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if(!database.objectStoreNames.contains("pins")) {
        database.createObjectStore("pins",{keyPath:"id"});
      }

      if(!database.objectStoreNames.contains("images")) {
        database.createObjectStore("images",{keyPath:"id"});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function databaseOperation(storeName, mode, operation) {
  return new Promise((resolve,reject) => {
    const transaction = db.transaction(storeName,mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(storeName,record) {
  return databaseOperation(
    storeName,
    "readwrite",
    store => store.put(record)
  );
}

function getRecord(storeName,id) {
  return databaseOperation(
    storeName,
    "readonly",
    store => store.get(id)
  );
}

function getAllRecords(storeName) {
  return databaseOperation(
    storeName,
    "readonly",
    store => store.getAll()
  );
}

function deleteRecord(storeName,id) {
  return databaseOperation(
    storeName,
    "readwrite",
    store => store.delete(id)
  );
}

function photoURL(pin) {
  return objectURLs.get(pin.id) || pin.imageURL || "";
}

async function hydrateImages() {
  for(const pin of pins) {
    if(pin.imageId) {
      const image = await getRecord("images",pin.imageId);

      if(image?.blob) {
        objectURLs.set(
          pin.id,
          URL.createObjectURL(image.blob)
        );
      }
    }
  }
}

// MODAL HELPERS

function openModal(content) {
  $("modalBody").innerHTML = content;
  $("modalOverlay").classList.remove("hidden");
}

function closeModal() {
  $("modalOverlay").classList.add("hidden");
}

$("closeModal").onclick = closeModal;

$("modalOverlay").addEventListener("click",event => {
  if(event.target === $("modalOverlay")) {
    closeModal();
  }
});

document.addEventListener("keydown",event => {
  if(event.key === "Escape") {
    closeModal();
  }
});

// PAGE NAVIGATION

function showPage(page) {
  currentPage = page;

  document.querySelectorAll(".page").forEach(element => {
    element.classList.add("hidden");
  });

  $(page + "Page").classList.remove("hidden");

  if(page === "discover") renderFeed();
  if(page === "collections") renderCollections();
  if(page === "people") renderPeople();
  if(page === "profile") renderProfile();

  window.scrollTo(0,0);
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click",() => {
    showPage(button.dataset.page);
  });
});

// AVATARS

function makeAvatar(name) {
  const initial = String(name || "C")[0].toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="120" height="120">
      <rect width="120" height="120" rx="60"
        fill="#efd9da"/>
      <text x="60" y="76"
        text-anchor="middle"
        font-family="Georgia"
        font-size="55"
        fill="#704852">${escapeHTML(initial)}</text>
    </svg>
  `;

  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// ONBOARDING

function createProfile() {
  openModal(`
    <p class="eyebrow">WELCOME TO CRAVIN’</p>
    <h2>Create your profile ♡</h2>
    <p class="muted">
      No account registration required for this local demo.
    </p>

    <form id="profileSetupForm">
      <label class="form-label">Your name</label>
      <input class="form-input" name="name"
        required maxlength="40"
        placeholder="Your name">

      <label class="form-label">Username</label>
      <input class="form-input" name="username"
        required pattern="[A-Za-z0-9_]{3,24}"
        placeholder="yourusername">

      <label class="form-label">Your bio</label>
      <input class="form-input" name="bio"
        maxlength="140"
        placeholder="Dreaming big, saving little ♡">

      <button class="btn btn-primary" type="submit"
        style="margin-top:20px">
        Continue →
      </button>
    </form>
  `);

  $("profileSetupForm").onsubmit = event => {
    event.preventDefault();

    const data = new FormData(event.target);

    profile = {
      name:String(data.get("name")).trim(),
      username:String(data.get("username")).trim(),
      bio:String(data.get("bio")).trim(),
      avatar:""
    };

    saveState();
    chooseInterests();
  };
}

function chooseInterests() {
  openModal(`
    <p class="eyebrow">YOUR PERSONAL EDIT</p>
    <h2>What are you cravin’? ♡</h2>
    <p class="muted">Choose at least 3 interests.</p>

    <div class="interest-grid">
      ${CATEGORIES.map(([name,icon]) => `
        <button class="interest-option
          ${interests.includes(name)?"active":""}"
          data-interest="${name}">
          <span>${icon}</span>${name}
        </button>
      `).join("")}
    </div>

    <p id="interestCounter" class="muted"></p>

    <button class="btn btn-primary"
      id="saveInterestsButton">
      Personalize my feed ♡
    </button>
  `);

  const updateCount = () => {
    $("interestCounter").textContent =
      interests.length + " interests selected";
  };

  updateCount();

  document.querySelectorAll("[data-interest]").forEach(button => {
    button.onclick = () => {
      const name = button.dataset.interest;

      if(interests.includes(name)) {
        interests = interests.filter(item => item !== name);
      } else {
        interests.push(name);
      }

      button.classList.toggle("active");
      updateCount();
    };
  });

  $("saveInterestsButton").onclick = () => {
    if(interests.length < 3) {
      alert("Please select at least 3 interests.");
      return;
    }

    saveState();
    closeModal();
    renderFeed();
  };
}

// CREATE PIN WITH REAL UPLOAD

function createPin() {
  openModal(`
    <p class="eyebrow">A NEW CRAVING</p>
    <h2>Create a Pin ♡</h2>

    <form id="createPinForm">
      <div class="upload-area">
        <div style="font-size:42px">📸</div>
        <strong>Upload your dream photo</strong>
        <p>Choose JPG, PNG or WebP (maximum 8 MB)</p>
        <input id="pinFile" type="file"
          accept="image/jpeg,image/png,image/webp">
      </div>

      <p class="muted" style="text-align:center">
        OR
      </p>

      <label class="form-label">Paste image URL</label>
      <input class="form-input" id="pinImageURL"
        type="url"
        placeholder="https://example.com/product.jpg">

      <img id="pinPreview"
        class="image-preview hidden"
        alt="Your pin preview">

      <label class="form-label">Pin title</label>
      <input class="form-input" name="title"
        required maxlength="100"
        placeholder="e.g. Chanel Classic Flap Bag">

      <div class="form-row">
        <div>
          <label class="form-label">Category</label>
          <select class="form-input" name="category">
            ${CATEGORIES.map(([name]) =>
              `<option value="${name}">${name}</option>`
            ).join("")}
          </select>
        </div>

        <div>
          <label class="form-label">Collection</label>
          <select class="form-input" name="collection">
            ${collections.map(folder => `
              <option value="${escapeHTML(folder.id)}">
                ${escapeHTML(folder.name)}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      <label class="form-label">Description (optional)</label>
      <textarea class="form-input" name="description"
        maxlength="300" rows="3"
        placeholder="Why do you love it?"></textarea>

      <label class="checkbox-row">
        <input type="checkbox" name="public" checked>
        Make this pin public
      </label>

      <p class="muted">
        Public means visible in this local demo feed.
        It is not published to other devices.
      </p>

      <h3>Optional savings goal</h3>

      <div class="form-row">
        <div>
          <label class="form-label">Estimated price (€)</label>
          <input class="form-input" name="price"
            type="number" min="0" step="0.01"
            placeholder="0.00">
        </div>

        <div>
          <label class="form-label">Already saved (€)</label>
          <input class="form-input" name="saved"
            type="number" min="0" step="0.01"
            value="0">
        </div>
      </div>

      <label class="form-label">Target date (optional)</label>
      <input class="form-input" name="date" type="date">

      <p class="muted">
        Savings information is never shown on public pins.
      </p>

      <button class="btn btn-primary" type="submit"
        style="margin-top:20px;width:100%">
        Create Pin ♡
      </button>
    </form>
  `);

  const fileInput = $("pinFile");
  const urlInput = $("pinImageURL");
  const preview = $("pinPreview");

  let previewURL = null;

  function clearPreviewURL() {
    if(previewURL) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }
  }

  fileInput.onchange = () => {
    clearPreviewURL();

    const file = fileInput.files?.[0];

    if(!file) {
      preview.classList.add("hidden");
      return;
    }

    if(!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      alert("Please upload JPG, PNG or WebP.");
      fileInput.value = "";
      return;
    }

    if(file.size > 8 * 1024 * 1024) {
      alert("The maximum image size is 8 MB.");
      fileInput.value = "";
      return;
    }

    previewURL = URL.createObjectURL(file);
    preview.src = previewURL;
    preview.classList.remove("hidden");

    urlInput.value = "";
  };

  urlInput.oninput = () => {
    if(urlInput.value.trim()) {
      clearPreviewURL();
      fileInput.value = "";
      preview.src = urlInput.value.trim();
      preview.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
    }
  };

  $("createPinForm").onsubmit = async event => {
    event.preventDefault();

    const form = event.target;
    const data = new FormData(form);
    const file = fileInput.files?.[0];
    const imageURL = urlInput.value.trim();

    if(!file && !imageURL) {
      alert("Please upload an image or paste an image URL.");
      return;
    }

    if(imageURL && !/^https?:\/\//i.test(imageURL)) {
      alert("Please use a valid HTTP or HTTPS image URL.");
      return;
    }

    const rawPrice = String(data.get("price")).trim();
    const price = rawPrice ? Number(rawPrice) : null;
    const saved = Number(data.get("saved") || 0);
    const date = String(data.get("date") || "");

    if(
      (price !== null && (!Number.isFinite(price) || price <= 0)) ||
      !Number.isFinite(saved) ||
      saved < 0 ||
      (price !== null && saved > price) ||
      (price === null && saved > 0)
    ) {
      alert("Please check your savings amounts.");
      return;
    }

    const id = uid();
    const imageId = file ? id : null;

    const pin = {
      id,
      title:String(data.get("title")).trim(),
      category:String(data.get("category")),
      collectionId:String(data.get("collection")),
      description:String(data.get("description")).trim(),
      isPublic:data.has("public"),
      imageURL:file ? "" : imageURL,
      imageId,
      price,
      saved,
      date,
      achieved:false,
      createdAt:Date.now()
    };

    try {
      if(file) {
        await putRecord("images",{
          id:imageId,
          blob:file
        });
      }

      await putRecord("pins",pin);

      pins.unshift(pin);

      if(file) {
        objectURLs.set(id,URL.createObjectURL(file));
      }

      clearPreviewURL();
      closeModal();

      activeCollection = "all";
      searchText = "";
      $("searchInput").value = "";

      showPage("collections");
    } catch(error) {
      console.error(error);
      alert(
        "Unable to save this pin. Browser storage may be full."
      );
    }
  };
}

$("createPinButton").onclick = createPin;
$("heroCreateButton").onclick = createPin;
$("emptyCreateButton").onclick = createPin;

// CREATE COLLECTION

function createCollection() {
  openModal(`
    <p class="eyebrow">CURATE YOUR WORLD</p>
    <h2>New Collection ♡</h2>

    <form id="collectionForm">
      <label class="form-label">Collection name</label>
      <input class="form-input" name="name"
        required maxlength="45"
        placeholder="Dream Wardrobe">

      <label class="form-label">Cover emoji</label>
      <input class="form-input" name="emoji"
        maxlength="8" value="🎀">

      <label class="checkbox-row">
        <input type="checkbox" name="public" checked>
        Public collection
      </label>

      <button class="btn btn-primary" type="submit"
        style="margin-top:20px">
        Create Collection ♡
      </button>
    </form>
  `);

  $("collectionForm").onsubmit = event => {
    event.preventDefault();

    const data = new FormData(event.target);
    const name = String(data.get("name")).trim();

    if(!name) return;

    if(collections.some(folder =>
      folder.name.toLowerCase() === name.toLowerCase()
    )) {
      alert("A collection with that name already exists.");
      return;
    }

    collections.push({
      id:uid(),
      name,
      emoji:String(data.get("emoji")).trim() || "♡",
      isPublic:data.has("public")
    });

    saveState();
    closeModal();
    renderCollections();
  };
}

$("newCollectionButton").onclick = createCollection;

function renderCollections() {
  $("collectionsGrid").innerHTML = collections.map(folder => {
    const count = pins.filter(pin =>
      pin.collectionId === folder.id
    ).length;

    return `
      <article class="collection-card"
        data-folder="${escapeHTML(folder.id)}">
        <div class="collection-cover">
          ${escapeHTML(folder.emoji)}
        </div>

        <div class="collection-info">
          <h3>${escapeHTML(folder.name)}</h3>
          <p>
            ${count} pins ·
            ${folder.isPublic ? "Public" : "Private"}
          </p>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-folder]").forEach(card => {
    card.onclick = () => {
      activeCollection = card.dataset.folder;
      renderCollections();
      $("selectedCollectionTitle").scrollIntoView({
        behavior:"smooth"
      });
    };
  });

  const selectedFolder = collections.find(folder =>
    folder.id === activeCollection
  );

  $("selectedCollectionTitle").textContent =
    selectedFolder?.name || "All My Pins";

  const items = pins.filter(pin =>
    activeCollection === "all" ||
    pin.collectionId === activeCollection
  );

  renderPinCards("collectionPins",items,true);
}

$("showAllCollections").onclick = () => {
  activeCollection = "all";
  renderCollections();
};

// SEARCH AND DISCOVERY

function allDiscoverablePins() {
  const ownPublic = pins.filter(pin => {
    const folder = collections.find(
      item => item.id === pin.collectionId
    );

    return pin.isPublic && folder?.isPublic;
  });

  return [
    ...ownPublic,
    ...STARTER_PINS.map(item => ({
      ...item,
      isStarter:true,
      imageURL:item.image,
      description:"",
      achieved:false
    }))
  ];
}

function matchesSearch(pin,query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const searchable = [
    pin.title,
    pin.category,
    pin.description,
    pin.tags || ""
  ].join(" ").toLowerCase();

  return terms.every(term => searchable.includes(term));
}

function renderCategoryFilters() {
  const names = ["All",...CATEGORIES.map(item => item[0])];

  $("categoryFilters").innerHTML = names.map(name => `
    <button
      class="${activeCategory === name ? "active" : ""}"
      data-category="${name}">
      ${name}
    </button>
  `).join("");

  document.querySelectorAll("[data-category]").forEach(button => {
    button.onclick = () => {
      activeCategory = button.dataset.category;
      renderCategoryFilters();
      renderFeed();
    };
  });
}

function renderFeed() {
  let items = allDiscoverablePins();

  if(activeCategory !== "All") {
    items = items.filter(pin =>
      pin.category === activeCategory
    );
  }

  if(searchText) {
    items = items.filter(pin =>
      matchesSearch(pin,searchText)
    );
  }

  if(feedMode === "forYou") {
    items.sort((a,b) =>
      Number(interests.includes(b.category)) -
      Number(interests.includes(a.category))
    );
  }

  $("searchStatus").textContent = searchText
    ? `${items.length} matching results for "${searchText}"`
    : "";

  renderPinCards("pinFeed",items,false);

  $("emptyFeed").classList.toggle(
    "hidden",
    items.length > 0
  );
}

function renderPinCards(targetId,items,showPrivate) {
  $(targetId).innerHTML = items.map(pin => {
    const src = photoURL(pin);

    const folder = collections.find(item =>
      item.id === pin.collectionId
    );

    return `
      <article class="pin-card">
        <div class="pin-image">
          <img
            loading="lazy"
            src="${escapeHTML(src)}"
            alt="${escapeHTML(pin.title)}"
            data-view-pin="${escapeHTML(pin.id)}"
          >

          <div class="pin-actions">
            <button data-save-pin="${escapeHTML(pin.id)}">
              ${pin.isStarter ? "Save ♡" : "View ♡"}
            </button>
          </div>
        </div>

        <div class="pin-info">
          <h3>${escapeHTML(pin.title)}</h3>
          <p>
            ${escapeHTML(pin.category)}
            ${showPrivate && folder
              ? " · " + escapeHTML(folder.name)
              : ""}
          </p>

          ${pin.achieved
            ? `<span class="achieved-tag">
                ✦ Dream Achieved
               </span>`
            : ""}
        </div>
      </article>
    `;
  }).join("");

  $(targetId).querySelectorAll("[data-view-pin]").forEach(image => {
    image.onclick = () => openPin(image.dataset.viewPin);
  });

  $(targetId).querySelectorAll("[data-save-pin]").forEach(button => {
    button.onclick = () => openPin(button.dataset.savePin);
  });
}

function findPin(id) {
  return pins.find(pin => pin.id === id) ||
    STARTER_PINS.find(pin => pin.id === id);
}

function openPin(id) {
  const pin = findPin(id);
  if(!pin) return;

  const src = photoURL(pin);

  if(pin.isStarter || id.startsWith("starter-")) {
    openModal(`
      <p class="eyebrow">SAVE YOUR INSPIRATION</p>
      <h2>${escapeHTML(pin.title)}</h2>

      <img class="image-preview"
        src="${escapeHTML(src)}"
        alt="${escapeHTML(pin.title)}">

      <p class="muted">
        Save this inspiration to your own collection.
      </p>

      <button class="btn btn-primary" id="saveStarterPin">
        Save to My Wishlist ♡
      </button>
    `);

    $("saveStarterPin").onclick = () => {
      closeModal();
      createPin();

      const titleInput = document.querySelector(
        '#createPinForm [name="title"]'
      );

      if(titleInput) titleInput.value = pin.title;

      $("pinImageURL").value = src;
      $("pinPreview").src = src;
      $("pinPreview").classList.remove("hidden");

      const categoryInput = document.querySelector(
        '#createPinForm [name="category"]'
      );

      if(categoryInput) categoryInput.value = pin.category;
    };

    return;
  }

  const folder = collections.find(item =>
    item.id === pin.collectionId
  );

  openModal(`
    <p class="eyebrow">
      ${pin.achieved ? "✦ DREAM ACHIEVED" : "MY WISHLIST"}
    </p>

    <h2>${escapeHTML(pin.title)}</h2>

    <img class="image-preview"
      src="${escapeHTML(src)}"
      alt="${escapeHTML(pin.title)}">

    <p>${escapeHTML(pin.description || "")}</p>

    <p class="muted">
      ${escapeHTML(pin.category)} ·
      ${escapeHTML(folder?.name || "Collection")}
    </p>

    <p class="muted">
      ${pin.isPublic && folder?.isPublic
        ? "Public pin"
        : "Private pin"}
    </p>

    <div class="card-buttons">
      <button class="btn btn-primary" id="toggleAchieved">
        ${pin.achieved ? "Undo Achievement" : "Dream Achieved ✦"}
      </button>

      <button class="btn btn-outline" id="deletePinButton">
        Delete Pin
      </button>
    </div>
  `);

  $("toggleAchieved").onclick = async () => {
    pin.achieved = !pin.achieved;
    await putRecord("pins",pin);
    closeModal();
    renderEverything();
  };

  $("deletePinButton").onclick = async () => {
    if(!confirm("Delete this pin?")) return;

    await deleteRecord("pins",pin.id);

    if(pin.imageId) {
      await deleteRecord("images",pin.imageId);
    }

    const objectURL = objectURLs.get(pin.id);

    if(objectURL) {
      URL.revokeObjectURL(objectURL);
      objectURLs.delete(pin.id);
    }

    pins = pins.filter(item => item.id !== pin.id);

    closeModal();
    renderEverything();
  };
}

// SEARCH SUGGESTIONS

const searchInput = $("searchInput");
const suggestionsBox = $("suggestions");

searchInput.addEventListener("input",() => {
  searchText = searchInput.value.trim();

  const items = allDiscoverablePins()
    .filter(pin => matchesSearch(pin,searchText))
    .slice(0,7);

  suggestionsBox.innerHTML = searchText
    ? items.map(pin => `
      <button data-search="${escapeHTML(pin.title)}">
        ⌕ ${escapeHTML(pin.title)}
      </button>
    `).join("")
    : "";

  suggestionsBox.classList.toggle(
    "hidden",
    !searchText || items.length === 0
  );

  suggestionsBox.querySelectorAll("[data-search]").forEach(button => {
    button.onclick = () => {
      searchInput.value = button.dataset.search;
      searchText = searchInput.value;
      suggestionsBox.classList.add("hidden");
      showPage("discover");
    };
  });

  showPage("discover");
});

searchInput.addEventListener("keydown",event => {
  if(event.key === "Enter") {
    suggestionsBox.classList.add("hidden");
    showPage("discover");
  }
});

document.addEventListener("click",event => {
  if(!event.target.closest(".search-container")) {
    suggestionsBox.classList.add("hidden");
  }
});

$("forYouButton").onclick = () => {
  feedMode = "forYou";
  $("forYouButton").classList.add("active");
  $("exploreAllButton").classList.remove("active");
  renderFeed();
};

$("exploreAllButton").onclick = () => {
  feedMode = "all";
  $("exploreAllButton").classList.add("active");
  $("forYouButton").classList.remove("active");
  renderFeed();
};

// SAVINGS GOALS

function renderSavings() {
  const goals = pins.filter(pin =>
    pin.price !== null && pin.price > 0
  );

  if(!goals.length) {
    $("savingsGrid").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♡</div>
        <h3>No savings goals yet</h3>
        <p>Create a pin and add an estimated price.</p>
      </div>
    `;
    return;
  }

  $("savingsGrid").innerHTML = goals.map(pin => {
    const progress = Math.min(
      100,
      Math.round(pin.saved / pin.price * 100)
    );

    let weekly = null;

    if(pin.date) {
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(pin.date+"T00:00:00") - new Date()) /
          86400000
        )
      );

      weekly = Math.max(
        0,
        (pin.price - pin.saved) / days * 7
      );
    }

    const message = pin.achieved
      ? "You made your dream happen! ♡"
      : progress >= 100
      ? "Your dream fund is ready! ✨"
      : progress >= 50
      ? "You're getting closer, keep going! ♡"
      : "Little by little, you've got this ♡";

    return `
      <article class="savings-card">
        <img
          src="${escapeHTML(photoURL(pin))}"
          alt="${escapeHTML(pin.title)}">

        <div class="savings-content">
          <p class="eyebrow">
            ${pin.achieved
              ? "DREAM ACHIEVED ✦"
              : "YOUR SAVINGS JOURNEY"}
          </p>

          <h3>${escapeHTML(pin.title)}</h3>

          <div class="progress-track">
            <div class="progress-fill"
              style="width:${progress}%"></div>
          </div>

          <p>
            <strong>${progress}% saved</strong>
          </p>

          <p>
            €${pin.saved.toFixed(2)}
            / €${pin.price.toFixed(2)}
          </p>

          <p class="encouragement">${message}</p>

          ${weekly !== null
            ? `<p class="muted">
                Suggested saving:
                €${weekly.toFixed(2)} / week
               </p>`
            : ""}

          <div class="card-buttons">
            <button class="btn btn-primary"
              data-add-savings="${escapeHTML(pin.id)}">
              + Add Savings
            </button>

            <button class="btn btn-outline"
              data-achieve-goal="${escapeHTML(pin.id)}">
              ${pin.achieved ? "Undo" : "Achieved ✦"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-add-savings]").forEach(button => {
    button.onclick = async () => {
      const pin = pins.find(item =>
        item.id === button.dataset.addSavings
      );

      const answer = prompt("How much did you save? (€)");

      if(answer === null || !answer.trim()) return;

      const amount = Number(answer);

      if(!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a positive amount.");
        return;
      }

      pin.saved = Math.min(
        pin.price,
        Math.round((pin.saved + amount) * 100) / 100
      );

      await putRecord("pins",pin);
      renderSavings();
    };
  });

  document.querySelectorAll("[data-achieve-goal]").forEach(button => {
    button.onclick = async () => {
      const pin = pins.find(item =>
        item.id === button.dataset.achieveGoal
      );

      pin.achieved = !pin.achieved;

      await putRecord("pins",pin);
      renderEverything();
    };
  });
}

// PROFILE

function renderProfile() {
  if(!profile) return;

  $("profileAvatar").src =
    profile.avatar || makeAvatar(profile.name);

  $("profileName").textContent = profile.name;
  $("profileUsername").textContent = "@" + profile.username;
  $("profileBio").textContent = profile.bio;

  $("profileStats").textContent =
    `${pins.length} pins · ` +
    `${pins.filter(pin => pin.achieved).length} achieved · ` +
    `${collections.length} collections · ` +
    `${follows.length} following`;

  renderSavings();
}

function editProfile() {
  openModal(`
    <p class="eyebrow">YOUR PERSONAL EDIT</p>
    <h2>Edit Profile ♡</h2>

    <form id="editProfileForm">
      <label class="form-label">Display name</label>
      <input class="form-input" name="name"
        required maxlength="40"
        value="${escapeHTML(profile.name)}">

      <label class="form-label">Username</label>
      <input class="form-input" name="username"
        required pattern="[A-Za-z0-9_]{3,24}"
        value="${escapeHTML(profile.username)}">

      <label class="form-label">Bio</label>
      <input class="form-input" name="bio"
        maxlength="140"
        value="${escapeHTML(profile.bio)}">

      <label class="form-label">Avatar image URL</label>
      <input class="form-input" name="avatar"
        type="url"
        value="${escapeHTML(profile.avatar || "")}">

      <button class="btn btn-primary" type="submit"
        style="margin-top:20px">
        Save Changes
      </button>
    </form>
  `);

  $("editProfileForm").onsubmit = event => {
    event.preventDefault();

    const data = new FormData(event.target);

    profile = {
      name:String(data.get("name")).trim(),
      username:String(data.get("username")).trim(),
      bio:String(data.get("bio")).trim(),
      avatar:String(data.get("avatar")).trim()
    };

    saveState();
    closeModal();
    renderProfile();
  };
}

$("editProfileButton").onclick = editProfile;
$("editInterestsButton").onclick = chooseInterests;

// DEMO COMMUNITY

function renderPeople() {
  $("peopleGrid").innerHTML = DEMO_PEOPLE.map(person => `
    <article class="person-card">
      <img class="person-avatar"
        src="${makeAvatar(person.name)}"
        alt="${escapeHTML(person.name)}">

      <h3>${escapeHTML(person.name)}</h3>
      <p>@${escapeHTML(person.username)}</p>
      <p>${escapeHTML(person.bio)}</p>

      <div class="person-actions">
        <button class="btn btn-primary"
          data-follow="${person.id}">
          ${follows.includes(person.id)
            ? "Following ✓"
            : "Follow +"}
        </button>

        <button class="btn btn-outline"
          data-person="${person.id}">
          View Wishlist
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-follow]").forEach(button => {
    button.onclick = () => {
      const id = Number(button.dataset.follow);

      follows = follows.includes(id)
        ? follows.filter(item => item !== id)
        : [...follows,id];

      saveState();
      renderPeople();
    };
  });

  document.querySelectorAll("[data-person]").forEach(button => {
    button.onclick = () => {
      viewPublicProfile(Number(button.dataset.person));
    };
  });
}

function viewPublicProfile(id) {
  const person = DEMO_PEOPLE.find(item => item.id === id);

  if(!person) return;

  $("publicProfile").classList.remove("hidden");

  $("publicProfile").innerHTML = `
    <p class="eyebrow">PUBLIC WISHLIST · DEMO PROFILE</p>
    <h2>${escapeHTML(person.name)}'s world ♡</h2>
    <p>${escapeHTML(person.bio)}</p>

    <p class="muted">
      ${person.pins.length} wishlist items ·
      ${person.pins.filter(pin => pin.achieved).length}
      dreams achieved
    </p>

    <div class="masonry">
      ${person.pins.map(pin => `
        <article class="pin-card">
          <div class="pin-image">
            <img src="${escapeHTML(pin.image)}"
              alt="${escapeHTML(pin.title)}">
          </div>

          <div class="pin-info">
            <h3>${escapeHTML(pin.title)}</h3>
            <p>${escapeHTML(pin.category)}</p>

            ${pin.achieved
              ? `<span class="achieved-tag">
                  ✦ Dream Achieved
                 </span>`
              : ""}
          </div>
        </article>
      `).join("")}
    </div>

    <p class="muted">
      Savings amounts and progress are private.
    </p>
  `;

  $("publicProfile").scrollIntoView({behavior:"smooth"});
}

// RENDER ALL

function renderEverything() {
  renderCategoryFilters();
  renderFeed();
  renderCollections();
  renderPeople();
  renderProfile();
}

// INITIALIZE WEBSITE

async function initialize() {
  try {
    db = await openDatabase();

    profile = getSaved("profile",null);
    interests = getSaved("interests",[]);

    collections = getSaved("collections",[
      {
        id:"birthday",
        name:"Birthday Wishlist",
        emoji:"🎂",
        isPublic:true
      },
      {
        id:"christmas",
        name:"Christmas Wishes",
        emoji:"🎄",
        isPublic:true
      },
      {
        id:"wardrobe",
        name:"Dream Wardrobe",
        emoji:"👠",
        isPublic:true
      },
      {
        id:"travel",
        name:"Travel Dreams",
        emoji:"✈️",
        isPublic:true
      },
      {
        id:"cars",
        name:"Dream Cars",
        emoji:"🏎️",
        isPublic:true
      }
    ]);

    follows = getSaved("follows",[]);

    pins = await getAllRecords("pins");

    pins.sort((a,b) =>
      (b.createdAt || 0) - (a.createdAt || 0)
    );

    await hydrateImages();

    saveState();
    renderEverything();

    if(!profile) {
      createProfile();
    } else if(interests.length < 3) {
      chooseInterests();
    }

  } catch(error) {
    console.error("CRAVIN initialization error:",error);

    alert(
      "CRAVIN could not open browser storage. " +
      "Try Chrome in a normal window or use a local server."
    );
  }
}

initialize();

let data = [];
let filtered = [];
let currentCategory = "All";
let currentSubcategory = "All";
let currentFilter = "all";
let searchQuery = "";

// Fetch data
fetch("data.json")
  .then(r => r.json())
  .then(d => {
    data = d;
    filtered = d;
    updateStats();
    buildCategories();
    renderTopSuppliers();
    render();
  })
  .catch(err => {
    console.error("Failed to load data:", err);
    document.getElementById("grid").innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <p>Failed to load vendor data</p>
      </div>
    `;
  });

function renderTopSuppliers() {
  const grid = document.getElementById("top-suppliers-grid");
  if (!grid) return;
  
  // Filter for Verified + High trust vendors
  const topVendors = data
    .filter(v => v.verification_status === 'Verified' && v.trust_level === 'High')
    .sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0))
    .slice(0, 15);
  
  if (topVendors.length === 0) {
    grid.innerHTML = `
      <div class="empty" style="grid-column: 1/-1; text-align: center; padding: 40px;">
        <p>No verified suppliers yet. <a href="#directory" style="color: var(--accent);">Browse all vendors</a></p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = topVendors.map(v => `
    <div class="supplier-card" onclick="scrollToVendor('${v.name}')">
      <div class="supplier-name">
        ${escapeHtml(v.name)}
        <span class="trust-badge high" style="font-size:10px;padding:2px 6px;">${v.trust_level}</span>
      </div>
      <div class="supplier-category">${escapeHtml(v.category || 'Other')}${v.subcategory ? ' → ' + escapeHtml(v.subcategory) : ''}</div>
      ${v.website ? `<div class="supplier-domain">${escapeHtml(extractDomain(v.website))}</div>` : ''}
      <div class="supplier-badges">
        <span class="supplier-badge verified">✓ Verified</span>
        ${v.business_type ? `<span class="supplier-badge high-trust">${escapeHtml(v.business_type)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function scrollToVendor(name) {
  document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const searchInput = document.querySelector('.search');
    if (searchInput) {
      searchInput.value = name;
      search(name);
    }
  }, 500);
}

function updateStats() {
  document.getElementById("total-count").textContent = data.length;
  document.getElementById("website-count").textContent = data.filter(d => d.website).length;
  document.getElementById("showing-count").textContent = filtered.length;
  
  // Update filter counts
  document.getElementById("filter-all").textContent = data.length;
  document.getElementById("filter-website").textContent = data.filter(d => d.website).length;
  document.getElementById("filter-email").textContent = data.filter(d => d.email).length;
  document.getElementById("filter-phone").textContent = data.filter(d => d.phone).length;
  
  // Update results info
  updateResultsInfo();
  updateActiveFilters();
}

function updateResultsInfo() {
  const info = document.getElementById("results-info");
  const total = data.length;
  const showing = filtered.length;
  
  if (showing === total) {
    info.innerHTML = `Showing all <strong>${total}</strong> vendors`;
  } else {
    info.innerHTML = `Showing <strong>${showing}</strong> of <strong>${total}</strong> vendors`;
  }
}

function updateActiveFilters() {
  const container = document.getElementById("active-filters");
  const hasFilters = currentCategory !== "All" || currentSubcategory !== "All" || currentFilter !== "all" || searchQuery;
  
  if (!hasFilters) {
    container.innerHTML = "";
    return;
  }
  
  let tags = [];
  
  if (currentCategory !== "All") {
    tags.push(`<span class="active-filter">📁 ${escapeHtml(currentCategory)} <button onclick="clearCategory()">×</button></span>`);
  }
  
  if (currentSubcategory !== "All") {
    tags.push(`<span class="active-filter">🏷 ${escapeHtml(currentSubcategory)} <button onclick="clearSubcategory()">×</button></span>`);
  }
  
  if (currentFilter !== "all") {
    const label = currentFilter === "website" ? "✓ Website" : currentFilter === "email" ? "✉ Email" : "📞 Phone";
    tags.push(`<span class="active-filter">${label} <button onclick="setFilter('all')">×</button></span>`);
  }
  
  if (searchQuery) {
    tags.push(`<span class="active-filter">🔍 "${escapeHtml(searchQuery)}" <button onclick="clearSearch()">×</button></span>`);
  }
  
  tags.push(`<button class="reset-all" onclick="resetFilters()">Reset All</button>`);
  
  container.innerHTML = tags.join('');
}

function clearCategory() {
  currentCategory = "All";
  currentSubcategory = "All";
  document.querySelectorAll("#categories .chip").forEach(c => c.classList.remove("active"));
  document.querySelector("#categories .chip").classList.add("active");
  document.getElementById("subcategory-section").style.display = "none";
  applyFilters();
}

function clearSubcategory() {
  currentSubcategory = "All";
  document.querySelectorAll("#subcategories .chip").forEach(c => c.classList.remove("active"));
  document.querySelector("#subcategories .chip").classList.add("active");
  applyFilters();
}

function clearSearch() {
  searchQuery = "";
  document.querySelector(".search").value = "";
  applyFilters();
}

function buildCategories() {
  // Top categories to display prominently (by count)
  const mainCategories = [
    "Clothes", "Hair", "Devices", "Health & Beauty",
    "Kids & Toys", "Home & Garden", "Sports & Outdoors", "Other"
  ];
  
  const container = document.getElementById("categories");
  container.innerHTML = "";

  // "All" first
  const allDiv = document.createElement("div");
  allDiv.className = "chip active";
  allDiv.innerHTML = `
    <span>All</span>
    <span class="count">${data.length}</span>
  `;
  allDiv.onclick = () => {
    document.querySelectorAll("#categories .chip").forEach(c => c.classList.remove("active"));
    allDiv.classList.add("active");
    filterCategory("All");
  };
  container.appendChild(allDiv);

  // Add main categories with counts
  mainCategories.forEach(cat => {
    let count;
    if (cat === "Other") {
      count = data.filter(d => !mainCategories.slice(0, -1).includes(d.category)).length;
    } else {
      count = data.filter(d => d.category === cat).length;
    }
    
    if (count === 0) return; // Skip empty categories
    
    const div = document.createElement("div");
    div.className = "chip";
    div.innerHTML = `
      <span>${escapeHtml(cat)}</span>
      <span class="count">${count}</span>
    `;
    div.onclick = () => {
      document.querySelectorAll("#categories .chip").forEach(c => c.classList.remove("active"));
      div.classList.add("active");
      filterCategory(cat);
    };
    container.appendChild(div);
  });
}

function buildSubcategories() {
  let subs;
  if (currentCategory === "All") {
    subs = [...new Set(data.map(d => d.subcategory))];
  } else if (currentCategory === "Other") {
    // Get subcategories from non-main categories
    subs = [...new Set(data.filter(d => !MAIN_CATEGORIES.includes(d.category)).map(d => d.subcategory))];
  } else {
    subs = [...new Set(data.filter(d => d.category === currentCategory).map(d => d.subcategory))];
  }
  subs = ["All", ...subs.filter(Boolean).sort()];
  
  const section = document.getElementById("subcategory-section");
  const container = document.getElementById("subcategories");
  container.innerHTML = "";

  if (subs.length > 1) {
    section.style.display = "block";
    
    subs.forEach(sub => {
      const div = document.createElement("div");
      div.className = "chip";
      let count;
      if (currentCategory === "All") {
        count = sub === "All" ? data.length : data.filter(d => d.subcategory === sub).length;
      } else if (currentCategory === "Other") {
        count = sub === "All"
          ? data.filter(d => !MAIN_CATEGORIES.includes(d.category)).length
          : data.filter(d => !MAIN_CATEGORIES.includes(d.category) && d.subcategory === sub).length;
      } else {
        count = sub === "All" 
          ? data.filter(d => d.category === currentCategory).length
          : data.filter(d => d.category === currentCategory && d.subcategory === sub).length;
      }
      div.innerHTML = `
        <span>${escapeHtml(sub)}</span>
        <span class="count">${count}</span>
      `;
      if (sub === currentSubcategory) div.classList.add("active");
      
      div.onclick = () => {
        document.querySelectorAll("#subcategories .chip").forEach(c => c.classList.remove("active"));
        div.classList.add("active");
        currentSubcategory = sub;
        applyFilters();
      };
      container.appendChild(div);
    });
  } else {
    section.style.display = "none";
  }
}

function filterCategory(cat) {
  currentCategory = cat;
  currentSubcategory = "All";
  buildSubcategories();
  applyFilters();
}

const MAIN_CATEGORIES = [
  "Clothes", "Hair", "Devices", "Health & Beauty",
  "Kids & Toys", "Home & Garden", "Sports & Outdoors"
];

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll("#filters .chip").forEach(c => c.classList.remove("active"));
  document.querySelector(`#filters .chip[data-filter="${filter}"]`).classList.add("active");
  applyFilters();
}

function resetFilters() {
  currentCategory = "All";
  currentSubcategory = "All";
  currentFilter = "all";
  searchQuery = "";
  
  document.querySelectorAll("#categories .chip").forEach(c => c.classList.remove("active"));
  document.querySelector("#categories .chip").classList.add("active");
  
  document.querySelectorAll("#filters .chip").forEach(c => c.classList.remove("active"));
  document.querySelector("#filters .chip").classList.add("active");
  
  document.getElementById("subcategory-section").style.display = "none";
  document.querySelector(".search").value = "";
  
  applyFilters();
}

function applyFilters() {
  filtered = data.filter(d => {
    // Category matching - handle "Other" specially
    let matchCategory = true;
    if (currentCategory === "Other") {
      matchCategory = !MAIN_CATEGORIES.includes(d.category);
    } else {
      matchCategory = currentCategory === "All" || d.category === currentCategory;
    }
    
    const matchSub = currentSubcategory === "All" || d.subcategory === currentSubcategory;

    // Quick filter
    let matchFilter = true;
    if (currentFilter === "website") matchFilter = !!d.website;
    else if (currentFilter === "email") matchFilter = !!d.email;
    else if (currentFilter === "phone") matchFilter = !!d.phone;

    const matchSearch =
      !searchQuery ||
      (d.name && d.name.toLowerCase().includes(searchQuery)) ||
      (d.category && d.category.toLowerCase().includes(searchQuery)) ||
      (d.subcategory && d.subcategory.toLowerCase().includes(searchQuery)) ||
      (d.email && d.email.toLowerCase().includes(searchQuery)) ||
      (d.website && d.website.toLowerCase().includes(searchQuery));

    return matchCategory && matchSub && matchFilter && matchSearch;
  });

  // Sort by trust level (High -> Medium -> Low), then by name
  const trustOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  filtered.sort((a, b) => {
    const trustA = trustOrder[a.trust_level] || 99;
    const trustB = trustOrder[b.trust_level] || 99;
    if (trustA !== trustB) return trustA - trustB;
    return (a.name || '').localeCompare(b.name || '');
  });

  updateStats();
  render();
}

function search(q) {
  searchQuery = q.toLowerCase();
  applyFilters();
}

function highlight(text) {
  if (!text) return "";
  if (!searchQuery) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
  return escaped.replace(regex, '<span class="highlight">$1</span>');
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncateUrl(url, maxLen = 40) {
  if (!url) return "";
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen) + "...";
}

function extractDomain(website) {
  if (!website) return "";
  try {
    let url = website.toLowerCase();
    if (!url.startsWith('http')) url = 'https://' + url;
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return website;
  }
}

function render() {
  const grid = document.getElementById("grid");
  
  if (filtered.length === 0) {
    const hasFilters = currentCategory !== "All" || currentSubcategory !== "All" || currentFilter !== "all" || searchQuery;
    
    let message = "No vendors found";
    let hint = "Try adjusting your filters or search";
    
    if (searchQuery) {
      message = `No results for "${escapeHtml(searchQuery)}"`;
      hint = "Try a different search term or clear filters";
    } else if (currentFilter !== "all") {
      const filterName = currentFilter === "website" ? "websites" : currentFilter === "email" ? "emails" : "phone numbers";
      message = `No vendors with ${filterName}`;
      hint = `Try selecting "All" in Quick Filters`;
    } else if (currentCategory !== "All") {
      message = `No vendors in ${escapeHtml(currentCategory)}`;
      hint = "Try a different category";
    }
    
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <p>${message}</p>
        <p style="margin-top:8px;font-size:13px;">${hint}</p>
        ${hasFilters ? '<button onclick="resetFilters()" style="margin-top:16px;padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;">Reset Filters</button>' : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = "";

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";

    const categoryDisplay = item.subcategory 
      ? `${item.category} → ${item.subcategory}` 
      : item.category || "Other";

    let badges = [];
    if (item.website) badges.push('<span class="badge success">✓ Website</span>');
    if (item.email) badges.push('<span class="badge">✉ Email</span>');
    if (item.phone) badges.push('<span class="badge">📞 Phone</span>');

    // Trust badge with explanation for Low trust
    let trustBadge = '';
    if (item.trust_level) {
      const level = item.trust_level.toLowerCase();
      const explanation = item.trust_level === 'Low' 
        ? 'Missing contact info or broken website' 
        : '';
      trustBadge = `<span class="trust-badge ${level}" ${explanation ? `data-explanation="${explanation}"` : ''}>${item.trust_level}</span>`;
    }

    div.innerHTML = `
      <div class="card-name">${highlight(item.name)} ${trustBadge}</div>
      <div class="card-category">${highlight(categoryDisplay)}</div>
      ${item.website ? `<div class="card-website">${highlight(extractDomain(item.website))}</div>` : ''}
      ${item.phone ? `<div class="card-phone">📞 ${escapeHtml(item.phone)}</div>` : ''}
      <div class="card-badges">${badges.join('')}</div>
    `;

    div.onclick = () => openModal(item);
    grid.appendChild(div);
  });
}

function openModal(item) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modalContent");

  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    <div class="modal-title">${escapeHtml(item.name)}</div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
      </svg>
      <div>
        <div class="modal-label">Category</div>
        <div class="modal-value">${escapeHtml(item.category)}</div>
      </div>
    </div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
      </svg>
      <div>
        <div class="modal-label">Subcategory</div>
        <div class="modal-value">${escapeHtml(item.subcategory || "N/A")}</div>
      </div>
    </div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
      </svg>
      <div>
        <div class="modal-label">Phone</div>
        <div class="modal-value">${escapeHtml(item.phone || "N/A")}</div>
      </div>
    </div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      <div>
        <div class="modal-label">Email</div>
        <div class="modal-value">${escapeHtml(item.email || "N/A")}</div>
      </div>
    </div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
      </svg>
      <div>
        <div class="modal-label">Website</div>
        <div class="modal-value">
          ${item.website ? `<a href="${escapeHtml(item.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.website)}</a>` : "N/A"}
        </div>
      </div>
    </div>
    
    <div class="modal-row">
      <svg class="modal-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <div>
        <div class="modal-label">Trust Score</div>
        <div class="modal-value">
          <span class="trust-badge ${item.trust_level ? item.trust_level.toLowerCase() : 'low'}">${item.trust_level || 'Low'}</span>
          <span style="margin-left:8px;color:var(--text-muted);font-size:12px;">${item.trust_score || 0}/100</span>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});
</script>

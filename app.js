(function () {
  "use strict";

  const PRODUCTS = Array.isArray(window.CATALOG_PRODUCTS) ? window.CATALOG_PRODUCTS : [];

  const CHAPTERS = [
    {
      key: "Ten & Baz",
      roman: "BÖLÜM I",
      subtitle: "Pürüzsüz, taze ve gün boyu kalıcı ten makyajının temel ürünleri"
    },
    {
      key: "Yüz & Işıltı",
      roman: "BÖLÜM II",
      subtitle: "Yanaklara canlılık, yüz hatlarına sıcaklık ve doğal ışıltı katan seçki"
    },
    {
      key: "Göz & Kaş",
      roman: "BÖLÜM III",
      subtitle: "Zengin far paletleri, belirgin maskaralar, eyeliner ve kaş sabitleyiciler"
    },
    {
      key: "Dudak",
      roman: "BÖLÜM IV",
      subtitle: "İkonik rujlar, dolgunlaştırıcı parlatıcılar, bakım yağları ve özel setler"
    },
    {
      key: "Fırça & Aksesuar",
      roman: "BÖLÜM V",
      subtitle: "Kusursuz uygulama ve şık taşıma için seçilmiş fırça setleri ve aksesuarlar"
    }
  ];

  // Türkçe ve aksanlı karakterlere duyarlı arama normalizasyonu
  function normalizeTr(text) {
    return String(text || "")
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .replace(/ı/g, "i")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[’'‘`]/g, "");
  }

  function padNo(n) {
    return String(n).padStart(2, "0");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Durum (State)
  const state = {
    view: "grid", // "grid" | "book"
    category: "all",
    brand: "all",
    query: "",
    spreadIndex: 0,
    modalIndex: -1
  };

  // DOM Referansları
  const els = {
    gridView: document.getElementById("gridView"),
    bookView: document.getElementById("bookView"),
    bookSpread: document.getElementById("bookSpread"),
    bookPrev: document.getElementById("bookPrev"),
    bookNext: document.getElementById("bookNext"),
    bookPageLabel: document.getElementById("bookPageLabel"),
    bookDots: document.getElementById("bookDots"),
    emptyState: document.getElementById("emptyState"),
    categoryPills: document.getElementById("categoryPills"),
    brandSelect: document.getElementById("brandSelect"),
    brandStrip: document.getElementById("brandStrip"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    resultMeta: document.getElementById("resultMeta"),
    modeGrid: document.getElementById("modeGrid"),
    modeBook: document.getElementById("modeBook"),
    btnOpenBook: document.getElementById("btnOpenBook"),
    btnResetFilters: document.getElementById("btnResetFilters"),
    scrollTopBtn: document.getElementById("scrollTopBtn"),
    statCount: document.getElementById("statCount"),
    statBrands: document.getElementById("statBrands"),
    // Modal
    modal: document.getElementById("productModal"),
    modalClose: document.getElementById("modalClose"),
    modalMedia: document.getElementById("modalMedia"),
    modalImg: document.getElementById("modalImg"),
    modalNo: document.getElementById("modalNo"),
    modalBrand: document.getElementById("modalBrand"),
    modalCategory: document.getElementById("modalCategory"),
    modalTitle: document.getElementById("modalTitle"),
    modalTag: document.getElementById("modalTag"),
    modalDesc: document.getElementById("modalDesc"),
    modalWhatsapp: document.getElementById("modalWhatsapp"),
    modalPrev: document.getElementById("modalPrev"),
    modalNext: document.getElementById("modalNext"),
    modalCounter: document.getElementById("modalCounter")
  };

  // Benzersiz markaları hesapla
  const brandCounts = new Map();
  PRODUCTS.forEach((p) => {
    brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
  });
  const sortedBrands = Array.from(brandCounts.keys()).sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  // İstatistikleri doldur
  if (els.statCount) els.statCount.textContent = String(PRODUCTS.length);
  if (els.statBrands) els.statBrands.textContent = String(sortedBrands.length);

  // Filtrelenmiş ürün listesi
  function getFilteredProducts() {
    const q = normalizeTr(state.query.trim());
    return PRODUCTS.filter((p) => {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (state.brand !== "all" && p.brand !== state.brand) return false;
      if (q) {
        const hay = normalizeTr(
          `${p.id} ${padNo(p.id)} no ${padNo(p.id)} ${p.name} ${p.brand} ${p.category} ${p.tag} ${p.desc}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // Marka dropdown & alt marka şeridini oluştur
  function initBrands() {
    sortedBrands.forEach((brand) => {
      const opt = document.createElement("option");
      opt.value = brand;
      opt.textContent = `${brand} (${brandCounts.get(brand)})`;
      els.brandSelect.appendChild(opt);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "brand-strip-btn";
      btn.textContent = brand;
      btn.addEventListener("click", () => {
        state.brand = brand;
        state.category = "all";
        state.query = "";
        state.spreadIndex = 0;
        syncControls();
        render();
        document.getElementById("koleksiyon").scrollIntoView({ behavior: "smooth" });
      });
      els.brandStrip.appendChild(btn);
    });
  }

  // Kategori sekmelerini oluştur
  function renderCategoryPills() {
    const counts = new Map();
    PRODUCTS.forEach((p) => {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });

    const items = [
      { key: "all", label: "Tümü", count: PRODUCTS.length },
      ...CHAPTERS.map((ch) => ({
        key: ch.key,
        label: ch.key,
        count: counts.get(ch.key) || 0
      }))
    ];

    els.categoryPills.innerHTML = items
      .map(
        (item) => `
        <button
          type="button"
          class="cat-pill ${state.category === item.key ? "is-active" : ""}"
          data-cat="${escapeHtml(item.key)}"
        >
          ${escapeHtml(item.label)}<span class="pill-count">(${item.count})</span>
        </button>
      `
      )
      .join("");

    els.categoryPills.querySelectorAll(".cat-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.category = btn.dataset.cat;
        state.spreadIndex = 0;
        render();
      });
    });
  }

  function createProductCardHtml(p) {
    return `
      <article class="product-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)} detaylarını aç">
        <div class="card-media" style="--frame-bg: ${escapeHtml(p.bg)};">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" width="${p.width}" height="${p.height}" />
          <span class="card-no">No. ${padNo(p.id)}</span>
          <span class="card-tag">${escapeHtml(p.tag)}</span>
        </div>
        <div class="card-body">
          <span class="card-brand">${escapeHtml(p.brand)}</span>
          <h3 class="card-title">${escapeHtml(p.name)}</h3>
          <p class="card-desc">${escapeHtml(p.desc)}</p>
        </div>
      </article>
    `;
  }

  // 1) Koleksiyon (Grid / Bölümler) Görünümü
  function renderGrid(filtered) {
    const isUnfiltered = state.category === "all" && state.brand === "all" && !state.query.trim();

    if (isUnfiltered) {
      els.gridView.innerHTML = CHAPTERS.map((ch) => {
        const chapterItems = filtered.filter((p) => p.category === ch.key);
        if (!chapterItems.length) return "";
        return `
          <section class="chapter-section" id="bolum-${normalizeTr(ch.key).replace(/[^a-z0-9]+/g, "-")}">
            <div class="chapter-header">
              <div>
                <span class="chapter-kicker">${ch.roman}</span>
                <h2 class="chapter-title">${escapeHtml(ch.key)}</h2>
                <p class="chapter-sub">${escapeHtml(ch.subtitle)}</p>
              </div>
              <span class="chapter-count">${chapterItems.length} Ürün</span>
            </div>
            <div class="product-grid">
              ${chapterItems.map(createProductCardHtml).join("")}
            </div>
          </section>
        `;
      }).join("");
    } else {
      const heading =
        state.category !== "all"
          ? state.category
          : state.brand !== "all"
          ? `${state.brand} Seçkisi`
          : "Arama Sonuçları";

      els.gridView.innerHTML = `
        <section class="chapter-section">
          <div class="chapter-header">
            <div>
              <span class="chapter-kicker">SEÇİLİ KOLEKSİYON</span>
              <h2 class="chapter-title">${escapeHtml(heading)}</h2>
            </div>
            <span class="chapter-count">${filtered.length} Ürün</span>
          </div>
          <div class="product-grid">
            ${filtered.map(createProductCardHtml).join("")}
          </div>
        </section>
      `;
    }

    bindCardClicks(els.gridView, filtered);
  }

  // 2) Sayfa Çevirmeli Katalog Görünümü (Her açık çift sayfada 8 ürün: Sol 4 + Sağ 4)
  function renderBook(filtered) {
    const PER_PAGE = 4;
    const PER_SPREAD = PER_PAGE * 2;
    const totalSpreads = Math.max(1, Math.ceil(filtered.length / PER_SPREAD));

    if (state.spreadIndex >= totalSpreads) state.spreadIndex = totalSpreads - 1;
    if (state.spreadIndex < 0) state.spreadIndex = 0;

    const start = state.spreadIndex * PER_SPREAD;
    const leftItems = filtered.slice(start, start + PER_PAGE);
    const rightItems = filtered.slice(start + PER_PAGE, start + PER_SPREAD);

    const leftPageNum = state.spreadIndex * 2 + 1;
    const rightPageNum = state.spreadIndex * 2 + 2;
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    const renderPageHtml = (items, pageNum, sideClass) => {
      const headLabel = items.length ? items[0].category : "Ürün Kataloğu";
      const content = items.length
        ? `<div class="book-page-grid">
            ${items
              .map(
                (p) => `
              <article class="book-item" data-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(p.name)} detaylarını aç">
                <div class="book-item-media" style="--frame-bg: ${escapeHtml(p.bg)};">
                  <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
                  <span class="book-item-no">No. ${padNo(p.id)}</span>
                </div>
                <span class="book-item-brand">${escapeHtml(p.brand)}</span>
                <h3 class="book-item-title">${escapeHtml(p.name)}</h3>
                <p class="book-item-desc">${escapeHtml(p.desc)}</p>
              </article>
            `
              )
              .join("")}
          </div>`
        : `<div class="book-empty-page">
            <h3>Seçkinin Sonu</h3>
            <p>Kataloğumuzdaki tüm ürünleri incelediniz. Sipariş ve detaylı bilgi için 0535 954 8578 numarasından veya @ozdee_cosmeticss hesabından ulaşabilirsiniz.</p>
          </div>`;

      return `
        <div class="book-page ${sideClass}">
          <div class="book-running-head">
            <span>ÖZDE PREMİUM KOZMETİK</span>
            <span>${escapeHtml(headLabel)}</span>
          </div>
          ${content}
          <div class="book-page-foot">
            <span>Ürün Kataloğu</span>
            <span>Sayfa ${padNo(pageNum)}</span>
          </div>
        </div>
      `;
    };

    els.bookSpread.innerHTML =
      renderPageHtml(leftItems, leftPageNum, "book-page-left") +
      renderPageHtml(rightItems, rightPageNum, "book-page-right");

    // Sayfa animasyonunu yeniden tetikle
    els.bookSpread.style.animation = "none";
    void els.bookSpread.offsetWidth;
    els.bookSpread.style.animation = "";

    const shownEnd = Math.min(rightPageNum, totalPages);
    els.bookPageLabel.textContent =
      leftPageNum === shownEnd
        ? `Sayfa ${leftPageNum} / ${totalPages}`
        : `Sayfa ${leftPageNum}–${shownEnd} / ${totalPages}`;

    els.bookPrev.disabled = state.spreadIndex === 0;
    els.bookNext.disabled = state.spreadIndex >= totalSpreads - 1;

    els.bookDots.innerHTML = Array.from({ length: totalSpreads })
      .map(
        (_, i) => `
        <button
          type="button"
          class="book-dot ${i === state.spreadIndex ? "is-active" : ""}"
          aria-label="Açık sayfa ${i + 1}"
          data-spread="${i}"
        ></button>
      `
      )
      .join("");

    els.bookDots.querySelectorAll(".book-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        state.spreadIndex = Number(dot.dataset.spread);
        render();
      });
    });

    bindCardClicks(els.bookSpread, filtered);
  }

  function bindCardClicks(container, currentList) {
    container.querySelectorAll("[data-id]").forEach((card) => {
      const open = () => {
        const id = Number(card.dataset.id);
        const idx = currentList.findIndex((p) => p.id === id);
        if (idx !== -1) openModal(currentList, idx);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  // Modal Mantığı
  let activeModalList = PRODUCTS;

  function openModal(list, index) {
    activeModalList = list;
    state.modalIndex = index;
    updateModalContent();
    els.modal.hidden = false;
    document.body.style.overflow = "hidden";
    els.modalClose.focus();
  }

  function closeModal() {
    els.modal.hidden = true;
    document.body.style.overflow = "";
    state.modalIndex = -1;
  }

  function updateModalContent() {
    const p = activeModalList[state.modalIndex];
    if (!p) return;
    els.modalMedia.style.setProperty("--frame-bg", p.bg);
    els.modalImg.src = p.image;
    els.modalImg.alt = p.name;
    els.modalNo.textContent = `No. ${padNo(p.id)}`;
    els.modalBrand.textContent = p.brand;
    els.modalCategory.textContent = p.category;
    els.modalTitle.textContent = p.name;
    els.modalTag.textContent = p.tag;
    els.modalDesc.textContent = p.desc;
    if (els.modalWhatsapp) {
      const msg = `Merhaba Özde Premium Kozmetik, katalogdaki No. ${padNo(p.id)} - ${p.name} ürünü hakkında bilgi alabilir miyim?`;
      els.modalWhatsapp.href = `https://wa.me/905359548578?text=${encodeURIComponent(msg)}`;
    }
    els.modalCounter.textContent = `${state.modalIndex + 1} / ${activeModalList.length}`;
  }

  function stepModal(delta) {
    if (state.modalIndex < 0 || !activeModalList.length) return;
    state.modalIndex = (state.modalIndex + delta + activeModalList.length) % activeModalList.length;
    updateModalContent();
  }

  // Kontrolleri durumla eşitle
  function syncControls() {
    els.brandSelect.value = state.brand;
    els.searchInput.value = state.query;
    els.searchClear.hidden = !state.query;
    els.modeGrid.classList.toggle("is-active", state.view === "grid");
    els.modeGrid.setAttribute("aria-selected", String(state.view === "grid"));
    els.modeBook.classList.toggle("is-active", state.view === "book");
    els.modeBook.setAttribute("aria-selected", String(state.view === "book"));
  }

  // Ana Render
  function render() {
    renderCategoryPills();
    syncControls();

    const filtered = getFilteredProducts();
    els.resultMeta.textContent = `${filtered.length} / ${PRODUCTS.length} ürün gösteriliyor`;

    if (!filtered.length) {
      els.gridView.hidden = true;
      els.bookView.hidden = true;
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;

    if (state.view === "grid") {
      els.gridView.hidden = false;
      els.bookView.hidden = true;
      renderGrid(filtered);
    } else {
      els.gridView.hidden = true;
      els.bookView.hidden = false;
      renderBook(filtered);
    }
  }

  // Olay Dinleyicileri
  els.modeGrid.addEventListener("click", () => {
    state.view = "grid";
    render();
  });

  els.modeBook.addEventListener("click", () => {
    state.view = "book";
    state.spreadIndex = 0;
    render();
  });

  els.btnOpenBook.addEventListener("click", () => {
    state.view = "book";
    state.spreadIndex = 0;
    render();
    document.getElementById("koleksiyon").scrollIntoView({ behavior: "smooth" });
  });

  els.brandSelect.addEventListener("change", () => {
    state.brand = els.brandSelect.value;
    state.spreadIndex = 0;
    render();
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value;
    state.spreadIndex = 0;
    render();
  });

  els.searchClear.addEventListener("click", () => {
    state.query = "";
    state.spreadIndex = 0;
    render();
    els.searchInput.focus();
  });

  els.btnResetFilters.addEventListener("click", () => {
    state.category = "all";
    state.brand = "all";
    state.query = "";
    state.spreadIndex = 0;
    render();
  });

  els.bookPrev.addEventListener("click", () => {
    state.spreadIndex -= 1;
    render();
  });

  els.bookNext.addEventListener("click", () => {
    state.spreadIndex += 1;
    render();
  });

  // Kapak kolaj kartlarına tıklayınca ürünü aç
  document.querySelectorAll("[data-open-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.openId);
      const idx = PRODUCTS.findIndex((p) => p.id === id);
      if (idx !== -1) openModal(PRODUCTS, idx);
    });
  });

  // Modal olayları
  els.modalClose.addEventListener("click", closeModal);
  els.modalPrev.addEventListener("click", () => stepModal(-1));
  els.modalNext.addEventListener("click", () => stepModal(1));
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  // Klavye kısayolları
  document.addEventListener("keydown", (e) => {
    if (!els.modal.hidden) {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") stepModal(-1);
      if (e.key === "ArrowRight") stepModal(1);
      return;
    }

    if (state.view === "book" && document.activeElement !== els.searchInput) {
      if (e.key === "ArrowLeft" && !els.bookPrev.disabled) {
        state.spreadIndex -= 1;
        render();
      } else if (e.key === "ArrowRight" && !els.bookNext.disabled) {
        state.spreadIndex += 1;
        render();
      }
    }
  });

  // Yukarı çık düğmesi
  window.addEventListener(
    "scroll",
    () => {
      els.scrollTopBtn.hidden = window.scrollY < 500;
    },
    { passive: true }
  );

  els.scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Başlat
  initBrands();
  render();
})();

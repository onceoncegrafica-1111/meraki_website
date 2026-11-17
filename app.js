/* ==========================================================================
   MERAKI · ENRUTADOR, MODAL CON SELECTOR DE PRENDAS/COMBOS Y WHATSAPP
   ========================================================================== */

let activeCurrency = localStorage.getItem('meraki_currency') || 'ARS';
let currentView = 'home';
let activeRubro = 'Todo';
let activeSubcat = 'Todas';
let activeHomeSection = 'home';
let searchQuery = '';
let shoppingBag = JSON.parse(localStorage.getItem('meraki_bag') || '[]');
let currentPdpProduct = null;
let currentPdpSize = 'A confirmar';
let currentPdpComboSelection = 'all'; // Para conjuntos: 'all' | índice del ítem

function buildSkeletonCards(count) {
    return Array.from({ length: count }, () => `
        <div class="skeleton-card" aria-hidden="true">
            <div class="skeleton-box skeleton-img"></div>
            <div class="skeleton-box skeleton-line1"></div>
            <div class="skeleton-box skeleton-line2"></div>
            <div class="skeleton-box skeleton-line3"></div>
        </div>
    `).join('');
}

function renderSkeletonStates() {
    const homeGrid = document.getElementById('homeCuratedGrid');
    const catGrid = document.getElementById('categoryProductsGrid');
    if (homeGrid && !homeGrid.children.length) homeGrid.innerHTML = buildSkeletonCards(6);
    if (catGrid && !catGrid.children.length) catGrid.innerHTML = buildSkeletonCards(8);
}

function setCurrency(curr) {
    playTap();
    activeCurrency = curr;
    localStorage.setItem('meraki_currency', curr);
    document.querySelectorAll('.curr-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.curr === curr);
    });
    if (PRODUCTS.length > 0) {
        renderHomeCuratedGrid();
        if (currentView === 'category') renderCategoryGrid();
    }
    renderBagDrawer();
    if (currentPdpProduct && document.getElementById('pdpModal').classList.contains('open')) {
        updatePdpPrices(currentPdpProduct);
    }
}

function getOrderedRubros() {
    const orderedPriority = ['Indumentaria', 'Deco & Home', 'Bazar', 'Aromas'];
    const existing = [...new Set(PRODUCTS.map(p => p.rubro).filter(Boolean))];
    return existing.sort((a, b) => {
        const ia = orderedPriority.indexOf(a), ib = orderedPriority.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

function afterCatalogLoaded() {
    buildTopBarAndUniverses();
    renderHomeCuratedGrid();
    handleRouteFromHash();
}

function buildTopBarAndUniverses() {
    const rubros = getOrderedRubros();
    const topBar = document.getElementById('topCategoriesBar');
    let html = `<button class="top-cat-pill ${currentView === 'home' && activeHomeSection === 'home' ? 'active' : ''}" data-nav="home" onclick="navigateToHome(event)">Inicio</button>`;
    rubros.forEach(r => {
        const isAct = currentView === 'category' && activeRubro === r;
        html += `<button class="top-cat-pill ${isAct ? 'active' : ''}" data-nav="cat-${r}" onclick="navigateToCategory('${r}')">${r}</button>`;
    });
    html += `
        <button class="top-cat-pill ${currentView === 'home' && activeHomeSection === 'bienestar' ? 'active' : ''}" data-nav="bienestar" onclick="scrollToSection(event, 'bienestar')">7 Intenciones</button>
        <button class="top-cat-pill ${currentView === 'home' && activeHomeSection === 'contacto' ? 'active' : ''}" data-nav="contacto" onclick="scrollToSection(event, 'contacto')">Contacto</button>
        <button class="top-cat-pill ${currentView === 'home' && activeHomeSection === 'ubicacion' ? 'active' : ''}" data-nav="ubicacion" onclick="scrollToSection(event, 'ubicacion')">Showroom</button>
    `;
    topBar.innerHTML = html;

    const portalsGrid = document.getElementById('universesPortalGrid');
    const tileClasses = {
        'Indumentaria': { cls: 'tile-indumentaria', sub: 'Tendencia & Básicas' },
        'Deco & Home':  { cls: 'tile-deco',         sub: 'Refugio & Diseño' },
        'Bazar':        { cls: 'tile-bazar',        sub: 'Mesa & Detalles' },
        'Aromas':       { cls: 'tile-aromas',       sub: 'Textil & Sahumado' }
    };

    portalsGrid.innerHTML = rubros.map((r, i) => {
        const count = PRODUCTS.filter(p => p.rubro === r).length;
        const conf = tileClasses[r] || { cls: 'tile-bazar', sub: 'Colección MeraKi' };
        return `
            <article class="universe-tile ${conf.cls}" onclick="navigateToCategory('${r}')">
                <div class="tile-top">
                    <span>0${i + 1} · ${count} piezas</span>
                    <span>↗</span>
                </div>
                <div>
                    <h3 class="tile-name">${r}</h3>
                    <p class="tile-sub">${conf.sub}</p>
                </div>
            </article>
        `;
    }).join('');

    const mobileMenu = document.getElementById('mobileMenuBody');
    mobileMenu.innerHTML = `
        <span class="product-sub-kicker" style="color:var(--ink-light);">Páginas de Colección</span>
        <button onclick="navigateToHome(event); closeAllOverlays();" style="text-align:left; font-size:1.15rem; font-weight:700; padding:7px 0; border-bottom:1px solid var(--hairline); text-transform:uppercase;">Inicio</button>
        ${rubros.map(r => `
            <button onclick="navigateToCategory('${r}'); closeAllOverlays();" style="text-align:left; font-size:1.15rem; font-weight:700; padding:7px 0; border-bottom:1px solid var(--hairline); text-transform:uppercase;">${r}</button>
        `).join('')}
    `;
}

function setActiveHeaderTab(navKey) {
    document.querySelectorAll('#topCategoriesBar .top-cat-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === navKey);
    });
}

function navigateToHome(e) {
    if (e) e.preventDefault();
    playTap();
    currentView = 'home';
    activeHomeSection = 'home';
    searchQuery = '';
    document.getElementById('catalogSearchInput').value = '';
    document.getElementById('searchExpandBar').classList.remove('open');
    document.getElementById('pageCategoryView').classList.remove('active');
    document.getElementById('pageHomeView').classList.add('active');
    if (location.hash !== '#inicio') history.replaceState(null, '', '#inicio');
    setActiveHeaderTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateFloatingVisibility();
}

function navigateToCategory(rubro) {
    playTap();
    currentView = 'category';
    activeRubro = rubro;
    activeSubcat = 'Todas';
    document.getElementById('pageHomeView').classList.remove('active');
    document.getElementById('pageCategoryView').classList.add('active');
    const newHash = `categoria/${encodeURIComponent(rubro)}`;
    if (location.hash !== `#${newHash}`) location.hash = newHash;
    setActiveHeaderTab(`cat-${rubro}`);
    renderCategoryPageHeaderAndSubcats();
    renderCategoryGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateFloatingVisibility();
}

function scrollToSection(e, sectionId) {
    if (e) e.preventDefault();
    playTap();
    activeHomeSection = sectionId;
    const perform = () => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        const headerEl = document.getElementById('luxuryHeader');
        const offset = (headerEl ? headerEl.offsetHeight : 100) + 18;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        setActiveHeaderTab(sectionId);
    };
    if (currentView !== 'home') {
        currentView = 'home';
        document.getElementById('pageCategoryView').classList.remove('active');
        document.getElementById('pageHomeView').classList.add('active');
        setTimeout(perform, 60);
    } else {
        perform();
    }
}

function handleRouteFromHash() {
    const h = decodeURIComponent(location.hash || '');
    if (h.startsWith('#categoria/')) {
        const targetRubro = h.replace('#categoria/', '');
        if (targetRubro === 'Todo' || PRODUCTS.some(p => p.rubro === targetRubro)) navigateToCategory(targetRubro);
    }
}
window.addEventListener('hashchange', handleRouteFromHash);

function getWeeklyHomeSix() {
    if (PRODUCTS.length === 0) return [];
    const flagged = PRODUCTS.filter(p => p.destacado === true);
    if (flagged.length >= 6) return flagged.slice(0, 6);
    const selected = [...flagged];
    const usedIds = new Set(selected.map(p => p.id));
    for (const p of PRODUCTS) {
        if (selected.length >= 6) break;
        if (!usedIds.has(p.id)) { selected.push(p); usedIds.add(p.id); }
    }
    return selected;
}

function buildSwatchesHTML(colores) {
    if (!colores || colores.length === 0) return '';
    const dots = colores.slice(0, 6).map(c =>
        `<span class="color-dot-sample ${c.light ? 'is-light' : ''}" style="background-color:${c.hex};" title="${c.name}"></span>`
    ).join('');
    const namesText = colores.map(c => c.name).join(' · ');
    return `
        <div class="product-swatches-row">
            ${dots}
            <span class="color-names-mini">${namesText}</span>
        </div>
    `;
}

function formatPriceDisplay(item) {
    if (item.isCombo && item.preciosArray && item.preciosArray.length > 1) {
        const p1 = formatMoney(getProductPrice({ precioARS: item.preciosArray[0] }));
        const p2 = formatMoney(getProductPrice({ precioARS: item.preciosArray[1] }));
        return `${p1} / ${p2}`;
    }
    const val = getProductPrice(item);
    return val > 0 ? formatMoney(val) : 'Consultar precio';
}

function createProductCardHTML(item, idx = 99) {
    const priceStr = formatPriceDisplay(item);
    const subLabel = [item.rubro, item.subcategoria].filter(Boolean).join(' · ');
    const fetchAttr = idx < 4 ? 'fetchpriority="high"' : 'loading="lazy"';

    return `
        <article class="product-card-minimal" onclick="openPdpModal('${item.id}')">
            <div class="product-image-stage">
                ${item.etiqueta ? `<span class="product-tag-minimal">${item.etiqueta}</span>` : ''}
                <img src="${item.imagen}" alt="${item.nombre}" ${fetchAttr} decoding="async">
                <button class="product-quick-add" title="Agregar" onclick="quickAddBag(event, '${item.id}')">+</button>
            </div>
            <div class="product-meta-block">
                <div class="product-kicker-row">
                    <span class="product-sub-kicker">${subLabel}</span>
                    ${item.tallesLabel ? `<span class="product-size-pill-mini">${item.tallesLabel}</span>` : ''}
                </div>
                <h3 class="product-name-clean">${item.nombre}</h3>
                ${item.descripcion ? `<p class="product-desc-mini">${item.descripcion}</p>` : ''}
                ${buildSwatchesHTML(item.colores)}
                <div class="product-bottom-row">
                    <span class="product-price-clean">${priceStr}</span>
                </div>
            </div>
        </article>
    `;
}

function renderHomeCuratedGrid() {
    const grid = document.getElementById('homeCuratedGrid');
    const sub = document.getElementById('homeCuratedSubtitle');
    const list = getWeeklyHomeSix();
    sub.innerText = `${list.length} Piezas Curadas · Mix de Temporada (${activeCurrency})`;
    if (list.length === 0) { grid.innerHTML = buildSkeletonCards(6); return; }
    grid.innerHTML = list.map((p, i) => createProductCardHTML(p, i)).join('');
}

function renderCategoryPageHeaderAndSubcats() {
    const titleEl = document.getElementById('catPageTitle');
    titleEl.innerText = activeRubro === 'Todo' ? 'Toda la Colección' : activeRubro;
    const subRow = document.getElementById('dynamicSubcatRow');
    const pool = activeRubro === 'Todo' ? PRODUCTS : PRODUCTS.filter(p => p.rubro === activeRubro);
    const subs = [...new Set(pool.map(p => p.subcategoria).filter(Boolean))];
    if (subs.length > 1) {
        subRow.innerHTML = ['Todas', ...subs].map(s => `
            <button class="subcat-pill-btn ${activeSubcat === s ? 'active' : ''}" onclick="selectSubcat('${s}')">${s}</button>
        `).join('');
        subRow.classList.add('visible');
    } else {
        subRow.classList.remove('visible');
    }
}

function selectSubcat(sub) {
    playTap();
    activeSubcat = sub;
    renderCategoryPageHeaderAndSubcats();
    renderCategoryGrid();
}

function renderCategoryGrid() {
    const grid = document.getElementById('categoryProductsGrid');
    const counterEl = document.getElementById('catPageCounter');
    const filtered = PRODUCTS.filter(p => {
        const matchRubro = activeRubro === 'Todo' || p.rubro === activeRubro;
        const matchSub = activeSubcat === 'Todas' || p.subcategoria === activeSubcat;
        const q = searchQuery.toLowerCase();
        return matchRubro && matchSub && (!q || p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q));
    });
    counterEl.innerText = `${filtered.length} piezas disponibles · ${activeCurrency}`;
    if (!filtered.length) { grid.innerHTML = `<div class="empty-catalog-state">No hay resultados.</div>`; return; }
    grid.innerHTML = filtered.map((p, i) => createProductCardHTML(p, i)).join('');
}

function toggleSearchBar() {
    playTap();
    const bar = document.getElementById('searchExpandBar');
    bar.classList.toggle('open');
    if (bar.classList.contains('open')) document.getElementById('catalogSearchInput').focus();
}

function handleSearch(val) {
    searchQuery = val.trim();
    if (searchQuery.length > 0 && currentView !== 'category') {
        activeRubro = 'Todo'; activeSubcat = 'Todas'; currentView = 'category';
        document.getElementById('pageHomeView').classList.remove('active');
        document.getElementById('pageCategoryView').classList.add('active');
    }
    renderCategoryGrid();
}

function clearSearch() {
    searchQuery = '';
    document.getElementById('catalogSearchInput').value = '';
    document.getElementById('searchExpandBar').classList.remove('open');
    navigateToHome();
}

// ==========================================================================
// MODAL QUICK-VIEW CON SELECTOR DE PRENDAS PARA CONJUNTOS
// ==========================================================================
function openPdpModal(id) {
    playTap();
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;

    currentPdpProduct = item;
    currentPdpSize = item.talles[0] || 'A confirmar';
    currentPdpComboSelection = item.isCombo ? 'all' : null;

    document.getElementById('pdpImg').src = item.imagen;
    document.getElementById('pdpKicker').innerText = [item.rubro, item.subcategoria].filter(Boolean).join(' · ');
    document.getElementById('pdpTitle').innerText = item.nombre;

    const descEl = document.getElementById('pdpDesc');
    descEl.innerText = item.descripcion || '';
    descEl.style.display = item.descripcion ? 'block' : 'none';

    // Colores
    const colorsBlock = document.getElementById('pdpColorsBlock');
    const colorsList = document.getElementById('pdpColorsList');
    if (item.colores && item.colores.length > 0) {
        colorsList.innerHTML = item.colores.map(c => `
            <span class="pdp-color-chip">
                <span class="color-dot-sample ${c.light ? 'is-light' : ''}" style="background-color:${c.hex};"></span>
                <span>${c.name}</span>
            </span>
        `).join('');
        colorsBlock.style.display = 'flex';
    } else {
        colorsBlock.style.display = 'none';
    }

    // Talles
    document.getElementById('pdpSizeGrid').innerHTML = item.talles.map((t, idx) => `
        <button class="size-chip ${idx === 0 ? 'selected' : ''}" onclick="selectSizeChip(this, '${t}')">${t}</button>
    `).join('');

    // Si es conjunto con 2 prendas, agregamos selector en el modal
    renderComboItemSelector(item);
    updatePdpPrices(item);
    updatePdpWppLink();

    document.getElementById('globalBackdrop').classList.add('open');
    document.getElementById('pdpModal').classList.add('open');
}

function renderComboItemSelector(item) {
    let comboContainer = document.getElementById('pdpComboSelectorBlock');
    if (!comboContainer) {
        comboContainer = document.createElement('div');
        comboContainer.id = 'pdpComboSelectorBlock';
        comboContainer.style.margin = '10px 0';
        const sizeBlock = document.getElementById('pdpSizeBlock');
        sizeBlock.parentNode.insertBefore(comboContainer, sizeBlock);
    }

    if (!item.isCombo || !item.subItems || item.subItems.length < 2) {
        comboContainer.style.display = 'none';
        return;
    }

    const totalCombo = item.subItems.reduce((acc, sub) => acc + sub.priceARS, 0);
    comboContainer.style.display = 'block';
    comboContainer.innerHTML = `
        <span class="product-sub-kicker" style="color:var(--ink-black); margin-bottom:6px; display:block;">¿Qué prenda te interesa?</span>
        <div style="display:flex; flex-direction:column; gap:6px;">
            ${item.subItems.map((sub, idx) => `
                <button type="button" class="subcat-pill-btn" style="text-align:left; font-size:0.72rem; display:flex; justify-content:space-between;" onclick="selectComboPart(${idx})">
                    <span>${sub.name}</span>
                    <b>${formatMoney(getProductPrice({ precioARS: sub.priceARS }))}</b>
                </button>
            `).join('')}
            <button type="button" class="subcat-pill-btn active" style="text-align:left; font-size:0.72rem; display:flex; justify-content:space-between;" onclick="selectComboPart('all')">
                <span>Look Completo (ambas prendas)</span>
                <b>${formatMoney(getProductPrice({ precioARS: totalCombo }))}</b>
            </button>
        </div>
    `;
}

function selectComboPart(choice) {
    playTap();
    currentPdpComboSelection = choice;
    const btns = document.querySelectorAll('#pdpComboSelectorBlock button');
    btns.forEach((b, idx) => {
        b.classList.toggle('active', choice === 'all' ? (idx === btns.length - 1) : idx === choice);
    });
    updatePdpPrices(currentPdpProduct);
    updatePdpWppLink();
}

function updatePdpPrices(item) {
    let currentPriceARS = item.precioARS;
    if (item.isCombo && item.subItems.length > 1) {
        if (currentPdpComboSelection === 'all') {
            currentPriceARS = item.subItems.reduce((acc, sub) => acc + sub.priceARS, 0);
        } else if (typeof currentPdpComboSelection === 'number') {
            currentPriceARS = item.subItems[currentPdpComboSelection].priceARS;
        }
    }

    const mainPrice = formatMoney(getProductPrice({ precioARS: currentPriceARS }, activeCurrency));
    document.getElementById('pdpPriceMain').innerText = currentPriceARS > 0 ? mainPrice : 'Consultar precio';
}

function selectSizeChip(btn, sizeVal) {
    playTap();
    currentPdpSize = sizeVal;
    document.querySelectorAll('#pdpSizeGrid .size-chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    updatePdpWppLink();
}

function updatePdpWppLink() {
    if (!currentPdpProduct) return;
    const item = currentPdpProduct;

    let targetName = item.nombre;
    let targetPrice = item.precioARS;

    if (item.isCombo && item.subItems.length > 1) {
        if (currentPdpComboSelection === 'all') {
            targetName = `Look Completo (${item.nombre})`;
            targetPrice = item.subItems.reduce((acc, sub) => acc + sub.priceARS, 0);
        } else if (typeof currentPdpComboSelection === 'number') {
            targetName = item.subItems[currentPdpComboSelection].name;
            targetPrice = item.subItems[currentPdpComboSelection].priceARS;
        }
    }

    const priceStr = formatMoney(getProductPrice({ precioARS: targetPrice }));
    const msg = `¡Hola MeraKi! ✨ Quisiera *Solicitar por WhatsApp*:\n\n• *Prenda:* ${targetName}\n• *Opción/Talle:* ${currentPdpSize}\n• *Valor (${activeCurrency}):* ${priceStr}`;
    document.getElementById('pdpDirectWppBtn').href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function quickAddBag(e, id) {
    e.stopPropagation();
    playTap();
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;
    pushToBag(item, item.talles[0] || 'A confirmar');
}

function addCurrentPdpToBag() {
    if (!currentPdpProduct) return;
    playTap();
    pushToBag(currentPdpProduct, currentPdpSize);
    closeAllOverlays();
    openBagDrawer();
}

function pushToBag(item, size) {
    const existing = shoppingBag.find(b => b.id === item.id && b.size === size);
    if (existing) existing.qty += 1;
    else shoppingBag.push({ id: item.id, size, qty: 1 });
    saveBag();
    showToast(`"${item.nombre}" agregado`);
}

function updateBagQty(index, delta) {
    playTap();
    if (!shoppingBag[index]) return;
    shoppingBag[index].qty += delta;
    if (shoppingBag[index].qty < 1) shoppingBag.splice(index, 1);
    saveBag();
    renderBagDrawer();
}

function removeBagItem(index) {
    playTap();
    shoppingBag.splice(index, 1);
    saveBag();
    renderBagDrawer();
}

function clearEntireBag() {
    playTap();
    shoppingBag = [];
    saveBag();
    renderBagDrawer();
}

function saveBag() {
    localStorage.setItem('meraki_bag', JSON.stringify(shoppingBag));
    const totalCount = shoppingBag.reduce((sum, b) => sum + b.qty, 0);
    const badge = document.getElementById('bagCountBadge');
    badge.innerText = totalCount;
    badge.classList.toggle('visible', totalCount > 0);
}

function renderBagDrawer() {
    const body = document.getElementById('bagDrawerBody');
    const foot = document.getElementById('bagDrawerFoot');
    if (!shoppingBag.length) {
        body.innerHTML = `<div style="text-align:center; padding:48px 16px; color:var(--ink-muted);">Tu bolsa está vacía.</div>`;
        foot.innerHTML = `<button class="btn-add-bag-outline" onclick="closeAllOverlays()">Seguir Explorando</button>`;
        return;
    }
    let total = 0, lines = [];
    body.innerHTML = shoppingBag.map((entry, idx) => {
        const item = PRODUCTS.find(p => p.id === entry.id);
        if (!item) return '';
        const p = getProductPrice(item);
        total += p * entry.qty;
        const pStr = formatMoney(p);
        lines.push(`▪ ${entry.qty}x *${item.nombre}* (${entry.size}) — ${pStr}`);
        return `
            <div class="bag-item-row">
                <img src="${item.imagen}" class="bag-item-img">
                <div class="bag-item-info">
                    <div class="bag-item-top-row">
                        <div style="font-size:0.82rem; font-weight:700;">${item.nombre}</div>
                        <button class="btn-remove-bag-item" onclick="removeBagItem(${idx})">✕</button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <div class="qty-control">
                            <button onclick="updateBagQty(${idx}, -1)">−</button>
                            <span>${entry.qty}</span>
                            <button onclick="updateBagQty(${idx}, 1)">+</button>
                        </div>
                        <b>${pStr}</b>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const totalStr = formatMoney(total);
    const fullMsg = `¡Hola MeraKi! ✨ Quisiera solicitar esta selección:\n\n${lines.join('\n')}\n\n*Total estimado:* ${totalStr}`;
    foot.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>Total:</span>
            <b>${totalStr}</b>
        </div>
        <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMsg)}" target="_blank" class="btn-wpp-solicitar">
            Solicitar por WhatsApp
        </a>
    `;
}

function openBagDrawer() { playTap(); renderBagDrawer(); document.getElementById('globalBackdrop').classList.add('open'); document.getElementById('bagDrawer').classList.add('open'); }
function openMenuDrawer() { playTap(); document.getElementById('globalBackdrop').classList.add('open'); document.getElementById('menuDrawer').classList.add('open'); }
function closeAllOverlays() {
    document.getElementById('globalBackdrop').classList.remove('open');
    document.getElementById('pdpModal').classList.remove('open');
    document.getElementById('bagDrawer').classList.remove('open');
    document.getElementById('menuDrawer').classList.remove('open');
}

function showToast(msg) {
    const t = document.getElementById('toastBar');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

function playTap() { if ('vibrate' in navigator) try { navigator.vibrate(8); } catch(_) {} }

function updateFloatingVisibility() {
    const floating = document.getElementById('floatingConcierge');
    if (!floating) return;
    floating.classList.toggle('is-visible', window.scrollY > 120);
}
window.addEventListener('scroll', updateFloatingVisibility, { passive: true });

window.addEventListener('DOMContentLoaded', () => {
    setCurrency(activeCurrency);
    saveBag();
    loadCatalog();
});

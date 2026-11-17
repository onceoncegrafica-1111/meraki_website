/* ==========================================================================
   MERAKI · ENRUTADOR, VISTAS, QUICK-VIEW MODAL, BOLSA WHATSAPP & EVENTOS
   ========================================================================== */

let activeCurrency = localStorage.getItem('meraki_currency') || 'ARS';
let currentView = 'home'; // 'home' | 'category'
let activeRubro = 'Todo';
let activeSubcat = 'Todas';
let activeHomeSection = 'home';
let searchQuery = '';
let shoppingBag = JSON.parse(localStorage.getItem('meraki_bag') || '[]');
let currentPdpProduct = null;
let currentPdpSize = 'A confirmar';

// ==========================================================================
// 1. SKELETON LOADERS & MONEDA
// ==========================================================================
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

// ==========================================================================
// 2. ENRUTADOR MULTIPÁGINA & NAVEGACIÓN
// ==========================================================================
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
                    <span>0${i + 1} · ${count} ${count === 1 ? 'pieza' : 'piezas'}</span>
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
        <div style="margin-top:16px; display:flex; flex-direction:column; gap:14px;">
            <button onclick="scrollToSection(event, 'bienestar'); closeAllOverlays();" style="text-align:left; font-family:var(--font-mono); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.1em;">✨ 7 Días · 7 Intenciones</button>
            <button onclick="scrollToSection(event, 'contacto'); closeAllOverlays();" style="text-align:left; font-family:var(--font-mono); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.1em;">✉️ Escribinos por Email</button>
            <button onclick="scrollToSection(event, 'ubicacion'); closeAllOverlays();" style="text-align:left; font-family:var(--font-mono); font-size:0.72rem; text-transform:uppercase; letter-spacing:0.1em;">📍 Showroom Ushuaia 196</button>
            <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}" target="_blank" rel="noopener noreferrer" class="btn-wpp-solicitar" style="margin-top:8px;">Solicitar por WhatsApp</a>
        </div>
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

    const performScroll = () => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        const headerEl = document.getElementById('luxuryHeader');
        const offset = (headerEl ? headerEl.offsetHeight : 100) + 18;
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
        setActiveHeaderTab(sectionId);
    };

    if (currentView !== 'home') {
        currentView = 'home';
        document.getElementById('pageCategoryView').classList.remove('active');
        document.getElementById('pageHomeView').classList.add('active');
        setTimeout(performScroll, 60);
    } else {
        performScroll();
    }
    updateFloatingVisibility();
}

function handleRouteFromHash() {
    const h = decodeURIComponent(location.hash || '');
    if (h.startsWith('#categoria/')) {
        const targetRubro = h.replace('#categoria/', '');
        if (targetRubro === 'Todo' || PRODUCTS.some(p => p.rubro === targetRubro)) {
            navigateToCategory(targetRubro);
        }
    } else if (['#bienestar', '#contacto', '#ubicacion'].includes(h)) {
        scrollToSection(null, h.replace('#', ''));
    }
}

window.addEventListener('hashchange', handleRouteFromHash);

// ==========================================================================
// 3. TARJETA EDITORIAL BOUTIQUE (TÍTULO, DESCRIPCIÓN, TALLES, COLORES Y PRECIO)
// ==========================================================================
function getWeeklyHomeSix() {
    if (PRODUCTS.length === 0) return [];
    const flagged = PRODUCTS.filter(p => p.destacado === true);
    if (flagged.length >= 6) return flagged.slice(0, 6);

    const selected = [...flagged];
    const usedIds = new Set(selected.map(p => p.id));
    const rubros = getOrderedRubros();
    let round = 0;

    while (selected.length < 6 && round < 20) {
        let added = false;
        for (const r of rubros) {
            if (selected.length >= 6) break;
            const pool = PRODUCTS.filter(p => p.rubro === r && !usedIds.has(p.id));
            if (pool.length > 0) {
                selected.push(pool[0]);
                usedIds.add(pool[0].id);
                added = true;
            }
        }
        if (!added) break;
        round++;
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
        <div class="product-swatches-row" aria-label="Colores disponibles: ${namesText}">
            ${dots}
            <span class="color-names-mini">${namesText}</span>
        </div>
    `;
}

function createProductCardHTML(item, idx = 99) {
    const priceVal = getProductPrice(item);
    const priceFormatted = formatMoney(priceVal);
    const isConsult = priceVal <= 0;
    const subLabel = [item.rubro, item.subcategoria].filter(Boolean).join(' · ');
    const fetchAttr = idx < 4 ? 'fetchpriority="high"' : 'loading="lazy"';

    return `
        <article class="product-card-minimal" onclick="openPdpModal('${item.id}')">
            <div class="product-image-stage">
                ${item.etiqueta ? `<span class="product-tag-minimal">${item.etiqueta}</span>` : ''}
                <img src="${item.imagen}" alt="${item.nombre}" ${fetchAttr} decoding="async">
                <button class="product-quick-add" title="Agregar a la Bolsa" onclick="quickAddBag(event, '${item.id}')">+</button>
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
                    <span class="product-price-clean ${isConsult ? 'is-consult' : ''}">${isConsult ? 'Consultar precio' : priceFormatted}</span>
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
    if (list.length === 0) {
        grid.innerHTML = buildSkeletonCards(6);
        return;
    }
    grid.innerHTML = list.map((p, i) => createProductCardHTML(p, i)).join('');
}

function renderCategoryPageHeaderAndSubcats() {
    const titleEl = document.getElementById('catPageTitle');
    const kickerEl = document.getElementById('catPageKicker');
    const subRow = document.getElementById('dynamicSubcatRow');

    titleEl.innerText = activeRubro === 'Todo' ? 'Toda la Colección' : activeRubro;
    kickerEl.innerText = searchQuery ? `Resultados para "${searchQuery}"` : 'Colección MeraKi';

    const pool = activeRubro === 'Todo' ? PRODUCTS : PRODUCTS.filter(p => p.rubro === activeRubro);
    const subs = [...new Set(pool.map(p => p.subcategoria).filter(Boolean))];

    if (subs.length > 1 || (activeRubro === 'Indumentaria' && subs.length >= 1)) {
        const allSubs = subs.length > 1 ? ['Todas', ...subs] : subs;
        if (subs.length === 1) activeSubcat = subs[0];
        subRow.innerHTML = allSubs.map(s => `
            <button class="subcat-pill-btn ${activeSubcat === s ? 'active' : ''}" onclick="selectSubcat('${s}')">${s}</button>
        `).join('');
        subRow.classList.add('visible');
    } else {
        subRow.classList.remove('visible');
        activeSubcat = 'Todas';
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

    if (PRODUCTS.length === 0) {
        grid.innerHTML = buildSkeletonCards(8);
        return;
    }

    const filtered = PRODUCTS.filter(p => {
        const matchRubro = activeRubro === 'Todo' || p.rubro === activeRubro;
        const matchSub = activeSubcat === 'Todas' || p.subcategoria === activeSubcat;
        const q = searchQuery.toLowerCase();
        const colorNames = (p.colores || []).map(c => c.name.toLowerCase()).join(' ');
        const matchSearch = !q ||
            p.nombre.toLowerCase().includes(q) ||
            p.descripcion.toLowerCase().includes(q) ||
            p.rubro.toLowerCase().includes(q) ||
            p.subcategoria.toLowerCase().includes(q) ||
            colorNames.includes(q);
        return matchRubro && matchSub && matchSearch;
    });

    counterEl.innerText = `${filtered.length} ${filtered.length === 1 ? 'pieza disponible' : 'piezas disponibles'} · ${activeCurrency}`;

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-catalog-state">No encontramos piezas con ese filtro. Probá limpiando la búsqueda.</div>`;
        return;
    }
    grid.innerHTML = filtered.map((p, i) => createProductCardHTML(p, i)).join('');
}

// ==========================================================================
// 4. BÚSQUEDA GLOBAL
// ==========================================================================
function toggleSearchBar() {
    playTap();
    const bar = document.getElementById('searchExpandBar');
    bar.classList.toggle('open');
    if (bar.classList.contains('open')) document.getElementById('catalogSearchInput').focus();
}

function handleSearch(val) {
    searchQuery = val.trim();
    if (searchQuery.length > 0 && currentView !== 'category') {
        activeRubro = 'Todo';
        activeSubcat = 'Todas';
        currentView = 'category';
        document.getElementById('pageHomeView').classList.remove('active');
        document.getElementById('pageCategoryView').classList.add('active');
        setActiveHeaderTab('');
    }
    renderCategoryPageHeaderAndSubcats();
    renderCategoryGrid();
}

function clearSearch() {
    searchQuery = '';
    document.getElementById('catalogSearchInput').value = '';
    document.getElementById('searchExpandBar').classList.remove('open');
    navigateToHome();
}

// ==========================================================================
// 5. QUICK-VIEW MODAL (CON MUESTRA DE COLORES Y TALLES EXPANDIDOS)
// ==========================================================================
function openPdpModal(id) {
    playTap();
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;

    currentPdpProduct = item;
    const tallesList = item.talles && item.talles.length ? item.talles : ['Único', 'A confirmar'];
    currentPdpSize = tallesList[0];

    document.getElementById('pdpImg').src = item.imagen;
    document.getElementById('pdpKicker').innerText = [item.rubro, item.subcategoria].filter(Boolean).join(' · ');
    document.getElementById('pdpTitle').innerText = item.nombre;

    const descEl = document.getElementById('pdpDesc');
    descEl.innerText = item.descripcion || '';
    descEl.style.display = item.descripcion ? 'block' : 'none';

    // Colores de muestra (no clickeables) dentro del modal
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

    document.getElementById('pdpSizeGrid').innerHTML = tallesList.map((t, idx) => `
        <button class="size-chip ${idx === 0 ? 'selected' : ''}" onclick="selectSizeChip(this, '${t}')">${t}</button>
    `).join('');

    updatePdpPrices(item);
    updatePdpWppLink();

    document.getElementById('globalBackdrop').classList.add('open');
    document.getElementById('pdpModal').classList.add('open');
}

function updatePdpPrices(item) {
    const arsVal = getProductPrice(item, 'ARS');
    const mainPrice = formatMoney(getProductPrice(item, activeCurrency), activeCurrency);
    document.getElementById('pdpPriceMain').innerText = arsVal > 0 ? mainPrice : 'Consultar precio';

    const otherCurrencies = ['ARS', 'PYG', 'BRL'].filter(c => c !== activeCurrency);
    const refs = otherCurrencies.map(c => `${c} ${formatMoney(getProductPrice(item, c), c)}`).join('  ·  ');
    document.getElementById('pdpPriceFrontier').innerText = arsVal > 0 ? `Referencia aprox: ${refs}` : 'Consultar disponibilidad directa por WhatsApp';
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
    const priceStr = formatMoney(getProductPrice(item, activeCurrency), activeCurrency);
    const colorsLine = (item.colores && item.colores.length)
        ? `\n• *Colores publicados:* ${item.colores.map(c => c.name).join(', ')}`
        : '';
    const msg = `¡Hola MeraKi! ✨ Quisiera *Solicitar por WhatsApp* esta pieza:\n\n• *Producto:* ${item.nombre}\n• *Sección:* ${item.rubro} (${item.subcategoria})\n• *Opción/Talle:* ${currentPdpSize}${colorsLine}\n• *Valor (${activeCurrency}):* ${priceStr}`;
    document.getElementById('pdpDirectWppBtn').href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// ==========================================================================
// 6. BOLSA DE SELECCIÓN WHATSAPP
// ==========================================================================
function quickAddBag(e, id) {
    e.stopPropagation();
    playTap();
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;
    const defaultSize = (item.talles && item.talles[0]) ? item.talles[0] : 'A confirmar';
    pushToBag(item, defaultSize);
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
    else shoppingBag.push({ id: item.id, size: size, qty: 1 });
    saveBag();
    showToast(`"${item.nombre}" agregado a tu bolsa`);
}

function updateBagQty(index, delta) {
    playTap();
    if (!shoppingBag[index]) return;
    const next = shoppingBag[index].qty + delta;
    if (next < 1) { removeBagItem(index); return; }
    shoppingBag[index].qty = next;
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

    if (shoppingBag.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:48px 16px; color:var(--ink-muted); font-size:0.86rem;">Tu bolsa está vacía.<br><br>Elegí piezas de la colección para armar tu solicitud por WhatsApp.</div>`;
        foot.innerHTML = `<button class="btn-add-bag-outline" onclick="closeAllOverlays()">Seguir Explorando</button>`;
        return;
    }

    let totalMoney = 0, hasConsult = false, wppLines = [];

    body.innerHTML = shoppingBag.map((entry, idx) => {
        const item = PRODUCTS.find(p => p.id === entry.id);
        if (!item) return '';
        const unitPrice = getProductPrice(item, activeCurrency);
        if (unitPrice > 0) totalMoney += unitPrice * entry.qty;
        else hasConsult = true;

        const unitStr = formatMoney(unitPrice, activeCurrency);
        wppLines.push(`▪ ${entry.qty}x *${item.nombre}* (${entry.size}) — ${unitStr}`);

        return `
            <div class="bag-item-row">
                <img src="${item.imagen}" alt="${item.nombre}" class="bag-item-img">
                <div class="bag-item-info">
                    <div class="bag-item-top-row">
                        <div>
                            <div style="font-size:0.82rem; font-weight:700; color:var(--ink-black);">${item.nombre}</div>
                            <div style="font-family:var(--font-mono); font-size:0.62rem; color:var(--ink-muted); text-transform:uppercase; margin-top:2px;">Opción: ${entry.size}</div>
                        </div>
                        <button class="btn-remove-bag-item" onclick="removeBagItem(${idx})" aria-label="Eliminar producto">✕ Eliminar</button>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                        <div class="qty-control">
                            <button onclick="updateBagQty(${idx}, -1)" aria-label="Restar uno">−</button>
                            <span>${entry.qty}</span>
                            <button onclick="updateBagQty(${idx}, 1)" aria-label="Sumar uno">+</button>
                        </div>
                        <span style="font-family:var(--font-mono); font-size:0.78rem; font-weight:700;">${unitStr}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const totalFormatted = totalMoney > 0 ? formatMoney(totalMoney, activeCurrency) + (hasConsult ? ' + ítems a consultar' : '') : 'A consultar';
    const fullMsg = `¡Hola MeraKi! ✨ Quisiera *Solicitar por WhatsApp* mi selección de la tienda:\n\n${wppLines.join('\n')}\n\n*Total estimado (${activeCurrency}):* ${totalFormatted}\n\nQuedo atenta/o para confirmar talles y medio de pago.`;

    foot.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <span style="font-family:var(--font-mono); font-size:0.70rem; text-transform:uppercase; color:var(--ink-muted);">Total Estimado (${activeCurrency})</span>
            <span style="font-family:var(--font-mono); font-size:1.08rem; font-weight:700;">${totalFormatted}</span>
        </div>
        <span style="font-size:0.68rem; color:var(--ink-muted);">30% OFF + 12 cuotas sin interés · Ahora Misiones</span>
        <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMsg)}" target="_blank" rel="noopener noreferrer" class="btn-wpp-solicitar" onclick="playTap()">
            Solicitar por WhatsApp (${shoppingBag.reduce((s,b)=>s+b.qty,0)})
        </a>
        <button onclick="clearEntireBag()" style="font-family:var(--font-mono); font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--ink-muted); padding:4px; text-align:center;">Vaciar bolsa</button>
    `;
}

// ==========================================================================
// 7. CONTACTO, DRAWERS, 7 INTENCIONES & SCROLL
// ==========================================================================
async function submitContactForm(e) {
    e.preventDefault();
    playTap();
    const btn = document.getElementById('contactSubmitBtn');
    const feedback = document.getElementById('contactFeedback');
    const payload = {
        action: 'contact',
        nombre: document.getElementById('contactName').value.trim(),
        contacto: document.getElementById('contactEmail').value.trim(),
        asunto: document.getElementById('contactSubject').value.trim(),
        mensaje: document.getElementById('contactMessage').value.trim(),
        fecha: new Date().toLocaleString('es-AR')
    };

    btn.innerText = 'ENVIANDO...';
    btn.disabled = true;

    try {
        if (CONFIG.APPS_SCRIPT_URL) {
            await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
        }
        feedback.innerText = '✓ ¡Gracias! Tu consulta fue enviada correctamente.';
        feedback.classList.add('visible');
        document.getElementById('contactForm').reset();
    } catch (_) {
        feedback.innerText = '✓ Consulta registrada. Si es urgente, escribinos directo por WhatsApp.';
        feedback.classList.add('visible');
    } finally {
        btn.innerText = 'ENVIAR CONSULTA';
        btn.disabled = false;
        setTimeout(() => feedback.classList.remove('visible'), 6000);
    }
}

function openBagDrawer() {
    playTap();
    renderBagDrawer();
    document.getElementById('globalBackdrop').classList.add('open');
    document.getElementById('bagDrawer').classList.add('open');
}

function openMenuDrawer() {
    playTap();
    document.getElementById('globalBackdrop').classList.add('open');
    document.getElementById('menuDrawer').classList.add('open');
}

function closeAllOverlays() {
    document.getElementById('globalBackdrop').classList.remove('open');
    document.getElementById('pdpModal').classList.remove('open');
    document.getElementById('bagDrawer').classList.remove('open');
    document.getElementById('menuDrawer').classList.remove('open');
}

const intencionesData = {
    abundancia: {
        title: "Momento de Abundancia",
        phrase: '"Atraigo prosperidad, plenitud y gratitud a cada rincón de mi espacio."',
        link: `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=%C2%A1Hola%20MeraKi!%20%E2%9C%A8%20Quiero%20solicitar%20el%20kit%20de%20sahumado%20para%20la%20intenci%C3%B3n%20de%20Abundancia.`
    },
    paz: {
        title: "Momento de Paz & Armonía",
        phrase: '"Despejo la mente, suelto tensiones y restauro la calma en mi hogar."',
        link: `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=%C2%A1Hola%20MeraKi!%20%E2%9C%A8%20Quiero%20solicitar%20el%20kit%20de%20sahumado%20para%20la%20intenci%C3%B3n%20de%20Paz%20y%20Armon%C3%ADa.`
    },
    meditacion: {
        title: "Momento de Meditación",
        phrase: '"Conecto con el presente, el silencio y mi centro espiritual."',
        link: `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=%C2%A1Hola%20MeraKi!%20%E2%9C%A8%20Quiero%20solicitar%20el%20kit%20de%20sahumado%20para%20la%20intenci%C3%B3n%20de%20Meditaci%C3%B3n.`
    },
    soltar: {
        title: "Momento de Soltar",
        phrase: '"Libero cargas pasadas, renuevo el aire y abro paso a lo nuevo."',
        link: `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=%C2%A1Hola%20MeraKi!%20%E2%9C%A8%20Quiero%20solicitar%20el%20kit%20de%20sahumado%20para%20la%20intenci%C3%B3n%20de%20Soltar.`
    }
};

function selectIntencion(key, btn) {
    playTap();
    document.querySelectorAll('.ritual-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const item = intencionesData[key];
    if (item) {
        document.getElementById('intencionTitle').innerText = item.title;
        document.getElementById('intencionPhrase').innerText = item.phrase;
        document.getElementById('intencionLink').href = item.link;
    }
}

function updateStoreStatus() {
    const now = new Date();
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const isOpen = (day >= 1 && day <= 5) && ((mins >= 540 && mins <= 750) || (mins >= 990 && mins <= 1260));
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (isOpen) {
        dot.style.background = '#16A34A';
        txt.innerText = 'Abierto ahora · Ushuaia 196 esq. Jangadero';
    } else {
        dot.style.background = '#D97706';
        txt.innerText = 'Ushuaia 196 · Consultas activas por WhatsApp';
    }
}

function updateFloatingVisibility() {
    const floating = document.getElementById('floatingConcierge');
    const header = document.getElementById('luxuryHeader');
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
    if (!floating) return;

    if (currentView === 'category') {
        floating.classList.toggle('is-visible', window.scrollY > 80);
        return;
    }
    const heroWpp = document.getElementById('heroWhatsAppBtn');
    if (heroWpp) {
        const rect = heroWpp.getBoundingClientRect();
        floating.classList.toggle('is-visible', rect.bottom < 0);
    }
}

function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal-block').forEach(el => el.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal-block').forEach(el => observer.observe(el));
}

function showToast(msg) {
    const t = document.getElementById('toastBar');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
}

function playTap() {
    if ('vibrate' in navigator) { try { navigator.vibrate(8); } catch(_) {} }
}

window.addEventListener('scroll', updateFloatingVisibility, { passive: true });

window.addEventListener('DOMContentLoaded', () => {
    setCurrency(activeCurrency);
    saveBag();
    updateStoreStatus();
    initScrollAnimations();
    loadCatalog();
    updateFloatingVisibility();
});
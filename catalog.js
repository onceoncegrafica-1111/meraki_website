/* ==========================================================================
   MERAKI · MOTOR DE CATÁLOGO (CON PARSER DE CONJUNTOS, COLORES Y TALLES)
   ========================================================================== */

const CONFIG = {
    WHATSAPP_NUMBER: "5493757525802",
    GITHUB_OWNER: "onceoncegrafica-1111",
    GITHUB_REPO: "meraki_website",
    GITHUB_BRANCH: "main",

    GOOGLE_SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCgumzTKh4vjuCvuVdCPvgAyZyg_yYtaatwPvlJGbzpjz96tokUttkgTSE5_oHc0weHP3dEEyDwoj5/pub?gid=0&single=true&output=csv",
    APPS_SCRIPT_URL: "",

    CACHE_KEY: "meraki_sheets_cache_v4",
    CACHE_TTL_MS: 3 * 60 * 1000,

    RATES: {
        ARS_TO_PYG: 6.5,
        ARS_TO_BRL: 0.005
    }
};

let PRODUCTS = [];

// Diccionario de colores de indumentaria
const COLOR_MAP = {
    "blanco": "#FFFFFF", "off white": "#F8F6F0", "manteca": "#FBF7EE",
    "natural": "#EFECE6", "crudo": "#EDE6D8", "marfil": "#FAF6EB",
    "crema": "#F5ECD7", "hueso": "#F2EDE2", "beige": "#D8C3A5",
    "arena": "#DCCDB6", "nude": "#E3C5B0", "vison": "#B8A695",
    "taupe": "#8C7D70", "camel": "#C19A6B", "tostado": "#A97B50",
    "marron": "#5C3A28", "chocolate": "#3D2418", "negro": "#141414",
    "gris": "#8E9196", "gris claro": "#C9CDD1", "gris melange": "#A5A9AE",
    "azul": "#1F4E8C", "azul marino": "#162642", "marino": "#162642",
    "celeste": "#9EC4E8", "sky": "#C3D6FF", "jean": "#48698E", "denim": "#48698E",
    "verde": "#2E6B47", "salvia": "#8FA692", "oliva": "#646B3F", "militar": "#4A5633",
    "rojo": "#B81D24", "bordo": "#600000", "borravino": "#600000", "vino": "#600000",
    "terracota": "#B85A3A", "coral": "#E66E5E", "amarillo": "#EBC23F",
    "rosa": "#EBA4B5", "rosa viejo": "#C48A95", "fucsia": "#C92A76", "lila": "#C5A8D9"
};

function normalizeColorKey(str) {
    let key = String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9#\s]/g, " ").replace(/\s+/g, " ").trim();
    if (COLOR_MAP[key]) return key;
    const gender = [[/blanca$/, "blanco"], [/negra$/, "negro"], [/roja$/, "rojo"], [/amarilla$/, "amarillo"], [/cruda$/, "crudo"], [/tostada$/, "tostado"]];
    for (const [rx, rep] of gender) {
        const cand = key.replace(rx, rep);
        if (COLOR_MAP[cand]) return cand;
    }
    return key;
}

function parseColors(raw) {
    if (!raw) return [];
    const tokens = String(raw).replace(/\s+y\s+/gi, ",").split(/[,/|;&+]+/).map(s => s.trim()).filter(Boolean);
    const seen = new Set(), res = [];
    for (const t of tokens) {
        let hex = t.startsWith('#') ? t.toUpperCase() : COLOR_MAP[normalizeColorKey(t)];
        if (!hex) hex = "#D8D4CE";
        const name = t.charAt(0).toUpperCase() + t.slice(1);
        if (!seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            res.push({ name, hex, light: hex.toUpperCase() === '#FFFFFF' || hex.toUpperCase() === '#F8F6F0' });
        }
    }
    return res;
}

function parseTalles(raw, rubro = "Indumentaria") {
    const clean = String(raw || "").trim();
    if (!clean) return { list: ["A confirmar"], label: "A confirmar" };
    const list = clean.split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
    return { list: list.length ? list : ["A confirmar"], label: list.join(' · ') };
}

// Extractor automático de "(color: ...)" o "(talle: ...)" dentro del nombre
function parseTitleAndExtractMeta(rawTitle) {
    let title = String(rawTitle || "").trim();
    let extractedColors = [];
    let extractedTalles = [];

    // Busca patrones tipo: (color: beige y blanco) o Color: amarillo
    const colorMatch = title.match(/\(?color:\s*([^)]+)\)?/i);
    if (colorMatch) {
        extractedColors = parseColors(colorMatch[1]);
        title = title.replace(colorMatch[0], "").trim();
    }

    // Busca patrones tipo: (talle: M) o (talle: 42/46)
    const talleMatch = title.match(/\(?talles?:\s*([^)]+)\)?/i);
    if (talleMatch) {
        extractedTalles = talleMatch[1].split(/[/,|-]+/).map(t => t.trim()).filter(Boolean);
        title = title.replace(talleMatch[0], "").trim();
    }

    // Limpia paréntesis residuales vacíos o barras al final
    title = title.replace(/\(\s*\)/g, "").replace(/\s*[/–-]\s*$/, "").trim();

    return { cleanTitle: title, extractedColors, extractedTalles };
}

function parsePriceCell(val) {
    const str = String(val || "").trim();
    if (!str) return [0];

    // Detecta precios dobles tipo "35000 / 56000" o "$35.000 / $56.000"
    if (str.includes('/')) {
        const parts = str.split('/');
        return parts.map(p => {
            const clean = p.replace(/[.,]\d{2}$/, '').replace(/[^0-9]/g, '');
            return Number(clean) || 0;
        });
    }

    const clean = str.replace(/[.,]\d{2}$/, '').replace(/[^0-9]/g, '');
    return [Number(clean) || 0];
}

function resolveAssetUrl(relPath) {
    if (!relPath) return '';
    if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;
    const encoded = relPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    if (window.location.protocol === 'file:') {
        return `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${encoded}`;
    }
    return encoded;
}

function getProductPrice(item, curr = activeCurrency) {
    const ars = item.precioARS || 0;
    if (curr === 'ARS') return ars;
    if (curr === 'PYG') return Math.round((ars * CONFIG.RATES.ARS_TO_PYG) / 1000) * 1000;
    if (curr === 'BRL') return Math.round(ars * CONFIG.RATES.ARS_TO_BRL);
    return ars;
}

function formatMoney(amount, curr = activeCurrency) {
    if (!amount || amount <= 0) return 'Consultar';
    if (curr === 'ARS') return '$ ' + amount.toLocaleString('es-AR');
    if (curr === 'PYG') return '₲ ' + amount.toLocaleString('es-PY');
    if (curr === 'BRL') return 'R$ ' + amount.toLocaleString('pt-BR');
    return '$ ' + amount;
}

function parseCSV(csvText) {
    const rows = [];
    let currentRow = [], currentVal = '', inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i], nextChar = csvText[i + 1];
        if (inQuotes) {
            if (char === '"' && nextChar === '"') { currentVal += '"'; i++; }
            else if (char === '"') { inQuotes = false; }
            else { currentVal += char; }
        } else {
            if (char === '"') { inQuotes = true; }
            else if (char === ',') { currentRow.push(currentVal.trim()); currentVal = ''; }
            else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                if (char === '\r') i++;
                currentRow.push(currentVal.trim());
                if (currentRow.some(v => v !== '')) rows.push(currentRow);
                currentRow = []; currentVal = '';
            } else { currentVal += char; }
        }
    }
    if (currentVal || currentRow.length) {
        currentRow.push(currentVal.trim());
        if (currentRow.some(v => v !== '')) rows.push(currentRow);
    }
    return rows;
}

function mapSheetRowsToProducts(rows) {
    const headers = rows[0].map(h => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    const idx = {
        rubro: headers.findIndex(h => h.includes('rubro') || h.includes('categoria')),
        sub: headers.findIndex(h => h.includes('sub')),
        nombre: headers.findIndex(h => h.includes('nombre') || h.includes('producto') || h.includes('titulo')),
        ars: headers.findIndex(h => h.includes('ars') || h === 'precio'),
        desc: headers.findIndex(h => h.includes('desc')),
        foto: headers.findIndex(h => h.includes('foto') || h.includes('imagen')),
        tag: headers.findIndex(h => h.includes('etiqueta') || h.includes('tag')),
        talles: headers.findIndex(h => h.includes('talle')),
        colores: headers.findIndex(h => h.includes('color')),
        destacado: headers.findIndex(h => h.includes('destacado') || h.includes('home')),
        estado: headers.findIndex(h => h.includes('estado') || h.includes('mostrar'))
    };

    const list = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const estado = idx.estado > -1 ? (row[idx.estado] || '').toUpperCase() : 'SI';
        if (estado === 'NO' || estado === 'OCULTO' || estado === '0') continue;

        const rawTitle = idx.nombre > -1 ? row[idx.nombre] : '';
        const foto = idx.foto > -1 ? row[idx.foto] : '';
        if (!rawTitle && !foto) continue;

        const { cleanTitle, extractedColors, extractedTalles } = parseTitleAndExtractMeta(rawTitle);
        const prices = idx.ars > -1 ? parsePriceCell(row[idx.ars]) : [0];
        const rubro = (idx.rubro > -1 && row[idx.rubro]) ? row[idx.rubro] : 'Indumentaria';

        // Talles de columna o extraídos del nombre
        let finalTalles = idx.talles > -1 && row[idx.talles] ? parseTalles(row[idx.talles], rubro).list : [];
        if (extractedTalles.length > 0) finalTalles = [...new Set([...finalTalles, ...extractedTalles])];
        if (finalTalles.length === 0) finalTalles = ["A confirmar"];

        // Colores de columna o extraídos del nombre
        let finalColors = idx.colores > -1 && row[idx.colores] ? parseColors(row[idx.colores]) : [];
        if (extractedColors.length > 0) finalColors = [...finalColors, ...extractedColors];

        // ¿Es un conjunto / foto de 2 prendas? (ej: "Blusita / Pantalón")
        const isCombo = cleanTitle.includes('/') || prices.length > 1;
        let subItems = [];
        if (isCombo) {
            const names = cleanTitle.split('/').map(n => n.trim());
            subItems = names.map((namePart, i) => ({
                name: namePart,
                priceARS: prices[i] || prices[0] || 0
            }));
        }

        const destVal = idx.destacado > -1 ? (row[idx.destacado] || '').toUpperCase() : '';
        const isFeatured = ['SI', 'SÍ', 'YES', 'TRUE', '1', 'X'].includes(destVal);

        list.push({
            id: `sh-${r}`,
            rubro,
            subcategoria: (idx.sub > -1 && row[idx.sub]) ? row[idx.sub] : 'Mujer',
            nombre: cleanTitle || 'Pieza Exclusiva MeraKi',
            precioARS: prices[0] || 0,
            preciosArray: prices,
            isCombo,
            subItems,
            descripcion: (idx.desc > -1 && row[idx.desc]) ? row[idx.desc] : '',
            imagen: resolveAssetUrl(foto),
            etiqueta: isCombo ? 'LOOK / 2 PIEZAS' : (idx.tag > -1 ? (row[idx.tag] || '') : ''),
            talles: finalTalles,
            tallesLabel: finalTalles.join(' · '),
            colores: finalColors,
            destacado: isFeatured
        });
    }
    return list;
}

async function loadCatalog() {
    let rendered = false;
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.data && parsed.data.length) {
                PRODUCTS = parsed.data;
                rendered = true;
                afterCatalogLoaded();
            }
        }
    } catch (_) {}

    if (!rendered && typeof renderSkeletonStates === 'function') renderSkeletonStates();

    try {
        const res = await fetch(CONFIG.GOOGLE_SHEETS_CSV_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error();
        const rows = parseCSV(await res.text());
        const fresh = mapSheetRowsToProducts(rows);
        if (fresh.length > 0) {
            PRODUCTS = fresh;
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh }));
            afterCatalogLoaded();
        }
    } catch (e) {
        console.warn('Sheets temporalmente inaccesible');
    }
}

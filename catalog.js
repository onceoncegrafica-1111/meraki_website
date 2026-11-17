/* ==========================================================================
   MERAKI · MOTOR DE CATÁLOGO, CACHÉ INSTANTÁNEO, COLORES Y RANGOS DE TALLES
   ========================================================================== */

const CONFIG = {
    WHATSAPP_NUMBER: "5493757525802",
    GITHUB_OWNER: "linkuniversal",
    GITHUB_REPO: "meraki_web",
    GITHUB_BRANCH: "main",

    GOOGLE_SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSCgumzTKh4vjuCvuVdCPvgAyZyg_yYtaatwPvlJGbzpjz96tokUttkgTSE5_oHc0weHP3dEEyDwoj5/pub?gid=0&single=true&output=csv",
    APPS_SCRIPT_URL: "",

    CACHE_KEY: "meraki_sheets_cache_v3",
    CACHE_TTL_MS: 3 * 60 * 1000, // 3 minutos en caché instantáneo + revalidación en segundo plano

    RATES: {
        ARS_TO_PYG: 6.5,
        ARS_TO_BRL: 0.005
    }
};

let PRODUCTS = [];

// ==========================================================================
// 1. DICCIONARIO INTELIGENTE DE COLORES DE INDUMENTARIA Y DECO (TEXTO -> HEX)
// ==========================================================================
const COLOR_MAP = {
    "blanco": "#FFFFFF", "off white": "#F8F6F0", "manteca": "#FBF7EE",
    "natural": "#EFECE6", "crudo": "#EDE6D8", "marfil": "#FAF6EB",
    "crema": "#F5ECD7", "hueso": "#F2EDE2", "beige": "#D8C3A5",
    "arena": "#DCCDB6", "nude": "#E3C5B0", "vison": "#B8A695",
    "taupe": "#8C7D70", "topo": "#8C7D70", "camel": "#C19A6B",
    "tostado": "#A97B50", "suela": "#9E5B32", "habano": "#7D482B",
    "marron": "#5C3A28", "chocolate": "#3D2418", "cafe": "#4A2E20",
    "cacao": "#482D24", "negro": "#141414", "carbon": "#2B2B2B",
    "gris": "#8E9196", "gris claro": "#C9CDD1", "gris melange": "#A5A9AE",
    "gris oscuro": "#4F5256", "plata": "#C7CBD1", "plateado": "#C7CBD1",
    "azul": "#1F4E8C", "azul marino": "#162642", "marino": "#162642",
    "navy": "#162642", "azul francia": "#1E50B5", "francia": "#1E50B5",
    "aero": "#6D94B8", "celeste": "#9EC4E8", "sky": "#C3D6FF",
    "denim": "#48698E", "jean": "#48698E", "petroleo": "#1E4D5C",
    "turquesa": "#39A6A3", "agua": "#9BD2CC", "verde agua": "#9BD2CC",
    "menta": "#A8D5BA", "verde": "#2E6B47", "salvia": "#8FA692",
    "verde oliva": "#646B3F", "oliva": "#646B3F", "militar": "#4A5633",
    "verde militar": "#4A5633", "esmeralda": "#1B7A58", "botella": "#17422D",
    "rojo": "#B81D24", "bordo": "#600000", "borravino": "#600000",
    "vino": "#600000", "cereza": "#9E1B32", "terracota": "#B85A3A",
    "teja": "#A84A2D", "ladrillo": "#A4462C", "oxido": "#8B3E26",
    "coral": "#E66E5E", "salmon": "#ED8B79", "durazno": "#F6B99B",
    "naranja": "#DF6628", "amarillo": "#EBC23F", "limon": "#EDE059",
    "mostaza": "#C99324", "oro": "#C79C3B", "dorado": "#C79C3B",
    "rosa": "#EBA4B5", "rosa claro": "#F7CED7", "rosa bebe": "#F7CED7",
    "rosa viejo": "#C48A95", "fucsia": "#C92A76", "magenta": "#B8256F",
    "lila": "#C5A8D9", "lavanda": "#B5A6D9", "violeta": "#6D3B82",
    "morado": "#552968", "ciruela": "#592242", "uva": "#552968"
};

function normalizeColorKey(str) {
    let key = String(str || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9#\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (COLOR_MAP[key]) return key;

    // Normaliza femenino a masculino ("blanca" -> "blanco", "negra" -> "negro")
    const genderMap = [
        [/blanca$/, "blanco"], [/negra$/, "negro"], [/roja$/, "rojo"],
        [/amarilla$/, "amarillo"], [/rosada$/, "rosa"], [/dorada$/, "dorado"],
        [/plateada$/, "plateado"], [/marina$/, "marino"], [/oscura$/, "oscuro"],
        [/clara$/, "claro"], [/cruda$/, "crudo"], [/tostada$/, "tostado"],
        [/morada$/, "morado"], [/violeta$/, "violeta"], [/turquesa$/, "turquesa"]
    ];
    for (const [rx, rep] of genderMap) {
        const candidate = key.replace(rx, rep);
        if (COLOR_MAP[candidate]) return candidate;
    }
    return key;
}

function isHexLight(hex) {
    const h = hex.replace('#', '');
    if (h.length !== 6) return false;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.82;
}

function parseColors(raw) {
    if (!raw || !String(raw).trim()) return [];
    const tokens = String(raw)
        .replace(/\s+y\s+/gi, ",")
        .replace(/\s+e\s+/gi, ",")
        .split(/[,/|;&+]+/)
        .map(s => s.trim())
        .filter(Boolean);

    const seen = new Set();
    const result = [];

    for (const token of tokens) {
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(token)) {
            let hex = token.toUpperCase();
            if (hex.length === 4) {
                hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            if (!seen.has(hex)) {
                seen.add(hex);
                result.push({ name: token, hex, light: isHexLight(hex) });
            }
            continue;
        }

        const key = normalizeColorKey(token);
        let hex = COLOR_MAP[key];

        // Búsqueda parcial si pusieron "verde esmeralda" o "beige claro"
        if (!hex) {
            const words = key.split(' ');
            for (const w of words) {
                const wk = normalizeColorKey(w);
                if (COLOR_MAP[wk]) { hex = COLOR_MAP[wk]; break; }
            }
        }

        if (!hex) hex = "#D8D4CE"; // Fallback neutro elegante
        const displayName = token.charAt(0).toUpperCase() + token.slice(1);
        const dedupeKey = displayName.toLowerCase();
        if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            result.push({ name: displayName, hex, light: isHexLight(hex) });
        }
    }
    return result;
}

// ==========================================================================
// 2. LECTOR INTELIGENTE DE RANGOS DE TALLES ("S-XL", "36-44", "1-4", "S, M, L")
// ==========================================================================
const LETTER_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function parseTalles(raw, rubro = "Indumentaria") {
    const clean = String(raw || "").trim();
    const isAccessory = ["Deco & Home", "Bazar", "Aromas"].includes(rubro);

    if (!clean) {
        return isAccessory
            ? { list: ["Único", "Consultar"], label: "Talle único" }
            : { list: ["A confirmar"], label: "A confirmar" };
    }

    // 1. Detecta rangos como "S-XL", "S a XL", "S al XL", "36-44", "1 al 4"
    const rangeMatch = clean.match(/^([a-z0-9]+)\s*(?:-|–|a|al)\s*([a-z0-9]+)$/i);
    if (rangeMatch) {
        const start = rangeMatch[1].toUpperCase();
        const end = rangeMatch[2].toUpperCase();

        const idxA = LETTER_SIZE_ORDER.indexOf(start);
        const idxB = LETTER_SIZE_ORDER.indexOf(end);
        if (idxA !== -1 && idxB !== -1 && idxA <= idxB) {
            const expanded = LETTER_SIZE_ORDER.slice(idxA, idxB + 1);
            return { list: expanded, label: `${start} – ${end}` };
        }

        const nA = parseInt(start, 10);
        const nB = parseInt(end, 10);
        if (!isNaN(nA) && !isNaN(nB) && nA <= nB && (nB - nA) <= 16) {
            const step = (nA >= 32 && nB <= 56 && nA % 2 === 0 && nB % 2 === 0 && (nB - nA) >= 4) ? 2 : 1;
            const expanded = [];
            for (let n = nA; n <= nB; n += step) expanded.push(String(n));
            return { list: expanded, label: `${nA} – ${nB}` };
        }
    }

    // 2. Lista separada por comas o barras ("S, M, L, XL, A confirmar")
    const list = clean.split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
    const realSizes = list.filter(t => !/^(a confirmar|consultar)$/i.test(t));

    let label = "";
    if (realSizes.length === 0) {
        label = "A confirmar";
    } else if (realSizes.length === 1 && /^(u|unico|único|talle unico|talle único)$/i.test(realSizes[0])) {
        label = "Talle único";
    } else if (realSizes.length >= 4 && realSizes[0] === "XS" && realSizes[realSizes.length - 1] === "XXL") {
        label = "XS – XXL";
    } else if (realSizes.length >= 3) {
        label = realSizes.join(" · ");
    } else {
        label = realSizes.join(" · ");
    }

    return { list: list.length ? list : ["A confirmar"], label };
}

// ==========================================================================
// 3. UTILIDADES DE RUTAS & FORMATO DE MONEDA
// ==========================================================================
function resolveAssetUrl(relPath) {
    if (!relPath) return '';
    if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;
    const encoded = relPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
    if (window.location.protocol === 'file:') {
        return `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${encoded}`;
    }
    return encoded;
}

function prettifyFilename(filename) {
    return filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]+/g, ' ')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}

function getProductPrice(item, curr = activeCurrency) {
    const ars = Number(item.precioARS) || 0;
    if (ars === 0 && !item.precioPYG && !item.precioBRL) return 0;

    if (curr === 'ARS') return ars;
    if (curr === 'PYG') return Number(item.precioPYG) > 0 ? Number(item.precioPYG) : Math.round((ars * CONFIG.RATES.ARS_TO_PYG) / 1000) * 1000;
    if (curr === 'BRL') return Number(item.precioBRL) > 0 ? Number(item.precioBRL) : Math.round(ars * CONFIG.RATES.ARS_TO_BRL);
    return ars;
}

function formatMoney(amount, curr = activeCurrency) {
    if (!amount || amount <= 0) return 'Consultar';
    if (curr === 'ARS') return '$ ' + amount.toLocaleString('es-AR');
    if (curr === 'PYG') return '₲ ' + amount.toLocaleString('es-PY');
    if (curr === 'BRL') return 'R$ ' + amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return '$ ' + amount;
}

// ==========================================================================
// 4. CARGA ULTRA RÁPIDA (STALE-WHILE-REVALIDATE + SHEETS + GITHUB FALLBACK)
// ==========================================================================
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
        pyg: headers.findIndex(h => h.includes('pyg') || h.includes('guarani')),
        brl: headers.findIndex(h => h.includes('brl') || h.includes('real')),
        desc: headers.findIndex(h => h.includes('desc')),
        foto: headers.findIndex(h => h.includes('foto') || h.includes('imagen')),
        tag: headers.findIndex(h => h.includes('etiqueta') || h.includes('tag')),
        talles: headers.findIndex(h => h.includes('talle')),
        colores: headers.findIndex(h => h.includes('color')),
        destacado: headers.findIndex(h => h.includes('destacado') || h.includes('home') || h.includes('mix')),
        estado: headers.findIndex(h => h.includes('estado') || h.includes('mostrar'))
    };

    const cleanNum = (val) => {
        if (!val) return 0;
        let s = String(val).trim().replace(/[.,]\d{2}$/, '');
        return Number(s.replace(/[^0-9]/g, '')) || 0;
    };

    const list = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const estado = idx.estado > -1 ? (row[idx.estado] || '').toUpperCase() : 'SI';
        if (estado === 'NO' || estado === 'OCULTO' || estado === '0') continue;

        const nombre = idx.nombre > -1 ? row[idx.nombre] : '';
        const foto = idx.foto > -1 ? row[idx.foto] : '';
        if (!nombre && !foto) continue;

        const rubro = (idx.rubro > -1 && row[idx.rubro]) ? row[idx.rubro] : 'Indumentaria';
        const parsedTalles = parseTalles(idx.talles > -1 ? row[idx.talles] : '', rubro);
        const parsedColors = parseColors(idx.colores > -1 ? row[idx.colores] : '');
        const destVal = idx.destacado > -1 ? (row[idx.destacado] || '').toUpperCase() : '';
        const isFeatured = ['SI', 'SÍ', 'YES', 'TRUE', '1', 'X'].includes(destVal);

        list.push({
            id: `sh-${r}`,
            rubro,
            subcategoria: (idx.sub > -1 && row[idx.sub]) ? row[idx.sub] : 'Mujer',
            nombre: nombre || 'Pieza Exclusiva MeraKi',
            precioARS: idx.ars > -1 ? cleanNum(row[idx.ars]) : 0,
            precioPYG: idx.pyg > -1 ? cleanNum(row[idx.pyg]) : 0,
            precioBRL: idx.brl > -1 ? cleanNum(row[idx.brl]) : 0,
            descripcion: (idx.desc > -1 && row[idx.desc]) ? row[idx.desc] : '',
            imagen: resolveAssetUrl(foto),
            etiqueta: idx.tag > -1 ? (row[idx.tag] || '') : '',
            talles: parsedTalles.list,
            tallesLabel: parsedTalles.label,
            colores: parsedColors,
            destacado: isFeatured
        });
    }
    return list;
}

function mapFolderToCategory(path) {
    const parts = path.split('/');
    const folder = (parts[1] || '').toLowerCase();
    if (folder === 'indumentaria') {
        const sub = (parts[2] || 'Mujer').toLowerCase();
        return {
            rubro: 'Indumentaria',
            subcategoria: sub === 'mujer' ? 'Mujer' : sub === 'hombre' ? 'Hombre' : prettifyFilename(sub),
            talles: ['S', 'M', 'L', 'XL'],
            tallesLabel: 'S – XL',
            desc: 'Prenda seleccionada de nuestra colección.'
        };
    }
    if (folder === 'deco-home' || folder === 'deco') {
        return { rubro: 'Deco & Home', subcategoria: 'Hogar', talles: ['Único'], tallesLabel: 'Talle único', desc: 'Pieza de decoración para renovar tus espacios.' };
    }
    if (folder === 'bazar') {
        return { rubro: 'Bazar', subcategoria: 'Mesa & Cocina', talles: ['Único'], tallesLabel: 'Talle único', desc: 'Artículo funcional de bazar contemporáneo.' };
    }
    if (folder === 'aromas') {
        return { rubro: 'Aromas', subcategoria: 'Ritual & Sahumado', talles: ['Único'], tallesLabel: 'Talle único', desc: 'Aromatización textil y rituales para tu espacio.' };
    }
    return { rubro: 'Colección', subcategoria: 'Destacados', talles: ['Único'], tallesLabel: 'Talle único', desc: 'Pieza exclusiva MeraKi.' };
}

async function autoLoadFromGitHubRepo() {
    try {
        const apiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/git/trees/${CONFIG.GITHUB_BRANCH}?recursive=1`;
        const res = await fetch(apiUrl);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.tree) return;

        const imgRegex = /\.(webp|jpe?g|png|avif)$/i;
        const discovered = [];

        data.tree.forEach((node, idx) => {
            if (node.type !== 'blob' || !node.path.startsWith('media/') || node.path.startsWith('media/editorial/')) return;
            if (!imgRegex.test(node.path)) return;
            const filename = node.path.split('/').pop();
            if (filename.startsWith('.')) return;

            const meta = mapFolderToCategory(node.path);
            discovered.push({
                id: `gh-${idx}`,
                rubro: meta.rubro,
                subcategoria: meta.subcategoria,
                nombre: prettifyFilename(filename),
                precioARS: 0, precioPYG: 0, precioBRL: 0,
                descripcion: meta.desc,
                imagen: resolveAssetUrl(node.path),
                etiqueta: '',
                talles: meta.talles,
                tallesLabel: meta.tallesLabel,
                colores: [],
                destacado: false
            });
        });

        if (discovered.length > 0) {
            PRODUCTS = discovered;
            afterCatalogLoaded();
        }
    } catch (err) {
        console.warn('Fallback GitHub temporalmente no disponible:', err);
    }
}

async function loadCatalog() {
    // 1. Pintado instantáneo en 0 ms desde caché local si existe
    let renderedFromCache = false;
    try {
        const cachedRaw = localStorage.getItem(CONFIG.CACHE_KEY);
        if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed.data) && parsed.data.length > 0) {
                PRODUCTS = parsed.data;
                renderedFromCache = true;
                afterCatalogLoaded();
            }
        }
    } catch (_) {}

    // Si no había caché, mostramos esqueletos elegantes mientras llega Google Sheets
    if (!renderedFromCache && typeof renderSkeletonStates === 'function') {
        renderSkeletonStates();
    }

    if (!CONFIG.GOOGLE_SHEETS_CSV_URL) {
        await autoLoadFromGitHubRepo();
        return;
    }

    // 2. Revalidación silenciosa en segundo plano contra Google Sheets
    try {
        const res = await fetch(CONFIG.GOOGLE_SHEETS_CSV_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Sheet error');
        const rows = parseCSV(await res.text());
        if (rows.length < 2) throw new Error('Sheet vacía');

        const freshProducts = mapSheetRowsToProducts(rows);
        if (freshProducts.length > 0) {
            const freshHash = JSON.stringify(freshProducts);
            const prevHash = PRODUCTS.length ? JSON.stringify(PRODUCTS) : '';
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ ts: Date.now(), data: freshProducts }));

            if (!renderedFromCache || freshHash !== prevHash) {
                PRODUCTS = freshProducts;
                afterCatalogLoaded();
            }
        } else if (!renderedFromCache) {
            await autoLoadFromGitHubRepo();
        }
    } catch (_) {
        if (!renderedFromCache) await autoLoadFromGitHubRepo();
    }
}
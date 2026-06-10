// shared.js — config + helpers for The Leaderboard
// Adapted from personal app's shared.js

const AppConfig = {
    api: "https://script.google.com/macros/s/AKfycbyMWezKiSWgCFEzvRfQ_vN2qylkA9HCXywFcQhlJiYsaTEWno6durZhSZUByu51eQQ/exec",
    
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    
    // 5 disciplines — order matches likely usage frequency
    disciplines: ['In Boulder', 'In Rope', 'Out Rope', 'Out Boulder', 'Trad'],
    
    // Discipline colors used as 4px border-left on session cards, leaderboard tabs, profile strip
    disciplineColors: {
        'In Boulder':  '#f59e0b',  // amber
        'In Rope':     '#06b6d4',  // cyan
        'Out Rope':    '#10b981',  // emerald (= primary)
        'Out Boulder': '#a855f7',  // violet
        'Trad':        '#f43f5e'   // rose
    },
    
    // Style options per discipline
    stylesForDiscipline: {
        'In Boulder':  ['Send', 'Flash'],
        'In Rope':     ['Send', 'Flash', 'Top-rope'],
        'Out Rope':    ['Send', 'Flash', 'Onsight', 'Top-rope'],
        'Out Boulder': ['Send', 'Flash'],
        'Trad':        ['Send', 'Flash', 'Onsight']
    },
    
    // Trimmed grade scales (per design doc)
    grades: {
        'In Boulder': {
            // Canonical union of both gym circuits — every existing grade keeps its score; mint(4+), grey(7B+), pink(7C) added. Colours here are HOUSE colours for aggregate views (histogram/pyramid) that mix gyms; per-gym colours live in boulderCircuits below.
            labels: ["4","4+","5","6A","6B","6C","7A","7B","7B+","7C"],
            scores: [400,450,500,600,633,667,700,733,750,767],
            colors: ["#ffffff","#5eead4","#22c55e","#3b82f6","#eab308","#ef4444","#3f3f46","#a855f7","#a1a1aa","#ec4899"]
        },
        'In Rope': {
            labels: ["4b","4c","5a","5a+","5b","5b+","5c","5c+","6a","6a+","6b","6b+","6c","6c+","7a","7a+","7b","7b+","7c"],
            scores: [450,475,500,517,533,550,567,583,600,617,633,650,667,683,700,717,733,750,767],
            colors: []
        },
        'Out Rope': {
            labels: ["3","4-","4","4+","5-","5a","5a+","5b","5b+","5c","5c+","6a","6a+","6b","6b+","6c","6c+","7a","7a+","7b","7b+","7c"],
            scores: [100,200,250,300,400,500,517,533,550,567,583,600,617,633,650,667,683,700,717,733,750,767],
            colors: []
        },
        'Out Boulder': {
            labels: ["3","4","5","5+","6A","6A+","6B","6B+","6C","6C+","7A","7A+","7B","7B+","7C"],
            scores: [300,400,500,550,600,617,633,650,667,683,700,717,733,750,767],
            colors: []
        },
        'Trad': {
            labels: ["3","4-","4","4+","5-","5a","5a+","5b","5b+","5c","5c+","6a","6a+","6b","6b+","6c","6c+","7a","7a+","7b","7b+","7c"],
            scores: [100,200,250,300,400,500,517,533,550,567,583,600,617,633,650,667,683,700,717,733,750,767],
            colors: []
        }
    },
    
    // Default grade for first-ever log per discipline
    defaultGradeIndex: {
        'In Boulder':  3,  // 6A (index shifted by the new mint 4+ tier)
        'In Rope':     8,  // 6a
        'Out Rope':    11, // 6a
        'Out Boulder': 4,  // 6A
        'Trad':        11  // 6a (same as Out Rope scale)
    },
    
    // Flash/onsight bonus per discipline
    flashBonus: {
        'In Boulder':  17,
        'Out Boulder': 17,
        'In Rope':     10,
        'Out Rope':    10,
        'Trad':        10
    },

    // Indoor-boulder gym circuits. Each colour maps to a CANONICAL grade label (scored via grades['In Boulder']).
    // Order is easy -> hard; the logger shows exactly this colour ladder for the selected gym.
    boulderCircuits: {
        oks: { name: 'OKS', ladder: [
            { color: '#ffffff', grade: '4'  },
            { color: '#5eead4', grade: '4+' },  // mint
            { color: '#22c55e', grade: '5'  },
            { color: '#3b82f6', grade: '6A' },
            { color: '#eab308', grade: '6B' },
            { color: '#ef4444', grade: '6C' },
            { color: '#3f3f46', grade: '7A' },
            { color: '#a855f7', grade: '7B' },  // purple
            { color: '#ec4899', grade: '7C' }   // pink
        ] },
        klatreverket: { name: 'Klatreverket', ladder: [
            { color: '#ffffff', grade: '4'   },
            { color: '#22c55e', grade: '5'   },
            { color: '#3b82f6', grade: '6A'  },
            { color: '#eab308', grade: '6B'  },
            { color: '#ef4444', grade: '6C'  },
            { color: '#3f3f46', grade: '7A'  },
            { color: '#a1a1aa', grade: '7B+' }  // grey (black -> grey; no 7B tier here)
        ] }
    },

    // Which circuit each indoor-boulder gym runs (keys are lowercased location names). Unknown gyms default to OKS.
    boulderLocationCircuit: {
        'bryn': 'klatreverket',
        'torshov': 'klatreverket',
        'løkka': 'klatreverket',
        'lokka': 'klatreverket',
        'drammen': 'klatreverket',
        'oks': 'oks',
        'gneiss': 'oks'
    }
};

// Strip style markers from grade strings (legacy from personal app — leaderboard probably won't need but kept for safety)
const getBaseGrade = (g) => String(g || "").replace(/[⚡💎🚀🛠️❌🪢🔄\s]/g, '');

// True if a send was top-roped — kept separate from lead everywhere, never scored on lead boards
const isTopRope = (style) => String(style || '').toLowerCase().trim() === 'top-rope';

// Date string normalizer — extracts a LOCAL YYYY-MM-DD deterministically (no UTC round-trip, no hour math)
const getCleanDate = (dStr) => {
    const toLocalYMD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    if (!dStr) return toLocalYMD(new Date());
    if (typeof dStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dStr.trim())) return dStr.trim();
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) return toLocalYMD(d);
    return String(dStr).substring(0, 10);
};

// HTML escape for safe rendering of user input
const escapeHTML = (str) => {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// Short date display: "28 Apr"
const formatShortDate = (dStr) => {
    const clean = getCleanDate(dStr);
    const [y, m, d] = clean.split('-');
    return `${parseInt(d, 10)} ${AppConfig.months[parseInt(m, 10)-1]}`;
};

// Get scoring scale for a discipline
const getScaleConfig = (disc) => AppConfig.grades[disc];

// Indoor-boulder circuit object ({name, ladder}) for a gym — defaults to the OKS ladder for unknown gyms
const circuitForLocation = (loc) => {
    const key = String(loc || '').trim().toLowerCase();
    return AppConfig.boulderCircuits[AppConfig.boulderLocationCircuit[key]] || AppConfig.boulderCircuits.oks;
};

// Ordered colour/grade ladder to render in the logger for a given gym (In Boulder only)
const boulderLadderForLocation = (loc) => circuitForLocation(loc).ladder;

// Colour for an indoor-boulder grade AS SHOWN AT A GIVEN GYM; falls back to the canonical house colour
const boulderColorForGrade = (grade, loc) => {
    const g = getBaseGrade(grade);
    const hit = circuitForLocation(loc).ladder.find(x => x.grade === g);
    if (hit) return hit.color;
    const scale = AppConfig.grades['In Boulder'];
    const i = scale.labels.indexOf(g);
    return i >= 0 ? scale.colors[i] : '#888';
};

// Compute scored value with flash/onsight bonus applied
const getScoredValue = (grade, style, discipline) => {
    const scale = getScaleConfig(discipline);
    if (!scale) return 0;
    const idx = scale.labels.indexOf(getBaseGrade(grade));
    if (idx === -1) return 0;
    const baseScore = scale.scores[idx];
    const styleNorm = String(style || '').toLowerCase();
    const bonus = (styleNorm === 'flash' || styleNorm === 'onsight') ? AppConfig.flashBonus[discipline] : 0;
    return baseScore + bonus;
};

// Relative time format for feed cards
const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const ms = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (hours < 1)  return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days}d ago`;
    return formatShortDate(timestamp);
};
// Haptic feedback — short pulse on tap, slightly longer on commit
const haptic = (kind = 'tap') => {
    if (!navigator.vibrate) return;
    const patterns = {
        tap: 10,        // pill, button, tab
        commit: 25,     // log submit, user switch
        error: [50, 30, 50]  // failure
    };
    navigator.vibrate(patterns[kind] || 10);
};

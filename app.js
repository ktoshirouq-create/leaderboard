// ==========================================
// CONFIGURATION & API
// ==========================================
// The Master Web App URL you generated:
const API_URL = 'https://script.google.com/macros/s/AKfycbxS1G-POcgzt75cKiJUYnl6Kqe9EHQYAu5KDDMGqRE3SSvWOVWQYAoV-Rwr5Stb46p1/exec';

// Grade Matrices
const gymCircuits = [
    { text: '4', color: '#FFFFFF', value: '4' },
    { text: '5', color: '#4CAF50', value: '5' },
    { text: '6A', color: '#2196F3', value: '6A' },
    { text: '6B', color: '#FFEB3B', value: '6B' },
    { text: '6C', color: '#F44336', value: '6C' },
    { text: '7A', color: '#000000', value: '7A' },
    { text: '7B', color: '#9C27B0', value: '7B' }
];

const linearGrades = [
    '3a', '3a+', '3b', '3b+', '3c', '3c+',
    '4a', '4a+', '4b', '4b+', '4c', '4c+',
    '5a', '5a+', '5b', '5b+', '5c', '5c+',
    '6a', '6a+', '6b', '6b+', '6c', '6c+',
    '7a', '7a+', '7b', '7b+', '7c', '7c+'
];

// ==========================================
// STATE MANAGEMENT
// ==========================================
let activeDiscipline = 'In Boulder';
let rosterCache = [];

// ==========================================
// MATH ENGINE
// ==========================================
function calculateScore(discipline, gradeStr, style) {
    let score = 0;
    
    if (discipline === 'In Boulder') {
        const baseScores = { '4': 400, '5': 500, '6A': 600, '6B': 633, '6C': 667, '7A': 700, '7B': 733 };
        score = baseScores[gradeStr] || 0;
        if (style === 'Flash') score += 17;
    } else {
        // Ropes & Out Boulder (Math formula based on strings like '6c+')
        const numMatch = gradeStr.match(/\d/);
        const subMatch = gradeStr.match(/[a-c]\+?/);
        if (numMatch && subMatch) {
            const base = parseInt(numMatch[0]) * 100;
            const subs = { 'a': 0, 'a+': 17, 'b': 33, 'b+': 50, 'c': 67, 'c+': 83 };
            score = base + (subs[subMatch[0].toLowerCase()] || 0);
        }
        if (style === 'Flash' || style === 'Onsight') score += 10;
    }
    return score;
}

function getGradeFromScore(score, discipline) {
    if (score === 0) return 'Unranked';
    // Helper to translate final average score back into readable grade (e.g. 683 -> 6c+)
    if (discipline === 'In Boulder') {
        const reversed = [
            { s: 733, g: '7B' }, { s: 700, g: '7A' }, { s: 667, g: '6C' },
            { s: 633, g: '6B' }, { s: 600, g: '6A' }, { s: 500, g: '5' }, { s: 400, g: '4' }
        ];
        const match = reversed.find(r => score >= r.s);
        return match ? match.g : 'Unranked';
    } else {
        const base = Math.floor(score / 100);
        const remainder = score % 100;
        let sub = 'a';
        if (remainder >= 83) sub = 'c+';
        else if (remainder >= 67) sub = 'c';
        else if (remainder >= 50) sub = 'b+';
        else if (remainder >= 33) sub = 'b';
        else if (remainder >= 17) sub = 'a+';
        return `${base}${sub}`;
    }
}

// ==========================================
// UI LOGIC & API CALLS
// ==========================================

async function fetchLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    const spinner = document.getElementById('loading-spinner');
    
    list.innerHTML = '';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}?discipline=${encodeURIComponent(activeDiscipline)}`);
        const data = await response.json();
        
        spinner.style.display = 'none';
        renderLeaderboard(data.leaderboard);
        updateWhoPicker(data.leaderboard); // Piggyback to build roster
    } catch (error) {
        spinner.innerText = 'Error loading board. Check connection.';
        console.error(error);
    }
}

function renderLeaderboard(data) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    if (data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888; margin-top:40px;">No sends logged in the last 60 days.</p>';
        return;
    }

    data.forEach((user) => {
        const displayGrade = getGradeFromScore(user.capacityScore, activeDiscipline);
        
        // Build card HTML
        const card = document.createElement('div');
        card.className = 'climber-card';
        card.dataset.rank = user.rank;
        
        card.innerHTML = `
            <div class="rank-badge">${user.rank}</div>
            <div class="climber-info">
                <div class="climber-name">${user.name}</div>
                <div class="climber-logs">${user.logsCount}/10 Logs</div>
            </div>
            <div class="climber-score">
                <div class="score-grade">${displayGrade}</div>
                <div class="score-pts">${Math.round(user.capacityScore)} pts</div>
            </div>
        `;
        list.appendChild(card);
    });
}

// Format Date safely (For standardizing "Today" / "Yesterday")
function getFormattedDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
}

// Handle Form Submission POST
document.getElementById('submit-log-btn').addEventListener('click', async () => {
    const btn = document.getElementById('submit-log-btn');
    btn.innerText = 'SENDING...';

    // Gather selected values
    const who = document.querySelector('#who-container .active')?.dataset.value;
    const whenRaw = document.querySelector('#when-container .active')?.dataset.value;
    const what = document.querySelector('#what-container .active')?.dataset.value;
    const grade = document.querySelector('#grade-container .active')?.dataset.value;
    const style = document.querySelector('#style-container .active')?.dataset.value;

    if (!who) {
        alert("Please wait for the roster to load, or add a user in the Google Sheet!");
        btn.innerText = 'SEND IT';
        return;
    }

    // Convert Date
    let finalDate = getFormattedDate(0);
    if (whenRaw === 'Yesterday') finalDate = getFormattedDate(1);
    // Note: If 'Custom', in a full build we'd prompt a date picker. Defaulting to today here for safety.

    // Calculate Score mathematically
    const mathScore = calculateScore(what, grade, style);

    const payload = {
        climber: who,
        date: finalDate,
        discipline: what,
        grade: grade,
        style: style,
        score: mathScore
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // Success UI
        document.getElementById('logger-modal').classList.add('hidden');
        document.getElementById('success-overlay').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('success-overlay').classList.add('hidden');
            btn.innerText = 'SEND IT';
            fetchLeaderboard(); // Refresh the board instantly
        }, 1500);

    } catch (error) {
        alert("Error saving log.");
        btn.innerText = 'SEND IT';
    }
});


// ==========================================
// UI INTERACTIONS & SETUP
// ==========================================

// Setup Pill Mutually Exclusive Selection
function setupSelectables(containerId) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const allBtns = container.querySelectorAll('button');
        allBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Dynamic Grade Swapping
        if (containerId === 'what-container') {
            renderGrades(btn.dataset.value);
        }
    });
}

function renderGrades(discipline) {
    const gradeContainer = document.getElementById('grade-container');
    gradeContainer.innerHTML = ''; 

    if (discipline === 'In Boulder') {
        gymCircuits.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn grade-pill';
            btn.dataset.value = grade.value;
            btn.innerHTML = `<span class="color-dot" style="background-color: ${grade.color}; border: ${grade.color === '#000000' ? '1px solid #fff' : 'none'}"></span> ${grade.text}`;
            gradeContainer.appendChild(btn);
        });
    } else {
        const startIndex = linearGrades.indexOf('6a') > -1 ? linearGrades.indexOf('6a') : 0;
        linearGrades.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn';
            btn.dataset.value = grade;
            btn.innerText = grade;
            gradeContainer.appendChild(btn);
        });
        setTimeout(() => { gradeContainer.scrollLeft = startIndex * 60; }, 10);
    }
    if(gradeContainer.firstElementChild) gradeContainer.firstElementChild.classList.add('active');
}

function updateWhoPicker(leaderboardData) {
    const whoContainer = document.getElementById('who-container');
    whoContainer.innerHTML = '';
    
    leaderboardData.forEach((user, index) => {
        const btn = document.createElement('button');
        btn.className = index === 0 ? 'avatar-btn active' : 'avatar-btn';
        btn.dataset.value = user.name;
        
        const avatarSrc = user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`;
        btn.innerHTML = `<img src="${avatarSrc}" alt="${user.name}"><span>${user.name}</span>`;
        whoContainer.appendChild(btn);
    });
}

// Modal Triggers
document.getElementById('open-logger-btn').addEventListener('click', () => {
    document.getElementById('logger-modal').classList.remove('hidden');
});
document.getElementById('close-logger-btn').addEventListener('click', () => {
    document.getElementById('logger-modal').classList.add('hidden');
});

// Admin Add User Alert
document.getElementById('add-user-btn').addEventListener('click', () => {
    alert("To keep the app fast, User Management is handled in the Admin Panel.\n\nOpen your Google Sheet, go to the 'Roster' tab, and add the new Climber's name there!");
});

// Main Board Discipline Switcher
document.getElementById('main-discipline-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    document.querySelectorAll('#main-discipline-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeDiscipline = btn.dataset.value;
    
    // Sync the logger's 'WHAT' selector to match the board you are currently viewing
    const loggerWhatBtns = document.querySelectorAll('#what-container button');
    loggerWhatBtns.forEach(b => {
        if(b.dataset.value === activeDiscipline) {
            b.click(); // Programmatically click to ensure grades update
        }
    });

    fetchLeaderboard();
});

// Initialize App
setupSelectables('who-container');
setupSelectables('when-container');
setupSelectables('what-container');
setupSelectables('grade-container'); 
setupSelectables('style-container');

renderGrades('In Boulder');
fetchLeaderboard(); // Initial data load// --- CONFIGURATION DATA ---
const gymCircuits = [
    { text: '4', color: '#FFFFFF', value: '4' },
    { text: '5', color: '#4CAF50', value: '5' },
    { text: '6A', color: '#2196F3', value: '6A' },
    { text: '6B', color: '#FFEB3B', value: '6B' },
    { text: '6C', color: '#F44336', value: '6C' },
    { text: '7A', color: '#000000', value: '7A' },
    { text: '7B', color: '#9C27B0', value: '7B' }
];

const linearGrades = [
    '3a', '3a+', '3b', '3b+', '3c', '3c+',
    '4a', '4a+', '4b', '4b+', '4c', '4c+',
    '5a', '5a+', '5b', '5b+', '5c', '5c+',
    '6a', '6a+', '6b', '6b+', '6c', '6c+',
    '7a', '7a+', '7b', '7b+', '7c', '7c+'
];

// --- DOM ELEMENTS ---
const gradeContainer = document.getElementById('grade-container');
const whoContainer = document.getElementById('who-container');
const submitBtn = document.getElementById('submit-btn');

// --- LOGIC ---

function setupSelectables(containerId) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Logic check: if discipline changed, swap grades
        if (containerId === 'discipline-container') {
            renderGrades(btn.dataset.value);
        }
    });
}

function renderGrades(discipline) {
    gradeContainer.innerHTML = '';
    
    // In Boulder = Colors + Grade
    if (discipline === 'In Boulder') {
        gymCircuits.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn grade-pill';
            btn.dataset.value = grade.value;
            btn.innerHTML = `<span class="color-dot" style="background-color: ${grade.color}; border: ${grade.color === '#000000' ? '1px solid #fff' : 'none'}"></span> ${grade.text}`;
            gradeContainer.appendChild(btn);
        });
    } else {
        // In Rope, Out Rope, Out Boulder = Text Only
        linearGrades.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn';
            btn.dataset.value = grade;
            btn.innerText = grade;
            gradeContainer.appendChild(btn);
        });
        // Auto-scroll to 6a as a starting midpoint
        gradeContainer.scrollLeft = linearGrades.indexOf('6a') * 65;
    }
    gradeContainer.firstElementChild.classList.add('active');
}

// Future: This will fetch from the doGet script
function loadRoster(members = []) {
    whoContainer.innerHTML = '';
    if (members.length === 0) {
        whoContainer.innerHTML = '<button class="pill-btn">+ Add Member</button>';
        return;
    }
    // Logic to build avatar buttons will go here
}

// --- INITIALIZATION ---
setupSelectables('who-container');
setupSelectables('when-container');
setupSelectables('discipline-container');
setupSelectables('grade-container');
setupSelectables('style-container');

renderGrades('In Boulder');// --- CONFIGURATION DATA ---
const gymCircuits = [
    { text: '4', color: '#FFFFFF', value: '4' }, // White
    { text: '5', color: '#4CAF50', value: '5' }, // Green
    { text: '6A', color: '#2196F3', value: '6A' }, // Blue
    { text: '6B', color: '#FFEB3B', value: '6B' }, // Yellow
    { text: '6C', color: '#F44336', value: '6C' }, // Red
    { text: '7A', color: '#000000', value: '7A' }, // Black (Border added in CSS if needed)
    { text: '7B', color: '#9C27B0', value: '7B' }  // Purple
];

const linearGrades = [
    '3a', '3a+', '3b', '3b+', '3c', '3c+',
    '4a', '4a+', '4b', '4b+', '4c', '4c+',
    '5a', '5a+', '5b', '5b+', '5c', '5c+',
    '6a', '6a+', '6b', '6b+', '6c', '6c+',
    '7a', '7a+', '7b', '7b+', '7c', '7c+'
];

// --- DOM ELEMENTS ---
const gradeContainer = document.getElementById('grade-container');
const whatPills = document.querySelectorAll('#what-container button');
const submitBtn = document.getElementById('submit-btn');
const successOverlay = document.getElementById('success-overlay');

// --- LOGIC ---

// 1. Handle Selection Visuals (Only one active per row)
function setupSelectables(containerId) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        // Remove active class from all in this specific container
        const allBtns = container.querySelectorAll('button');
        allBtns.forEach(b => b.classList.remove('active'));
        
        // Add active to clicked
        btn.classList.add('active');

        // If 'WHAT' was clicked, trigger grade swap
        if (containerId === 'what-container') {
            renderGrades(btn.dataset.value);
        }
    });
}

// 2. Render Grades Dynamically
function renderGrades(discipline) {
    gradeContainer.innerHTML = ''; // Clear current

    if (discipline === 'In Boulder') {
        // Render Gym Circuits
        gymCircuits.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn grade-pill';
            btn.dataset.value = grade.value;
            // Inject color dot and text
            btn.innerHTML = `<span class="color-dot" style="background-color: ${grade.color}; border: ${grade.color === '#000000' ? '1px solid #fff' : 'none'}"></span> ${grade.text}`;
            gradeContainer.appendChild(btn);
        });
    } else {
        // Render Linear Grades (Ropes & Out Boulder)
        // Find a sensible default starting index (e.g., 6a)
        const startIndex = linearGrades.indexOf('6a') > -1 ? linearGrades.indexOf('6a') : 0;
        
        linearGrades.forEach(grade => {
            const btn = document.createElement('button');
            btn.className = 'pill-btn';
            btn.dataset.value = grade;
            btn.innerText = grade;
            gradeContainer.appendChild(btn);
        });

        // Auto-scroll slightly to show 6a/6b range instead of starting at 3a
        gradeContainer.scrollLeft = startIndex * 60; 
    }

    // Set first child as active default
    gradeContainer.firstElementChild.classList.add('active');
}

// 3. Gather Data & Simulate Submit
submitBtn.addEventListener('click', () => {
    // Gather all active values
    const payload = {
        who: document.querySelector('#who-container .active').dataset.value,
        when: document.querySelector('#when-container .active').dataset.value,
        what: document.querySelector('#what-container .active').dataset.value,
        grade: document.querySelector('#grade-container .active').dataset.value,
        style: document.querySelector('#style-container .active').dataset.value
    };

    console.log("SENDING TO GOOGLE SHEETS:", payload);

    // Flash success overlay
    successOverlay.classList.remove('hidden');
    setTimeout(() => {
        successOverlay.classList.add('hidden');
        // Here you would normally route back to the leaderboard view
    }, 1200);
});

// --- INITIALIZATION ---
setupSelectables('who-container');
setupSelectables('when-container');
setupSelectables('what-container');
setupSelectables('grade-container'); // Need to run this after dynamic render

// Set initial state
renderGrades('In Boulder');

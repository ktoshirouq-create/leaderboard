// ==========================================
// CONFIGURATION & API
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxS1G-POcgzt75cKiJUYnl6Kqe9EHQYAu5KDDMGqRE3SSvWOVWQYAoV-Rwr5Stb46p1/exec';

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

let activeDiscipline = 'In Boulder';

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
    if (!list || !spinner) return;
    
    list.innerHTML = '';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}?discipline=${encodeURIComponent(activeDiscipline)}`);
        const data = await response.json();
        
        spinner.style.display = 'none';
        renderLeaderboard(data.leaderboard);
        updateWhoPicker(data.leaderboard); 
    } catch (error) {
        spinner.innerText = 'Error loading board. Check connection.';
        console.error("Fetch Error:", error);
    }
}

function renderLeaderboard(data) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888; margin-top:40px;">No sends logged recently.</p>';
        return;
    }

    data.forEach((user) => {
        const displayGrade = getGradeFromScore(user.capacityScore, activeDiscipline);
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

function getFormattedDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
}

function updateWhoPicker(leaderboardData) {
    const whoContainer = document.getElementById('who-container');
    if (!whoContainer || !leaderboardData) return;
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

// Setup Pill Mutually Exclusive Selection
function setupSelectables(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const allBtns = container.querySelectorAll('button');
        allBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (containerId === 'what-container') {
            renderGrades(btn.dataset.value);
        }
    });
}

function renderGrades(discipline) {
    const gradeContainer = document.getElementById('grade-container');
    if (!gradeContainer) return;
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

// ==========================================
// INITIALIZATION (Safe Load)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    setupSelectables('who-container');
    setupSelectables('when-container');
    setupSelectables('what-container');
    setupSelectables('grade-container'); 
    setupSelectables('style-container');

    renderGrades('In Boulder');
    fetchLeaderboard();

    // Modal Triggers
    const openBtn = document.getElementById('open-logger-btn');
    const closeBtn = document.getElementById('close-logger-btn');
    const modal = document.getElementById('logger-modal');
    
    if (openBtn && modal) openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // Admin Alert
    const addBtn = document.getElementById('add-user-btn');
    if (addBtn) addBtn.addEventListener('click', () => {
        alert("To keep the app fast, User Management is handled in the Admin Panel.\n\nOpen your Google Sheet, go to the 'Roster' tab, and add the new Climber's name there!");
    });

    // Main Board Discipline Switcher
    const mainTabs = document.getElementById('main-discipline-tabs');
    if (mainTabs) {
        mainTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            document.querySelectorAll('#main-discipline-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeDiscipline = btn.dataset.value;
            
            const loggerWhatBtns = document.querySelectorAll('#what-container button');
            loggerWhatBtns.forEach(b => {
                if(b.dataset.value === activeDiscipline) b.click();
            });

            fetchLeaderboard();
        });
    }

    // Submit Log
    const submitBtn = document.getElementById('submit-log-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            submitBtn.innerText = 'SENDING...';

            // Safe DOM queries
            const whoEl = document.querySelector('#who-container .active');
            const whenEl = document.querySelector('#when-container .active');
            const whatEl = document.querySelector('#what-container .active');
            const gradeEl = document.querySelector('#grade-container .active');
            const styleEl = document.querySelector('#style-container .active');

            const who = whoEl ? whoEl.dataset.value : null;
            const whenRaw = whenEl ? whenEl.dataset.value : null;
            const what = whatEl ? whatEl.dataset.value : null;
            const grade = gradeEl ? gradeEl.dataset.value : null;
            const style = styleEl ? styleEl.dataset.value : null;

            if (!who) {
                alert("Please wait for the roster to load, or add a user in the Google Sheet!");
                submitBtn.innerText = 'SEND IT';
                return;
            }

            let finalDate = getFormattedDate(0);
            if (whenRaw === 'Yesterday') finalDate = getFormattedDate(1);
            
            const mathScore = calculateScore(what, grade, style);

            const payload = { climber: who, date: finalDate, discipline: what, grade: grade, style: style, score: mathScore };

            try {
                await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                document.getElementById('logger-modal').classList.add('hidden');
                document.getElementById('success-overlay').classList.remove('hidden');
                
                setTimeout(() => {
                    document.getElementById('success-overlay').classList.add('hidden');
                    submitBtn.innerText = 'SEND IT';
                    fetchLeaderboard();
                }, 1500);

            } catch (error) {
                alert("Error saving log.");
                submitBtn.innerText = 'SEND IT';
            }
        });
    }
});

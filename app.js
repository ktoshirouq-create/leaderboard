// --- CONFIGURATION DATA ---
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

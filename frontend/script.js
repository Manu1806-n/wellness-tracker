// Firebase Web SDK initialization
const auth = firebase.auth();
// Disable auto-login persistence (user must log in every time)
auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
  .then(() => {
    console.log("Persistence set to NONE (no auto-login).");
    // Clear any existing session to avoid auto-login
    return auth.signOut();
  })
  .catch((error) => {
    console.error("Persistence error:", error);
  });
// Detect environment (local vs deployed)
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Base API URL
const apiBase = isLocal
  ? "http://localhost:8080/api"         // Local backend
  : "https://wellness-tracker-49up.onrender.com/api";  // Render backend
  
// DOM Elements
const authCard = document.getElementById("authCard");
const appContainer = document.getElementById("appContainer");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const entryForm = document.getElementById("entryForm");
const entriesList = document.getElementById("entriesList");
const stepsInput = document.getElementById("steps");
const sleepInput = document.getElementById("sleep");
const moodInput = document.getElementById("mood");
const notesInput = document.getElementById("notes");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const filterBtn = document.getElementById("filterBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");
const exportCSVBtn = document.getElementById("exportCSV");
const exportPDFBtn = document.getElementById("exportPDF");
const toggleThemeBtn = document.getElementById("toggleTheme");
const totalStepsEl = document.getElementById("totalSteps");
const avgSleepEl = document.getElementById("avgSleep");
const commonMoodEl = document.getElementById("commonMood");
const aiTipEl = document.getElementById("aiTip");

// Chart instances
let stepsChart, sleepChart, moodChart;
const stepsChartCtx = document.getElementById("stepsChart").getContext("2d");
const sleepChartCtx = document.getElementById("sleepChart").getContext("2d");
const moodChartCtx = document.getElementById("moodChart").getContext("2d");

// State
let entries = [];
let filteredEntries = [];
let isEditing = false;
let editingId = null;

// Unified API fetch with Firebase token
async function apiFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("No user authenticated");

  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
}

// Initialize the app
function initApp() {
  // Set default dates for filters
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  
  startDateInput.value = oneWeekAgo.toISOString().split('T')[0];
  endDateInput.value = today.toISOString().split('T')[0];
  
  // Check for saved theme preference
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }
  
  // Set up auth state listener
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Try to refresh the token and load entries, show error toast on failure
      try {
        await user.getIdToken();
        // User is signed in and token is valid
        console.log("✅ User signed in:", user.email);
        showToast("Logged in successfully!", "success");
        authCard.style.display = "none";
        appContainer.style.display = "block";
        // Load user's entries
        await loadEntries();
      } catch (err) {
        // If token refresh or loadEntries fails, show error toast but do not sign out
        showToast("Failed to load your data. Please try again.", "error");
      }
    } else {
      // User is signed out
      console.log("❌ User signed out");
      authCard.style.display = "flex";
      appContainer.style.display = "none";
      entries = [];
      filteredEntries = [];
      clearCharts();
      updateSummary();
    }
  });
  
  // Set up event listeners
  setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
  // Auth buttons
  signupBtn.addEventListener("click", handleSignup);
  loginBtn.addEventListener("click", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  
  // Entry form
  entryForm.addEventListener("submit", handleAddEntry);
  
  // Filters and exports
  filterBtn.addEventListener("click", applyFilters);
  clearFilterBtn.addEventListener("click", clearFilters);
  exportCSVBtn.addEventListener("click", exportToCSV);
  exportPDFBtn.addEventListener("click", exportToPDF);
  
  // Theme toggle
  toggleThemeBtn.addEventListener("click", toggleTheme);
}

// Handle user signup
async function handleSignup() {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthMessage("Please enter both email and password", "error");
    return;
  }
  
  try {
    showAuthMessage("Creating account...", "info");
    
    // First create user with Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Then create user in our backend
    const response = await fetch(`${apiBase}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAuthMessage("Account created successfully!", "success");
      // Clear form
      emailInput.value = "";
      passwordInput.value = "";
    } else {
      showAuthMessage("Signup failed: " + data.error, "error");
      // Delete the Firebase user if backend creation failed
      await user.delete();
    }
  } catch (error) {
    console.error("Signup error:", error);
    showAuthMessage("Signup failed: " + error.message, "error");
  }
}

// Handle user login
async function handleLogin() {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthMessage("Please enter both email and password", "error");
    return;
  }
  
  try {
    showAuthMessage("Logging in...", "info");
    
    // Sign in with Firebase Authentication
    await auth.signInWithEmailAndPassword(email, password);
    
    // Clear form
    emailInput.value = "";
    passwordInput.value = "";
    hideAuthMessage();
  } catch (error) {
    console.error("Login error:", error);
    showAuthMessage("Login failed: " + error.message, "error");
  }
}

// Handle user logout
async function handleLogout() {
  try {
    await auth.signOut();
    showToast("Logged out successfully", "info");
  } catch (error) {
    console.error("Logout error:", error);
    showToast("Logout failed: " + error.message, "error");
  }
}

// Handle adding a new entry
async function handleAddEntry(e) {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    showToast("Please log in first", "error");
    return;
  }
  
  const steps = parseInt(stepsInput.value);
  const sleep = parseFloat(sleepInput.value);
  const mood = moodInput.value;
  const notes = notesInput.value;
  
  if (!steps || !sleep || !mood) {
    showToast("Please fill in all required fields", "error");
    return;
  }
  
  try {
    const url = isEditing ? `${apiBase}/wellness/${editingId}` : `${apiBase}/wellness`;
    const method = isEditing ? "PUT" : "POST";

    const response = await apiFetch(url, {
      method,
      body: JSON.stringify({ steps, sleep, mood, notes })
    });

    const data = await response.json();

    if (data.success) {
      showToast("Entry added successfully!", "success");
      entryForm.reset();
      await loadEntries();
      isEditing = false;
      editingId = null;
      entryForm.querySelector('button[type="submit"]').textContent = "Add Entry";
    } else {
      showToast("Failed to add entry: " + data.error, "error");
    }
  } catch (error) {
    console.error("Add entry error:", error);
    showToast("Failed to add entry: " + error.message, "error");
  }
}

// Load all entries for the current user
async function loadEntries() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const response = await apiFetch(`${apiBase}/wellness`, { method: "GET" });

    const data = await response.json();

    if (data.success) {
      entries = data.entries || [];
      applyFilters(); // Apply current filters
      renderEntries();
      updateCharts();
      updateSummary();
    } else {
      // If backend says token is invalid or failed, show toast instead of signing out
      showToast("Failed to load entries: Invalid token or server error.", "error");
    }
  } catch (error) {
    console.error("Load entries error:", error);
    // If token fetch or fetch fails, show error toast and do not sign out
    showToast("Failed to load entries: " + error.message, "error");
  }
}

// Render entries list
function renderEntries() {
  entriesList.innerHTML = "";
  
  if (filteredEntries.length === 0) {
    entriesList.innerHTML = `<p class="no-entries">No entries found. Add your first entry above!</p>`;
    return;
  }
  
  filteredEntries.forEach(entry => {
    const entryEl = document.createElement("div");
    entryEl.className = "entry-item";
    entryEl.innerHTML = `
      <div class="entry-info">
        <div class="entry-date">${formatDate(entry.date)}</div>
        <div class="entry-details">
          Steps: ${entry.steps} | Sleep: ${entry.sleep}h | Mood: ${entry.mood}
          ${entry.notes ? `| Notes: ${entry.notes}` : ''}
        </div>
      </div>
      <div class="entry-actions">
        <button class="entry-btn edit" data-id="${entry.id}">Edit</button>
        <button class="entry-btn delete" data-id="${entry.id}">Delete</button>
      </div>
    `;
    entriesList.appendChild(entryEl);
  });
  
  // Add event listeners to edit and delete buttons
  document.querySelectorAll(".entry-btn.edit").forEach(btn => {
    btn.addEventListener("click", (e) => handleEditEntry(e.target.dataset.id));
  });
  
  document.querySelectorAll(".entry-btn.delete").forEach(btn => {
    btn.addEventListener("click", (e) => handleDeleteEntry(e.target.dataset.id));
  });
}

// Handle editing an entry
async function handleEditEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  
  // Populate form with entry data
  stepsInput.value = entry.steps;
  sleepInput.value = entry.sleep;
  moodInput.value = entry.mood;
  notesInput.value = entry.notes || "";
  
  // Change form to edit mode
  isEditing = true;
  editingId = id;
  entryForm.querySelector('button[type="submit"]').textContent = "Update Entry";
  
  // Scroll to form
  entryForm.scrollIntoView({ behavior: "smooth" });
}

// Handle deleting an entry
async function handleDeleteEntry(id) {
  if (!confirm("Are you sure you want to delete this entry?")) return;
  
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const response = await apiFetch(`${apiBase}/wellness/${id}`, { method: "DELETE" });

    const data = await response.json();

    if (data.success) {
      showToast("Entry deleted successfully!", "success");
      await loadEntries();
    } else {
      showToast("Failed to delete entry: " + data.error, "error");
    }
  } catch (error) {
    console.error("Delete entry error:", error);
    showToast("Failed to delete entry: " + error.message, "error");
  }
}

// Apply date filters
function applyFilters() {
  const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
  const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
  
  filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    
    return true;
  });
  
  renderEntries();
  updateCharts();
  updateSummary();
}

// Clear filters
function clearFilters() {
  startDateInput.value = "";
  endDateInput.value = "";
  filteredEntries = [...entries];
  renderEntries();
  updateCharts();
  updateSummary();
}

// Update charts with current data
function updateCharts() {
  updateStepsChart();
  updateSleepChart();
  updateMoodChart();
}

// Update steps chart
function updateStepsChart() {
  if (stepsChart) {
    stepsChart.destroy();
  }
  
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  stepsChart = new Chart(stepsChartCtx, {
    type: 'line',
    data: {
      labels: sortedEntries.map(entry => formatDate(entry.date)),
      datasets: [{
        label: 'Steps',
        data: sortedEntries.map(entry => entry.steps),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Steps Over Time'
        }
      }
    }
  });
}

// Update sleep chart
function updateSleepChart() {
  if (sleepChart) {
    sleepChart.destroy();
  }
  
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  sleepChart = new Chart(sleepChartCtx, {
    type: 'bar',
    data: {
      labels: sortedEntries.map(entry => formatDate(entry.date)),
      datasets: [{
        label: 'Sleep Hours',
        data: sortedEntries.map(entry => entry.sleep),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Sleep Hours'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    }
  });
}

// Update mood chart
function updateMoodChart() {
  if (moodChart) {
    moodChart.destroy();
  }
  
  const moodCounts = {
    Happy: 0,
    Neutral: 0,
    Tired: 0,
    Stressed: 0
  };
  
  filteredEntries.forEach(entry => {
    if (moodCounts.hasOwnProperty(entry.mood)) {
      moodCounts[entry.mood]++;
    }
  });
  
  const moodColors = {
    Happy: '#10b981',
    Neutral: '#3b82f6',
    Tired: '#f59e0b',
    Stressed: '#ef4444'
  };
  
  moodChart = new Chart(moodChartCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(moodCounts),
      datasets: [{
        data: Object.values(moodCounts),
        backgroundColor: Object.values(moodColors),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Mood Distribution'
        }
      }
    }
  });
}

// Clear all charts
function clearCharts() {
  if (stepsChart) {
    stepsChart.destroy();
    stepsChart = null;
  }
  if (sleepChart) {
    sleepChart.destroy();
    sleepChart = null;
  }
  if (moodChart) {
    moodChart.destroy();
    moodChart = null;
  }
}

// Update summary cards
function updateSummary() {
  if (filteredEntries.length === 0) {
    totalStepsEl.textContent = "0";
    avgSleepEl.textContent = "0h";
    commonMoodEl.textContent = "-";
    aiTipEl.textContent = "Add entries to see your wellness summary";
    return;
  }
  
  // Total steps
  const totalSteps = filteredEntries.reduce((sum, entry) => sum + entry.steps, 0);
  totalStepsEl.textContent = totalSteps.toLocaleString();
  
  // Average sleep
  const avgSleep = filteredEntries.reduce((sum, entry) => sum + entry.sleep, 0) / filteredEntries.length;
  avgSleepEl.textContent = `${avgSleep.toFixed(1)}h`;
  
  // Most common mood
  const moodCounts = {};
  filteredEntries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });
  
  const commonMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b
  );
  commonMoodEl.textContent = commonMood;
  
  // AI Tip only
  const aiAdvice = generateAITip(filteredEntries);
  aiTipEl.textContent = aiAdvice;
}

// Generate AI tip based on ALL filtered entries
function generateAITip(entries) {
  if (entries.length === 0) {
    return "Get started by adding your first entry!";
  }

  // Compute average sleep and steps
  const avgSleep = entries.reduce((sum, e) => sum + e.sleep, 0) / entries.length;
  const avgSteps = entries.reduce((sum, e) => sum + e.steps, 0) / entries.length;

  // Count moods
  const moodCounts = {};
  entries.forEach(e => {
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });
  const commonMood = Object.keys(moodCounts).reduce((a, b) =>
    moodCounts[a] > moodCounts[b] ? a : b
  , null);

  if (avgSleep < 6) {
    return "You seem to be sleeping less. Aim for at least 7-8 hours for better recovery.";
  }
  if (avgSteps < 5000) {
    return "Your step count is a bit low. Try short walks to reach 5,000+ steps daily.";
  }
  if (commonMood === "Stressed") {
    return "Stress is showing up often. Consider meditation or light exercise to relax.";
  }

  // Positive reinforcement
  const tips = [
    "Great job staying consistent with your wellness tracking!",
    "Keep up the healthy balance of sleep, activity, and mood.",
    "You're doing well—stay hydrated and active!",
    "Consistency pays off. Keep going strong!",
    "Awesome progress! Remember to celebrate small wins."
  ];

  return tips[Math.floor(Math.random() * tips.length)];
}

// Export entries to CSV
function exportToCSV() {
  if (filteredEntries.length === 0) {
    showToast("No entries to export", "error");
    return;
  }
  
  const headers = ["Date", "Steps", "Sleep (hours)", "Mood", "Notes"];
  const csvData = filteredEntries.map(entry => [
    entry.date,
    entry.steps,
    entry.sleep,
    entry.mood,
    entry.notes || ""
  ]);
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += headers.join(",") + "\n";
  csvContent += csvData.map(row => row.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "wellness_entries.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV exported successfully", "success");
}

// Export entries to PDF
function exportToPDF() {
  if (filteredEntries.length === 0) {
    showToast("No entries to export", "error");
    return;
  }
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text("Wellness Tracker Entries", 14, 22);
    
    // Add date range
    doc.setFontSize(12);
    const startDate = startDateInput.value || "Beginning";
    const endDate = endDateInput.value || "Today";
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 30);
    
    // Add summary
    const totalSteps = filteredEntries.reduce((sum, entry) => sum + entry.steps, 0);
    const avgSleep = filteredEntries.reduce((sum, entry) => sum + entry.sleep, 0) / filteredEntries.length;
    
    doc.text(`Total Steps: ${totalSteps.toLocaleString()}`, 14, 40);
    doc.text(`Average Sleep: ${avgSleep.toFixed(1)} hours`, 14, 48);
    
    // Add table headers
    doc.setFontSize(10);
    const headers = ["Date", "Steps", "Sleep", "Mood", "Notes"];
    const columnWidths = [30, 25, 25, 25, 85];
    let yPosition = 60;
    
    headers.forEach((header, i) => {
      doc.text(header, 14 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), yPosition);
    });
    
    yPosition += 6;
    
    // Add table rows
    filteredEntries.forEach(entry => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const row = [
        entry.date,
        entry.steps.toString(),
        entry.sleep.toString(),
        entry.mood,
        entry.notes || ""
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell, 14 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), yPosition);
      });
      
      yPosition += 6;
    });
    
    // Save the PDF
    doc.save("wellness_entries.pdf");
    showToast("PDF exported successfully", "success");
  } catch (error) {
    console.error("PDF export error:", error);
    showToast("Failed to export PDF", "error");
  }
}

// Toggle dark/light theme
function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  showToast(`${isDark ? "Dark" : "Light"} mode enabled`, "info");
}

// Show auth message
function showAuthMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = "block";
}

// Hide auth message
function hideAuthMessage() {
  authMessage.style.display = "none";
}

// Show toast notification
function showToast(message, type) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast");
  existingToasts.forEach(toast => toast.remove());
  
  // Create new toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);

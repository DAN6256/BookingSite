import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";

// Model - TeacherDashboardModel
class TeacherDashboardModel {
    constructor() {
        this.app = null;
        this.auth = null;
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            this.app = initializeApp(FIREBASE_CONFIG);
            this.auth = getAuth(this.app);
        } catch (error) {
            throw new Error("Firebase initialization failed");
        }
    }

    getDashboardCards() {
        return [
            {
                icon: "📚",
                title: "Manage Courses",
                description: "View and edit your available times, and contact details.",
                url: "edit-teacher.html"
            },
            {
                icon: "📅",
                title: "View Bookings",
                description: "Check your upcoming and past tutorial sessions with students.",
                url: "teacher-records.html"
            }
        ];
    }

    onAuthStateChanged(callback) {
        onAuthStateChanged(this.auth, callback);
    }
}

// View - TeacherDashboardView
class TeacherDashboardView {
    constructor() {
        this.initializeElements();
    }

    initializeElements() {
        this.dashboardContainer = document.getElementById("dashboard-container");
    }

    displayDashboard(cards) {
        const cardsHTML = cards.map(card => `
            <div class="card" data-url="${card.url}">
                <div class="card-icon">${card.icon}</div>
                <h2>${card.title}</h2>
                <p>${card.description}</p>
            </div>
        `).join('');

        this.dashboardContainer.innerHTML = cardsHTML;
    }

    bindCardClick(handler) {
        this.dashboardContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                const url = card.getAttribute('data-url');
                handler(url);
            }
        });
    }

    navigateToPage(url) {
        window.location.href = url;
    }

    redirectToLogin() {
        window.location.href = "index.html";
    }
}

// Controller - TeacherDashboardController
class TeacherDashboardController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.setupAuthStateListener();
        this.initializeDashboard();
        this.bindEvents();
    }

    setupAuthStateListener() {
        this.model.onAuthStateChanged((user) => {
            if (!user) {
                this.handleUserNotAuthenticated();
            }
        });
    }

    initializeDashboard() {
        try {
            const cards = this.model.getDashboardCards();
            this.view.displayDashboard(cards);
        } catch (error) {
            console.error("Error initializing dashboard:", error);
        }
    }

    bindEvents() {
        this.view.bindCardClick((url) => this.handleCardClick(url));
    }

    handleCardClick(url) {
        try {
            this.view.navigateToPage(url);
        } catch (error) {
            console.error("Error handling card click:", error);
        }
    }

    handleUserNotAuthenticated() {
        this.view.redirectToLogin();
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const model = new TeacherDashboardModel();
    const view = new TeacherDashboardView();
    const controller = new TeacherDashboardController(model, view);
});
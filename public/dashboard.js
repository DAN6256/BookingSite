// Model - AdminDashboardModel
class AdminDashboardModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            throw new Error("Firebase initialization failed");
        }
    }

    async checkAdminAccess() {
        try {
            const user = await new Promise((resolve) => {
                firebase.auth().onAuthStateChanged((user) => {
                    resolve(user);
                });
            });

            const allowedEmails = Object.values(ADMIN_EMAILS);

            if (!user || !allowedEmails.includes(user.email)) {
                return false;
            }
            return true;
        } catch (error) {
            console.error("Authentication error:", error);
            return false;
        }
    }

    getDashboardCards() {
        return [
            {
                icon: "📊",
                title: "View Bookings",
                description: "View and manage all booking records and sessions",
                url: "admin.html"
            },
            {
                icon: "📚",
                title: "Manage Courses",
                description: "Update and manage course details and information",
                url: "manage-courses.html"
            },
            {
                icon: "👥",
                title: "Review and Approve Tutors",
                description: "Review tutor applications and manage approvals",
                url: "review-tutors.html"
            },
            {
                icon: "📥",
                title: "Download Applications",
                description: "Download all tutor application information as Excel",
                url: "downloadAllTutorApplications.html"
            },
            {
                icon: "⬆️",
                title: "Upload Courses",
                description: "Upload courses on offer",
                url: "upload-courses.html"
            },
            {
                icon: "🗑️",
                title: "End Tutor Registration",
                description: "End when tutor registration is over for the semester.",
                url: "delete-courses-on-offer.html"
            }
        ];
    }
}

// View - AdminDashboardView
class AdminDashboardView {
    constructor() {
        this.contentElement = document.getElementById("content");
    }

    showAccessDenied() {
        this.contentElement.innerHTML = `
            <div class="access-denied">
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        `;
    }

    showDashboard(cards) {
        const cardsHTML = cards.map(card => `
            <div class="card" data-url="${card.url}">
                <div class="card-icon">${card.icon}</div>
                <h2>${card.title}</h2>
                <p>${card.description}</p>
            </div>
        `).join('');

        this.contentElement.innerHTML = `
            <div class="cards-container">
                ${cardsHTML}
            </div>
        `;
    }

    bindCardClick(handler) {
        this.contentElement.addEventListener('click', (e) => {
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
}

// Controller - AdminDashboardController
class AdminDashboardController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        try {
            const hasAccess = await this.model.checkAdminAccess();
            
            if (!hasAccess) {
                this.view.showAccessDenied();
                return;
            }

            const cards = this.model.getDashboardCards();
            this.view.showDashboard(cards);
            this.bindEvents();
        } catch (error) {
            console.error("Error initializing dashboard:", error);
            this.view.showAccessDenied();
        }
    }

    bindEvents() {
        this.view.bindCardClick((url) => this.handleCardClick(url));
    }

    handleCardClick(url) {
        this.view.navigateToPage(url);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const model = new AdminDashboardModel();
    const view = new AdminDashboardView();
    const controller = new AdminDashboardController(model, view);
});
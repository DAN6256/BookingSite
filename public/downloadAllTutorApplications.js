class TutorApplicationModel {
    constructor() {
        this.firebase = firebase;
        this.adminEmails = Object.values(ADMIN_EMAILS);
        this.currentUser = null;
    }

    // Initialize Firebase and get current user
    async initializeAuth() {
        return new Promise((resolve) => {
            this.firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                resolve(user);
            });
        });
    }

    // Check if current user has admin access
    hasAdminAccess() {
        return this.currentUser && this.adminEmails.includes(this.currentUser.email);
    }

    // Get current user information
    getCurrentUser() {
        return this.currentUser;
    }

    // Get admin emails list
    getAdminEmails() {
        return this.adminEmails;
    }
}


class TutorApplicationView {
    constructor() {
        this.contentContainer = document.getElementById("content");
    }

    // Show access denied message
    showAccessDenied() {
        this.contentContainer.innerHTML = `
            <div class="access-denied">
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        `;
    }

    // Show the main navigation cards
    showNavigationCards() {
        this.contentContainer.innerHTML = `
            <div class="cards-container">
                <div class="card pending" data-url="downloadApplications.html">
                    <div class="card-icon">📝</div>
                    <h2>Applied Tutors</h2>
                    <p>Download information for all pending tutor applications currently under review</p>
                </div>
                <div class="card accepted" data-url="acceptedTutors.html">
                    <div class="card-icon">✅</div>
                    <h2>Accepted Tutors</h2>
                    <p>Download information for all tutors who have been approved to teach</p>
                </div>
                <div class="card rejected" data-url="rejectedTutors.html">
                    <div class="card-icon">❌</div>
                    <h2>Rejected Tutors</h2>
                    <p>Download information for all tutor applications that were not approved</p>
                </div>
            </div>
        `;
        
        // Add event listeners to cards
        this.addCardEventListeners();
    }

    // Add event listeners to navigation cards
    addCardEventListeners() {
        const cards = this.contentContainer.querySelectorAll('.card[data-url]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const url = card.getAttribute('data-url');
                window.location.href = url;
            });
        });
    }

    // Show loading state
    showLoading() {
        this.contentContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🔄</div>
                <p>Loading...</p>
            </div>
        `;
    }

    // Show error message
    showError(message) {
        this.contentContainer.innerHTML = `
            <div style="text-align: center; color: #d32f2f; padding: 2rem;">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }
}


class TutorApplicationController {
    constructor() {
        this.model = new TutorApplicationModel();
        this.view = new TutorApplicationView();
        this.init();
    }

    // Initialize the application
    async init() {
        try {
            // Initialize Firebase
            this.model.firebase.initializeApp(FIREBASE_CONFIG);
            
            // Show loading state
            this.view.showLoading();
            
            // Check admin access
            const hasAccess = await this.checkAdminAccess();
            
            if (hasAccess) {
                this.view.showNavigationCards();
            } else {
                this.view.showAccessDenied();
            }
        } catch (error) {
            console.error("Error initializing application:", error);
            this.view.showError("Failed to load the application. Please try again.");
        }
    }

    // Check if user has admin access
    async checkAdminAccess() {
        try {
            await this.model.initializeAuth();
            return this.model.hasAdminAccess();
        } catch (error) {
            console.error("Error checking admin access:", error);
            return false;
        }
    }

    // Navigate to a specific page
    navigateToPage(url) {
        try {
            window.location.href = url;
        } catch (error) {
            console.error("Navigation error:", error);
            this.view.showError("Failed to navigate to the requested page.");
        }
    }

    // Get current user (for potential future use)
    getCurrentUser() {
        return this.model.getCurrentUser();
    }

    // Check if current user is admin (for potential future use)
    isCurrentUserAdmin() {
        return this.model.hasAdminAccess();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    window.TutorApplicationApp = new TutorApplicationController();
});


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TutorApplicationModel,
        TutorApplicationView,
        TutorApplicationController
    };
}
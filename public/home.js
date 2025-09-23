// Model
class HomeModel {
    constructor() {
        this.initializeFirebase();
        this.user = null;
    }

    initializeFirebase() {
        this.app = firebase.initializeApp(FIREBASE_CONFIG);
        this.auth = firebase.auth();
    }

    getGreeting() {
        const now = new Date();
        const hours = now.getHours();

        if (hours >= 0 && hours < 12) {
            return "Good Morning ";
        } else if (hours >= 12 && hours < 16) {
            return "Good Afternoon ";
        } else {
            return "Good Evening ";
        }
    }

    extractFirstName(email) {
        if (!email) return "";
        
        const firstName = email.split("@")[0].split(".")[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }

    generateWelcomeMessage(email) {
        const firstName = this.extractFirstName(email);
        const greeting = this.getGreeting();
        return `${greeting}${firstName}!`;
    }

    onAuthStateChanged(callback) {
        this.auth.onAuthStateChanged(callback);
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }
}

// View
class HomeView {
    constructor() {
        this.loadingElement = document.getElementById("loading");
        this.pageContainer = document.getElementById("page-container");
        this.firstNameElement = document.getElementById("first-name");
        this.bookTutorCard = document.getElementById("book-tutor-card");
        this.bookingRecordsCard = document.getElementById("booking-records-card");
    }

    showLoading() {
        this.loadingElement.style.display = "flex";
        this.pageContainer.style.display = "none";
    }

    hideLoading() {
        this.loadingElement.style.display = "none";
        this.pageContainer.style.display = "block";
    }

    setWelcomeMessage(message) {
        if (this.firstNameElement) {
            this.firstNameElement.textContent = message;
        }
    }

    addCardHoverEffects() {
        const cards = [this.bookTutorCard, this.bookingRecordsCard];
        
        cards.forEach(card => {
            if (card) {
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-8px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0) scale(1)';
                });
            }
        });
    }

    redirectToLogin() {
        window.location.href = "index.html";
    }

    showError(message) {
        console.error(message);
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-family: Arial, sans-serif;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    animateCards() {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + (index * 150));
        });
    }
}

// Controller
class HomeController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.view.showLoading();
        this.setupEventListeners();
        this.handleAuthStateChange();
    }

    setupEventListeners() {
        // Add any additional event listeners here
        this.view.addCardHoverEffects();
        
        // Add smooth scrolling for better UX
        document.addEventListener('DOMContentLoaded', () => {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 100);
        });
    }

    handleAuthStateChange() {
        this.model.onAuthStateChanged((user) => {
            try {
                if (user) {
                    this.handleUserAuthenticated(user);
                } else {
                    this.handleUserNotAuthenticated();
                }
            } catch (error) {
                this.view.showError("An error occurred while loading the page.");
                console.error("Auth state change error:", error);
            }
        });
    }

    handleUserAuthenticated(user) {
        try {
            const welcomeMessage = this.model.generateWelcomeMessage(user.email);
            this.view.setWelcomeMessage(welcomeMessage);
            this.view.hideLoading();
            
            // Add entrance animation
            setTimeout(() => {
                this.view.animateCards();
            }, 100);
            
        } catch (error) {
            this.view.showError("Failed to load user information.");
            console.error("User authentication handling error:", error);
        }
    }

    handleUserNotAuthenticated() {
        // Small delay to prevent flickering if auth state is still being determined
        setTimeout(() => {
            this.view.redirectToLogin();
        }, 500);
    }

    refreshUserData() {
        const currentUser = this.model.getCurrentUser();
        if (currentUser) {
            this.handleUserAuthenticated(currentUser);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const model = new HomeModel();
    const view = new HomeView();
    const controller = new HomeController(model, view);
    
    // Make controller available globally for debugging
    window.homeController = controller;
});
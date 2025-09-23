// Model - ViewSelectionModel
class ViewSelectionModel {
    constructor() {
        this.app = null;
        this.auth = null;
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            this.app = firebase.initializeApp(FIREBASE_CONFIG);
            this.auth = firebase.auth();
        } catch (error) {
            throw new Error("Firebase initialization failed");
        }
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

    getUserName(email) {
        const firstName = email.split("@")[0].split(".")[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }

    getViewRedirectUrl(view) {
        const redirectUrls = {
            student: "home.html",
            teacher: "teacher-dashboard.html"
        };
        return redirectUrls[view] || "home.html";
    }

    onAuthStateChanged(callback) {
        this.auth.onAuthStateChanged(callback);
    }
}

// View - ViewSelectionView
class ViewSelectionView {
    constructor() {
        this.initializeElements();
    }

    initializeElements() {
        this.loadingScreen = document.getElementById("loading-screen");
        this.pageContainer = document.getElementById("page-container");
        this.firstNameElement = document.getElementById("first-name");
        this.cardsContainer = document.querySelector(".cards-container");
    }

    showLoading() {
        this.loadingScreen.style.display = "flex";
        this.pageContainer.style.display = "none";
    }

    hideLoading() {
        this.loadingScreen.style.display = "none";
        this.pageContainer.style.display = "block";
    }

    displayGreeting(greeting, userName) {
        this.firstNameElement.textContent = `${greeting}${userName}!`;
    }

    bindViewSelection(handler) {
        this.cardsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                const view = card.getAttribute('data-view');
                handler(view);
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

// Controller - ViewSelectionController
class ViewSelectionController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.view.showLoading();
        this.bindEvents();
        this.setupAuthStateListener();
    }

    bindEvents() {
        this.view.bindViewSelection((view) => this.handleViewSelection(view));
    }

    setupAuthStateListener() {
        this.model.onAuthStateChanged((user) => {
            if (user) {
                this.handleUserAuthenticated(user);
            } else {
                this.handleUserNotAuthenticated();
            }
        });
    }

    handleUserAuthenticated(user) {
        try {
            const greeting = this.model.getGreeting();
            const userName = this.model.getUserName(user.email);
            
            this.view.displayGreeting(greeting, userName);
            this.view.hideLoading();
        } catch (error) {
            console.error("Error handling authenticated user:", error);
            this.handleUserNotAuthenticated();
        }
    }

    handleUserNotAuthenticated() {
        this.view.redirectToLogin();
    }

    handleViewSelection(view) {
        try {
            const redirectUrl = this.model.getViewRedirectUrl(view);
            this.view.navigateToPage(redirectUrl);
        } catch (error) {
            console.error("Error handling view selection:", error);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const model = new ViewSelectionModel();
    const view = new ViewSelectionView();
    const controller = new ViewSelectionController(model, view);
});
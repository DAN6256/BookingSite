
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

// Model - AuthModel
class AuthModel {
    constructor() {
        this.app = null;
        this.auth = null;
        this.database = null;
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            this.app = initializeApp(FIREBASE_CONFIG);
            this.auth = getAuth(this.app);
            this.database = getDatabase(this.app);
        } catch (error) {
            throw new Error("Firebase initialization failed");
        }
    }

    getReadableErrorMessage(error) {
        switch (error.code) {
            // Sign in errors
            case 'auth/invalid-email':
                return 'Please enter a valid email address';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support';
            case 'auth/user-not-found':
                return 'No account found with this email. Please check your email or sign up';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again or use "Forgot Password"';
            case 'auth/invalid-credential':
                return 'Invalid login credentials. Please check your email and password';
            case 'auth/too-many-requests':
                return 'Too many failed login attempts. Please try again later or reset your password';
                
            // Sign up errors
            case 'auth/email-already-in-use':
                return 'An account already exists with this email. Please sign in instead';
            case 'auth/weak-password':
                return 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers';
            case 'auth/operation-not-allowed':
                return 'Account creation is currently disabled. Please contact support';
                
            // Password reset errors
            case 'auth/missing-email':
                return 'Please enter your email address to reset your password';
            case 'auth/invalid-action-code':
                return 'The password reset link has expired or is invalid. Please request a new one';
                
            // Network errors
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection and try again';
                
            // Default case
            default:
                return 'An error occurred. Please try again later';
        }
    }

    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: this.getReadableErrorMessage(error) };
        }
    }

    async signUp(email, password) {
        try {
            // Validate Ashesi email
            if (!(email.endsWith("@ashesi.edu.gh") || Object.values(SPECIAL_ACCESS_EMAILS).includes(email))) {
                return { success: false, error: "Please use an Ashesi email address." };
            }

            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: this.getReadableErrorMessage(error) };
        }
    }

    async resetPassword(email) {
        try {
            if (!email) {
                return { success: false, error: "Please enter your email address." };
            }

            await sendPasswordResetEmail(this.auth, email);
            return { success: true, message: "Password reset email sent! Please check your inbox." };
        } catch (error) {
            return { success: false, error: this.getReadableErrorMessage(error) };
        }
    }

    async checkUserType(userEmail) {
        try {
            // Check if admin
            if (Object.values(ADMIN_EMAILS).includes(userEmail)) {
                return { userType: "admin", redirectUrl: "dashboard.html" };
            }

            // Check if teacher
            const teachersRef = ref(this.database, "teachers");
            const snapshot = await get(teachersRef);
            const teachersData = snapshot.val();
            let userType = "student";

            for (let course in teachersData) {
                const teachers = teachersData[course];
                for (let teacher of teachers) {
                    if (teacher.email === userEmail) {
                        userType = "teacher";
                        break;
                    }
                }
                if (userType === "teacher") break;
            }

            const redirectUrl = userType === "teacher" ? "teacher.html" : "home.html";
            return { userType, redirectUrl };
        } catch (error) {
            console.error("Error checking user type:", error);
            return { userType: "student", redirectUrl: "home.html" };
        }
    }

    onAuthStateChanged(callback) {
        onAuthStateChanged(this.auth, callback);
    }
}

// View - AuthView
class AuthView {
    constructor() {
        this.initializeElements();
    }

    initializeElements() {
        this.emailInput = document.getElementById("email");
        this.passwordInput = document.getElementById("password");
        this.errorMessage = document.getElementById("error-message");
        this.successMessage = document.getElementById("success-message");
        this.signInButton = document.getElementById("sign-in-button");
        this.signUpButton = document.getElementById("sign-up-button");
        this.toggleText = document.getElementById("toggle-text");
        this.forgotPassword = document.getElementById("forgot-password");
        this.passwordToggle = document.getElementById("password-toggle");
        this.signInLink = document.getElementById("sign-in-link");
        this.signUpLink = document.getElementById("sign-up-link");
    }

    getFormData() {
        return {
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value.trim()
        };
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.successMessage.textContent = "";
    }

    showSuccess(message) {
        this.successMessage.textContent = message;
        this.errorMessage.textContent = "";
    }

    clearMessages() {
        this.errorMessage.textContent = "";
        this.successMessage.textContent = "";
    }

    toggleAuthMode() {
        if (this.signUpLink.style.display === "none") {
            // Switch to sign up mode
            this.signUpLink.style.display = "block";
            this.signInLink.style.display = "none";
            this.signInButton.style.display = "none";
            this.signUpButton.style.display = "block";
            this.forgotPassword.style.display = "none";
            this.toggleText.textContent = "Already have an account? Sign In";
        } else {
            // Switch to sign in mode
            this.signUpLink.style.display = "none";
            this.signInLink.style.display = "block";
            this.signInButton.style.display = "block";
            this.signUpButton.style.display = "none";
            this.forgotPassword.style.display = "block";
            this.toggleText.textContent = "Don't have an account? Sign Up";
        }
        this.clearMessages();
    }

    togglePasswordVisibility() {
        const toggleIcon = this.passwordToggle;
        
        if (this.passwordInput.type === "password") {
            this.passwordInput.type = "text";
            toggleIcon.textContent = "🙈";
        } else {
            this.passwordInput.type = "password";
            toggleIcon.textContent = "👁️";
        }
    }

    navigateToPage(url) {
        window.location.href = url;
    }

    // Event binding methods
    bindSignIn(handler) {
        this.signInButton.addEventListener("click", handler);
    }

    bindSignUp(handler) {
        this.signUpButton.addEventListener("click", handler);
    }

    bindToggleMode(handler) {
        this.toggleText.addEventListener("click", handler);
    }

    bindForgotPassword(handler) {
        this.forgotPassword.addEventListener("click", handler);
    }

    bindPasswordToggle(handler) {
        this.passwordToggle.addEventListener("click", handler);
    }
}

// Controller - AuthController
class AuthController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupAuthStateListener();
    }

    bindEvents() {
        this.view.bindSignIn((e) => this.handleSignIn(e));
        this.view.bindSignUp(() => this.handleSignUp());
        this.view.bindToggleMode(() => this.handleToggleMode());
        this.view.bindForgotPassword(() => this.handleForgotPassword());
        this.view.bindPasswordToggle(() => this.handlePasswordToggle());
    }

    setupAuthStateListener() {
        this.model.onAuthStateChanged((user) => {
            if (user) {
                this.handleUserAuthenticated(user.email);
            }
        });
    }

    async handleSignIn(event) {
        event.preventDefault();
        const { email, password } = this.view.getFormData();
        
        if (!email || !password) {
            this.view.showError("Please enter both email and password.");
            return;
        }

        const result = await this.model.signIn(email, password);
        
        if (result.success) {
            await this.handleUserAuthenticated(email);
        } else {
            this.view.showError(result.error);
        }
    }

    async handleSignUp() {
        const { email, password } = this.view.getFormData();
        
        if (!email || !password) {
            this.view.showError("Please enter both email and password.");
            return;
        }

        const result = await this.model.signUp(email, password);
        
        if (result.success) {
            await this.handleUserAuthenticated(email);
        } else {
            this.view.showError(result.error);
        }
    }

    async handleForgotPassword() {
        const { email } = this.view.getFormData();
        
        const result = await this.model.resetPassword(email);
        
        if (result.success) {
            this.view.showSuccess(result.message);
        } else {
            this.view.showError(result.error);
        }
    }

    handleToggleMode() {
        this.view.toggleAuthMode();
    }

    handlePasswordToggle() {
        this.view.togglePasswordVisibility();
    }

    async handleUserAuthenticated(email) {
        const { redirectUrl } = await this.model.checkUserType(email);
        this.view.navigateToPage(redirectUrl);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const model = new AuthModel();
    const view = new AuthView();
    const controller = new AuthController(model, view);
});




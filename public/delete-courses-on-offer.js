class AcceptTutorModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            this.database = firebase.database();

            this.tutorsApp = firebase.initializeApp({
                apiKey: "AIzaSyBmOHv1nUeEQ9YmCQDqQnZfiwX6gr4D-zM",
                authDomain: "beapeertutor.firebaseapp.com",
                databaseURL: "https://beapeertutor-default-rtdb.firebaseio.com",
                projectId: "beapeertutor",
                storageBucket: "beapeertutor.firebasestorage.app",
                messagingSenderId: "415772611931",
                appId: "1:415772611931:web:eed767f5d2e80f60b3767e",
                measurementId: "G-89WLZ0CZMV"
            }, 'tutors');
            this.tutorsDb = this.tutorsApp.database();

        } catch (error) {
            throw new Error("Firebase initialization failed");
        }
    }

    async checkAuthStatus() {
        try {
            return new Promise((resolve) => {
                firebase.auth().onAuthStateChanged((user) => {
                    if (user && Object.values(ADMIN_EMAILS).includes(user.email)) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            return false;
        }
    }

    async endRegistration() {
        try {
            const database = this.tutorsDb;
            const coursesRef = database.ref('courses');
            await coursesRef.remove();
            return { success: true, message: "Registration ended successfully" };
        } catch (error) {
            throw new Error(`Failed to end registration: ${error.message}`);
        }
    }
}

class AcceptTutorView {
    constructor() {
        this.deleteBtn = document.getElementById('deleteBtn');
        this.statusDiv = document.getElementById('status');
    }

    bindDeleteEvent(handler) {
        this.deleteBtn.addEventListener('click', handler);
    }

    showConfirmation(message) {
        return confirm(message);
    }

    showAlert(message) {
        alert(message);
    }

    showError(message) {
        this.showAlert(`Error: ${message}`);
    }

    showSuccess(message) {
        this.showAlert(message);
    }

    updateStatus(message) {
        this.statusDiv.textContent = message;
    }

    disableButton() {
        this.deleteBtn.disabled = true;
    }

    enableButton() {
        this.deleteBtn.disabled = false;
    }
}

class AcceptTutorController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.view.bindDeleteEvent(() => this.handleDelete());
    }

    async handleDelete() {
        try {
            const isAuthenticated = await this.model.checkAuthStatus();
            if (!isAuthenticated) {
                this.view.showAlert("Access denied. You must be logged in with an authorized account to end registration.");
                return;
            }

            const confirmed = this.view.showConfirmation(
                "Are you sure you want to close tutor registration? Courses will not be available for students to register as tutors"
            );
            
            if (!confirmed) return;

            this.view.disableButton();
            this.view.updateStatus("Ending registration...");

            const result = await this.model.endRegistration();
            
            if (result.success) {
                this.view.updateStatus("Registration ended. All courses have been deleted.");
                this.view.showSuccess("Registration ended successfully!");
            }

        } catch (error) {
            this.view.updateStatus("Deletion failed. Check console.");
            this.view.showError(error.message);
            this.view.enableButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new AcceptTutorModel();
    const view = new AcceptTutorView();
    const controller = new AcceptTutorController(model, view);
});
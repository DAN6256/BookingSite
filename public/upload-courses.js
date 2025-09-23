import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

class CoursesModel {
    constructor() {
        this.coursesArray = [];
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            this.app = initializeApp(FIREBASE_CONFIG);
            this.auth = getAuth(this.app);
            
            this.coursesConfig = {
                apiKey: "AIzaSyBmOHv1nUeEQ9YmCQDqQnZfiwX6gr4D-zM",
                authDomain: "beapeertutor.firebaseapp.com",
                databaseURL: "https://beapeertutor-default-rtdb.firebaseio.com",
                projectId: "beapeertutor",
                storageBucket: "beapeertutor.firebasestorage.app",
                messagingSenderId: "415772611931",
                appId: "1:415772611931:web:eed767f5d2e80f60b3767e",
                measurementId: "G-89WLZ0CZMV"
            };
            
            this.coursesApp = initializeApp(this.coursesConfig, 'courses');
            this.db = getDatabase(this.coursesApp);
        } catch (error) {
            console.error("Initialization error:", error);
            throw new Error("Failed to initialize.");
        }
    }

    async parseExcelFile(file) {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // assume first column of each row is the course name; skip empty
            this.coursesArray = rows
                .map(r => r[0])
                .filter(name => typeof name === "string" && name.trim().length);

            return this.coursesArray;
        } catch (error) {
            console.error("Excel parsing error:", error);
            throw new Error("Failed to parse Excel file. Please check the file format.");
        }
    }

    async uploadCourses() {
        try {
            // write the array under /courses
            await set(ref(this.db, "courses"), this.coursesArray);
            return true;
        } catch (error) {
            throw new Error("Failed to upload courses to database.");
        }
    }

    async checkAuthStatus() {
        try {
            return new Promise((resolve) => {
                onAuthStateChanged(this.auth, (user) => {
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

    getCoursesCount() {
        return this.coursesArray.length;
    }
}

class CoursesView {
    constructor() {
        this.fileInput = document.getElementById("fileInput");
        this.uploadBtn = document.getElementById("uploadBtn");
        this.statusDiv = document.getElementById("status");
    }

    bindFileChangeEvent(handler) {
        this.fileInput.addEventListener("change", handler);
    }

    bindUploadEvent(handler) {
        this.uploadBtn.addEventListener("click", handler);
    }

    enableUploadButton() {
        this.uploadBtn.disabled = false;
    }

    disableUploadButton() {
        this.uploadBtn.disabled = true;
    }

    showStatus(message) {
        this.statusDiv.textContent = message;
    }

    showSuccess(message) {
        this.statusDiv.textContent = `✅ ${message}`;
    }

    showError(message) {
        this.statusDiv.textContent = `❌ ${message}`;
    }

    showAlert(message) {
        alert(message);
    }

    getSelectedFile() {
        return this.fileInput.files[0];
    }
}

class CoursesController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.view.bindFileChangeEvent((e) => this.handleFileChange(e));
        this.view.bindUploadEvent(() => this.handleUpload());
    }

    async handleFileChange(e) {
        const file = this.view.getSelectedFile();
        if (!file) return;

        try {
            const courses = await this.model.parseExcelFile(file);
            
            if (courses.length) {
                this.view.showStatus(`Found ${courses.length} courses. Ready to upload.`);
                this.view.enableUploadButton();
            } else {
                this.view.showStatus("No valid course names found in column A.");
                this.view.disableUploadButton();
            }
        } catch (error) {
            this.view.showError("Failed to parse Excel file. Please check the file format.");
            this.view.disableUploadButton();
        }
    }

    async handleUpload() {
        try {
            // Check authentication first
            const isAuthenticated = await this.model.checkAuthStatus();
            if (!isAuthenticated) {
                this.view.showAlert("Access denied. You must be logged in with an authorized account to upload courses.");
                return;
            }

            this.view.disableUploadButton();
            this.view.showStatus("Uploading…");

            await this.model.uploadCourses();
            this.view.showSuccess("Successfully uploaded courses!");
        } catch (error) {
            console.error(error);
            this.view.showError("Upload failed. Please try again.");
            this.view.enableUploadButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new CoursesModel();
    const view = new CoursesView();
    const controller = new CoursesController(model, view);
});
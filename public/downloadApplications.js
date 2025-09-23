// ==================== MODEL ====================
class TeachersModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            throw new Error("Failed to initialize Firebase. Please check your configuration.");
        }
    }

    async getTeachers() {
        try {
            const response = await fetch('https://beapeertutor-default-rtdb.firebaseio.com/teachers.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data) {
                return [];
            }

            const teachersData = [];
            
            // Process the data structure with null checks
            Object.keys(data).forEach((courseName) => {
                const courseData = data[courseName];
                
                // Skip if courseData is null or not an object
                if (!courseData || typeof courseData !== 'object') {
                    return;
                }
                
                Object.keys(courseData).forEach((teacherKey) => {
                    const teacher = courseData[teacherKey];
                    
                    if (!teacher || typeof teacher !== 'object') {
                        return;
                    }
                    
                    teachersData.push({
                        Course: courseName,
                        Name: teacher.name || '',
                        Email: teacher.email || '',
                        Major: teacher.major || '',
                        Phone: teacher.number || '',
                        status: teacher.status || '',
                        CGPA: teacher.gpa || '',
                        'Last Sem GPA': teacher.sgpa || '',
                        'Class Year': teacher.classYear || '',
                        'Available Times': (teacher.availableTimes && Array.isArray(teacher.availableTimes)) 
                            ? teacher.availableTimes.join(', ') : '',
                        'Submission Date': teacher.submissionDate 
                            ? new Date(teacher.submissionDate).toLocaleDateString() : ''
                    });
                });
            });
            
            return teachersData;
        } catch (error) {
            this.showAlert("Database error:", error);
            throw new Error(`Failed to fetch teachers data: ${error.message}`);
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
}

class TeachersView {
    constructor() {
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    bindDownloadEvent(handler) {
        this.downloadBtn.addEventListener('click', handler);
    }

    showAlert(message) {
        alert(message);
    }

    showError(message) {
        this.showAlert("Error downloading data. Please try again.");
    }

    showSuccess(message) {
        this.showAlert(message);
    }
}

class TeachersController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    init() {
        this.view.bindDownloadEvent(() => this.handleDownload());
    }

    async handleDownload() {
        try {
            // Enable authentication check using config.js
            const isAuthenticated = await this.model.checkAuthStatus();
            if (!isAuthenticated) {
                this.view.showAlert("Access denied. You must be logged in with an authorized account to download the data.");
                return;
            }

            await this.downloadExcel();
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    async downloadExcel() {
        try {
            const teachers = await this.model.getTeachers();
            const worksheet = XLSX.utils.json_to_sheet(teachers);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
            XLSX.writeFile(workbook, "Teachers_Data.xlsx");
            this.view.showSuccess("Excel file downloaded successfully!");
        } catch (error) {
            throw new Error(`Excel download failed: ${error.message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new TeachersModel();
    const view = new TeachersView();
    const controller = new TeachersController(model, view);
});
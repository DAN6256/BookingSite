class TutorModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            console.error("Initialization error:", error);
            throw new Error("Failed to initialize");
        }
    }

    async getTeachers() {
        try {
            const response = await fetch('https://beapeertutor-default-rtdb.firebaseio.com/approvedTutors.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data) {
                return [];
            }

            const teachersData = [];
            
            Object.keys(data).forEach((courseName) => {
                const courseData = data[courseName];
                
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
                        CGPA: teacher.gpa || '',
                        status: teacher.status || '',
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
            console.error("Database error:", error);
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
            console.error("Auth check error:", error);
            return false;
        }
    }
}

class TutorView {
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
        console.error(message);
        this.showAlert("Error downloading data. Please try again.");
    }

    showSuccess(message) {
        console.log(message);
    }
}

class TutorController {
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
            XLSX.writeFile(workbook, "approvedTutors.xlsx");
            this.view.showSuccess("Excel file downloaded successfully!");
        } catch (error) {
            throw new Error(`Excel download failed: ${error.message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new TutorModel();
    const view = new TutorView();
    const controller = new TutorController(model, view);
});
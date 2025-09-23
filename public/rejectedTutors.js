class RejectedTutorsModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            throw new Error("Initialization failed" );
        }
    }

    async getRejectedTutors() {
        try {
            const response = await fetch('https://beapeertutor-default-rtdb.firebaseio.com/rejectedTutors.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data) {
                console.warn("No data found at /rejectedTutors");
                return [];
            }

            const tutorsData = [];
            
            // Process the data structure with null checks
            Object.keys(data).forEach((courseName) => {
                const courseData = data[courseName];
                
                // Skip if courseData is null or not an object
                if (!courseData || typeof courseData !== 'object') {
                    return;
                }
                
                Object.keys(courseData).forEach((tutorKey) => {
                    const tutor = courseData[tutorKey];
                    
                    if (!tutor || typeof tutor !== 'object') {
                        return;
                    }
                    
                    tutorsData.push({
                        Course: courseName,
                        Name: tutor.name || '',
                        Email: tutor.email || '',
                        Major: tutor.major || '',
                        Phone: tutor.number || '',
                        CGPA: tutor.gpa || '',
                        status: tutor.status || '',
                        'Last Sem GPA': tutor.sgpa || '',
                        'Class Year': tutor.classYear || '',
                        'Available Times': (tutor.availableTimes && Array.isArray(tutor.availableTimes)) 
                            ? tutor.availableTimes.join(', ') : '',
                        'Submission Date': tutor.submissionDate 
                            ? new Date(tutor.submissionDate).toLocaleDateString() : ''
                    });
                });
            });
            
            return tutorsData;
        } catch (error) {
            alert(`Failed to fetch rejected tutors data: ${error.message}`);
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

class RejectedTutorsView {
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
        alert(message);
    }
}

class RejectedTutorsController {
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
            const tutors = await this.model.getRejectedTutors();
            const worksheet = XLSX.utils.json_to_sheet(tutors);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
            XLSX.writeFile(workbook, "rejectedTutors.xlsx");
            this.view.showSuccess("Excel file downloaded successfully!");
        } catch (error) {
            throw new Error(`Excel download failed: ${error.message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new RejectedTutorsModel();
    const view = new RejectedTutorsView();
    const controller = new RejectedTutorsController(model, view);
});
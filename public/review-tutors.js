class TutorReviewModel {
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
            console.error("Initialization error:", error);
            throw new Error("Failed to initialize.");
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

    async loadTutorApplications() {
        try {
            const snapshot = await this.tutorsDb.ref('teachers').once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error("Error loading tutor applications:", error);
            throw new Error("Failed to load tutor applications");
        }
    }

    async approveTutor(courseName, tutorId) {
        try {
            const tutorRef = this.tutorsDb.ref(`teachers/${courseName}/${tutorId}`);
            const tutorSnapshot = await tutorRef.once('value');

            if (!tutorSnapshot.exists()) {
                throw new Error('Tutor not found. They may have already been processed.');
            }

            const currentTutorData = tutorSnapshot.val();

            // Move to approved tutors
            await this.tutorsDb.ref(`approvedTutors/${courseName}/${tutorId}`).set({
                ...currentTutorData,
                status: 'approved',
                approvalDate: Date.now()
            });

            // Add to main teachers collection
            const mainTeachersRef = this.database.ref(`teachers/${courseName}`);
            const mainTeachersSnapshot = await mainTeachersRef.once('value');
            const currentTeachers = mainTeachersSnapshot.val() || [];

            const simplifiedTeacherData = {
                name: currentTutorData.name || '',
                email: currentTutorData.email || '',
                number: currentTutorData.number || '',
                availableTimes: currentTutorData.availableTimes || []
            };

            if (Array.isArray(currentTeachers)) {
                await mainTeachersRef.set([...currentTeachers, simplifiedTeacherData]);
            } else {
                const newIndex = Object.keys(currentTeachers).length;
                await mainTeachersRef.child(newIndex.toString()).set(simplifiedTeacherData);
            }

            // Remove from pending
            await tutorRef.remove();
            return true;
        } catch (error) {
            console.error("Error approving tutor:", error);
            throw error;
        }
    }

    async rejectTutor(courseName, tutorId) {
        try {
            const tutorRef = this.tutorsDb.ref(`teachers/${courseName}/${tutorId}`);
            const tutorSnapshot = await tutorRef.once('value');

            if (!tutorSnapshot.exists()) {
                throw new Error('Tutor not found. They may have already been processed.');
            }

            const currentTutorData = tutorSnapshot.val();

            // Move to rejected tutors
            await this.tutorsDb.ref(`rejectedTutors/${courseName}/${tutorId}`).set({
                ...currentTutorData,
                status: 'rejected',
                rejectionDate: Date.now()
            });

            // Remove from pending
            await tutorRef.remove();
            return true;
        } catch (error) {
            console.error("Error rejecting tutor:", error);
            throw error;
        }
    }

    async deleteTutor(courseName, tutorId) {
        try {
            const tutorRef = this.tutorsDb.ref(`teachers/${courseName}/${tutorId}`);
            const tutorSnapshot = await tutorRef.once('value');

            if (!tutorSnapshot.exists()) {
                throw new Error('Tutor not found. They may have already been deleted.');
            }

            await tutorRef.remove();
            return true;
        } catch (error) {
            console.error("Error deleting tutor:", error);
            throw error;
        }
    }
}

class TutorReviewView {
    constructor() {
        this.container = document.getElementById('coursesContainer');
    }

    showAlert(message) {
        alert(message);
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    redirectToIndex() {
        window.location.href = "index.html";
    }

    clearContainer() {
        this.container.innerHTML = '';
    }

    renderTutorApplications(courses) {
        this.clearContainer();

        Object.entries(courses).forEach(([courseName, tutors]) => {
            const courseSection = this.createCourseSection(courseName, tutors);
            this.container.appendChild(courseSection);
        });
    }

    createCourseSection(courseName, tutors) {
        const courseSection = document.createElement('div');
        courseSection.className = 'course-section';

        const tutorsArray = Object.entries(tutors).map(([index, tutor]) => ({
            ...tutor,
            id: index
        }));

        courseSection.innerHTML = `
            <h2 class="course-title">${courseName}</h2>
            <div class="tutors-grid">
                ${tutorsArray.map(tutor => this.createTutorCardHTML(tutor, courseName)).join('')}
            </div>
        `;

        return courseSection;
    }

    createTutorCardHTML(tutor, courseName) {
        return `
            <div class="tutor-card" data-tutor-id="${tutor.id}" data-course="${courseName}">
                <div style="display: flex; justify-content: space-between; align-items: center">
                    <h3>${tutor.name || 'Unnamed Tutor'}</h3>
                    ${tutor.status ? 
                        `<span class="pending-badge" style="background-color: ${tutor.status === 'approved' ? 'var(--primary-color)' : 'var(--danger-color)'}; color: white;">
                            ${tutor.status.charAt(0).toUpperCase() + tutor.status.slice(1)}
                        </span>` : 
                        '<span class="pending-badge">Pending</span>'
                    }
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span>${tutor.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Major:</span>
                    <span>${tutor.major || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span>${tutor.number || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">CGPA:</span>
                    <span>${tutor.gpa}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Sem GPA:</span>
                    <span>${tutor.sgpa}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Class Year:</span>
                    <span>${tutor.classYear}</span>
                </div>
                ${tutor.submissionDate ? `
                    <div class="info-row">
                        <span class="info-label">Submitted:</span>
                        <span>${new Date(tutor.submissionDate).toLocaleDateString()}</span>
                    </div>
                ` : ''}
                <div style="margin-top: 10px;">
                    <span class="info-label">Available Times:</span>
                    <div style="margin-top: 5px;">
                        ${(tutor.availableTimes || []).map(time => 
                            `<span class="time-tag">${time}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="button-container">
                    ${!tutor.status || tutor.status === 'pending' ? `
                        <button class="button approve-btn" data-action="approve" data-course="${courseName}" data-tutor-id="${tutor.id}">
                            Approve
                        </button>
                        <button class="button reject-btn" data-action="reject" data-course="${courseName}" data-tutor-id="${tutor.id}">
                            Reject
                        </button>
                    ` : ''}
                    <button class="button" style="background-color: #6c757d;" data-action="delete" data-course="${courseName}" data-tutor-id="${tutor.id}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    removeTutorCard(courseName, tutorId) {
        const tutorCard = document.querySelector(`[data-tutor-id="${tutorId}"][data-course="${courseName}"]`);
        if (tutorCard) {
            const courseSection = tutorCard.closest('.course-section');
            const tutorsGrid = tutorCard.closest('.tutors-grid');
            
            tutorCard.remove();
            
            // If this was the last tutor card, remove the entire course section
            if (tutorsGrid.children.length === 0) {
                courseSection.remove();
            }
        }
    }

    bindButtonEvents(handler) {
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('button[data-action]')) {
                const action = e.target.dataset.action;
                const courseName = e.target.dataset.course;
                const tutorId = e.target.dataset.tutorId;
                handler(action, courseName, tutorId);
            }
        });
    }
}

class TutorReviewController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        try {
            const isAdmin = await this.model.checkAdminAccess();
            if (isAdmin) {
                await this.loadTutorApplications();
                this.view.bindButtonEvents((action, courseName, tutorId) => 
                    this.handleButtonAction(action, courseName, tutorId)
                );
            } else {
                this.view.showAlert("Access Denied");
                this.view.redirectToIndex();
            }
        } catch (error) {
            this.view.showError("Error initializing application: " + error.message);
        }
    }

    async loadTutorApplications() {
        try {
            const courses = await this.model.loadTutorApplications();
            this.view.renderTutorApplications(courses);
        } catch (error) {
            this.view.showError('Error loading tutor applications. Please try again.');
        }
    }

    async handleButtonAction(action, courseName, tutorId) {
        try {
            switch (action) {
                case 'approve':
                    await this.model.approveTutor(courseName, tutorId);
                    this.view.removeTutorCard(courseName, tutorId);
                    this.view.showAlert("Tutor successfully approved");
                    break;
                    
                case 'reject':
                    await this.model.rejectTutor(courseName, tutorId);
                    this.view.removeTutorCard(courseName, tutorId);
                    this.view.showAlert('Tutor successfully rejected');
                    break;
                    
                case 'delete':
                    const confirmDelete = confirm(`Are you sure you want to delete this tutor application for ${courseName}?`);
                    if (confirmDelete) {
                        await this.model.deleteTutor(courseName, tutorId);
                        this.view.removeTutorCard(courseName, tutorId);
                    }
                    break;
                    
                default:
                    console.warn('Unknown action:', action);
            }
        } catch (error) {
            this.view.showError(error.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new TutorReviewModel();
    const view = new TutorReviewView();
    const controller = new TutorReviewController(model, view);
});
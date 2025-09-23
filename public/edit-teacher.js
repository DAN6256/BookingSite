// Model
class TeacherProfileModel {
    constructor() {
        this.initializeFirebase();
        this.teacherData = {};
        this.currentTeacherData = null;
        this.currentCourse = null;
        this.currentIndex = null;
    }

    async initializeFirebase() {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js");
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js");
        const { getDatabase, ref, get, update } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-database.js");

        this.app = initializeApp(FIREBASE_CONFIG);
        this.auth = getAuth(this.app);
        this.db = getDatabase(this.app);
        this.firebaseRefs = { ref, get, update };
    }

    async loadTeacherCourses() {
        const user = this.auth.currentUser;
        if (!user) return null;

        const teacherEmail = user.email;
        const snapshot = await this.firebaseRefs.get(this.firebaseRefs.ref(this.db, "teachers"));
        const courses = snapshot.val();

        this.teacherData = {};
        const teacherCourses = [];

        Object.entries(courses).forEach(([course, teachers]) => {
            const teacherIndex = teachers.findIndex(t => t.email === teacherEmail);
            if (teacherIndex !== -1) {
                this.teacherData[course] = teachers;
                const teacher = teachers[teacherIndex];
                teacherCourses.push({
                    course,
                    teacher,
                    teacherIndex
                });
            }
        });

        return teacherCourses;
    }

    async saveTeacherChanges(phone, availableTimes) {
        if (!phone || availableTimes.length === 0) {
            throw new Error("Please fill in all fields and add at least one available time");
        }

        const updates = {};
        const teacherRef = `teachers/${this.currentCourse}/${this.currentIndex}`;
        updates[`${teacherRef}/number`] = phone;
        updates[`${teacherRef}/availableTimes`] = availableTimes;

        await this.firebaseRefs.update(this.firebaseRefs.ref(this.db), updates);
    }

    setCurrentTeacher(course, teacherIndex) {
        this.currentCourse = course;
        this.currentIndex = teacherIndex;
        this.currentTeacherData = this.teacherData[course][teacherIndex];
        return this.currentTeacherData;
    }

    clearCurrentTeacher() {
        this.currentTeacherData = null;
        this.currentCourse = null;
        this.currentIndex = null;
    }

    onAuthStateChanged(callback) {
        const { onAuthStateChanged } = this.firebaseRefs || {};
        if (onAuthStateChanged) {
            return onAuthStateChanged(this.auth, callback);
        }
    }
}

// View
class TeacherProfileView {
    constructor() {
        this.coursesContainer = document.getElementById('coursesContainer');
        this.editModal = document.getElementById('editModal');
        this.editPhone = document.getElementById('editPhone');
        this.daySelect = document.getElementById('daySelect');
        this.timeSelect = document.getElementById('timeSelect');
        this.addTimeBtn = document.getElementById('addTimeBtn');
        this.timesList = document.getElementById('timesList');
        this.saveChangesBtn = document.getElementById('saveChangesBtn');
        this.closeBtn = document.querySelector('.close');
        
        this.selectedTimes = [];
    }

    renderTeacherCourses(teacherCourses) {
        this.coursesContainer.innerHTML = "";

        teacherCourses.forEach(({ course, teacher, teacherIndex }) => {
            const card = document.createElement("div");
            card.className = "course-card";
            card.innerHTML = `
                <h2 class="course-title">${course}</h2>
                <div class="teacher-info">
                    <p><strong>Name:</strong> ${teacher.name}</p>
                    <p><strong>Email:</strong> ${teacher.email}</p>
                    <p><strong>Phone:</strong> ${teacher.number}</p>
                    <div>
                        <strong>Available Times:</strong><br>
                        ${teacher.availableTimes
                            .map(time => `<span class="time-tag">${time}</span>`)
                            .join("")}
                    </div>
                </div>
                <button class="edit-btn" data-course="${course}" data-index="${teacherIndex}">
                    Edit Profile
                </button>
            `;
            this.coursesContainer.appendChild(card);
        });
    }

    showEditModal(teacherData) {
        this.editPhone.value = teacherData.number;
        this.selectedTimes = [...teacherData.availableTimes];
        this.updateTimesList();
        this.editModal.style.display = "block";
    }

    hideEditModal() {
        this.editModal.style.display = "none";
        this.selectedTimes = [];
    }

    addTime() {
        const day = this.daySelect.value;
        const time = this.timeSelect.value;
        const timeString = `${day}-${time}`;

        if (!this.selectedTimes.includes(timeString)) {
            this.selectedTimes.push(timeString);
            this.updateTimesList();
        }
    }

    updateTimesList() {
        this.timesList.innerHTML = this.selectedTimes
            .map(time => `
                <span class="time-tag">
                    ${time}
                    <button data-time="${time}" style="border: none; background: none; cursor: pointer;">&times;</button>
                </span>
            `)
            .join("");
    }

    removeTime(time) {
        this.selectedTimes = this.selectedTimes.filter(t => t !== time);
        this.updateTimesList();
    }

    getFormData() {
        return {
            phone: this.editPhone.value,
            availableTimes: this.selectedTimes
        };
    }

    showAlert(message) {
        alert(message);
    }

    bindEditButtonClick(handler) {
        this.coursesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const course = e.target.dataset.course;
                const index = parseInt(e.target.dataset.index);
                handler(course, index);
            }
        });
    }

    bindAddTimeClick(handler) {
        this.addTimeBtn.addEventListener('click', handler);
    }

    bindRemoveTimeClick(handler) {
        this.timesList.addEventListener('click', (e) => {
            if (e.target.dataset.time) {
                handler(e.target.dataset.time);
            }
        });
    }

    bindSaveChangesClick(handler) {
        this.saveChangesBtn.addEventListener('click', handler);
    }

    bindCloseModal(handler) {
        this.closeBtn.addEventListener('click', handler);
        
        window.addEventListener('click', (event) => {
            if (event.target === this.editModal) {
                handler();
            }
        });
    }
}

// Controller
class TeacherProfileController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        await this.model.initializeFirebase();
        this.bindEvents();
        this.handleAuthStateChange();
    }

    bindEvents() {
        this.view.bindEditButtonClick((course, index) => this.handleEditTeacher(course, index));
        this.view.bindAddTimeClick(() => this.handleAddTime());
        this.view.bindRemoveTimeClick((time) => this.handleRemoveTime(time));
        this.view.bindSaveChangesClick(() => this.handleSaveChanges());
        this.view.bindCloseModal(() => this.handleCloseModal());
    }

    handleAuthStateChange() {
        const { onAuthStateChanged } = this.model.auth ? { onAuthStateChanged: (auth, callback) => {
            import("https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js").then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, callback);
            });
        }} : {};

        if (onAuthStateChanged) {
            onAuthStateChanged(this.model.auth, (user) => {
                if (user) {
                    this.loadTeacherCourses();
                } else {
                    window.location.href = "index.html";
                }
            });
        }
    }

    async loadTeacherCourses() {
        try {
            const teacherCourses = await this.model.loadTeacherCourses();
            if (teacherCourses) {
                this.view.renderTeacherCourses(teacherCourses);
            }
        } catch (error) {
            this.view.showAlert("Error loading teacher courses: " + error.message);
        }
    }

    handleEditTeacher(course, teacherIndex) {
        const teacherData = this.model.setCurrentTeacher(course, teacherIndex);
        this.view.showEditModal(teacherData);
    }

    handleAddTime() {
        this.view.addTime();
    }

    handleRemoveTime(time) {
        this.view.removeTime(time);
    }

    async handleSaveChanges() {
        try {
            const { phone, availableTimes } = this.view.getFormData();
            await this.model.saveTeacherChanges(phone, availableTimes);
            this.handleCloseModal();
            this.loadTeacherCourses();
        } catch (error) {
            this.view.showAlert("Error updating profile: " + error.message);
        }
    }

    handleCloseModal() {
        this.view.hideEditModal();
        this.model.clearCurrentTeacher();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const model = new TeacherProfileModel();
    const view = new TeacherProfileView();
    const controller = new TeacherProfileController(model, view);
});
// Model - ManageCoursesModel
class ManageCoursesModel {
    constructor() {
        this.database = null;
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            this.database = firebase.database();
        } catch (error) {
            throw new Error("Firebase initialization failed");
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

    async testDatabaseConnection() {
        try {
            const connectedRef = this.database.ref(".info/connected");
            connectedRef.on("value", (snap) => {
                if (snap.val() === true) {
                    console.log("Connected to Firebase");
                } else {
                    console.log("Not connected to Firebase");
                }
            });
        } catch (error) {
            console.error("Database connection test failed:", error);
        }
    }

    // Class management
    async getClasses() {
        try {
            const snapshot = await this.database.ref("classes").once("value");
            return snapshot.val() || [];
        } catch (error) {
            throw new Error(`Failed to load classes: ${error.message}`);
        }
    }

    async addClass(className) {
        try {
            const classesRef = this.database.ref("classes");
            const snapshot = await classesRef.once("value");
            const existingClasses = snapshot.val() || [];
            
            if (existingClasses.includes(className)) {
                throw new Error("This class already exists!");
            }
            
            existingClasses.push(className);
            await classesRef.set(existingClasses);
            return existingClasses;
        } catch (error) {
            throw new Error(`Failed to add class: ${error.message}`);
        }
    }

    async deleteClass(index) {
        try {
            const classesRef = this.database.ref("classes");
            const snapshot = await classesRef.once("value");
            let classes = snapshot.val() || [];
            classes.splice(index, 1);
            await classesRef.set(classes);
            return classes;
        } catch (error) {
            throw new Error(`Failed to delete class: ${error.message}`);
        }
    }

    // Course management
    async getCourses() {
        try {
            const snapshot = await this.database.ref("teachers").once("value");
            return snapshot.val() || {};
        } catch (error) {
            throw new Error(`Failed to load courses: ${error.message}`);
        }
    }

    async addCourse(courseName) {
        try {
            const coursesRef = this.database.ref("teachers/" + courseName);
            
            // Check if course already exists
            const snapshot = await coursesRef.once("value");
            if (snapshot.exists()) {
                throw new Error("This course already exists!");
            }

            // Initialize the course with placeholder teacher data
            await coursesRef.set({
                0: {
                    name: "Placeholder Teacher",
                    email: "placeholder@example.com",
                    number: "0000000000",
                    availableTimes: ["To be determined"],
                },
            });

            // Verify the course was added
            const verifySnapshot = await coursesRef.once("value");
            if (!verifySnapshot.exists()) {
                throw new Error("Failed to verify course creation");
            }

            return true;
        } catch (error) {
            throw new Error(`Failed to add course: ${error.message}`);
        }
    }

    async deleteCourse(course) {
        try {
            await this.database.ref(`teachers/${course}`).remove();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete course: ${error.message}`);
        }
    }

    // Teacher management
    async addTeacher(course, teacher) {
        try {
            const snapshot = await this.database.ref(`teachers/${course}`).once("value");
            const teachers = snapshot.val() || [];
            teachers.push(teacher);
            await this.database.ref(`teachers/${course}`).set(teachers);
            return true;
        } catch (error) {
            throw new Error(`Failed to add teacher: ${error.message}`);
        }
    }

    async updateTeacher(course, index, updatedTeacher) {
        try {
            const snapshot = await this.database.ref(`teachers/${course}`).once("value");
            const teachers = snapshot.val() || [];
            teachers[index] = updatedTeacher;
            await this.database.ref(`teachers/${course}`).set(teachers);
            return true;
        } catch (error) {
            throw new Error(`Failed to update teacher: ${error.message}`);
        }
    }

    async deleteTeacher(course, index) {
        try {
            const snapshot = await this.database.ref(`teachers/${course}`).once("value");
            const teachers = snapshot.val() || [];
            teachers.splice(index, 1);
            await this.database.ref(`teachers/${course}`).set(teachers);
            return true;
        } catch (error) {
            throw new Error(`Failed to delete teacher: ${error.message}`);
        }
    }
}

// View - ManageCoursesView
class ManageCoursesView {
    constructor() {
        this.initializeElements();
        this.selectedTimes = [];
        this.editSelectedTimes = [];
    }

    initializeElements() {
        // Class management elements
        this.newClassNameInput = document.getElementById("newClassName");
        this.addClassBtn = document.getElementById("addClassBtn");
        this.classList = document.getElementById("classList");

        // Course management elements
        this.newCourseNameInput = document.getElementById("newCourseName");
        this.addCourseBtn = document.getElementById("addCourseBtn");
        this.courseSelect = document.getElementById("courseSelect");
        this.coursesList = document.getElementById("coursesList");

        // Teacher management elements
        this.teacherNameInput = document.getElementById("teacherName");
        this.teacherEmailInput = document.getElementById("teacherEmail");
        this.teacherNumberInput = document.getElementById("teacherNumber");
        this.daySelect = document.getElementById("daySelect");
        this.timeSelect = document.getElementById("timeSelect");
        this.addTimeBtn = document.getElementById("addTimeBtn");
        this.timesList = document.getElementById("timesList");
        this.addTeacherBtn = document.getElementById("addTeacherBtn");

        // Modal elements
        this.editModal = document.getElementById("editModal");
        this.closeModalBtn = document.getElementById("closeModalBtn");
        this.editTeacherNameInput = document.getElementById("editTeacherName");
        this.editTeacherEmailInput = document.getElementById("editTeacherEmail");
        this.editTeacherNumberInput = document.getElementById("editTeacherNumber");
        this.editDaySelect = document.getElementById("editDaySelect");
        this.editTimeSelect = document.getElementById("editTimeSelect");
        this.addEditTimeBtn = document.getElementById("addEditTimeBtn");
        this.editTimesList = document.getElementById("editTimesList");
        this.saveTeacherBtn = document.getElementById("saveTeacherBtn");
    }

    // Event binding methods
    bindAddClass(handler) {
        this.addClassBtn.addEventListener('click', handler);
    }

    bindAddCourse(handler) {
        this.addCourseBtn.addEventListener('click', handler);
    }

    bindAddTeacher(handler) {
        this.addTeacherBtn.addEventListener('click', handler);
    }

    bindAddTime(handler) {
        this.addTimeBtn.addEventListener('click', handler);
    }

    bindAddEditTime(handler) {
        this.addEditTimeBtn.addEventListener('click', handler);
    }

    bindSaveTeacher(handler) {
        this.saveTeacherBtn.addEventListener('click', handler);
    }

    bindCloseModal(handler) {
        this.closeModalBtn.addEventListener('click', handler);
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.editModal) {
                handler();
            }
        });
    }

    // Display methods
    showAlert(message) {
        alert(message);
    }

    showError(message) {
        this.showAlert(`Error: ${message}`);
    }

    showSuccess(message) {
        this.showAlert(message);
    }

    displayClasses(classes) {
        this.classList.innerHTML = "";
        classes.forEach((cls, index) => {
            const classDiv = document.createElement("div");
            classDiv.className = "class-card";
            classDiv.innerHTML = `
                <span>${cls}</span>
                <button class="button button-danger delete-class-btn" data-class-index="${index}">Delete</button>
            `;
            this.classList.appendChild(classDiv);
        });
    }

    updateCourseSelect(courses) {
        this.courseSelect.innerHTML = "";
        Object.keys(courses).forEach((course) => {
            const option = document.createElement("option");
            option.value = course;
            option.textContent = course;
            this.courseSelect.appendChild(option);
        });
    }

    displayCourses(courses) {
        this.coursesList.innerHTML = "";
        Object.entries(courses).forEach(([course, teachers]) => {
            const courseDiv = document.createElement("div");
            courseDiv.className = "course-card";
            courseDiv.innerHTML = `
                <h3>${course}</h3>
                <button class="button button-danger delete-course-btn" data-course="${course}">Delete Course</button>
                <div class="teachers-grid">
                    ${Array.isArray(teachers) ? teachers.map((teacher, index) => `
                        <div class="teacher-card">
                            <h4>${teacher.name}</h4>
                            <p>Email: ${teacher.email}</p>
                            <p>Phone: ${teacher.number}</p>
                            <div>
                                ${teacher.availableTimes.map(time => `
                                    <span class="time-tag">${time}</span>
                                `).join("")}
                            </div>
                            <button class="button edit-teacher-btn" data-edit-teacher='${JSON.stringify(teacher)}' data-course="${course}" data-index="${index}">Edit</button>
                            <button class="button button-danger delete-teacher-btn" data-delete-teacher="${course}" data-teacher-index="${index}">Delete</button>
                        </div>
                    `).join("") : ""}
                </div>
            `;
            this.coursesList.appendChild(courseDiv);
        });
    }

    updateTimesList() {
        this.timesList.innerHTML = this.selectedTimes
            .map(time => `
                <span class="time-tag">
                    ${time}
                    <button class="remove-time-btn" data-remove-time="${time}" style="border: none; background: none; cursor: pointer; margin-left: 5px;">&times;</button>
                </span>
            `).join("");
    }

    updateEditTimesList() {
        this.editTimesList.innerHTML = this.editSelectedTimes
            .map(time => `
                <span class="time-tag">
                    ${time}
                    <button class="remove-edit-time-btn" data-remove-edit-time="${time}" style="border: none; background: none; cursor: pointer; margin-left: 5px;">&times;</button>
                </span>
            `).join("");
    }

    // Form methods
    getNewClassName() {
        return this.newClassNameInput.value.trim();
    }

    clearNewClassName() {
        this.newClassNameInput.value = "";
    }

    getNewCourseName() {
        return this.newCourseNameInput.value.trim();
    }

    clearNewCourseName() {
        this.newCourseNameInput.value = "";
    }

    getTeacherFormData() {
        return {
            course: this.courseSelect.value,
            name: this.teacherNameInput.value.trim(),
            email: this.teacherEmailInput.value.trim(),
            number: this.teacherNumberInput.value.trim(),
            availableTimes: [...this.selectedTimes]
        };
    }

    clearTeacherForm() {
        this.teacherNameInput.value = "";
        this.teacherEmailInput.value = "";
        this.teacherNumberInput.value = "";
        this.selectedTimes = [];
        this.updateTimesList();
    }

    getSelectedTime() {
        const day = this.daySelect.value;
        const time = this.timeSelect.value;
        return `${day}-${time}`;
    }

    getSelectedEditTime() {
        const day = this.editDaySelect.value;
        const time = this.editTimeSelect.value;
        return `${day}-${time}`;
    }

    // Modal methods
    showModal(teacher) {
        this.editTeacherNameInput.value = teacher.name;
        this.editTeacherEmailInput.value = teacher.email;
        this.editTeacherNumberInput.value = teacher.number;
        this.editSelectedTimes = [...teacher.availableTimes];
        this.updateEditTimesList();
        this.editModal.style.display = "block";
        this.editModal.scrollTop = 0;
    }

    hideModal() {
        this.editModal.style.display = "none";
        this.editSelectedTimes = [];
    }

    getEditTeacherFormData() {
        return {
            name: this.editTeacherNameInput.value.trim(),
            email: this.editTeacherEmailInput.value.trim(),
            number: this.editTeacherNumberInput.value.trim(),
            availableTimes: [...this.editSelectedTimes]
        };
    }
}

// Controller - ManageCoursesController
class ManageCoursesController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentEditingTeacher = null;
        this.currentEditingCourse = null;
        this.init();
    }

    async init() {
        try {
            await this.model.testDatabaseConnection();
            const isAdmin = await this.model.checkAdminAccess();
            
            if (!isAdmin) {
                this.view.showAlert("Access Denied");
                window.location.href = "index.html";
                return;
            }

            this.bindEvents();
            await this.loadClasses();
            await this.loadCourses();
        } catch (error) {
            this.view.showError("Error initializing application: " + error.message);
        }
    }

    bindEvents() {
        this.view.bindAddClass(() => this.handleAddClass());
        this.view.bindAddCourse(() => this.handleAddCourse());
        this.view.bindAddTeacher(() => this.handleAddTeacher());
        this.view.bindAddTime(() => this.handleAddTime());
        this.view.bindAddEditTime(() => this.handleAddEditTime());
        this.view.bindSaveTeacher(() => this.handleSaveTeacher());
        this.view.bindCloseModal(() => this.handleCloseModal());

        // Event delegation for dynamically created elements using specific class names
        document.addEventListener('click', (e) => {
            // Delete class
            if (e.target.classList.contains('delete-class-btn')) {
                const index = parseInt(e.target.getAttribute('data-class-index'));
                this.handleDeleteClass(index);
            }
            // Delete course
            else if (e.target.classList.contains('delete-course-btn')) {
                const course = e.target.getAttribute('data-course');
                this.handleDeleteCourse(course);
            }
            // Edit teacher
            else if (e.target.classList.contains('edit-teacher-btn')) {
                this.handleEditTeacher(e.target);
            }
            // Delete teacher
            else if (e.target.classList.contains('delete-teacher-btn')) {
                this.handleDeleteTeacher(e.target);
            }
            // Remove time
            else if (e.target.classList.contains('remove-time-btn')) {
                const time = e.target.getAttribute('data-remove-time');
                this.handleRemoveTime(time);
            }
            // Remove edit time
            else if (e.target.classList.contains('remove-edit-time-btn')) {
                const time = e.target.getAttribute('data-remove-edit-time');
                this.handleRemoveEditTime(time);
            }
        });
    }

    // Class management handlers
    async handleAddClass() {
        try {
            const className = this.view.getNewClassName();
            if (!className) {
                this.view.showAlert("Please enter a class year");
                return;
            }
            await this.model.addClass(className);
            this.view.clearNewClassName();
            await this.loadClasses();
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    async handleDeleteClass(index) {
        try {
            await this.model.deleteClass(index);
            await this.loadClasses();
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    async loadClasses() {
        try {
            const classes = await this.model.getClasses();
            this.view.displayClasses(classes);
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    // Course management handlers
    async handleAddCourse() {
        try {
            const courseName = this.view.getNewCourseName();
            if (!courseName) {
                this.view.showAlert("Please enter a course name");
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                this.view.showAlert("You must be logged in to add a course");
                return;
            }

            await this.model.addCourse(courseName);
            this.view.clearNewCourseName();
            await this.loadCourses();
            this.view.showSuccess("Course added successfully with placeholder teacher data!");
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    async handleDeleteCourse(course) {
        if (confirm(`Are you sure you want to delete ${course}?`)) {
            try {
                await this.model.deleteCourse(course);
                await this.loadCourses();
            } catch (error) {
                this.view.showError(error.message);
            }
        }
    }

    async loadCourses() {
        try {
            const courses = await this.model.getCourses();
            this.view.updateCourseSelect(courses);
            this.view.displayCourses(courses);
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    // Teacher management handlers
    async handleAddTeacher() {
        try {
            const formData = this.view.getTeacherFormData();
            
            if (!formData.name || !formData.email || !formData.number || formData.availableTimes.length === 0) {
                this.view.showAlert("Please fill in all fields and add at least one available time");
                return;
            }

            const newTeacher = {
                name: formData.name,
                email: formData.email,
                number: formData.number,
                availableTimes: formData.availableTimes,
            };

            await this.model.addTeacher(formData.course, newTeacher);
            this.view.clearTeacherForm();
            await this.loadCourses();
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    handleEditTeacher(element) {
        try {
            const teacher = JSON.parse(element.getAttribute('data-edit-teacher'));
            const course = element.getAttribute('data-course');
            const index = parseInt(element.getAttribute('data-index'));

            this.currentEditingTeacher = index;
            this.currentEditingCourse = course;
            this.view.showModal(teacher);
        } catch (error) {
            this.view.showError("Error opening edit modal");
        }
    }

    async handleDeleteTeacher(element) {
        const course = element.getAttribute('data-delete-teacher');
        const index = parseInt(element.getAttribute('data-teacher-index'));

        if (confirm("Are you sure you want to delete this teacher?")) {
            try {
                await this.model.deleteTeacher(course, index);
                await this.loadCourses();
            } catch (error) {
                this.view.showError(error.message);
            }
        }
    }

    async handleSaveTeacher() {
        if (this.currentEditingTeacher === null || !this.currentEditingCourse) {
            this.view.showAlert("Invalid edit state");
            return;
        }

        try {
            const formData = this.view.getEditTeacherFormData();
            
            if (!formData.name || !formData.email || !formData.number || formData.availableTimes.length === 0) {
                this.view.showAlert("Please fill in all fields and add at least one available time");
                return;
            }

            await this.model.updateTeacher(this.currentEditingCourse, this.currentEditingTeacher, formData);
            this.handleCloseModal();
            await this.loadCourses();
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    // Time management handlers
    handleAddTime() {
        const timeString = this.view.getSelectedTime();
        if (!this.view.selectedTimes.includes(timeString)) {
            this.view.selectedTimes.push(timeString);
            this.view.updateTimesList();
        }
    }

    handleRemoveTime(time) {
        this.view.selectedTimes = this.view.selectedTimes.filter(t => t !== time);
        this.view.updateTimesList();
    }

    handleAddEditTime() {
        const timeString = this.view.getSelectedEditTime();
        if (!this.view.editSelectedTimes.includes(timeString)) {
            this.view.editSelectedTimes.push(timeString);
            this.view.updateEditTimesList();
        }
    }

    handleRemoveEditTime(time) {
        this.view.editSelectedTimes = this.view.editSelectedTimes.filter(t => t !== time);
        this.view.updateEditTimesList();
    }

    // Modal handlers
    handleCloseModal() {
        this.view.hideModal();
        this.currentEditingTeacher = null;
        this.currentEditingCourse = null;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const model = new ManageCoursesModel();
    const view = new ManageCoursesView();
    const controller = new ManageCoursesController(model, view);
});
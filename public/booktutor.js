import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    set,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";

class BookingModel {
    constructor() {
        this.app = initializeApp(FIREBASE_CONFIG);
        this.db = getDatabase(this.app);
        this.auth = getAuth(this.app);
        this.teachers = {};
        this.bookedTimes = {};
        this.apiBaseUrl = 'https://emailserver-4gcn.onrender.com';
        this.apiEndpoints = {
            sendBookingConfirmation: `${this.apiBaseUrl}/api/send-booking-confirmation`,
            testEmail: `${this.apiBaseUrl}/api/test-email`
        };
    }

    async fetchTeachersData() {
        try {
            const snapshot = await get(ref(this.db, "/teachers"));
            if (snapshot.exists()) {
                this.teachers = snapshot.val();
                return this.teachers;
            } else {
                console.error("No data available");
                return {};
            }
        } catch (error) {
            console.error("Error fetching teachers:", error);
            throw error;
        }
    }

    async fetchBookings() {
        const user = this.auth.currentUser;
        if (!user) {
            return;
        }

        try {
            const bookingsRef = ref(this.db, "bookings");
            const snapshot = await get(bookingsRef);

            if (snapshot.exists()) {
                this.bookedTimes = {};
                snapshot.forEach((childSnapshot) => {
                    const userBookings = childSnapshot.val();
                    Object.keys(userBookings).forEach((bookingKey) => {
                        const booking = userBookings[bookingKey];
                        const teacher = booking.teacher;
                        const time = booking.time;

                        if (!this.bookedTimes[teacher]) {
                            this.bookedTimes[teacher] = [];
                        }
                        this.bookedTimes[teacher].push(time);
                    });
                });
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
    }

    async saveBooking(bookingData) {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error("User not authenticated");
        }

        const bookingId = `bookingId_${user.uid}_${new Date()
            .toISOString()
            .replace(/[^\w\s]/gi, "")}`;

        await set(ref(this.db, "bookings/" + user.uid + "/" + bookingId), {
            subject: bookingData.subject,
            userEmail: bookingData.userEmail,
            teacher: bookingData.teacherName,
            time: bookingData.selectedTime,
            topic: bookingData.topic,
            teacherEmail: bookingData.teacherEmail,
            class: bookingData.userClass,
        });

        // Update local booked times
        if (!this.bookedTimes[bookingData.teacherName]) {
            this.bookedTimes[bookingData.teacherName] = [];
        }
        this.bookedTimes[bookingData.teacherName].push(bookingData.selectedTime);
    }

    // Send booking confirmation email
    async sendBookingConfirmationEmail(bookingData) {
        try {
            const response = await fetch(this.apiEndpoints.sendBookingConfirmation, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_email: bookingData.student_email,
                    student_name: bookingData.student_name,
                    tutor_email: bookingData.tutor_email,
                    tutor_name: bookingData.tutor_name,
                    tutor_number: bookingData.tutor_number,
                    subject: bookingData.subject,
                    topic: bookingData.topic,
                    selected_time: bookingData.selected_time
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error('Error sending booking confirmation:', error);
            throw error;
        }
    }

    // Test API connection
    async testAPIConnection() {
        try {
            const response = await fetch(this.apiEndpoints.testEmail);
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API connection failed:', error);
            throw error;
        }
    }

    // Get current user
    getCurrentUser() {
        return this.auth.currentUser;
    }

    // Get teachers for a specific subject
    getTeachersForSubject(subject) {
        return this.teachers[subject] || [];
    }

    // Get teacher by name and subject
    getTeacher(subject, teacherName) {
        const subjectTeachers = this.getTeachersForSubject(subject);
        return subjectTeachers.find(t => t.name === teacherName);
    }

    // Check if time is booked
    isTimeBooked(teacherName, time) {
        return this.bookedTimes[teacherName] && 
               this.bookedTimes[teacherName].includes(time);
    }
}

class BookingView {
    constructor() {
        this.elements = {
            subject: document.getElementById("subject"),
            teacher: document.getElementById("teacher"),
            time: document.getElementById("time"),
            topic: document.getElementById("topic"),
            userClass: document.getElementById("userClass"),
            bookButton: document.querySelector('button[onclick*="bookSession"]'),
            container: document.querySelector('.container'),
            messageDiv: document.getElementById('message')
        };
    }

    // Populate courses dropdown
    populateCourses(courses) {
        this.elements.subject.innerHTML = '<option value="">--Select Course--</option>';
        courses.sort();
        courses.forEach((course) => {
            const option = document.createElement("option");
            option.value = course;
            option.textContent = course;
            this.elements.subject.appendChild(option);
        });
    }

    // Populate teachers dropdown
    populateTeachers(teachers) {
        this.elements.teacher.innerHTML = "";
        teachers.forEach((teacher) => {
            const option = document.createElement("option");
            option.value = teacher.name;
            option.textContent = teacher.name;
            this.elements.teacher.appendChild(option);
        });
    }

    // Populate available times dropdown
    populateAvailableTimes(times) {
        this.elements.time.innerHTML = "";
        times.forEach((time) => {
            const option = document.createElement("option");
            option.value = time;
            option.textContent = time;
            this.elements.time.appendChild(option);
        });
    }

    // Populate class years dropdown
    populateClassYears() {
        const currentYear = new Date().getFullYear();
        this.elements.userClass.innerHTML = '<option value="">--Select Class--</option>';

        for (let i = 0; i < 5; i++) {
            const year = currentYear + i;
            const option = document.createElement("option");
            option.value = year.toString();
            option.textContent = year.toString();
            this.elements.userClass.appendChild(option);
        }
    }

    // Show loading state
    setLoading(isLoading) {
        if (isLoading) {
            this.elements.bookButton.disabled = true;
            this.elements.bookButton.textContent = 'Booking...';
            this.elements.container.classList.add('loading');
        } else {
            this.elements.bookButton.disabled = false;
            this.elements.bookButton.textContent = 'Book';
            this.elements.container.classList.remove('loading');
        }
    }

    // Show message to user
    showMessage(message, isError = false) {
        if (!this.elements.messageDiv) {
            const msgDiv = document.createElement('div');
            msgDiv.id = 'message';
            msgDiv.className = isError ? 'error-message' : 'success-message';
            msgDiv.textContent = message;
            document.querySelector('.column:nth-child(2)').appendChild(msgDiv);
            
            setTimeout(() => {
                msgDiv.remove();
            }, 5000);
        } else {
            this.elements.messageDiv.className = isError ? 'error-message' : 'success-message';
            this.elements.messageDiv.textContent = message;
        }
    }

    // Get form values
    getFormValues() {
        return {
            subject: this.elements.subject.value,
            teacherName: this.elements.teacher.value,
            selectedTime: this.elements.time.value,
            topic: this.elements.topic.value,
            userClass: this.elements.userClass.value
        };
    }

    // Reset form
    resetForm() {
        this.elements.subject.value = "";
        this.elements.teacher.innerHTML = "";
        this.elements.time.innerHTML = "";
        this.elements.topic.value = "";
        this.elements.userClass.value = "";
    }

    // Get selected subject
    getSelectedSubject() {
        return this.elements.subject.value;
    }

    // Get selected teacher
    getSelectedTeacher() {
        return this.elements.teacher.value;
    }
}


class BookingController {
    constructor() {
        this.model = new BookingModel();
        this.view = new BookingView();
        this.init();
    }

    // Initialize the application
    async init() {
        try {
            await this.model.fetchTeachersData();
            await this.populateCourses();
            this.view.populateClassYears();
            await this.model.fetchBookings();
            await this.testAPIConnection();
        } catch (error) {
            console.error("Error initializing application:", error);
            this.view.showMessage("Error loading application data", true);
        }
    }

    // Populate courses dropdown
    async populateCourses() {
        try {
            const courses = Object.keys(this.model.teachers);
            this.view.populateCourses(courses);
        } catch (error) {
            console.error("Error populating courses:", error);
            this.view.showMessage("Error loading courses", true);
        }
    }

    // Populate teachers based on selected subject
    populateTeachers() {
        const selectedSubject = this.view.getSelectedSubject();
        const teachers = this.model.getTeachersForSubject(selectedSubject);
        this.view.populateTeachers(teachers);
        this.populateAvailableTimes();
    }

    // Generate weekly availability for a teacher
    generateWeeklyAvailability(availableTimes, teacherName) {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const weeklyTimes = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });

            if (date >= currentDate) {
                availableTimes.forEach((time) => {
                    if (time.startsWith(dayOfWeek)) {
                        const timeStr = time.split("-")[1];
                        const monthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", 
                                           "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
                        const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                        const fullDateTime = `${formattedDate} - ${timeStr}`;

                        if (!this.model.isTimeBooked(teacherName, fullDateTime)) {
                            weeklyTimes.push(fullDateTime);
                        }
                    }
                });
            }
        }

        return weeklyTimes;
    }

    // Populate available times based on selected teacher
    async populateAvailableTimes() {
        const selectedTeacher = this.view.getSelectedTeacher();
        const selectedSubject = this.view.getSelectedSubject();
        const teacher = this.model.getTeacher(selectedSubject, selectedTeacher);

        if (teacher) {
            await this.model.fetchBookings();
            const availableTimes = this.generateWeeklyAvailability(
                teacher.availableTimes,
                selectedTeacher
            );
            this.view.populateAvailableTimes(availableTimes);
        }
    }

    // Format date time for API
    formatDateTimeForAPI(selectedTime) {
        try {
            const [dateStr, timeStr] = selectedTime.split(" - ");
            const dateParts = dateStr.trim().split(/[\s,]+/);
            
            if (dateParts.length < 3) {
                throw new Error("Invalid date format");
            }
            
            const monthStr = dateParts[0].replace('.', '');
            const day = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames.findIndex(m => m === monthStr);
            
            if (month === -1) {
                throw new Error("Invalid month name");
            }
            
            const timeMatch = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!timeMatch) {
                throw new Error("Invalid time format");
            }
            
            const [, hours, minutes, period] = timeMatch;
            let hour = parseInt(hours);
            
            if (period.toUpperCase() === "PM" && hour !== 12) {
                hour += 12;
            } else if (period.toUpperCase() === "AM" && hour === 12) {
                hour = 0;
            }
            
            const date = new Date(year, month, day, hour, parseInt(minutes));
            
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date created");
            }
            
            return date.toISOString();
        } catch (error) {
            console.error("Error formatting date:", error, "Input:", selectedTime);
            const fallbackDate = new Date();
            fallbackDate.setHours(fallbackDate.getHours() + 1);
            return fallbackDate.toISOString();
        }
    }

    // Book a session
    /*
    async bookSession() {
        const user = this.model.getCurrentUser();
        
        if (!user) {
            this.view.showMessage("You must be logged in to book a session.", true);
            return;
        }

        const formValues = this.view.getFormValues();
        const { subject, teacherName, selectedTime, topic, userClass } = formValues;

        // Validation
        if (!subject || !teacherName || !selectedTime || !topic || !userClass) {
            this.view.showMessage("Please fill out all fields.", true);
            return;
        }

        const teacher = this.model.getTeacher(subject, teacherName);
        if (!teacher) {
            this.view.showMessage("Teacher not found.", true);
            return;
        }

        if (this.model.isTimeBooked(teacherName, selectedTime)) {
            this.view.showMessage(
                "The selected time is already booked. Please choose another time.",
                true
            );
            return;
        }

        this.view.setLoading(true);

        try {
            const userEmail = user.email;
            const userName = user.displayName || userEmail.split('@')[0];

            // Save booking to Firebase
            await this.model.saveBooking({
                subject,
                userEmail,
                teacherName,
                selectedTime,
                topic,
                teacherEmail: teacher.email,
                userClass
            });

            // Send booking confirmation email
            const bookingData = {
                student_email: userEmail,
                student_name: userName,
                tutor_email: teacher.email,
                tutor_name: teacherName,
                tutor_number: teacher.number,
                subject: subject,
                topic: topic,
                selected_time: this.formatDateTimeForAPI(selectedTime)
            };

            const emailResult = await this.model.sendBookingConfirmationEmail(bookingData);
            
            if (emailResult.success) {
                alert("Booking was successful and email confirmation sent to both you and your tutor. Accept the calendar invite for reminders!");
                this.view.resetForm();
                await this.model.fetchBookings();
            } else {
                this.view.showMessage("Booking saved but email notification failed. Please contact support.", true);
            }

        } catch (error) {
            console.error("Error during booking:", error);
            this.view.showMessage("There was an error with your booking. Please try again.", true);
            
            // Remove the booking from local bookedTimes if it was added
            if (this.model.bookedTimes[teacherName]) {
                const index = this.model.bookedTimes[teacherName].indexOf(selectedTime);
                if (index > -1) {
                    this.model.bookedTimes[teacherName].splice(index, 1);
                }
            }
        } finally {
            this.view.setLoading(false);
        }
    }*/
   // Book a session - FIXED VERSION
async bookSession() {
    const user = this.model.getCurrentUser();
    
    if (!user) {
        this.view.showMessage("You must be logged in to book a session.", true);
        return;
    }

    const formValues = this.view.getFormValues();
    const { subject, teacherName, selectedTime, topic, userClass } = formValues;

    // Validation
    if (!subject || !teacherName || !selectedTime || !topic || !userClass) {
        this.view.showMessage("Please fill out all fields.", true);
        return;
    }

    const teacher = this.model.getTeacher(subject, teacherName);
    if (!teacher) {
        this.view.showMessage("Teacher not found.", true);
        return;
    }

    if (this.model.isTimeBooked(teacherName, selectedTime)) {
        this.view.showMessage(
            "The selected time is already booked. Please choose another time.",
            true
        );
        return;
    }

    this.view.setLoading(true);
    let bookingSaved = false;

    try {
        const userEmail = user.email;
        const userName = user.displayName || userEmail.split('@')[0];

        // Save booking to Firebase first
        await this.model.saveBooking({
            subject,
            userEmail,
            teacherName,
            selectedTime,
            topic,
            teacherEmail: teacher.email,
            userClass
        });

        // Mark that booking was successfully saved
        bookingSaved = true;

        // Prepare booking data for email
        const bookingData = {
            student_email: userEmail,
            student_name: userName,
            tutor_email: teacher.email,
            tutor_name: teacherName,
            tutor_number: teacher.number,
            subject: subject,
            topic: topic,
            selected_time: this.formatDateTimeForAPI(selectedTime)
        };

        // Try to send email confirmation 
        try {
            const emailResult = await this.model.sendBookingConfirmationEmail(bookingData);
            
            if (emailResult.success) {
                alert("Booking was successful and email confirmation sent to both you and your tutor. Accept the calendar invite for reminders!");
            } else {
                this.view.showMessage("Booking saved successfully, but email notification failed. Please contact support.", false);
            }
        } catch (emailError) {
            console.error("Error sending email confirmation:", emailError);
            this.view.showMessage("Booking saved successfully, but email notification failed. Please contact support.", false);
        }

        // Reset form and refresh bookings regardless of email status
        this.view.resetForm();
        await this.model.fetchBookings();

    } catch (error) {
        console.error("Error saving booking:", error);
        this.view.showMessage("There was an error saving your booking. Please try again.", true);
        
        // Only remove from local bookedTimes if the booking actually failed to save
        if (!bookingSaved && this.model.bookedTimes[teacherName]) {
            const index = this.model.bookedTimes[teacherName].indexOf(selectedTime);
            if (index > -1) {
                this.model.bookedTimes[teacherName].splice(index, 1);
            }
        }
    } finally {
        this.view.setLoading(false);
    }
}
    // Test API connection
    async testAPIConnection() {
        try {
            const result = await this.model.testAPIConnection();
            if (result.success) {
                console.log('Connection successful');
            } else {
                console.warn('API connection test failed:', result.error);
            }
        } catch (error) {
            console.error('API connection failed:', error);
            this.view.showMessage(
                'Warning: Email service may be unavailable. Bookings will be saved but confirmation emails may not be sent.', 
                true
            );
        }
    }
}


const BookingApp = new BookingController();

window.BookingController = {
    populateTeachers: () => BookingApp.populateTeachers(),
    populateAvailableTimes: () => BookingApp.populateAvailableTimes(),
    bookSession: () => BookingApp.bookSession()
};
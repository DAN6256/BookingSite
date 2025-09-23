// Model
class TeacherRecordsModel {
    constructor() {
        this.initializeFirebase();
        this.userEmail = null;
    }

    async initializeFirebase() {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js");
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js");
        const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/9.18.0/firebase-database.js");

        this.app = initializeApp(FIREBASE_CONFIG);
        this.auth = getAuth(this.app);
        this.database = getDatabase(this.app);
        this.firebaseRefs = { ref, get };
    }

    async fetchTeacherBookings(userEmail) {
        try {
            const snapshot = await this.firebaseRefs.get(this.firebaseRefs.ref(this.database, "/bookings"));

            if (!snapshot.exists()) {
                console.log("No data available");
                return [];
            }

            const bookingsData = snapshot.val();
            const bookings = [];

            // Loop through the bookings data
            for (let uid in bookingsData) {
                const userBookings = bookingsData[uid];

                // Check each booking
                for (let bookingId in userBookings) {
                    const booking = userBookings[bookingId];
                    if (booking.teacherEmail === userEmail) {
                        bookings.push(booking); // Add booking if teacher matches
                    }
                }
            }

            return bookings;
        } catch (error) {
            console.error("Error fetching teacher bookings:", error);
            throw error;
        }
    }

    isTeacherInCourse(course, teacherEmail) {
        // Check if the course and course.teachers are defined
        if (!course || !course.teachers) {
            console.error("Course or teachers field is missing for course:", course);
            return false;
        }

        const courseTeachers = course.teachers;
        for (let teacher of courseTeachers) {
            if (teacher.email === teacherEmail) {
                return true;
            }
        }
        return false;
    }

    parseDateTime(dateTimeString) {
        if (!dateTimeString || typeof dateTimeString !== "string") {
            console.error("Invalid dateTimeString:", dateTimeString);
            return null;
        }

        try {
            // Expected format: "Jan. 3, 2025 - 2:00 PM" or "MM/DD/YYYY - HH:MM AM/PM"
            const [datePart, timePart] = dateTimeString.split(" - ");
            
            if (!datePart || !timePart) {
                console.error("Invalid format - missing date or time part:", dateTimeString);
                return null;
            }

            let sessionDate;

            // Check if it's the new format (Jan. 3, 2025) or old format (MM/DD/YYYY)
            if (datePart.includes(',')) {
                // New format: "Jan. 3, 2025 - 2:00 PM"
                const dateParts = datePart.trim().split(/[\s,]+/);
                if (dateParts.length < 3) {
                    console.error("Invalid new date format:", datePart);
                    return null;
                }
                
                const monthStr = dateParts[0].replace('.', ''); // Remove period from month
                const day = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2]);
                
                // Convert month name to number
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames.findIndex(m => m === monthStr);
                
                if (month === -1) {
                    console.error("Invalid month name:", monthStr);
                    return null;
                }
                
                // Parse the time part (e.g., "2:00 PM")
                const timeMatch = timePart.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (!timeMatch) {
                    console.error("Invalid time format:", timePart);
                    return null;
                }
                
                const [, hours, minutes, period] = timeMatch;
                let hour = parseInt(hours);
                
                if (period.toUpperCase() === "PM" && hour !== 12) {
                    hour += 12;
                } else if (period.toUpperCase() === "AM" && hour === 12) {
                    hour = 0;
                }
                
                sessionDate = new Date(year, month, day, hour, parseInt(minutes));
            } else {
                // Old format: "MM/DD/YYYY - HH:MM AM/PM"
                const [month, day, year] = datePart
                    .split("/")
                    .map((num) => parseInt(num, 10));
                
                const [time, ampm] = timePart.split(" ");
                const [hour, minute] = time
                    .split(":")
                    .map((num) => parseInt(num, 10));

                sessionDate = new Date(
                    year,
                    month - 1,
                    day,
                    hour + (ampm === "PM" && hour !== 12 ? 12 : 0),
                    minute
                );
                
                if (ampm === "AM" && hour === 12) sessionDate.setHours(0);
            }

            // Validate the created date
            if (isNaN(sessionDate.getTime())) {
                console.error("Invalid date created from:", dateTimeString);
                return null;
            }

            return sessionDate;
        } catch (error) {
            console.error("Error parsing dateTime string:", error, "Input:", dateTimeString);
            return null;
        }
    }

    isSessionPassed(sessionTime) {
        const currentDate = new Date();
        const sessionDate = this.parseDateTime(sessionTime);
        return sessionDate < currentDate;
    }

    onAuthStateChanged(callback) {
        const { onAuthStateChanged } = this.auth ? { onAuthStateChanged: (auth, cb) => {
            import("https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js").then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, cb);
            });
        }} : {};

        if (onAuthStateChanged) {
            onAuthStateChanged(this.auth, callback);
        }
    }
}

// View
class TeacherRecordsView {
    constructor() {
        this.loadingElement = document.getElementById("loading");
        this.bookingsListElement = document.getElementById("bookings-list");
        this.noBookingsMessageElement = document.getElementById("no-bookings-message");
    }

    showLoading() {
        this.loadingElement.style.display = "block";
        this.bookingsListElement.innerHTML = "";
        this.noBookingsMessageElement.style.display = "none";
    }

    hideLoading() {
        this.loadingElement.style.display = "none";
    }

    displayBookings(bookings, model) {
        this.bookingsListElement.innerHTML = "";
        this.hideLoading();

        if (bookings.length === 0) {
            this.noBookingsMessageElement.style.display = "block";
            return;
        }

        this.noBookingsMessageElement.style.display = "none";

        bookings.forEach((booking) => {
            const card = document.createElement("div");
            card.classList.add("card");

            const isPast = model.isSessionPassed(booking.time);
            const statusClass = isPast ? "past" : "upcoming";
            const parsedDate = booking.time ? model.parseDateTime(booking.time) : null;

            card.innerHTML = `
                <h3>Course: ${booking.subject}</h3>
                <p><strong>Student:</strong> ${booking.userEmail}</p>
                <p><strong>Topic:</strong> ${booking.topic}</p>
                <p><strong>Date & Time:</strong> ${
                    parsedDate ? parsedDate.toLocaleString() : "Invalid date"
                }</p>
                <div class="status ${statusClass}">
                    ${isPast ? "This session has passed" : "This session is upcoming"}
                </div>
            `;

            this.bookingsListElement.appendChild(card);
        });
    }

    showAlert(message) {
        alert(message);
    }

    showError(message) {
        console.error(message);
        this.hideLoading();
        this.bookingsListElement.innerHTML = `
            <div class="card" style="background-color: #ffeeee; border: 1px solid #ffcccc;">
                <p style="color: #cc0000; text-align: center;">
                    <strong>Error loading bookings:</strong> ${message}
                </p>
            </div>
        `;
    }
}

// Controller
class TeacherRecordsController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        await this.model.initializeFirebase();
        this.handleAuthStateChange();
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
                    this.loadTeacherBookings(user.email);
                } else {
                    this.view.showAlert("Please log in.");
                }
            });
        }
    }

    async loadTeacherBookings(userEmail) {
        try {
            this.view.showLoading();
            const bookings = await this.model.fetchTeacherBookings(userEmail);
            this.view.displayBookings(bookings, this.model);
        } catch (error) {
            this.view.showError("Failed to load bookings. Please try again.");
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const model = new TeacherRecordsModel();
    const view = new TeacherRecordsView();
    const controller = new TeacherRecordsController(model, view);
});
class BookingRecordsModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            // Ignore error if already initialized
            if (!/already exists/.test(error.message)) {
                throw new Error("Initialization failed");
            }
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

    async getCurrentUser() {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged((user) => {
                resolve(user);
            });
        });
    }

    async getBookings() {
        try {
            const snapshot = await firebase
                .database()
                .ref("/bookings")
                .once("value");
            const bookings = [];
            
            snapshot.forEach((userSnapshot) => {
                // We need the user Key (student ID) to construct the delete path later
                const studentId = userSnapshot.key;

                userSnapshot.forEach((bookingSnapshot) => {
                    const bookingData = bookingSnapshot.val();
                    // IMPORTANT: Attach keys to the object so we can delete it later
                    bookingData.bookingId = bookingSnapshot.key;
                    bookingData.studentId = studentId;
                    
                    bookings.push(bookingData);
                });
            });

            bookings.sort((a, b) => {
                const dateA = this.parseDateTime(a.time);
                const dateB = this.parseDateTime(b.time);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA - dateB;
            });

            return bookings;
        } catch (error) {
            throw new Error(`Failed to fetch bookings: ${error.message}`);
        }
    }

    // NEW: Method to delete data from Firebase
    async deleteBooking(studentId, bookingId) {
        try {
            await firebase
                .database()
                .ref(`/bookings/${studentId}/${bookingId}`)
                .remove();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete booking: ${error.message}`);
        }
    }

    parseDateTime(dateTimeString) {
        if (!dateTimeString || typeof dateTimeString !== "string") return null;

        try {
            const [datePart, timePart] = dateTimeString.split(" - ");
            if (!datePart || !timePart) return null;

            let sessionDate;

            if (datePart.includes(',')) {
                const dateParts = datePart.trim().split(/[\s,]+/);
                if (dateParts.length < 3) return null;
                
                const monthStr = dateParts[0].replace('.', '');
                const day = parseInt(dateParts[1]);
                const year = parseInt(dateParts[2]);
                
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames.findIndex(m => m === monthStr);
                
                if (month === -1) return null;
                
                const timeMatch = timePart.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
                if (!timeMatch) return null;
                
                const [, hours, minutes, period] = timeMatch;
                let hour = parseInt(hours);
                
                if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
                else if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
                
                sessionDate = new Date(year, month, day, hour, parseInt(minutes));
            } else {
                const [month, day, year] = datePart.split("/").map((num) => parseInt(num, 10));
                const [time, ampm] = timePart.split(" ");
                const [hour, minute] = time.split(":").map((num) => parseInt(num, 10));

                sessionDate = new Date(
                    year, month - 1, day,
                    hour + (ampm === "PM" && hour !== 12 ? 12 : 0),
                    minute
                );
                if (ampm === "AM" && hour === 12) sessionDate.setHours(0);
            }

            return isNaN(sessionDate.getTime()) ? null : sessionDate;
        } catch (error) {
            console.error("Error parsing dateTime string:", error);
            return null;
        }
    }
}

class BookingRecordsView {
    constructor() {
        this.upcomingContainer = document.getElementById("upcomingSessions");
        this.passedContainer = document.getElementById("passedSessions");
        this.bookingCountElement = document.getElementById("bookingCount");
        this.downloadBtn = document.getElementById("downloadBtn");
    }

    bindDownloadEvent(handler) {
        this.downloadBtn.addEventListener('click', handler);
    }

    showAlert(message) {
        alert(message);
    }

    updateBookingCount(count) {
        this.bookingCountElement.textContent = `Total Bookings Since 2025: ${count}`;
    }

    // MODIFIED: Added deleteHandler parameter
    createBookingCard(booking, isUpcoming, deleteHandler) {
        const card = document.createElement("div");
        card.classList.add("card");

        const title = document.createElement("p");
        title.classList.add("title");
        title.textContent = `Booking Details`;
        card.appendChild(title);

        const teacherInfo = document.createElement("p");
        teacherInfo.textContent = `Teacher: ${booking.teacher}`;
        card.appendChild(teacherInfo);

        const studentInfo = document.createElement("p");
        studentInfo.textContent = `Student: ${booking.userEmail}`;
        card.appendChild(studentInfo);

        const subjectInfo = document.createElement("p");
        subjectInfo.classList.add("subject");
        subjectInfo.textContent = `Subject: ${booking.subject}`;
        card.appendChild(subjectInfo);

        const topicInfo = document.createElement("p");
        topicInfo.textContent = `Topic: ${booking.topic || 'Not specified'}`;
        card.appendChild(topicInfo);

        const dateInfo = document.createElement("p");
        dateInfo.textContent = `Date: ${booking.time}`;
        card.appendChild(dateInfo);

        const flag = document.createElement("p");
        flag.textContent = isUpcoming ? "Upcoming session" : "Session has passed";
        flag.classList.add(isUpcoming ? "upcoming" : "past");
        card.appendChild(flag);

        // NEW: Create Delete Button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete Booking";
        deleteBtn.classList.add("delete-card-btn"); // Specific class for styling
        
        // Attach click event
        deleteBtn.onclick = () => {
            // Confirm before deleting
            if(confirm(`Are you sure you want to delete this booking for ${booking.userEmail}?`)) {
                deleteHandler(booking.studentId, booking.bookingId);
            }
        };
        
        card.appendChild(deleteBtn);

        return card;
    }

    // MODIFIED: Pass deleteHandler down
    addBookingCard(booking, isUpcoming, deleteHandler) {
        const card = this.createBookingCard(booking, isUpcoming, deleteHandler);
        
        if (isUpcoming) {
            this.upcomingContainer.appendChild(card);
        } else {
            this.passedContainer.appendChild(card);
        }
    }

    showEmptyState(container, message) {
        const emptyDiv = document.createElement("div");
        emptyDiv.classList.add("empty-state");
        emptyDiv.textContent = message;
        container.appendChild(emptyDiv);
    }

    clearContainers() {
        this.upcomingContainer.innerHTML = '';
        this.passedContainer.innerHTML = '';
    }
}

class BookingRecordsController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        this.view.bindDownloadEvent(() => this.handleDownload());
        await this.loadBookings();
    }

    async loadBookings() {
        try {
            const user = await this.model.getCurrentUser();
            if (!user || !Object.values(ADMIN_EMAILS).includes(user.email)) {
                this.view.showAlert("Access Denied");
                return;
            }

            this.view.clearContainers();
            const bookings = await this.model.getBookings();
            this.view.updateBookingCount(bookings.length);

            let upcomingCount = 0;
            let passedCount = 0;

            bookings.forEach((booking) => {
                if (!booking.userEmail) return;

                const sessionDate = this.model.parseDateTime(booking.time);
                const isUpcoming = sessionDate && sessionDate >= new Date();

                // Pass the delete handler callback
                this.view.addBookingCard(booking, isUpcoming, (sId, bId) => this.handleDelete(sId, bId));

                if (isUpcoming) upcomingCount++;
                else passedCount++;
            });

            if (upcomingCount === 0) this.view.showEmptyState(this.view.upcomingContainer, "No upcoming sessions");
            if (passedCount === 0) this.view.showEmptyState(this.view.passedContainer, "No passed sessions");

        } catch (error) {
            console.error("Error loading bookings:", error);
            this.view.showAlert("Failed to load bookings");
        }
    }

    // NEW: Handle Deletion
    async handleDelete(studentId, bookingId) {
        try {
            await this.model.deleteBooking(studentId, bookingId);
            this.view.showAlert("Booking deleted successfully.");
            // Reload the list to reflect changes
            await this.loadBookings(); 
        } catch (error) {
            console.error("Delete error:", error);
            this.view.showAlert("Error deleting booking: " + error.message);
        }
    }

    handleDownload() {
        window.location.href = "adminCopy.html";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new BookingRecordsModel();
    const view = new BookingRecordsView();
    const controller = new BookingRecordsController(model, view);
});
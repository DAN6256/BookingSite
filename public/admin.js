class BookingRecordsModel {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (error) {
            throw new Error("Initialization failed");
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
                userSnapshot.forEach((bookingSnapshot) => {
                    bookings.push(bookingSnapshot.val());
                });
            });

            // Sort bookings by date (upcoming first, then passed)
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

    showError(message) {
        this.showAlert(`Error: ${message}`);
    }

    updateBookingCount(count) {
        this.bookingCountElement.textContent = `Total Bookings Since 2025: ${count}`;
    }

    createBookingCard(booking, isUpcoming) {
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

        return card;
    }

    addBookingCard(booking, isUpcoming) {
        const card = this.createBookingCard(booking, isUpcoming);
        
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

            // Update total count
            this.view.updateBookingCount(bookings.length);

            let upcomingCount = 0;
            let passedCount = 0;

            bookings.forEach((booking) => {
                if (!booking.userEmail) {
                    return;
                }

                // Check if session is passed or upcoming
                const sessionDate = this.model.parseDateTime(booking.time);
                const isUpcoming = sessionDate && sessionDate >= new Date();

                // Add card to the respective section
                this.view.addBookingCard(booking, isUpcoming);

                if (isUpcoming) {
                    upcomingCount++;
                } else {
                    passedCount++;
                }
            });

            // Show empty state messages if no bookings in either section
            if (upcomingCount === 0) {
                this.view.showEmptyState(this.view.upcomingContainer, "No upcoming sessions");
            }

            if (passedCount === 0) {
                this.view.showEmptyState(this.view.passedContainer, "No passed sessions");
            }

        } catch (error) {
            console.error("Error loading bookings:", error);
            this.view.showError("Failed to load bookings");
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
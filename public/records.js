// Model
class RecordsModel {
    constructor() {
        this.initializeFirebase();
        this.userId = null;
    }

    async initializeFirebase() {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
        const { getDatabase, ref, get } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js");
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js");

        this.app = initializeApp(FIREBASE_CONFIG);
        this.database = getDatabase(this.app);
        this.auth = getAuth(this.app);
        this.firebaseRefs = { ref, get };
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

    isSessionPassed(sessionDateTime) {
        const sessionDate = this.parseDateTime(sessionDateTime);
        return sessionDate ? sessionDate < new Date() : false;
    }

    async fetchBookings(userId) {
        try {
            const bookingsRef = this.firebaseRefs.ref(this.database, "bookings/" + userId);
            const snapshot = await this.firebaseRefs.get(bookingsRef);
            const bookingsData = snapshot.val();
            return bookingsData ? Object.values(bookingsData) : [];
        } catch (error) {
            console.error("Error fetching data:", error);
            throw error;
        }
    }

    onAuthStateChanged(callback) {
        const { onAuthStateChanged } = this.auth ? { onAuthStateChanged: (auth, cb) => {
            import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js").then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, cb);
            });
        }} : {};

        if (onAuthStateChanged) {
            onAuthStateChanged(this.auth, callback);
        }
    }
}

// View
class RecordsView {
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

        bookings.forEach((booking, index) => {
            const card = document.createElement("div");
            card.classList.add("card");

            const isPast = booking.time ? model.isSessionPassed(booking.time) : false;
            const statusClass = isPast ? "past" : "upcoming";
            const parsedDate = booking.time ? model.parseDateTime(booking.time) : null;

            card.innerHTML = `
                <h3>Subject: ${booking.subject || 'N/A'}</h3>
                <p><strong>Teacher:</strong> ${booking.teacher || 'N/A'}</p>
                <p><strong>Topic:</strong> ${booking.topic || 'N/A'}</p>
                <p><strong>Date & Time:</strong> ${
                    parsedDate ? parsedDate.toLocaleString() : "Invalid date"
                }</p>
                <div class="status ${statusClass}">
                    ${isPast ? "This session has passed" : "This session is upcoming"}
                </div>
            `;

            // Add entrance animation
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            this.bookingsListElement.appendChild(card);

            // Trigger animation
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + (index * 150));
        });
    }

    showAlert(message) {
        alert(message);
    }

    showError(message) {
        console.error(message);
        this.hideLoading();
        this.bookingsListElement.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, #ffeeee 0%, #ffd6d6 100%); border: 1px solid #ffcccc;">
                <p style="color: #cc0000; text-align: center; font-weight: 600;">
                    <strong>⚠️ Error loading bookings:</strong><br>
                    ${message}
                </p>
            </div>
        `;
    }

    addPageAnimations() {
        // Add page entrance animation
        const container = document.querySelector('.container');
        if (container) {
            container.style.opacity = '0';
            container.style.transform = 'translateY(20px)';
            container.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            
            setTimeout(() => {
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }, 100);
        }

        // Add navbar animation
        const navbarLinks = document.querySelectorAll('.navbar a');
        navbarLinks.forEach((link, index) => {
            link.style.opacity = '0';
            link.style.transform = 'translateY(-20px)';
            link.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                link.style.opacity = '1';
                link.style.transform = 'translateY(0)';
            }, 200 + (index * 100));
        });
    }
}

// Controller
class RecordsController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.init();
    }

    async init() {
        await this.model.initializeFirebase();
        this.view.addPageAnimations();
        this.handleAuthStateChange();
    }

    handleAuthStateChange() {
        const { onAuthStateChanged } = this.model.auth ? { onAuthStateChanged: (auth, callback) => {
            import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js").then(({ onAuthStateChanged }) => {
                onAuthStateChanged(auth, callback);
            });
        }} : {};

        if (onAuthStateChanged) {
            onAuthStateChanged(this.model.auth, (user) => {
                if (user) {
                    this.loadUserBookings(user.uid);
                } else {
                    this.view.showAlert("You must be logged in to view your bookings.");
                }
            });
        }
    }

    async loadUserBookings(userId) {
        try {
            this.view.showLoading();
            const bookings = await this.model.fetchBookings(userId);
            this.view.displayBookings(bookings, this.model);
        } catch (error) {
            this.view.showError("Failed to load your bookings. Please try again later.");
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const model = new RecordsModel();
    const view = new RecordsView();
    const controller = new RecordsController(model, view);
});
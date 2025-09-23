class DownloadBookingsModel {
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
                    resolve(user ? true : false);
                });
            });
        } catch (error) {
            return false;
        }
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
                    const booking = bookingSnapshot.val();
                    bookings.push({
                        Teacher: booking.teacher,
                        Student: booking.userEmail,
                        Subject: booking.subject,
                        Class: booking.class,
                        Date: booking.time,
                    });
                });
            });
            
            return bookings;
        } catch (error) {
            throw new Error(`Failed to fetch bookings: ${error.message}`);
        }
    }
}

class DownloadBookingsView {
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
        this.showAlert(`Error: ${message}`);
    }

    showSuccess(message) {
        this.showAlert(message);
    }

    disableButton() {
        this.downloadBtn.disabled = true;
        this.downloadBtn.textContent = 'Downloading...';
    }

    enableButton() {
        this.downloadBtn.disabled = false;
        this.downloadBtn.textContent = 'Download as Excel';
    }
}

class DownloadBookingsController {
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
                this.view.showAlert("You must be logged in to download the records.");
                return;
            }

            // Disable button during download
            this.view.disableButton();

            // Download Excel file
            await this.downloadExcel();
            
            // Show success message
            this.view.showSuccess("Excel file downloaded successfully!");
            
        } catch (error) {
            console.error("Download error:", error);
            this.view.showError("Failed to download records. Please try again.");
        } finally {
            // Re-enable button
            this.view.enableButton();
        }
    }

    async downloadExcel() {
        try {
            const bookings = await this.model.getBookings();
            
            // Create Excel file
            const worksheet = XLSX.utils.json_to_sheet(bookings);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
            XLSX.writeFile(workbook, "Bookings.xlsx");
            
        } catch (error) {
            throw new Error(`Excel download failed: ${error.message}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new DownloadBookingsModel();
    const view = new DownloadBookingsView();
    const controller = new DownloadBookingsController(model, view);
});
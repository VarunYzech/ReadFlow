/* ============================================
   LANDING PAGE - FILE UPLOAD HANDLER
   ============================================ */

class LandingPage {
    constructor() {
        // DOM Elements
        this.storyUploadArea = document.getElementById('storyUploadArea');
        this.storyFileInput = document.getElementById('storyFileInput');
        this.storyUploadStatus = document.getElementById('storyUploadStatus');
        
        this.musicUploadArea = document.getElementById('musicUploadArea');
        this.musicFileInput = document.getElementById('musicFileInput');
        this.musicUploadStatus = document.getElementById('musicUploadStatus');
        
        this.startReadingBtn = document.getElementById('startReadingBtn');
        this.readyMessage = document.getElementById('readyMessage');

        // State
        this.uploadedStory = null;
        this.uploadedMusic = null;
        this.storyFileName = null;
        this.musicFileName = null;

        // Initialize
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadFromStorage();
    }

    /* ============================================
       EVENT LISTENERS
       ============================================ */
    attachEventListeners() {
        // Story upload
        this.storyUploadArea.addEventListener('click', () => {
            this.storyFileInput.click();
        });

        this.storyFileInput.addEventListener('change', (e) => {
            this.handleStoryUpload(e);
        });

        this.storyUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.storyUploadArea.classList.add('dragover');
        });

        this.storyUploadArea.addEventListener('dragleave', () => {
            this.storyUploadArea.classList.remove('dragover');
        });

        this.storyUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.storyUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.storyFileInput.files = files;
                this.handleStoryUpload({ target: { files } });
            }
        });

        // Music upload
        this.musicUploadArea.addEventListener('click', () => {
            this.musicFileInput.click();
        });

        this.musicFileInput.addEventListener('change', (e) => {
            this.handleMusicUpload(e);
        });

        this.musicUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.musicUploadArea.classList.add('dragover');
        });

        this.musicUploadArea.addEventListener('dragleave', () => {
            this.musicUploadArea.classList.remove('dragover');
        });

        this.musicUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.musicUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.musicFileInput.files = files;
                this.handleMusicUpload({ target: { files } });
            }
        });

        // Start reading button
        this.startReadingBtn.addEventListener('click', () => {
            this.startReading();
        });
    }

    /* ============================================
       STORY UPLOAD HANDLER
       ============================================ */
    handleStoryUpload(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!file.name.endsWith('.txt')) {
            this.showStatus(this.storyUploadStatus, 'Only .txt files allowed', 'error');
            return;
        }

        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            this.showStatus(this.storyUploadStatus, 'File too large (max 1MB)', 'error');
            return;
        }

        // Read file
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.uploadedStory = event.target.result;
                this.storyFileName = file.name.replace('.txt', '');
                this.saveToStorage();
                this.showStatus(this.storyUploadStatus, `✓ Uploaded: ${file.name}`, 'success');
                this.updateReadyState();
            } catch (error) {
                this.showStatus(this.storyUploadStatus, 'Error reading file', 'error');
            }
        };

        reader.onerror = () => {
            this.showStatus(this.storyUploadStatus, 'Error reading file', 'error');
        };

        reader.readAsText(file);
    }

    /* ============================================
       MUSIC UPLOAD HANDLER
       ============================================ */
    handleMusicUpload(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!file.name.endsWith('.mp3')) {
            this.showStatus(this.musicUploadStatus, 'Only .mp3 files allowed', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showStatus(this.musicUploadStatus, 'File too large (max 10MB)', 'error');
            return;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.uploadedMusic = event.target.result;
                this.musicFileName = file.name;
                this.saveToStorage();
                this.showStatus(this.musicUploadStatus, `✓ Uploaded: ${file.name}`, 'success');
                this.updateReadyState();
            } catch (error) {
                this.showStatus(this.musicUploadStatus, 'Error reading file', 'error');
            }
        };

        reader.onerror = () => {
            this.showStatus(this.musicUploadStatus, 'Error reading file', 'error');
        };

        reader.readAsDataURL(file);
    }

    /* ============================================
       STORAGE MANAGEMENT
       ============================================ */
    saveToStorage() {
        const data = {
            story: this.uploadedStory,
            storyFileName: this.storyFileName,
            music: this.uploadedMusic,
            musicFileName: this.musicFileName
        };
        localStorage.setItem('readflow-uploads', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('readflow-uploads');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.uploadedStory = parsed.story;
                this.storyFileName = parsed.storyFileName;
                this.uploadedMusic = parsed.music;
                this.musicFileName = parsed.musicFileName;

                // Update UI
                if (this.uploadedStory) {
                    this.showStatus(this.storyUploadStatus, `✓ Loaded: ${this.storyFileName}.txt`, 'success');
                }
                if (this.uploadedMusic) {
                    this.showStatus(this.musicUploadStatus, `✓ Loaded: ${this.musicFileName}`, 'success');
                }

                this.updateReadyState();
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }

    /* ============================================
       UI UPDATES
       ============================================ */
    showStatus(element, message, type) {
        element.textContent = message;
        element.className = `upload-status ${type}`;
    }

    updateReadyState() {
        if (this.uploadedStory) {
            this.startReadingBtn.disabled = false;
            this.startReadingBtn.classList.remove('btn-disabled');
            this.readyMessage.textContent = `Ready! Story: ${this.storyFileName}.txt${this.uploadedMusic ? ' + Music' : ''}`;
        } else {
            this.startReadingBtn.disabled = true;
            this.startReadingBtn.classList.add('btn-disabled');
            this.readyMessage.textContent = 'Upload a story to get started';
        }
    }

    /* ============================================
       START READING
       ============================================ */
    startReading() {
        if (!this.uploadedStory) {
            alert('Please upload a story first');
            return;
        }

        // Pass data to reader page
        sessionStorage.setItem('readflow-session', JSON.stringify({
            story: this.uploadedStory,
            storyFileName: this.storyFileName,
            music: this.uploadedMusic,
            musicFileName: this.musicFileName
        }));

        // Navigate to reader
        window.location.href = 'index.html?mode=custom';
    }
}

// Initialize landing page
document.addEventListener('DOMContentLoaded', () => {
    window.landingPage = new LandingPage();
});

/* ============================================
   READFLOW - SMART READING ASSISTANT
   ============================================ */

class ReadFlow {
    constructor() {
        // DOM Elements
        this.reader = document.getElementById('reader');
        this.readerContent = document.getElementById('readerContent');
        this.storySelect = document.getElementById('storySelect');
        this.playBtn = document.getElementById('playBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedDisplay = document.getElementById('speedDisplay');
        this.speedMinusBtn = document.getElementById('speedMinusBtn');
        this.speedPlusBtn = document.getElementById('speedPlusBtn');
        this.musicToggleBtn = document.getElementById('musicToggleBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeDisplay = document.getElementById('volumeDisplay');
        this.bgMusic = document.getElementById('bgMusic');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');

        // State
        this.isPlaying = false;
        this.isMusicPlaying = false;
        this.currentSpeed = 1;
        this.currentVolume = 30;
        this.lines = [];
        this.activeLineIndex = 0;
        this.currentWordIndex = 0;
        this.animationFrameId = null;
        this.lastScrollTime = 0;
        this.scrollTimeout = null;
        this.userScrolling = false;
        this.pianoPlayer = null;
        this.audioContext = null;
        this.pianoGain = null;
        this.pianoPlaying = false;
        this.isDarkTheme = true;
        this.customStory = null;
        this.customMusic = null;
        this.customStoryName = null;

        // Initialize
        this.init();
    }

    init() {
        this.loadTheme();
        this.loadCustomSession();
        this.loadStories();
        this.attachEventListeners();
        this.updateSpeedDisplay();
        this.updateVolumeDisplay();
        this.updateMusicIcon();
        this.generateDefaultPianoMusic();
        this.handleMobileAudio();
    }

    /* ============================================
       CUSTOM SESSION LOADING
       ============================================ */
    loadCustomSession() {
        const sessionData = sessionStorage.getItem('readflow-session');
        if (sessionData) {
            try {
                const data = JSON.parse(sessionData);
                this.customStory = data.story;
                this.customMusic = data.music;
                this.customStoryName = data.storyFileName;
                
                // Load custom story immediately
                if (this.customStory) {
                    this.parseText(this.customStory);
                    this.renderLines();
                    this.resetReading();
                }
                
                // Clear session after loading
                sessionStorage.removeItem('readflow-session');
            } catch (error) {
                console.error('Error loading custom session:', error);
            }
        }
    }

    /* ============================================
       THEME MANAGEMENT
       ============================================ */
    loadTheme() {
        const savedTheme = localStorage.getItem('readflow-theme');
        this.isDarkTheme = savedTheme !== 'light';
        this.applyTheme();
    }

    applyTheme() {
        if (this.isDarkTheme) {
            document.body.classList.remove('light-theme');
            this.themeToggleBtn.innerHTML = '<span class="icon">☀️</span>';
        } else {
            document.body.classList.add('light-theme');
            this.themeToggleBtn.innerHTML = '<span class="icon">🌙</span>';
        }
        localStorage.setItem('readflow-theme', this.isDarkTheme ? 'dark' : 'light');
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        this.applyTheme();
    }

    /* ============================================
       STORY LOADING
       ============================================ */
    async loadStories() {
        const stories = ['heart', 'inspiration', 'feelgood'];
        
        for (const story of stories) {
            const option = document.createElement('option');
            option.value = story;
            option.textContent = this.formatStoryName(story);
            this.storySelect.appendChild(option);
        }
    }

    formatStoryName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    async loadStory(storyName) {
        if (!storyName) return;

        try {
            const response = await fetch(`../../public/stories/${storyName}.txt`);
            if (!response.ok) throw new Error('Story not found');
            
            const text = await response.text();
            this.parseText(text);
            this.renderLines();
            this.resetReading();
        } catch (error) {
            console.error('Error loading story:', error);
            this.readerContent.innerHTML = '<p class="placeholder">Error loading story. Please try again.</p>';
        }
    }

    parseText(text) {
        this.lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    renderLines() {
        this.readerContent.innerHTML = '';
        
        this.lines.forEach((lineText, index) => {
            const lineEl = document.createElement('div');
            lineEl.className = 'line';
            lineEl.dataset.index = index;
            
            const words = lineText.split(/\s+/);
            lineEl.innerHTML = words
                .map((word, wordIdx) => `<span class="word" data-word-index="${wordIdx}">${word}</span>`)
                .join(' ');
            
            this.readerContent.appendChild(lineEl);
        });

        this.updateLineHighlights();
        
        setTimeout(() => {
            this.centerLineInBeam(0);
        }, 100);
    }

    centerLineInBeam(lineIndex) {
        const lineEl = document.querySelector(`[data-index="${lineIndex}"]`);
        if (!lineEl) return;

        const readerRect = this.reader.getBoundingClientRect();
        const lineRect = lineEl.getBoundingClientRect();
        const readerCenter = readerRect.height / 2;
        const lineCenter = lineRect.top - readerRect.top + lineRect.height / 2;
        const scrollOffset = lineCenter - readerCenter;

        this.reader.scrollTop += scrollOffset;
    }

    /* ============================================
       READING LOGIC
       ============================================ */
    updateLineHighlights() {
        const lineElements = document.querySelectorAll('.line');
        
        lineElements.forEach((el, index) => {
            el.classList.remove('active', 'prev', 'next');
            
            if (index === this.activeLineIndex) {
                el.classList.add('active');
            } else if (index === this.activeLineIndex - 1) {
                el.classList.add('prev');
            } else if (index === this.activeLineIndex + 1) {
                el.classList.add('next');
            }
        });
    }

    getActiveLineElement() {
        return document.querySelector(`[data-index="${this.activeLineIndex}"]`);
    }

    updateActiveLineFromScroll() {
        const readerRect = this.reader.getBoundingClientRect();
        const centerY = readerRect.height / 2;
        const lineElements = document.querySelectorAll('.line');
        
        let closestIndex = 0;
        let closestDistance = Infinity;

        lineElements.forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            const lineCenter = rect.top - readerRect.top + rect.height / 2;
            const distance = Math.abs(lineCenter - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== this.activeLineIndex) {
            this.activeLineIndex = closestIndex;
            this.currentWordIndex = 0;
            this.updateLineHighlights();
        }
    }

    /* ============================================
       AUTO READING
       ============================================ */
    startReading() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.playBtn.classList.add('active');
        this.playBtn.innerHTML = '<span class="icon">⏸</span>';
        this.userScrolling = false;

        // Auto-play music if not already playing
        if (!this.isMusicPlaying) {
            this.toggleMusic();
        }

        this.read();
    }

    stopReading() {
        this.isPlaying = false;
        this.playBtn.classList.remove('active');
        this.playBtn.innerHTML = '<span class="icon">▶</span>';
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.clearWordHighlights();
    }

    read() {
        if (!this.isPlaying) return;

        const currentLine = this.lines[this.activeLineIndex];
        if (!currentLine) {
            this.stopReading();
            return;
        }

        const words = currentLine.split(/\s+/);

        if (this.currentWordIndex < words.length) {
            this.highlightWord(this.currentWordIndex);
            const wordLength = words[this.currentWordIndex].length;
            const delay = this.calculateDelay(wordLength);

            setTimeout(() => {
                this.currentWordIndex++;
                this.read();
            }, delay);
        } else {
            this.currentWordIndex = 0;
            this.clearWordHighlights();

            if (this.activeLineIndex < this.lines.length - 1) {
                this.activeLineIndex++;
                this.updateLineHighlights();
                this.smoothScrollToActiveLine();
                
                setTimeout(() => this.read(), 150);
            } else {
                this.stopReading();
            }
        }
    }

    calculateDelay(wordLength) {
        const baseDelay = Math.max(wordLength * 50, 80);
        return baseDelay / this.currentSpeed;
    }

    highlightWord(wordIndex) {
        const lineEl = this.getActiveLineElement();
        if (!lineEl) return;

        const words = lineEl.querySelectorAll('.word');
        words.forEach((word, idx) => {
            word.classList.toggle('highlight', idx === wordIndex);
        });

        const focusBeam = document.querySelector('.focus-beam');
        if (focusBeam) {
            focusBeam.classList.add('word-highlight');
        }
    }

    clearWordHighlights() {
        document.querySelectorAll('.word.highlight').forEach(word => {
            word.classList.remove('highlight');
        });

        const focusBeam = document.querySelector('.focus-beam');
        if (focusBeam) {
            focusBeam.classList.remove('word-highlight');
        }
    }

    smoothScrollToActiveLine() {
        const activeEl = this.getActiveLineElement();
        if (!activeEl) return;

        const readerRect = this.reader.getBoundingClientRect();
        const lineRect = activeEl.getBoundingClientRect();
        const readerCenter = readerRect.height / 2;
        const lineCenter = lineRect.top - readerRect.top + lineRect.height / 2;
        const scrollOffset = lineCenter - readerCenter;

        const startScroll = this.reader.scrollTop;
        const targetScroll = startScroll + scrollOffset;
        const duration = 300;
        const startTime = performance.now();

        const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.reader.scrollTop = startScroll + (targetScroll - startScroll) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };

        requestAnimationFrame(animateScroll);
    }

    resetReading() {
        this.stopReading();
        this.activeLineIndex = 0;
        this.currentWordIndex = 0;
        this.updateLineHighlights();
        this.clearWordHighlights();
        
        setTimeout(() => {
            this.centerLineInBeam(0);
        }, 50);
    }

    /* ============================================
       SPEED CONTROL
       ============================================ */
    setSpeed(speed) {
        this.currentSpeed = Math.max(0.5, Math.min(2, speed));
        this.speedSlider.value = this.currentSpeed;
        this.updateSpeedDisplay();
    }

    updateSpeedDisplay() {
        this.speedDisplay.textContent = this.currentSpeed.toFixed(1) + 'x';
    }

    /* ============================================
       VOLUME CONTROL
       ============================================ */
    setVolume(volume) {
        this.currentVolume = Math.max(0, Math.min(100, volume));
        this.volumeSlider.value = this.currentVolume;
        
        // Control file audio volume
        this.bgMusic.volume = this.currentVolume / 100;
        
        // Control piano music volume
        if (this.pianoGain) {
            this.pianoGain.gain.value = this.currentVolume / 100;
        }
        
        this.updateVolumeDisplay();
        this.updateMusicIcon();
    }

    updateVolumeDisplay() {
        this.volumeDisplay.textContent = this.currentVolume + '%';
    }

    updateMusicIcon() {
        if (this.currentVolume === 0) {
            this.musicToggleBtn.innerHTML = '<span class="icon">🔇</span>';
        } else if (this.currentVolume < 50) {
            this.musicToggleBtn.innerHTML = '<span class="icon">🔉</span>';
        } else {
            this.musicToggleBtn.innerHTML = '<span class="icon">🔊</span>';
        }
    }

    toggleMusic() {
        if (this.isMusicPlaying) {
            this.bgMusic.pause();
            this.isMusicPlaying = false;
            this.musicToggleBtn.classList.remove('active');
            
            if (this.pianoPlayer) {
                this.pianoPlaying = false;
            }
            
            this.updateMusicIcon();
        } else {
            this.isMusicPlaying = true;
            this.musicToggleBtn.classList.add('active');
            
            // Try custom music first
            if (this.customMusic) {
                this.bgMusic.src = this.customMusic;
            }
            
            this.bgMusic.play().catch(err => {
                console.log('Audio playback failed, using piano music:', err);
                if (this.pianoPlayer && !this.pianoPlaying) {
                    this.pianoPlaying = true;
                    this.pianoPlayer();
                }
            });
            
            this.updateMusicIcon();
        }
    }

    /* ============================================
       AUDIO SYSTEM
       ============================================ */
    generateDefaultPianoMusic() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node for volume control
            const masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            masterGain.gain.value = this.currentVolume / 100;
            
            this.pianoGain = masterGain;
            
            const playPianoMelody = () => {
                const notes = {
                    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
                    A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
                    F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
                    D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
                };
                
                const melody = [
                    { note: 'C4', duration: 1.2 },
                    { note: 'E4', duration: 0.8 },
                    { note: 'G4', duration: 1.0 },
                    { note: 'A4', duration: 0.6 },
                    { note: 'G4', duration: 1.2 },
                    { note: 'E4', duration: 0.8 },
                    { note: 'D4', duration: 0.8 },
                    { note: 'F4', duration: 0.8 },
                    { note: 'A4', duration: 1.0 },
                    { note: 'C5', duration: 1.2 },
                    { note: 'B4', duration: 0.8 },
                    { note: 'A4', duration: 0.8 },
                    { note: 'G4', duration: 1.0 },
                    { note: 'F4', duration: 0.8 },
                    { note: 'E4', duration: 1.2 },
                    { note: 'D4', duration: 0.8 },
                    { note: 'C4', duration: 1.0 },
                    { note: 'E4', duration: 0.8 },
                    { note: 'G4', duration: 0.8 },
                    { note: 'B4', duration: 1.0 },
                    { note: 'D5', duration: 1.2 },
                    { note: 'C5', duration: 0.8 },
                    { note: 'B4', duration: 0.8 },
                    { note: 'A4', duration: 1.0 },
                    { note: 'G4', duration: 0.8 },
                    { note: 'F4', duration: 1.2 },
                    { note: 'E4', duration: 0.8 },
                    { note: 'D4', duration: 1.0 },
                    { note: 'C4', duration: 1.2 },
                    { note: 'E4', duration: 1.0 },
                    { note: 'G4', duration: 1.2 },
                    { note: 'C5', duration: 1.5 },
                    { note: 'A4', duration: 1.0 },
                    { note: 'F4', duration: 1.2 },
                    { note: 'C4', duration: 2.0 }
                ];
                
                let currentTime = audioContext.currentTime;
                
                melody.forEach(({ note, duration }) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(masterGain);
                    
                    osc.frequency.value = notes[note];
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0.08, currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
                    
                    osc.start(currentTime);
                    osc.stop(currentTime + duration);
                    
                    currentTime += duration;
                });
                
                const totalDuration = currentTime - audioContext.currentTime;
                const loopDelay = totalDuration * 1000 + 2000;
                
                if (this.pianoPlaying) {
                    setTimeout(() => playPianoMelody(), loopDelay);
                }
            };
            
            this.pianoPlayer = playPianoMelody;
            this.audioContext = audioContext;
        } catch (err) {
            console.log('Web Audio API not available:', err);
        }
    }

    handleMobileAudio() {
        document.addEventListener('click', () => {
            if (this.bgMusic.paused && this.isMusicPlaying) {
                this.bgMusic.play().catch(err => {
                    console.log('Audio playback failed:', err);
                });
            }
        }, { once: true });
    }

    /* ============================================
       EVENT LISTENERS
       ============================================ */
    attachEventListeners() {
        // Story selection
        this.storySelect.addEventListener('change', (e) => {
            this.loadStory(e.target.value);
        });

        // Play/Pause
        this.playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.stopReading();
            } else {
                this.startReading();
            }
        });

        // Speed control
        this.speedSlider.addEventListener('input', (e) => {
            this.setSpeed(parseFloat(e.target.value));
        });

        this.speedMinusBtn.addEventListener('click', () => {
            this.setSpeed(this.currentSpeed - 0.1);
        });

        this.speedPlusBtn.addEventListener('click', () => {
            this.setSpeed(this.currentSpeed + 0.1);
        });

        // Music control
        this.musicToggleBtn.addEventListener('click', () => {
            this.toggleMusic();
        });

        // Volume control
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(parseFloat(e.target.value));
        });

        // Theme toggle
        this.themeToggleBtn.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Reader scroll detection
        this.reader.addEventListener('scroll', () => {
            this.userScrolling = true;
            this.lastScrollTime = Date.now();

            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            this.updateActiveLineFromScroll();

            if (this.isPlaying) {
                this.currentWordIndex = 0;
                this.clearWordHighlights();
            }

            this.scrollTimeout = setTimeout(() => {
                this.userScrolling = false;
            }, 150);
        }, { passive: true });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.playBtn.click();
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.readFlow = new ReadFlow();
});

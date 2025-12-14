/**
 * Background Music Player for Gravitation³ Simulations
 * Provides ambient lofi music with persistent mute state
 */

class MusicPlayer {
    constructor() {
        this.audio = null;
        this.button = null;
        this.volumeSlider = null;
        this.volumeContainer = null;
        this.isMuted = false; // Start unmuted by default to auto-play
        this.volume = 0.5; // 50% volume (default)
        this.saveInterval = null; // For periodic position saving
        
        this.init();
    }

    init() {
        // Load saved mute state from localStorage
        const savedMuteState = localStorage.getItem('gravitation-music-muted');
        if (savedMuteState !== null) {
            this.isMuted = savedMuteState === 'true';
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
        
        // Save playback position when navigating away
        window.addEventListener('beforeunload', () => this.savePlaybackPosition());
    }

    setup() {
        this.audio = document.getElementById('bg-music');
        this.button = document.getElementById('music-toggle');

        if (!this.audio || !this.button) {
            console.warn('Music player elements not found');
            return;
        }

        // Load saved volume from localStorage
        const savedVolume = localStorage.getItem('gravitation-music-volume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }

        // Set initial volume
        this.audio.volume = this.volume;

        // Check if this is a new browser session or continuing same session
        const isNewSession = !sessionStorage.getItem('gravitation-music-session');
        
        if (isNewSession) {
            // New session - start from beginning
            console.log('New music session - starting from beginning');
            sessionStorage.setItem('gravitation-music-session', 'active');
            localStorage.removeItem('gravitation-music-position'); // Clear old position
        } else {
            // Same session - restore position from localStorage
            const savedPosition = localStorage.getItem('gravitation-music-position');
            if (savedPosition !== null && parseFloat(savedPosition) > 0) {
                const restorePosition = () => {
                    try {
                        const pos = parseFloat(savedPosition);
                        if (!isNaN(pos) && pos < this.audio.duration) {
                            this.audio.currentTime = pos;
                            console.log(`Restored music position: ${pos.toFixed(1)}s`);
                        }
                    } catch (e) {
                        console.warn('Could not restore music position:', e);
                    }
                };
                
                // Try to restore when metadata is loaded
                if (this.audio.readyState >= 1) {
                    restorePosition();
                } else {
                    this.audio.addEventListener('loadedmetadata', restorePosition, { once: true });
                }
            }
        }

        // Create volume control UI
        this.createVolumeControl();

        // Set initial state and auto-play if not muted
        if (!this.isMuted) {
            this.playMusic();
        }
        this.updateButton();

        // Start periodic saving of playback position
        this.startPositionSaving();

        // Add click listener
        this.button.addEventListener('click', () => this.toggle());

        // Handle audio errors gracefully
        this.audio.addEventListener('error', (e) => {
            console.warn('Audio loading error:', e);
            this.button.style.display = 'none'; // Hide button if audio fails
            if (this.volumeContainer) {
                this.volumeContainer.style.display = 'none';
            }
        });

        // Save position on pause
        this.audio.addEventListener('pause', () => {
            this.savePlaybackPosition();
        });

        // Save position when page becomes hidden (tab switching, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.savePlaybackPosition();
            }
        });

        // Fade in when starting
        this.audio.addEventListener('play', () => {
            this.fadeIn();
        });
    }

    toggle() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    mute() {
        this.isMuted = true;
        this.fadeOut(() => {
            this.audio.pause();
        });
        this.updateButton();
        this.saveState();
    }

    unmute() {
        this.isMuted = false;
        this.playMusic();
        this.updateButton();
        this.saveState();
    }

    playMusic() {
        // Reset to start if at the end
        if (this.audio.ended) {
            this.audio.currentTime = 0;
        }
        
        // Play with promise handling for browsers that require user interaction
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Playback prevented:', error);
                // Browser prevented autoplay, will need user to click
            });
        }
    }

    updateButton() {
        if (!this.button) return;

        const unmutedIcon = this.button.querySelector('.music-icon-unmuted');
        const mutedIcon = this.button.querySelector('.music-icon-muted');

        if (this.isMuted) {
            this.button.classList.add('muted');
            this.button.classList.remove('playing');
            if (unmutedIcon) unmutedIcon.style.display = 'none';
            if (mutedIcon) mutedIcon.style.display = 'block';
        } else {
            this.button.classList.remove('muted');
            this.button.classList.add('playing');
            if (unmutedIcon) unmutedIcon.style.display = 'block';
            if (mutedIcon) mutedIcon.style.display = 'none';
        }
    }

    fadeIn() {
        this.audio.volume = 0;
        const fadeInterval = setInterval(() => {
            if (this.audio.volume < this.volume - 0.01) {
                this.audio.volume = Math.min(this.audio.volume + 0.02, this.volume);
            } else {
                this.audio.volume = this.volume;
                clearInterval(fadeInterval);
            }
        }, 50);
    }

    fadeOut(callback) {
        const fadeInterval = setInterval(() => {
            if (this.audio.volume > 0.02) {
                this.audio.volume = Math.max(this.audio.volume - 0.02, 0);
            } else {
                this.audio.volume = 0;
                clearInterval(fadeInterval);
                if (callback) callback();
            }
        }, 50);
    }

    createVolumeControl() {
        // Create volume container
        this.volumeContainer = document.createElement('div');
        this.volumeContainer.id = 'volume-control';
        this.volumeContainer.className = 'volume-control';
        
        // Create volume slider
        this.volumeSlider = document.createElement('input');
        this.volumeSlider.type = 'range';
        this.volumeSlider.min = '0';
        this.volumeSlider.max = '100';
        this.volumeSlider.value = Math.round(this.volume * 100);
        this.volumeSlider.className = 'volume-slider';
        
        // Create volume percentage display
        const volumeDisplay = document.createElement('div');
        volumeDisplay.className = 'volume-display';
        volumeDisplay.textContent = Math.round(this.volume * 100) + '%';
        
        // Add elements to container
        this.volumeContainer.appendChild(this.volumeSlider);
        this.volumeContainer.appendChild(volumeDisplay);
        
        // Insert after the music button
        this.button.parentNode.insertBefore(this.volumeContainer, this.button.nextSibling);
        
        // Add event listeners
        this.volumeSlider.addEventListener('input', (e) => {
            const newVolume = parseInt(e.target.value) / 100;
            this.setVolume(newVolume);
            volumeDisplay.textContent = e.target.value + '%';
        });
        
        // Show volume control on hover
        this.button.addEventListener('mouseenter', () => {
            this.volumeContainer.classList.add('visible');
        });
        
        this.button.addEventListener('mouseleave', () => {
            // Small delay to allow moving mouse to slider
            setTimeout(() => {
                if (!this.volumeContainer.matches(':hover') && !this.button.matches(':hover')) {
                    this.volumeContainer.classList.remove('visible');
                }
            }, 100);
        });
        
        this.volumeContainer.addEventListener('mouseleave', () => {
            if (!this.button.matches(':hover')) {
                this.volumeContainer.classList.remove('visible');
            }
        });
    }

    setVolume(newVolume) {
        this.volume = Math.max(0, Math.min(1, newVolume));
        this.audio.volume = this.volume;
        this.saveVolume();
        
        // If volume is set above 0, unmute
        if (this.volume > 0 && this.isMuted) {
            this.isMuted = false;
            this.playMusic();
            this.updateButton();
            this.saveState();
        }
    }

    saveState() {
        localStorage.setItem('gravitation-music-muted', this.isMuted.toString());
    }

    saveVolume() {
        localStorage.setItem('gravitation-music-volume', this.volume.toString());
    }

    savePlaybackPosition() {
        if (this.audio && !isNaN(this.audio.currentTime)) {
            localStorage.setItem('gravitation-music-position', this.audio.currentTime.toString());
        }
    }

    startPositionSaving() {
        // Save position every 2 seconds while playing
        this.saveInterval = setInterval(() => {
            if (this.audio && !this.audio.paused) {
                this.savePlaybackPosition();
            }
        }, 2000);
    }
}

// Initialize music player when script loads
const musicPlayer = new MusicPlayer();

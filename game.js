class TracingGame {
    constructor() {
        this.canvas = document.getElementById('tracingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentSection = 'letters';
        this.currentItemIndex = 0;
        this.brushColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        this.currentColorIndex = 0;
        this.brushSize = 15;
        this.completionCount = 0;
        this.interstitialFrequency = 5; // Show interstitial every 5 completions
        
        // Separate arrays for letters and numbers
        this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        this.numbers = '0123456789'.split('');
        
        // Shadow canvas for hit detection
        this.shadowCanvas = document.createElement('canvas');
        this.shadowCanvas.width = this.canvas.width;
        this.shadowCanvas.height = this.canvas.height;
        this.shadowCtx = this.shadowCanvas.getContext('2d');
        
        // Drawing canvas
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCanvas.width = this.canvas.width;
        this.drawingCanvas.height = this.canvas.height;
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeAds();
        this.drawCurrentItem();
        this.updateUI();
    }
    
    initializeAds() {
        // Initialize AdMob ads with error handling and debugging
        try {
            console.log('Initializing AdMob ads...');
            this.updateDebugPanel('sdkStatus', 'Loading...');
            
            // Wait for adsbygoogle to be available
            if (window.adsbygoogle) {
                this.updateDebugPanel('sdkStatus', 'Loaded ✓');
                
                // Set up error handling for ads
                window.addEventListener('error', (e) => {
                    if (e.message && e.message.includes('adsbygoogle')) {
                        console.log('AdMob error detected:', e.message);
                        this.updateDebugPanel('bannerStatus', 'Error ✗');
                    }
                });
                
                // Check banner ads after a delay
                setTimeout(() => {
                    this.checkBannerAds();
                }, 2000);
                
                console.log('AdMob ads initialized successfully');
                
            } else {
                this.updateDebugPanel('sdkStatus', 'Not loaded ✗');
                console.log('AdMob script not loaded yet, retrying...');
                setTimeout(() => this.initializeAds(), 1000);
            }
        } catch (e) {
            this.updateDebugPanel('sdkStatus', 'Failed ✗');
            console.error('AdMob initialization failed:', e);
        }
    }
    
    updateDebugPanel(elementId, status) {
        try {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = status;
            }
        } catch (e) {
            console.log('Debug panel update failed:', e);
        }
    }
    
    checkBannerAds() {
        const bannerAds = document.querySelectorAll('.adsbygoogle');
        let loadedCount = 0;
        
        bannerAds.forEach((ad, index) => {
            if (ad.innerHTML.trim() !== '') {
                loadedCount++;
            }
        });
        
        if (loadedCount > 0) {
            this.updateDebugPanel('bannerStatus', `Loaded ✓ (${loadedCount}/${bannerAds.length})`);
        } else {
            this.updateDebugPanel('bannerStatus', 'Not loaded ✗');
            console.log('Banner ads not loading - possible reasons:');
            console.log('1. Ad blocker enabled');
            console.log('2. Not on HTTPS/localhost');
            console.log('3. Ad unit ID incorrect');
            console.log('4. Domain not authorized in AdMob');
        }
    }
    
    setupEventListeners() {
        // Section selector buttons
        document.getElementById('lettersBtn').addEventListener('click', () => this.switchSection('letters'));
        document.getElementById('numbersBtn').addEventListener('click', () => this.switchSection('numbers'));
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        // Touch events for tablets/phones
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        // Button events
        document.getElementById('clearBtn').addEventListener('click', () => this.clearDrawing());
        document.getElementById('skipBtn').addEventListener('click', () => this.nextItem());
        document.getElementById('successNextBtn').addEventListener('click', () => {
            this.hideSuccessModal();
            this.nextItem();
        });
        
        // Change brush color on canvas click (when not drawing)
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDrawing) {
                this.changeBrushColor();
            }
        });
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x, y);
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Draw on the drawing canvas
        this.drawingCtx.lineWidth = this.brushSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.strokeStyle = this.brushColors[this.currentColorIndex];
        this.drawingCtx.lineTo(x, y);
        this.drawingCtx.stroke();
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x, y);
        
        // Update main canvas
        this.updateMainCanvas();
        
        // Check for success
        this.checkSuccess();
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.drawingCtx.beginPath();
        }
    }
    
    clearDrawing() {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.updateMainCanvas();
    }
    
    changeBrushColor() {
        this.currentColorIndex = (this.currentColorIndex + 1) % this.brushColors.length;
        this.updateBrushIndicator();
    }
    
    updateBrushIndicator() {
        const indicator = document.getElementById('brushIndicator');
        const colorNames = ['Blue', 'Red', 'Green', 'Orange', 'Purple', 'Teal'];
        indicator.textContent = `🎨 ${colorNames[this.currentColorIndex]} Brush`;
        indicator.style.background = this.brushColors[this.currentColorIndex] + 'e6';
    }
    
    drawCurrentItem() {
        // Clear shadow canvas
        this.shadowCtx.clearRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
        
        // Get current item based on section
        const currentItems = this.currentSection === 'letters' ? this.letters : this.numbers;
        const currentItem = currentItems[this.currentItemIndex];
        
        // Draw shadow letter/number
        this.shadowCtx.font = 'bold 200px Arial Rounded MT Bold, Arial';
        this.shadowCtx.fillStyle = '#d0d0d0';
        this.shadowCtx.textAlign = 'center';
        this.shadowCtx.textBaseline = 'middle';
        this.shadowCtx.fillText(currentItem, this.shadowCanvas.width / 2, this.shadowCanvas.height / 2);
        
        this.updateMainCanvas();
    }
    
    updateMainCanvas() {
        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw shadow
        this.ctx.drawImage(this.shadowCanvas, 0, 0);
        
        // Draw user's drawing
        this.ctx.drawImage(this.drawingCanvas, 0, 0);
    }
    
    checkSuccess() {
        const shadowData = this.shadowCtx.getImageData(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
        const drawingData = this.drawingCtx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        let shadowPixels = 0;
        let coveredPixels = 0;
        
        for (let i = 0; i < shadowData.data.length; i += 4) {
            // Check if this is a shadow pixel (not transparent)
            if (shadowData.data[i + 3] > 0) {
                shadowPixels++;
                
                // Check if the user has drawn over this pixel
                if (drawingData.data[i + 3] > 0) {
                    coveredPixels++;
                }
            }
        }
        
        // Calculate coverage percentage
        const coverage = shadowPixels > 0 ? (coveredPixels / shadowPixels) * 100 : 0;
        
        // Success if 80% or more coverage
        if (coverage >= 80) {
            this.showSuccessModal();
        }
    }
    
    showSuccessModal() {
        this.completionCount++;
        this.updateDebugPanel('completionCount', this.completionCount.toString());
        
        // Check if we should show interstitial ad
        if (this.completionCount % this.interstitialFrequency === 0) {
            setTimeout(() => this.showInterstitialAd(), 500);
        }
        
        const modal = document.getElementById('successModal');
        const starsContainer = document.getElementById('starsContainer');
        
        // Clear previous stars
        starsContainer.innerHTML = '';
        
        // Create star animations
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const star = document.createElement('div');
                star.className = 'star';
                star.textContent = '⭐';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                starsContainer.appendChild(star);
                
                // Remove star after animation
                setTimeout(() => star.remove(), 2000);
            }, i * 100);
        }
        
        modal.style.display = 'flex';
        
        // Play success sound (using Web Audio API for a simple beep)
        this.playSuccessSound();
    }
    
    hideSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }
    
    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    nextItem() {
        const currentItems = this.currentSection === 'letters' ? this.letters : this.numbers;
        this.currentItemIndex = (this.currentItemIndex + 1) % currentItems.length;
        this.clearDrawing();
        this.drawCurrentItem();
        this.updateUI();
    }
    
    updateUI() {
        const currentItems = this.currentSection === 'letters' ? this.letters : this.numbers;
        const currentItem = currentItems[this.currentItemIndex];
        document.getElementById('currentItem').textContent = `Trace: ${currentItem}`;
        
        // Update title based on section
        const title = document.querySelector('.title');
        if (this.currentSection === 'letters') {
            title.textContent = '✨ Trace the Letter! ✨';
        } else {
            title.textContent = '✨ Trace the Number! ✨';
        }
        
        // Update section buttons
        document.getElementById('lettersBtn').classList.toggle('active', this.currentSection === 'letters');
        document.getElementById('numbersBtn').classList.toggle('active', this.currentSection === 'numbers');
    }
    
    switchSection(section) {
        if (this.currentSection !== section) {
            this.currentSection = section;
            this.currentItemIndex = 0; // Reset to first item in new section
            this.clearDrawing();
            this.drawCurrentItem();
            this.updateUI();
        }
    }
    
    showInterstitialAd() {
        try {
            console.log('Attempting to show interstitial ad...');
            const interstitialAd = document.getElementById('interstitialAd');
            interstitialAd.style.display = 'flex';
            
            // Refresh the interstitial ad
            if (window.adsbygoogle) {
                (adsbygoogle = window.adsbygoogle || []).push({});
                console.log('Interstitial ad request sent');
            } else {
                console.log('AdMob not available for interstitial');
            }
            
            // Auto-close after 5 seconds if no ad loads
            setTimeout(() => {
                if (interstitialAd.style.display === 'flex') {
                    console.log('Auto-closing interstitial (no ad loaded)');
                    closeInterstitialAd();
                }
            }, 5000);
            
        } catch (e) {
            console.error('Failed to show interstitial ad:', e);
        }
    }
}

// Global function to close interstitial ad
function closeInterstitialAd() {
    const interstitialAd = document.getElementById('interstitialAd');
    interstitialAd.style.display = 'none';
    console.log('Interstitial ad closed');
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TracingGame();
});

// Prevent scrolling on touch devices
document.addEventListener('touchmove', (e) => {
    if (e.target.id === 'tracingCanvas') {
        e.preventDefault();
    }
}, { passive: false });

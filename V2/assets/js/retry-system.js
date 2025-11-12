/**
 * ============================================
 * PROFESSIONAL RETRY SYSTEM
 * ============================================
 * 
 * A robust, production-ready retry system with:
 * - Intelligent exponential backoff
 * - Real-time status updates
 * - User cancellation support
 * - Comprehensive error handling
 * - Live attempt tracking
 * - Timeout management per attempt
 * 
 * Version: 3.0
 * Author: EWU Course Filter Team
 * Last Updated: 2025-11-02
 */

// ===== CONFIGURATION =====

const RetryConfig = {
    MAX_RETRIES: Infinity,          // Infinite retries for resilience
    INITIAL_DELAY: 1000,            // Start with 1 second
    MAX_DELAY: 10000,               // Cap at 10 seconds
    BACKOFF_MULTIPLIER: 1.3,        // Gradual increase
    TIMEOUT_PER_ATTEMPT: 60000,     // 60 seconds per attempt
    AUTO_HIDE_DELAY: 1000,          // Hide success modal after 1 second
    SUCCESS_CODES: [200, 201, 202], // HTTP success codes
    SHOW_MODAL_ON_FIRST_ATTEMPT: false // Don't show modal on first attempt
};

// ===== STATE MANAGEMENT =====

class RetryState {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.active = false;
        this.operation = '';
        this.attempt = 0;
        this.canCancel = true;
        this.userCancelled = false;
        this.startTime = null;
        this.currentController = null;
        this.timerInterval = null;
    }
    
    start(operation) {
        this.reset();
        this.active = true;
        this.operation = operation;
        this.startTime = Date.now();
    }
    
    stop() {
        this.active = false;
        this.cleanup();
    }
    
    cancel() {
        this.userCancelled = true;
        this.stop();
    }
    
    cleanup() {
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Abort current request
        if (this.currentController) {
            try {
                this.currentController.abort();
            } catch (e) {
                console.warn('[Retry] Failed to abort controller:', e);
            }
            this.currentController = null;
        }
    }
}

// Global state instance
const retryState = new RetryState();

// ===== MODAL UI MANAGEMENT =====

class RetryModal {
    constructor() {
        this.modalId = 'retry-modal-v3';
        this.panelElement = null;
    }
    
    show(operation) {
        // Remove any existing modal
        this.hide();
        
        // Create modal structure
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'retry-modal';
        modal.innerHTML = this.getModalHTML(operation);
        
        document.body.appendChild(modal);
        this.panelElement = modal.querySelector('.retry-panel');
        
        // Attach event listeners
        this.attachEvents();
        
        // Start timer
        this.startTimer();
        
        // Make draggable
        this.makeDraggable();
        
        console.log('[RetryModal] Modal shown for:', operation);
    }
    
    getModalHTML(operation) {
        return `
            <div class="retry-panel" data-minimized="false">
                <div class="retry-panel-header" id="retry-drag-handle">
                    <div class="retry-title-section">
                        <div class="retry-spinner-small"></div>
                        <h4 id="retry-title">Connecting...</h4>
                    </div>
                    <div class="retry-controls">
                        <button id="retry-hide-btn" class="retry-btn-icon" title="Hide" type="button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <button id="retry-cancel-btn" class="retry-btn-icon retry-btn-close" title="Cancel" type="button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="retry-panel-body" id="retry-panel-body">
                    <div class="retry-status-row">
                        <span class="retry-status-label">Status:</span>
                        <span id="retry-status" class="retry-status-value status-connecting">Initializing...</span>
                    </div>
                    <div class="retry-progress-thin">
                        <div class="retry-progress-bar-thin"></div>
                    </div>
                    <div class="retry-stats">
                        <div class="retry-stat">
                            <span class="retry-stat-label">Attempt</span>
                            <span id="retry-attempt" class="retry-stat-value">0</span>
                        </div>
                        <div class="retry-stat">
                            <span class="retry-stat-label">Time</span>
                            <span id="retry-timer" class="retry-stat-value">0s</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEvents() {
        const hideBtn = document.getElementById('retry-hide-btn');
        const cancelBtn = document.getElementById('retry-cancel-btn');
        
        if (hideBtn) {
            hideBtn.onclick = () => this.toggleMinimize();
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => this.handleCancel();
        }
    }
    
    toggleMinimize() {
        if (!this.panelElement) return;
        
        const body = document.getElementById('retry-panel-body');
        const hideBtn = document.getElementById('retry-hide-btn');
        const isMinimized = this.panelElement.dataset.minimized === 'true';
        
        if (body) {
            body.style.display = isMinimized ? 'block' : 'none';
        }
        
        this.panelElement.dataset.minimized = isMinimized ? 'false' : 'true';
        
        if (hideBtn) {
            hideBtn.innerHTML = isMinimized ? `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            ` : `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            `;
            hideBtn.title = isMinimized ? 'Hide' : 'Show';
        }
    }
    
    handleCancel() {
        if (!retryState.canCancel) return;
        
        console.log('[RetryModal] User cancelled operation');
        retryState.cancel();
        this.hide();
    }
    
    updateStatus(attempt, status, statusType = 'connecting') {
        const attemptEl = document.getElementById('retry-attempt');
        const statusEl = document.getElementById('retry-status');
        const titleEl = document.getElementById('retry-title');
        
        if (attemptEl) {
            attemptEl.textContent = attempt;
            // Pulse animation
            attemptEl.style.animation = 'none';
            setTimeout(() => {
                attemptEl.style.animation = 'pulse 0.3s ease';
            }, 10);
        }
        
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = 'retry-status-value';
            statusEl.classList.add(`status-${statusType}`);
        }
        
        if (titleEl) {
            titleEl.textContent = statusType === 'success' ? 'Success!' : 
                                 statusType === 'error' ? 'Retrying...' : 
                                 'Connecting...';
        }
        
        console.log(`[RetryModal] Updated - Attempt ${attempt}: ${status}`);
    }
    
    startTimer() {
        retryState.timerInterval = setInterval(() => {
            if (!retryState.startTime) return;
            
            const elapsed = Math.floor((Date.now() - retryState.startTime) / 1000);
            const timerEl = document.getElementById('retry-timer');
            
            if (timerEl) {
                timerEl.textContent = `${elapsed}s`;
            }
        }, 1000);
    }
    
    makeDraggable() {
        const handle = document.getElementById('retry-drag-handle');
        if (!handle || !this.panelElement) return;
        
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        handle.style.cursor = 'move';
        
        handle.addEventListener('mousedown', (e) => {
            // Don't drag if clicking buttons
            if (e.target.closest('.retry-btn-icon')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.panelElement.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            handle.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            // Keep within viewport
            const maxX = window.innerWidth - this.panelElement.offsetWidth;
            const maxY = window.innerHeight - this.panelElement.offsetHeight;
            
            const boundedLeft = Math.max(0, Math.min(newLeft, maxX));
            const boundedTop = Math.max(0, Math.min(newTop, maxY));
            
            this.panelElement.style.right = 'auto';
            this.panelElement.style.left = `${boundedLeft}px`;
            this.panelElement.style.top = `${boundedTop}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'move';
            }
        });
    }
    
    hide() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
        }
        
        retryState.cleanup();
        this.panelElement = null;
        
        console.log('[RetryModal] Modal hidden');
    }
}

// Global modal instance
const retryModal = new RetryModal();

// ===== CORE RETRY ENGINE =====

class RetryEngine {
    /**
     * Execute fetch with intelligent retry logic
     * @param {string} url - API endpoint
     * @param {object} options - Fetch options
     * @param {string} operation - Operation description
     * @returns {Promise<{success: boolean, data: any, response: Response}>}
     */
    async execute(url, options = {}, operation = 'Fetching data') {
        console.log(`[RetryEngine] Starting: ${operation}`);
        
        // Initialize state
        retryState.start(operation);
        
        let attempt = 0;
        let delay = RetryConfig.INITIAL_DELAY;
        let modalShown = false;
        
        // Main retry loop
        while (retryState.active && !retryState.userCancelled) {
            attempt++;
            retryState.attempt = attempt;
            
            try {
                // Show modal only from second attempt onwards (when first attempt fails)
                if (attempt >= 2 && !modalShown) {
                    retryModal.show(operation);
                    modalShown = true;
                }
                
                // Update UI before attempt (only if modal is shown)
                if (modalShown) {
                    retryModal.updateStatus(attempt, `Connecting... (attempt ${attempt})`, 'connecting');
                }
                
                // Execute request with timeout
                const result = await this.attemptFetch(url, options, attempt);
                
                // Check if we should stop (user might have cancelled during request)
                if (retryState.userCancelled) {
                    throw new Error('USER_CANCELLED');
                }
                
                // Validate response
                if (!result.ok) {
                    throw new Error(`HTTP_${result.status}`);
                }
                
                // Parse JSON
                if (modalShown) {
                    retryModal.updateStatus(attempt, 'Parsing response...', 'connecting');
                }
                const data = await this.parseJSON(result);
                
                // Validate data
                if (!this.isValidResponse(data)) {
                    // Check if this is a non-retryable error
                    if (data._noRetry) {
                        // This is a rate limit or ban error - don't retry
                        console.warn('[RetryEngine] Non-retryable error detected, stopping retry');
                        throw new Error('NO_RETRY:' + (data.message || 'Request blocked'));
                    }
                    throw new Error('INVALID_RESPONSE');
                }
                
                // SUCCESS!
                console.log(`[RetryEngine] ✓ Success after ${attempt} attempt(s)`);
                
                // Only show success message if modal was shown
                if (modalShown) {
                    retryModal.updateStatus(attempt, '✓ Connected successfully!', 'success');
                    
                    // Auto-hide and cleanup
                    setTimeout(() => {
                        retryState.stop();
                        retryModal.hide();
                    }, RetryConfig.AUTO_HIDE_DELAY);
                } else {
                    // First attempt succeeded - just cleanup
                    retryState.stop();
                }
                
                return {
                    success: true,
                    data: data,
                    response: result
                };
                
            } catch (error) {
                console.warn(`[RetryEngine] Attempt ${attempt} failed:`, error.message);
                
                // Check for user cancellation
                if (error.message === 'USER_CANCELLED' || retryState.userCancelled) {
                    retryState.stop();
                    if (modalShown) {
                        retryModal.hide();
                    }
                    throw new Error('USER_CANCELLED');
                }
                
                // Check for non-retryable errors (rate limit, ban)
                if (error.message.startsWith('NO_RETRY:')) {
                    const actualMessage = error.message.replace('NO_RETRY:', '');
                    console.warn('[RetryEngine] Non-retryable error, stopping immediately:', actualMessage);
                    
                    // Stop retry state and hide modal
                    retryState.stop();
                    if (modalShown) {
                        retryModal.hide();
                    }
                    
                    // Throw error with the actual message for the caller to handle
                    throw new Error(actualMessage);
                }
                
                // If first attempt failed, show modal now
                if (attempt === 1 && !modalShown) {
                    retryModal.show(operation);
                    modalShown = true;
                }
                
                // Determine error type
                const errorInfo = this.categorizeError(error);
                
                // Update UI with error
                if (modalShown) {
                    retryModal.updateStatus(attempt, errorInfo.message, 'error');
                }
                
                // Calculate delay for next attempt
                const nextDelay = Math.min(delay, RetryConfig.MAX_DELAY);
                console.log(`[RetryEngine] Waiting ${nextDelay}ms before retry...`);
                
                // Show countdown
                await this.delayWithCountdown(nextDelay, attempt, errorInfo.message, modalShown);
                
                // Increase delay for next attempt
                delay = Math.min(delay * RetryConfig.BACKOFF_MULTIPLIER, RetryConfig.MAX_DELAY);
            }
        }
        
        // If loop exits due to cancellation
        if (retryState.userCancelled) {
            throw new Error('USER_CANCELLED');
        }
        
        // Unexpected exit
        throw new Error('RETRY_LOOP_EXITED');
    }
    
    /**
     * Attempt a single fetch with timeout
     */
    async attemptFetch(url, options, attempt) {
        const controller = new AbortController();
        retryState.currentController = controller;
        
        // Set timeout
        const timeoutId = setTimeout(() => {
            console.warn(`[RetryEngine] Attempt ${attempt} timed out after ${RetryConfig.TIMEOUT_PER_ATTEMPT}ms`);
            controller.abort();
        }, RetryConfig.TIMEOUT_PER_ATTEMPT);
        
        try {
            const startTime = Date.now();
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const duration = Date.now() - startTime;
            console.log(`[RetryEngine] Attempt ${attempt} completed in ${duration}ms`);
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        } finally {
            retryState.currentController = null;
        }
    }
    
    /**
     * Parse JSON with error handling
     */
    async parseJSON(response) {
        try {
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[RetryEngine] JSON parse error:', error);
            throw new Error('INVALID_JSON');
        }
    }
    
    /**
     * Validate response data
     */
    isValidResponse(data) {
        if (!data) {
            console.warn('[RetryEngine] Response is null or undefined');
            return false;
        }
        
        // Check for explicit failure status
        if (data.status === 'failed' || data.status === 'error') {
            const message = data.message || '';
            
            // Check for non-retryable errors (banned user, invalid credentials)
            // These should be shown to user immediately, not retried
            if (message.includes('suspended') ||
                message.includes('banned') ||
                message.includes('blocked') ||
                message.includes('Invalid credentials') ||
                message.includes('invalid credentials') ||
                message.includes('Incorrect') ||
                message.includes('incorrect') ||
                message.includes('Wrong password') ||
                message.includes('wrong password')) {
                console.warn('[RetryEngine] Non-retryable error:', message);
                // Mark as special error type
                data._noRetry = true;
            }
            
            console.warn('[RetryEngine] Server returned failure status:', message);
            return false;
        }
        
        return true;
    }
    
    /**
     * Categorize error for better messaging
     */
    categorizeError(error) {
        const message = error.message || '';
        
        if (error.name === 'AbortError' || message.includes('aborted')) {
            return {
                type: 'TIMEOUT',
                message: 'Request timeout - retrying...',
                userFriendly: 'Connection timeout'
            };
        }
        
        if (message.includes('Failed to fetch') || message === 'NetworkError') {
            return {
                type: 'NETWORK',
                message: 'Network error - retrying...',
                userFriendly: 'Network connection failed'
            };
        }
        
        if (message.startsWith('HTTP_')) {
            const code = message.replace('HTTP_', '');
            return {
                type: 'HTTP_ERROR',
                message: `Server error (${code}) - retrying...`,
                userFriendly: `Server returned error ${code}`
            };
        }
        
        if (message === 'INVALID_JSON') {
            return {
                type: 'PARSE_ERROR',
                message: 'Invalid response format - retrying...',
                userFriendly: 'Invalid server response'
            };
        }
        
        if (message === 'INVALID_RESPONSE') {
            return {
                type: 'VALIDATION_ERROR',
                message: 'Invalid response data - retrying...',
                userFriendly: 'Server returned invalid data'
            };
        }
        
        // Generic error
        return {
            type: 'UNKNOWN',
            message: `Error: ${message.substring(0, 30)}...`,
            userFriendly: 'Connection failed'
        };
    }
    
    /**
     * Delay with live countdown display
     */
    async delayWithCountdown(milliseconds, attempt, errorMessage, modalShown) {
        let remaining = Math.ceil(milliseconds / 1000);
        
        return new Promise((resolve) => {
            const countdownInterval = setInterval(() => {
                if (!retryState.active || retryState.userCancelled) {
                    clearInterval(countdownInterval);
                    resolve();
                    return;
                }
                
                if (remaining > 0) {
                    // Only update UI if modal is shown
                    if (modalShown) {
                        retryModal.updateStatus(
                            attempt, 
                            `${errorMessage} (retry in ${remaining}s)`,
                            'error'
                        );
                    }
                    remaining--;
                } else {
                    clearInterval(countdownInterval);
                    resolve();
                }
            }, 1000);
        });
    }
}

// Global engine instance
const retryEngine = new RetryEngine();

// ===== PUBLIC API =====

/**
 * Execute fetch with retry logic
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {string} operation - Operation description
 * @returns {Promise<{success: boolean, data: any, response: Response}>}
 */
async function fetchWithRetry(url, options = {}, operation = 'Fetching data') {
    try {
        return await retryEngine.execute(url, options, operation);
    } catch (error) {
        if (error.message === 'USER_CANCELLED') {
            console.log('[RetrySystem] Operation cancelled by user');
            throw new Error('Cancelled by user');
        }
        
        console.error('[RetrySystem] Fatal error:', error);
        throw error;
    }
}

/**
 * Cancel current retry operation
 */
function cancelRetry() {
    retryState.cancel();
    retryModal.hide();
}

// Export for global access
window.fetchWithRetry = fetchWithRetry;
window.cancelRetry = cancelRetry;

console.log('[RetrySystem] Professional retry system loaded (v3.0)');


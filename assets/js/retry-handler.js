// ========================================
// Intelligent Retry Handler System
// Handles automatic retries with status widget
// ========================================

class RetryHandler {
    constructor() {
        this.isRetrying = false;
        this.attemptNumber = 0;
        this.startTime = null;
        this.retryTimeout = null;
        this.elapsedInterval = null;
        this.shouldStop = false;
        this.widgetElement = null;
        this.isMinimized = false;
        this.onStopCallback = null;
    }

    /**
     * Execute a function with automatic retry logic
     * @param {Function} asyncFunction - The async function to execute
     * @param {Object} options - Configuration options
     * @returns {Promise} - Resolves on success, rejects on invalid credentials
     */
    async executeWithRetry(asyncFunction, options = {}) {
        const {
            onSuccess = () => {},
            onInvalidCredentials = () => {},
            onRetryAttempt = () => {},
            onStop = () => {},
            operationName = 'Connection',
            retryDelay = 1000,
            timeoutMs = 45000
        } = options;

        this.reset();
        this.isRetrying = true;
        this.startTime = Date.now();
        this.shouldStop = false;
        this.attemptNumber = 0;
        this.onStopCallback = onStop;

        const attemptOperation = async () => {
            if (this.shouldStop) {
                this.cleanup();
                return;
            }

            this.attemptNumber++;
            this.updateWidget('connecting', operationName);

            try {
                // Call the async function and wait for the API response
                const result = await this.executeWithTimeout(asyncFunction, timeoutMs);
                
                if (this.shouldStop) {
                    this.cleanup();
                    return;
                }

                // Check if credentials are invalid or account is blocked
                if (result && result.status === 'invalid_credentials') {
                    this.showSuccessAndCleanup(false);
                    onInvalidCredentials(result);
                    return;
                }

                // Success
                this.showSuccessAndCleanup(true);
                onSuccess(result);
                return;

            } catch (error) {
                if (this.shouldStop) {
                    this.cleanup();
                    return;
                }

                const errorReason = error.message || 'Portal busy';
                console.warn(`Attempt ${this.attemptNumber} failed:`, errorReason);
                
                // Show widget after first failure
                if (this.attemptNumber === 1) {
                    this.createWidget();
                }

                // Update widget to show retry status
                this.updateWidget('retrying', operationName, errorReason);
                
                // Notify about retry attempt
                onRetryAttempt(this.attemptNumber, this.getElapsedTime(), errorReason);

                // Wait briefly after getting response before launching the next attempt
                await new Promise((resolve) => {
                    this.retryTimeout = setTimeout(resolve, retryDelay);
                });

                // Auto retry immediately after response/delay
                if (!this.shouldStop) {
                    await attemptOperation();
                }
            }
        };

        await attemptOperation();
    }

    /**
     * Execute function with timeout
     */
    executeWithTimeout(asyncFunction, timeoutMs) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timeout. Retrying...'));
            }, timeoutMs);

            try {
                const result = await asyncFunction();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Create the status widget
     */
    createWidget() {
        if (this.widgetElement) return;

        const widget = document.createElement('div');
        widget.id = 'retryStatusWidget';
        widget.className = 'retry-widget';
        widget.innerHTML = `
            <div class="retry-widget-content">
                <div class="retry-widget-header">
                    <div class="status-indicator">
                        <span class="status-icon-wrapper flex items-center justify-center">
                            <svg class="w-4 h-4 animate-spin text-blue-400 status-icon" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </span>
                        <span class="status-text">Connecting...</span>
                    </div>
                    <div class="retry-widget-actions">
                        <button class="widget-btn minimize-btn" title="Minimize" type="button">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <button class="widget-btn stop-btn" title="Stop" type="button">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div class="retry-widget-body">
                    <div class="retry-stat">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span class="stat-label">Attempt:</span>
                        <span class="stat-value attempt-value">1</span>
                    </div>
                    <div class="retry-stat">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="stat-label">Elapsed:</span>
                        <span class="stat-value elapsed-value">0 sec</span>
                    </div>
                </div>
            </div>
            <div class="retry-widget-minimized">
                <svg class="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span class="mini-badge">1</span>
            </div>
        `;

        document.body.appendChild(widget);
        this.widgetElement = widget;

        // Setup event listeners
        widget.querySelector('.minimize-btn').addEventListener('click', (e) => { e.preventDefault(); this.toggleMinimize(); });
        widget.querySelector('.stop-btn').addEventListener('click', (e) => { e.preventDefault(); this.stop(); });
        widget.querySelector('.retry-widget-minimized').addEventListener('click', (e) => { e.preventDefault(); this.toggleMinimize(); });

        // Start elapsed time counter
        this.startElapsedCounter();

        // Animate in
        setTimeout(() => widget.classList.add('show'), 10);
    }

    /**
     * Update widget status
     */
    updateWidget(status, operationName = 'Connection', errorReason = '') {
        if (!this.widgetElement) return;

        const statusText = this.widgetElement.querySelector('.status-text');
        const iconWrapper = this.widgetElement.querySelector('.status-icon-wrapper');
        const attemptValue = this.widgetElement.querySelector('.attempt-value');
        const miniBadge = this.widgetElement.querySelector('.mini-badge');

        if (attemptValue) attemptValue.textContent = this.attemptNumber;
        if (miniBadge) miniBadge.textContent = this.attemptNumber;

        if (status === 'connecting') {
            if (statusText) statusText.textContent = this.attemptNumber > 1 ? `${operationName} (Attempt ${this.attemptNumber})...` : `${operationName}...`;
            if (iconWrapper) {
                iconWrapper.innerHTML = `<svg class="w-4 h-4 animate-spin text-blue-400 status-icon status-connecting" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
            }
            this.widgetElement.classList.remove('status-timeout', 'status-success');
            this.widgetElement.classList.add('status-connecting');
        } else if (status === 'retrying') {
            if (statusText) statusText.textContent = `Auto-retrying (Attempt ${this.attemptNumber + 1})...`;
            if (iconWrapper) {
                iconWrapper.innerHTML = `<svg class="w-4 h-4 animate-spin text-amber-400 status-icon status-timeout" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;
            }
            this.widgetElement.classList.remove('status-connecting', 'status-success');
            this.widgetElement.classList.add('status-timeout');
        } else if (status === 'success') {
            if (statusText) statusText.textContent = 'Success!';
            if (iconWrapper) {
                iconWrapper.innerHTML = `<svg class="w-4 h-4 text-emerald-400 status-icon status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
            }
            this.widgetElement.classList.remove('status-connecting', 'status-timeout');
            this.widgetElement.classList.add('status-success');
        }
    }

    /**
     * Toggle minimize state
     */
    toggleMinimize() {
        if (!this.widgetElement) return;
        
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.widgetElement.classList.add('minimized');
        } else {
            this.widgetElement.classList.remove('minimized');
        }
    }

    /**
     * Start elapsed time counter
     */
    startElapsedCounter() {
        if (this.elapsedInterval) clearInterval(this.elapsedInterval);
        this.elapsedInterval = setInterval(() => {
            if (!this.widgetElement || !this.startTime) return;
            
            const elapsed = this.getElapsedTime();
            const elapsedValue = this.widgetElement.querySelector('.elapsed-value');
            if (elapsedValue) {
                elapsedValue.textContent = this.formatElapsedTime(elapsed);
            }
        }, 1000);
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Format elapsed time
     */
    formatElapsedTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        if (mins === 0) {
            return `${secs} sec`;
        } else {
            return `${mins} min ${secs} sec`;
        }
    }

    /**
     * Stop retry process
     */
    stop() {
        this.shouldStop = true;
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        this.cleanup();
        if (this.onStopCallback) {
            this.onStopCallback();
        }
    }

    /**
     * Show success animation and cleanup
     */
    showSuccessAndCleanup(isSuccess = true) {
        if (!this.widgetElement) {
            this.cleanup();
            return;
        }

        if (isSuccess) {
            this.updateWidget('success');
        }

        // Animate out after 2 seconds
        setTimeout(() => {
            if (this.widgetElement) {
                this.widgetElement.classList.remove('show');
                setTimeout(() => this.cleanup(), 300);
            }
        }, isSuccess ? 2000 : 1000);
    }

    /**
     * Reset state
     */
    reset() {
        this.isRetrying = false;
        this.attemptNumber = 0;
        this.startTime = null;
        this.shouldStop = false;
        this.isMinimized = false;
        
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        
        if (this.elapsedInterval) {
            clearInterval(this.elapsedInterval);
            this.elapsedInterval = null;
        }
    }

    /**
     * Cleanup and remove widget
     */
    cleanup() {
        this.reset();
        
        if (this.widgetElement && this.widgetElement.parentNode) {
            this.widgetElement.parentNode.removeChild(this.widgetElement);
            this.widgetElement = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetryHandler;
}


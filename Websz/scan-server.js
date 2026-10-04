import express from "express";
import cors from "cors";
import dns from "node:dns/promises";
import tls from "node:tls";
import net from "node:net";
import punycode from "punycode/punycode.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dbManager from "./db-manager.js";
import * as dbRoutes from "./db-routes.js";

// Use the operating system resolver by default. Public DNS can be blocked on
// school/corporate networks, so custom servers are opt-in.
if (process.env.SCANNER_DNS_SERVERS) {
  dns.setServers(process.env.SCANNER_DNS_SERVERS.split(',').map((value) => value.trim()).filter(Boolean));
}

// Catch unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
app.use(cors());
app.use(express.json());

// Polyfill global fetch for Node versions prior to 18
if (typeof fetch === 'undefined') {
  const { default: fetchImpl } = await import('node-fetch');
  // eslint-disable-next-line no-global-assign
  fetch = fetchImpl;
}

const TIMEOUT_MS = 2000; // Lowered further for faster scans
const DISABLE_TLS = false; // Enable TLS checks for SSL certificate validation
const MAX_REDIRECTS = 3;
const FAST_MODE = true; // Return immediately on strong signals
const EARLY_HIGH_SCORE = 35; // heuristics score considered high

// ===== Offline blocklist support =====
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const feedsFile = path.join(__dirname, "feeds", "urls.txt");
const localDenyFile = path.join(__dirname, "feeds", "local-denylist.txt");
const configFile = path.join(__dirname, "scanner.config.json");
let badFull = new Set();
let badHosts = new Set();
let feedsLoadedAt = null;
let config = {};

function normalizeUrl(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    if ((x.protocol === "http:" && x.port === "80") || (x.protocol === "https:" && x.port === "443")) x.port = "";
    if (x.pathname === "/") x.pathname = "";
    const keys = [...x.searchParams.keys()];
    for (const k of keys) if (k.toLowerCase().startsWith("utm_")) x.searchParams.delete(k);
    return x.toString().toLowerCase();
  } catch {
    return null;
  }
}

async function loadFeeds() {
  try {
    const [feedTxt, localTxt] = await Promise.all([
      fs.readFile(feedsFile, "utf8").catch(() => ""),
      fs.readFile(localDenyFile, "utf8").catch(() => "")
    ]);
    const full = new Set();
    const hosts = new Set();
    const patterns = [];
    
    // Load from files
    for (const raw of (feedTxt + "\n" + localTxt).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const norm = normalizeUrl(line);
      if (!norm) continue;
      full.add(norm);
      try { hosts.add(new URL(norm).hostname.toLowerCase()); } catch {}
    }
    
    // Load from database blocklist
    try {
      const dbBlocklist = await dbManager.loadBlocklistToMemory();
      // Merge database blocklist with file-based blocklist
      dbBlocklist.urls.forEach(url => full.add(url));
      dbBlocklist.hosts.forEach(host => hosts.add(host));
      patterns.push(...dbBlocklist.patterns);
      console.log(`🗄️ Database blocklist: ${dbBlocklist.urls.size} URLs, ${dbBlocklist.hosts.size} hosts, ${dbBlocklist.patterns.length} patterns`);
    } catch (e) {
      console.warn(`⚠️ Database blocklist load failed: ${e.message}`);
    }
    
    badFull = full;
    badHosts = hosts;
    feedsLoadedAt = new Date();
    console.log(`✅ Feeds loaded: ${badFull.size} URLs, ${badHosts.size} hosts (file + database)`);
  } catch (e) {
    console.warn(`feed load issue (${e.message})`);
  }
}

await loadFeeds();
setInterval(loadFeeds, 15 * 60 * 1000);

// ===== Optional config (for API keys) =====
async function loadConfig() {
  try {
    const txt = await fs.readFile(configFile, "utf8");
    config = JSON.parse(txt);
    console.log("scanner.config.json loaded");
  } catch (e) {
    config = {};
  }
}
await loadConfig();

// ===== Load configuration from database (real-time) =====
let dbConfig = {};
let databaseConnected = false;
let lastDatabaseWarning = null;
async function loadDbConfig() {
  try {
    const result = await dbManager.getAllConfig();
    if (!result.success) throw new Error(result.error || 'Database configuration unavailable');
    dbConfig = Object.fromEntries(Object.entries(result.data || {}).map(([key, row]) => [key, row.value]));
    databaseConnected = true;
    lastDatabaseWarning = null;
    console.log(`📊 Database config loaded: ${Object.keys(dbConfig).length} settings`);
  } catch (e) {
    databaseConnected = false;
    if (lastDatabaseWarning !== e.message) {
      console.warn(`⚠️ Database config unavailable; using local defaults: ${e.message}`);
      lastDatabaseWarning = e.message;
    }
    dbConfig = {};
  }
}
await loadDbConfig();

// Refresh database config every 30 seconds for real-time updates
setInterval(loadDbConfig, 30 * 1000);

// Helper function to get config value (database overrides file config)
function getConfigValue(key, defaultValue = null) {
  return dbConfig[key] !== undefined ? dbConfig[key] : (config[key] !== undefined ? config[key] : defaultValue);
}

// ===== Reputation API (Google Safe Browsing) =====
const gsbCache = new Map(); // key: url, value { verdict, at }
const GSB_TTL_MS = 24 * 60 * 60 * 1000;

function getGSBKey() {
  // Priority: env var > database config > file config
  return process.env.GOOGLE_SAFE_BROWSING_KEY || getConfigValue('GOOGLE_SAFE_BROWSING_KEY') || null;
}

async function checkGSB(url) {
  const key = getGSBKey();
  if (!key) return { enabled: false, verdict: "unknown" };
  // cache
  const now = Date.now();
  const hit = gsbCache.get(url);
  if (hit && (now - hit.at) < GSB_TTL_MS) return { enabled: true, verdict: hit.verdict, matches: hit.matches || [] };
  const body = {
    client: { clientId: "local-scanner", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE","SOCIAL_ENGINEERING","UNWANTED_SOFTWARE","POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }]
    }
  };
  try {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}` , {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(2500) : undefined
    });
    if (!r.ok) {
      return { enabled: true, verdict: "error", status: r.status };
    }
    const data = await r.json();
    const unsafe = data && data.matches && data.matches.length > 0;
    const out = { enabled: true, verdict: unsafe ? "unsafe" : "safe", matches: data.matches || [] };
    gsbCache.set(url, { verdict: out.verdict, matches: out.matches, at: now });
    return out;
  } catch (e) {
    return { enabled: true, verdict: "error", error: e.message };
  }
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error("timeout")), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function isHttpUrl(url) {
  try {
  const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function dnsCheck(hostname, timeoutMs = TIMEOUT_MS) {
  let timeoutId;
  try {
    const addresses = await Promise.race([
      dns.lookup(hostname, { all: true }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs);
      })
    ]);
    return { ok: true, addresses };
  } catch (e) {
    return { ok: false, error: e.code || e.message };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function httpProbe(url, { timeoutMs = TIMEOUT_MS, maxRedirects = MAX_REDIRECTS, followRedirects = true } = {}) {
  const protocol = (() => { try { return new URL(url).protocol; } catch { return null; } })();
  const result = { ok: false, protocol, status: null, finalUrl: url, redirects: 0, contentType: null, contentLength: null, error: null };
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const { signal, cancel } = timeoutSignal(timeoutMs);
    try {
      let resp = await fetch(current, { method: "HEAD", redirect: "manual", signal });
      let status = resp.status;
      let loc = resp.headers.get("location");
      if (status >= 300 && status < 400 && loc) {
        if (!followRedirects) {
          result.status = status;
          result.ok = true;
          result.finalUrl = current;
          cancel();
          break;
        }
        current = new URL(loc, current).toString();
        result.redirects++;
        cancel();
        continue;
      }
      if (status === 405 || status === 403) {
        cancel();
        const t2 = timeoutSignal(timeoutMs);
        resp = await fetch(current, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "manual", signal: t2.signal });
        status = resp.status;
        loc = resp.headers.get("location");
        if (status >= 300 && status < 400 && loc) {
          if (!followRedirects) {
            result.status = status;
            result.ok = true;
            result.finalUrl = current;
            t2.cancel();
            break;
          }
          current = new URL(loc, current).toString();
          result.redirects++;
          t2.cancel();
          continue;
        }
        result.status = status;
        result.contentType = resp.headers.get("content-type");
        result.contentLength = resp.headers.get("content-length");
        result.ok = status < 400;
        result.finalUrl = resp.url || current;
        t2.cancel();
        break;
      } else {
        result.status = status;
        result.contentType = resp.headers.get("content-type");
        result.contentLength = resp.headers.get("content-length");
        result.ok = status < 400;
        result.finalUrl = resp.url || current;
        cancel();
        break;
      }
    } catch (e) {
      result.error = e.message || String(e);
      cancel();
      try {
        const t3 = timeoutSignal(timeoutMs);
        const resp = await fetch(current, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "manual", signal: t3.signal });
        const status = resp.status;
        const loc = resp.headers.get("location");
        if (status >= 300 && status < 400 && loc) {
          if (!followRedirects) {
            result.status = status;
            result.ok = true;
            result.finalUrl = current;
            t3.cancel();
            break;
          }
          current = new URL(loc, current).toString();
          result.redirects++;
          t3.cancel();
          continue;
        }
        result.status = status;
        result.contentType = resp.headers.get("content-type");
        result.contentLength = resp.headers.get("content-length");
        result.ok = status < 400;
        result.finalUrl = resp.url || current;
        t3.cancel();
        break;
      } catch (e2) {
        result.error = e2.message || String(e2);
        break;
      }
    }
  }
  return result;
}

function parseCertDates(cert) {
  const toDate = (s) => (s ? new Date(s) : null);
  return { notBefore: toDate(cert.valid_from), notAfter: toDate(cert.valid_to) };
}

function daysUntil(date) {
  if (!date) return null;
  return Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
}

async function tlsCheck(hostname, port = 443, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const out = { ok: false, error: null, validHostname: null, daysToExpire: null, issuer: null, subject: null, protocol: null, cipher: null };
    let settled = false;
    let hardTimeout;
    const finish = (socket) => {
      if (settled) return;
      settled = true;
      if (hardTimeout) clearTimeout(hardTimeout);
      if (socket && !socket.destroyed) socket.destroy();
      resolve(out);
    };
    const socket = tls.connect({
      host: hostname,
      port,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    }, () => {
      try {
        const cert = socket.getPeerCertificate();
        if (!cert || !Object.keys(cert).length) {
          out.error = "no_certificate";
          return finish(socket);
        }
        const { notAfter } = parseCertDates(cert);
        out.daysToExpire = daysUntil(notAfter);
        out.issuer = cert.issuer && cert.issuer.O ? cert.issuer.O : (cert.issuer && cert.issuer.CN) || null;
        out.subject = cert.subject && cert.subject.CN ? cert.subject.CN : null;
        out.protocol = socket.getProtocol && socket.getProtocol();
        try {
          const hnErr = tls.checkServerIdentity(hostname, cert);
          out.validHostname = hnErr === undefined;
        } catch {
          out.validHostname = false;
        }
        const c = socket.getCipher && socket.getCipher();
        out.cipher = c ? `${c.name}-${c.version || ""}` : null;
        out.ok = out.validHostname !== false && (out.daysToExpire === null || out.daysToExpire > 0);
      } catch (e) {
        out.error = e.message || String(e);
      } finally {
        finish(socket);
      }
    });
    socket.once("error", (e) => {
      out.error = e.code || e.message;
      finish(socket);
    });
    socket.once("timeout", () => {
      out.error = "timeout";
      finish(socket);
    });
    hardTimeout = setTimeout(() => {
      out.error = out.error || "timeout";
      finish(socket);
    }, timeoutMs + 250);
  });
}

function shannonEntropy(s) {
  if (!s) return 0;
  const freq = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  const len = s.length;
  let H = 0;
  for (const k in freq) {
    const p = freq[k] / len;
    H -= p * Math.log2(p);
  }
  return H;
}

function heuristics(u, customWeights = {}) {
  const url = new URL(u);
  const hostUnicode = punycode.toUnicode(url.hostname);
  const tld = hostUnicode.split(".").pop()?.toLowerCase() || "";
  const isIp = net.isIP(url.hostname) > 0;
  const puny = url.hostname.includes("xn--");
  const subdomains = hostUnicode.split(".").length - 2;
  const hyphens = (hostUnicode.match(/-/g) || []).length;
  const atInPath = url.pathname.includes("@");
  const encPct = (url.pathname.match(/%[0-9a-fA-F]{2}/g) || []).length;
  const hostLen = hostUnicode.length;
  const pathLen = url.pathname.length;
  const qLen = url.search.length;
  const hostEntropy = shannonEntropy(hostUnicode.replace(/\./g, ""));
  const pathEntropy = shannonEntropy(url.pathname.replace(/\//g, ""));
  const lowerHost = hostUnicode.toLowerCase();
  const pathStr = (url.pathname + url.search).toLowerCase();
  const keywords = ["login","verify","update","secure","account","wallet","bank","confirm","invoice","free","gift","bonus","support","pay","reset","unlock","limited","urgent","reward","rewards","claim","airdrop","prize","coupon","promo","earn","giftcard","watch","stream","movie","movies","flixerz","putlocker","fmovies","gomovies","yts","torrent","download"];
  const hasKeyword = keywords.some(k => lowerHost.includes(k) || pathStr.includes(k));
  const susTlds = new Set(["zip","mov","xyz","top","work","gq","cf","tk","ml","click","link","quest","cam","help","to","cc","ws","in","ga","icu","fun","bid","stream","download","pw"]);
  const shorteners = new Set(["bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","is.gd","buff.ly","cutt.ly","short.ly","rb.gy","s.id"]);
  const isShortener = (() => {
    for (const s of shorteners) {
      if (lowerHost === s || lowerHost.endsWith("." + s)) return true;
    }
    return false;
  })();
  
  // Get weights from custom config or use defaults
  const weights = {
    httpNotEncrypted: customWeights.httpNotEncrypted || 100,
    ipAddress: customWeights.ipAddress || 30,
    punycode: customWeights.punycode || 15,
    tldRisk: customWeights.tldRisk || 10,
    manySubdomains: customWeights.manySubdomains || 10,
    manyHyphens: customWeights.manyHyphens || 8,
    longHostname: customWeights.longHostname || 8,
    longPath: customWeights.longPath || 6,
    longQuery: customWeights.longQuery || 6,
    highHostEntropy: customWeights.highHostEntropy || 10,
    highPathEntropy: customWeights.highPathEntropy || 6,
    atInPath: customWeights.atInPath || 8,
    manyEncodedChars: customWeights.manyEncodedChars || 6,
    linkShortener: customWeights.linkShortener || 6,
    phishingKeywords: customWeights.phishingKeywords || 10,
    suspiciousPatterns: customWeights.suspiciousPatterns || 12,
    typosquat: customWeights.typosquat || 14
  };
  
  let score = 0;
  const flags = [];

  if (url.protocol === "http:") { score += weights.httpNotEncrypted; flags.push("http_not_encrypted"); }
  if (isIp) { score += weights.ipAddress; flags.push("ip_literal_host"); }
  if (puny) { score += weights.punycode; flags.push("punycode_host"); }
  if (susTlds.has(tld)) { score += weights.tldRisk; flags.push("suspicious_tld"); }
  if (subdomains > 2) { score += weights.manySubdomains; flags.push("many_subdomains"); }
  if (hyphens > 3) { score += weights.manyHyphens; flags.push("many_hyphens"); }
  if (hostLen > 45) { score += weights.longHostname; flags.push("long_hostname"); }
  if (pathLen > 60) { score += weights.longPath; flags.push("long_path"); }
  if (qLen > 80) { score += weights.longQuery; flags.push("long_query"); }
  if (hostEntropy > 3.8) { score += weights.highHostEntropy; flags.push("high_host_entropy"); }
  if (pathEntropy > 4.2) { score += weights.highPathEntropy; flags.push("high_path_entropy"); }
  if (atInPath) { score += weights.atInPath; flags.push("at_in_path"); }
  if (encPct > 5) { score += weights.manyEncodedChars; flags.push("many_encoded_chars"); }
  if (isShortener) { score += weights.linkShortener; flags.push("link_shortener"); }
  if (hasKeyword) { score += weights.phishingKeywords; flags.push("phishy_keywords"); }
  if (tld === "help" && /(reward|rewards|claim|airdrop|bonus|gift)/.test(pathStr)) {
    score += weights.suspiciousPatterns; flags.push("tld_help_with_reward_pattern");
  }

  // Typosquat with leetspeak and digit substitution; skip official brand roots
  const brandWhitelistRoots = ["facebook.com"]; // add more if needed
  const isWhitelistedBrand = brandWhitelistRoots.some(root => lowerHost === root || lowerHost.endsWith("." + root));
  if (!isWhitelistedBrand) {
    const brands = ["facebook","google","apple","microsoft","amazon","paypal","binance","metamask"];
    const looksLikeLeet = brands.some(br => {
      const re = new RegExp(br
        .replace(/o/g, "[o0]")
        .replace(/i/g, "[i1]")
        .replace(/e/g, "[e3]")
        .replace(/a/g, "[a4]")
        .replace(/s/g, "[s5]")
        .replace(/t/g, "[t7]")
        .replace(/b/g, "[b8]"), "i");
      return re.test(lowerHost) && /\d/.test(lowerHost);
    });
    if (looksLikeLeet) { score += weights.typosquat; flags.push("typosquat_leetspeak"); }
  }

  const risk = score >= 35 ? "high" : score >= 18 ? "medium" : "low";
  return { score, risk, flags, tld, host: hostUnicode, weightsUsed: weights };
}

// Generate detailed score breakdown showing individual checks and their contributions
function generateScoreBreakdown(scanData) {
  const breakdown = [];
  const { heuristics, blocklist, gsb, dns, tls, http } = scanData;
  
  // Heuristic Analysis Breakdown
  if (heuristics && heuristics.score !== undefined) {
    const heuristicBreakdown = {
      category: 'Heuristic Analysis',
      points: heuristics.score,
      maxPoints: 100,
      status: heuristics.score === 0 ? 'safe' : (heuristics.score >= 35 ? 'unsafe' : (heuristics.score >= 18 ? 'caution' : 'safe')),
      flags: [],
      description: 'Pattern-based analysis of URL characteristics'
    };
    
    // Individual flag breakdown
    if (heuristics.flags && Array.isArray(heuristics.flags)) {
      const flagPoints = {
        'http_not_encrypted': 100,
        'ip_address': 30,
        'punycode': 15,
        'suspicious_tld': 10,
        'many_subdomains': 10,
        'many_hyphens': 8,
        'long_hostname': 8,
        'long_path': 6,
        'long_query': 6,
        'high_host_entropy': 10,
        'high_path_entropy': 6,
        'at_in_path': 8,
        'many_encoded_chars': 6,
        'link_shortener': 6,
        'phishy_keywords': 10,
        'suspicious_patterns': 12,
        'typosquat_leetspeak': 14
      };
      
      heuristics.flags.forEach(flag => {
        const points = flagPoints[flag] || heuristics.weightsUsed?.[flag] || 0;
        heuristicBreakdown.flags.push({
          name: flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          points: points,
          severity: points >= 30 ? 'unsafe' : (points >= 10 ? 'caution' : 'safe')
        });
      });
    }
    
    if (heuristics.score === 0) {
      heuristicBreakdown.flags.push({
        name: 'No Suspicious Patterns',
        points: 0,
        severity: 'safe'
      });
    }
    
    breakdown.push(heuristicBreakdown);
  }
  
  // Google Safe Browsing Breakdown
  const gsbBreakdown = {
    category: 'Google Safe Browsing',
    points: 0,
    maxPoints: 100,
    status: 'safe',
    flags: [],
    description: 'Google\'s threat database check'
  };
  
  if (gsb) {
    if (gsb.enabled) {
      if (gsb.verdict === 'unsafe') {
        gsbBreakdown.points = 100;
        gsbBreakdown.status = 'unsafe';
        if (gsb.matches && gsb.matches.length > 0) {
          gsb.matches.forEach(match => {
            gsbBreakdown.flags.push({
              name: match.threatType || 'Threat Detected',
              points: 100,
              severity: 'unsafe'
            });
          });
        } else {
          gsbBreakdown.flags.push({
            name: 'Marked as Unsafe',
            points: 100,
            severity: 'unsafe'
          });
        }
      } else if (gsb.verdict === 'safe') {
        gsbBreakdown.points = 0;
        gsbBreakdown.status = 'safe';
        gsbBreakdown.flags.push({
          name: 'No Threats Found',
          points: 0,
          severity: 'safe'
        });
      } else if (gsb.verdict === 'error') {
        gsbBreakdown.status = 'caution';
        gsbBreakdown.flags.push({
          name: 'Check Failed',
          points: 0,
          severity: 'caution'
        });
      } else {
        gsbBreakdown.flags.push({
          name: 'Unknown Status',
          points: 0,
          severity: 'caution'
        });
      }
    } else {
      gsbBreakdown.status = 'caution';
      gsbBreakdown.flags.push({
        name: 'Check Disabled',
        points: 0,
        severity: 'caution'
      });
    }
  }
  
  breakdown.push(gsbBreakdown);
  
  // Blocklist Breakdown
  const blocklistBreakdown = {
    category: 'Blocklist',
    points: 0,
    maxPoints: 100,
    status: 'safe',
    flags: [],
    description: 'Local blocklist check'
  };
  
  if (blocklist) {
    if (blocklist.match) {
      blocklistBreakdown.points = 100;
      blocklistBreakdown.status = 'unsafe';
      blocklistBreakdown.flags.push({
        name: blocklist.matchType ? `${blocklist.matchType} Match` : 'Blocklist Match',
        points: 100,
        severity: 'unsafe'
      });
    } else {
      blocklistBreakdown.flags.push({
        name: 'No Match',
        points: 0,
        severity: 'safe'
      });
    }
  }
  
  breakdown.push(blocklistBreakdown);
  
  // DNS Lookup Breakdown
  const dnsBreakdown = {
    category: 'DNS Lookup',
    points: 0,
    maxPoints: 100,
    status: 'safe',
    flags: [],
    description: 'Domain name resolution check'
  };
  
  if (dns) {
    if (dns.skipped) {
      dnsBreakdown.status = 'caution';
      dnsBreakdown.flags.push({
        name: 'Check Skipped',
        points: 0,
        severity: 'caution'
      });
    } else if (dns.ok === true || dns.resolved === true) {
      dnsBreakdown.points = 0;
      dnsBreakdown.status = 'safe';
      dnsBreakdown.flags.push({
        name: 'Resolved',
        points: 0,
        severity: 'safe'
      });
    } else if (dns.ok === false || dns.resolved === false) {
      dnsBreakdown.points = 100;
      dnsBreakdown.status = 'unsafe';
      dnsBreakdown.flags.push({
        name: 'DNS Failed',
        points: 100,
        severity: 'unsafe'
      });
    } else {
      dnsBreakdown.status = 'caution';
      dnsBreakdown.flags.push({ name: 'Result Unavailable', points: 0, severity: 'caution' });
    }
  }
  
  breakdown.push(dnsBreakdown);
  
  // SSL/TLS Breakdown
  const sslBreakdown = {
    category: 'SSL/TLS',
    points: 0,
    maxPoints: 100,
    status: 'safe',
    flags: [],
    description: 'Certificate validation check'
  };
  
  if (tls) {
    if (tls.error) {
      sslBreakdown.status = 'caution';
      sslBreakdown.flags.push({
        name: 'Check Unavailable',
        points: 0,
        severity: 'caution'
      });
    } else if (tls.ok) {
      sslBreakdown.flags.push({
        name: 'Valid Certificate',
        points: 0,
        severity: 'safe'
      });
      if (tls.daysUntilExpiry && tls.daysUntilExpiry < 30) {
        sslBreakdown.flags.push({
          name: `Expires in ${tls.daysUntilExpiry} days`,
          points: 10,
          severity: 'caution'
        });
        sslBreakdown.status = 'caution';
        sslBreakdown.points = 10;
      }
    } else if (tls.ok === false) {
      sslBreakdown.points = 50;
      sslBreakdown.status = 'unsafe';
      sslBreakdown.flags.push({
        name: 'Invalid Certificate',
        points: 50,
        severity: 'unsafe'
      });
    }
  } else if (http && http.protocol === 'https:') {
    sslBreakdown.flags.push({
      name: 'Check Skipped',
      points: 0,
      severity: 'caution'
    });
  } else {
    sslBreakdown.flags.push({
      name: 'Invalid',
      points: 0,
      severity: 'caution'
    });
  }
  
  breakdown.push(sslBreakdown);
  
  return breakdown;
}

// Generate intelligent recommendations based on score and detected issues
function generateRecommendations(riskScore, scanData) {
  const recommendations = {
    rating: '',
    messages: [],
    actions: [],
    context: []
  };

  const { heuristics, blocklist, gsb, http, tls, url } = scanData;
  const checksIncomplete = Boolean(
    (gsb?.enabled && !['safe', 'unsafe'].includes(gsb.verdict)) ||
    tls?.error ||
    (http && http.ok === false)
  );
  
  // Determine rating based on score (0-100 scale)
  if (riskScore >= 90) {
    recommendations.rating = 'Very Safe';
    recommendations.messages.push('✅ No malicious indicators were found in the completed checks.');
    if (checksIncomplete) {
      recommendations.messages.push('⚠️ One or more network reputation or certificate checks were unavailable.');
    } else {
      recommendations.messages.push('✅ All enabled security checks passed successfully.');
    }
    if (http?.protocol === 'https:' && tls?.ok) {
      recommendations.messages.push('✅ HTTPS encryption and certificate validation passed.');
    }
    if (heuristics && heuristics.score === 0) {
      recommendations.messages.push('✅ No suspicious patterns detected.');
    }
  } else if (riskScore >= 70) {
    recommendations.rating = 'Safe';
    recommendations.messages.push('✓ This site appears safe with minor concerns.');
    recommendations.messages.push('✓ No major threats detected, but stay vigilant.');
    
    // Add specific warnings for minor issues
    if (heuristics && heuristics.flags) {
      if (heuristics.flags.includes('suspicious_tld')) {
        recommendations.messages.push('⚠️ Uses a less common TLD - use extra caution');
      }
      if (heuristics.flags.includes('new_domain')) {
        recommendations.messages.push('⚠️ Domain registered recently - verify legitimacy');
      }
    }
    if (http && http.protocol !== 'https:') {
      recommendations.messages.push('⚠️ Site uses HTTP - data not encrypted');
    }
  } else if (riskScore >= 50) {
    recommendations.rating = 'Use Caution';
    recommendations.messages.push('⚠️ Exercise caution when visiting this site.');
    recommendations.messages.push('⚠️ Multiple risk indicators detected.');
    
    // Specific warnings
    if (http && http.protocol !== 'https:') {
      recommendations.messages.push('🔍 Site uses HTTP - data not encrypted');
      recommendations.actions.push('Avoid entering personal information');
    }
    if (heuristics && heuristics.flags) {
      if (heuristics.flags.includes('phishy_keywords')) {
        recommendations.messages.push('🔍 Contains suspicious keywords');
      }
      if (heuristics.flags.includes('ip_address')) {
        recommendations.messages.push('🔍 Using IP address instead of domain name');
      }
      if (heuristics.flags.includes('link_shortener')) {
        recommendations.messages.push('🔍 URL shortener detected - final destination unknown');
      }
    }
    
    recommendations.actions.push('Verify site legitimacy before proceeding');
    recommendations.actions.push('Check for HTTPS before entering sensitive data');
    recommendations.actions.push('Look for trust indicators (reviews, contact info)');
  } else if (riskScore >= 30) {
    recommendations.rating = 'Unsafe';
    recommendations.messages.push('⛔ This site shows signs of being unsafe.');
    recommendations.messages.push('⛔ Multiple security threats detected.');
    
    // Critical warnings
    if (gsb && gsb.verdict === 'unsafe') {
      const threatType = gsb.threats && gsb.threats.length > 0 ? gsb.threats[0] : 'unknown';
      recommendations.messages.push(`🚨 Google Safe Browsing flagged as: ${threatType}`);
    }
    if (blocklist && blocklist.match) {
      recommendations.messages.push('🚨 Found in phishing/malware blocklist');
    }
    if (heuristics && heuristics.flags) {
      const keywordCount = heuristics.flags.filter(f => f.includes('keyword')).length;
      if (keywordCount > 0) {
        recommendations.messages.push(`🚨 Contains ${keywordCount} phishing indicators`);
      }
      if (heuristics.flags.includes('suspicious_patterns')) {
        recommendations.messages.push('🚨 URL structure matches known scam patterns');
      }
    }
    
    recommendations.actions.push('DO NOT enter passwords or credit card information');
    recommendations.actions.push('DO NOT download files from this site');
    recommendations.actions.push('Verify the correct URL if you intended to visit a legitimate service');
    recommendations.actions.push('Report this site if it\'s impersonating a known brand');
  } else if (riskScore >= 10) {
    // 10-29% safety score = Very Unsafe but not critical
    recommendations.rating = 'Very Unsafe';
    recommendations.messages.push('🚫 DANGER: This site has significant security risks!');
    recommendations.messages.push('🚫 Strong recommendation to avoid this site.');
    
    // Warnings for this range
    if (heuristics && heuristics.flags) {
      if (heuristics.flags.includes('suspicious_tld')) {
        recommendations.messages.push('⚠️ Uses a suspicious domain extension commonly used by scammers');
      }
      if (heuristics.flags.includes('phishy_keywords')) {
        recommendations.messages.push('⚠️ Contains keywords commonly found in phishing sites');
      }
      if (heuristics.flags.includes('http_not_encrypted')) {
        recommendations.messages.push('⚠️ No encryption - all data transmitted in plain text');
      }
    }
    
    recommendations.actions.push('Avoid visiting this site if possible');
    recommendations.actions.push('DO NOT enter sensitive information (passwords, credit cards, personal data)');
    recommendations.actions.push('Check the URL carefully - it may be impersonating a legitimate site');
    recommendations.actions.push('Use a different, verified source for the same content');
    recommendations.actions.push('If you must visit, use extreme caution');
  } else {
    // 0-9% safety score = Critically dangerous
    recommendations.rating = 'Very Unsafe';
    recommendations.messages.push('🚫 DANGER: This site is very likely malicious!');
    recommendations.messages.push('🚫 DO NOT VISIT this site.');
    
    // Critical alerts
    if (gsb && gsb.verdict === 'unsafe') {
      recommendations.messages.push('⛔ Confirmed threat by Google Safe Browsing');
    }
    if (blocklist && blocklist.match) {
      recommendations.messages.push('⛔ Listed in multiple security blocklists');
    }
    if (heuristics && heuristics.score > 70) {
      recommendations.messages.push('⛔ Failed all security validations');
    }
    
    recommendations.actions.push('IMMEDIATELY close this page if already opened');
    recommendations.actions.push('DO NOT enter any information whatsoever');
    recommendations.actions.push('DO NOT download or run any files');
    recommendations.actions.push('Report to: abuse@registrar.com or phishing services');
    recommendations.actions.push('If you received this link via email/SMS, mark as spam');
    recommendations.actions.push('Warn others who may have received the same link');
  }
  
  // Add context information
  if (heuristics && heuristics.flags) {
    const flags = heuristics.flags;
    if (flags.includes('suspicious_tld')) {
      recommendations.context.push('TLD risk: Common in phishing/scam sites');
    }
    if (flags.includes('phishy_keywords')) {
      recommendations.context.push('Suspicious keywords detected in URL');
    }
    if (flags.includes('ip_address')) {
      recommendations.context.push('Legitimate sites rarely use raw IP addresses');
    }
    if (flags.includes('typosquat')) {
      recommendations.context.push('May be impersonating a legitimate brand');
    }
  }
  
  if (gsb && gsb.threats && gsb.threats.length > 0) {
    recommendations.context.push(`Threat types: ${gsb.threats.join(', ')}`);
  }
  
  if (http && http.protocol === 'http:') {
    recommendations.context.push('No HTTPS encryption - data sent in plain text');
  }

  return recommendations;
}

app.post("/api/scan", async (req, res) => {
  let requestUrl = null;
  try {
    const { url, options = {} } = req.body || {};
    requestUrl = url;
    if (!url || !isHttpUrl(url)) return res.status(400).json({ error: "Provide a valid http/https URL" });
    
    // Extract configuration options with defaults from database config (real-time)
    const {
      enableDNS = getConfigValue('dns_enabled', true),
      enableSSL = getConfigValue('ssl_enabled', false),
      enableGSB = getConfigValue('gsb_enabled', true),
      enableHeuristics = getConfigValue('heuristics_enabled', true),
      followRedirects = true,
      maxRedirects = MAX_REDIRECTS,
      timeout = TIMEOUT_MS,
      heuristicWeights = {},
      safetyWeights = {}
    } = options;

    // Bound caller-provided values so one scan cannot hold sockets open for an
    // excessive period or follow an unbounded redirect chain.
    const effectiveTimeout = Math.max(500, Math.min(Number(timeout) || TIMEOUT_MS, 15000));
    const effectiveMaxRedirects = Math.max(0, Math.min(Number(maxRedirects) || MAX_REDIRECTS, 10));

    // Offline blocklist match
    const norm = normalizeUrl(url);
    const host = (() => { try { return new URL(norm || url).hostname.toLowerCase(); } catch { return null; } })();
    const blocklist = { loaded: !!feedsLoadedAt, loadedAt: feedsLoadedAt, match: false, matchType: null };
    if (feedsLoadedAt) {
      if (norm && badFull.has(norm)) { blocklist.match = true; blocklist.matchType = "full_url"; }
      else if (host && badHosts.has(host)) { blocklist.match = true; blocklist.matchType = "host"; }
    }

    const u = new URL(url);

    // Heuristics on the original URL (fast, no network) - only if enabled
    const heuristicFast = enableHeuristics ? heuristics(url, heuristicWeights) : { score: 0, risk: "low", flags: [], skipped: true };

    // Early exit for immediate results (no network wait)
    if (FAST_MODE && (blocklist.match || u.protocol === "http:" || heuristicFast.score >= EARLY_HIGH_SCORE)) {
      const riskEarly = blocklist.match ? "high" : heuristicFast.risk;
      
      // Calculate scores for early exit
      const heuristicScore = heuristicFast.score || 0;
      let safetyScore = 100 - heuristicScore;
      if (blocklist.match) safetyScore = Math.min(safetyScore, 25);
      const riskScore = 100 - safetyScore;
      
      // Determine status
      let status = 'safe';
      if (riskEarly === 'high' || riskEarly === 'critical') {
        status = 'unsafe';
      } else if (riskEarly === 'medium') {
        status = 'caution';
      }
      
      // Generate recommendations for early exit
      const earlyRecommendations = generateRecommendations(safetyScore, {
        heuristics: heuristicFast,
        blocklist,
        gsb: { enabled: enableGSB && !!getGSBKey(), verdict: "unknown", reason: "early_exit" },
        http: u.protocol === 'http:' ? { protocol: 'http:', ok: false } : null,
        dns: null,
        tls: null,
        url
      });
      
      // Generate score breakdown for early exit
      const earlyScoreBreakdown = generateScoreBreakdown({
        heuristics: heuristicFast,
        blocklist,
        gsb: { enabled: enableGSB && !!getGSBKey(), verdict: "unknown", reason: "early_exit" },
        http: u.protocol === 'http:' ? { protocol: 'http:', ok: false } : { protocol: 'https:', ok: true },
        dns: { ok: false, skipped: true },
        tls: null,
        url
      });
      
      const earlyExitResult = {
        inputUrl: url,
        availability: "unknown",
        http: null,
        dns: null,
        tls: null,
        heuristics: heuristicFast,
        blocklist,
        gsb: { enabled: enableGSB && !!getGSBKey(), verdict: "unknown", reason: "early_exit" },
        verdict: { availability: "unknown", risk: riskEarly, notes: "fast result (early exit)" },
        scores: {
          safety: Math.round(safetyScore),
          risk: Math.round(riskScore),
          heuristic: Math.round(heuristicScore)
        },
        status: status,
        recommendations: earlyRecommendations,
        scoreBreakdown: earlyScoreBreakdown
      };

      // Save early exit scan to database (async, don't wait)
      const earlyExitScanData = {
        inputUrl: url,
        http: null,
        dns: null,
        tls: null,
        heuristics: heuristicFast,
        blocklist,
        gsb: earlyExitResult.gsb,
        verdict: earlyExitResult.verdict,
        recommendations: earlyRecommendations
      };
      
      dbManager.saveScan(earlyExitScanData).then(scanId => {
        console.log(`💾 Early exit scan saved to database: ID ${scanId}`);
        // Calculate stats data for updateStatistics
        const heuristicScore = heuristicFast.score || 0;
        let safetyScore = 100 - heuristicScore;
        if (blocklist.match) safetyScore = Math.min(safetyScore, 25);
        const riskScore = 100 - safetyScore;
        const status = riskEarly === 'high' || riskEarly === 'critical' ? 'unsafe' : (riskEarly === 'medium' ? 'caution' : 'safe');
        
        return dbManager.updateStatistics({
          status: status,
          risk_score: Math.round(riskScore),
          gsb_threats: [],
          blocklist_match: blocklist.match || false
        });
      }).catch(err => {
        console.error(`❌ Failed to save scan: ${err.message}`);
      });

      return res.json(earlyExitResult);
    }

    // Run DNS, HTTP, TLS in parallel for speed - conditionally based on config
    const [dnsInfo, httpInfo, tlsInfo] = await Promise.all([
      enableDNS ? dnsCheck(u.hostname, effectiveTimeout) : Promise.resolve({ ok: true, skipped: true, addresses: [] }),
      httpProbe(url, { timeoutMs: effectiveTimeout, maxRedirects: effectiveMaxRedirects, followRedirects }),
      (enableSSL && u.protocol === "https:") ? tlsCheck(u.hostname, u.port ? Number(u.port) : 443, effectiveTimeout) : Promise.resolve(null)
    ]);

    // Fast fail for unreachable hosts (only if DNS check was enabled and failed)
    if (enableDNS && !dnsInfo.ok) {
      const failedScanResult = {
        inputUrl: url,
        availability: "fail",
        dns: dnsInfo,
        http: httpInfo,
        tls: tlsInfo,
        heuristics: enableHeuristics ? heuristics(url, heuristicWeights) : { skipped: true },
        blocklist,
        gsb: enableGSB ? { enabled: true, verdict: "skipped", reason: "dns_failed" } : { enabled: false, verdict: "disabled" },
        verdict: { availability: "fail", risk: "high", notes: "DNS unreachable." }
      };

      // Save failed scan to database (async, don't wait)
      const failedScanData = {
        inputUrl: url,
        http: httpInfo,
        dns: dnsInfo,
        tls: tlsInfo,
        heuristics: failedScanResult.heuristics,
        blocklist,
        gsb: failedScanResult.gsb,
        verdict: failedScanResult.verdict,
        recommendations: []
      };
      
      dbManager.saveScan(failedScanData).then(scanId => {
        console.log(`💾 Failed scan saved to database: ID ${scanId}`);
        // Update statistics for failed scans too
        const heuristicScore = failedScanResult.heuristics.score || 0;
        let safetyScore = 100 - heuristicScore;
        if (blocklist.match) safetyScore = Math.min(safetyScore, 25);
        const riskScore = 100 - safetyScore;
        
        return dbManager.updateStatistics({
          status: 'unsafe', // DNS failures are marked as unsafe
          risk_score: Math.max(Math.round(riskScore), 80), // Minimum 80 risk for DNS failure
          gsb_threats: [],
          blocklist_match: blocklist.match || false
        });
      }).catch(err => {
        console.error(`❌ Failed to save scan: ${err.message}`);
      });

      return res.json(failedScanResult);
    }

    const finalToCheck = httpInfo.finalUrl || url;
    
    // Run heuristics only if enabled (with custom weights)
    const heuristicInfo = enableHeuristics 
      ? heuristics(finalToCheck, heuristicWeights)
      : { score: 0, risk: "unknown", flags: [], skipped: true };
    
    // Run Google Safe Browsing only if enabled
    const gsb = enableGSB 
      ? await checkGSB(finalToCheck)
      : { enabled: false, verdict: "disabled" };
    
    const availability = httpInfo.ok && (dnsInfo.ok || dnsInfo.skipped) ? "ok" : "fail";
    let risk = heuristicInfo.risk;
    if (blocklist.match) risk = "high";
    if (gsb.enabled && gsb.verdict === "unsafe") risk = "high";

    // Build notes based on what checks were performed
    let notes = "Analysis: ";
    const activeChecks = [];
    if (enableHeuristics) activeChecks.push("Heuristics");
    if (blocklist.loaded) activeChecks.push("Blocklist");
    if (enableGSB && gsb.enabled) activeChecks.push("Google Safe Browsing");
    if (enableDNS) activeChecks.push("DNS");
    if (enableSSL && tlsInfo) activeChecks.push("SSL");
    notes += activeChecks.length > 0 ? activeChecks.join(" + ") : "Basic check only";

    // Calculate numeric safety score (0-100, where 100 is safest)
    let safetyScore = 100 - (heuristicInfo.score || 0); // Invert heuristic score
    if (blocklist.match) safetyScore = Math.min(safetyScore, 25);
    if (gsb.enabled && gsb.verdict === "unsafe") safetyScore = Math.min(safetyScore, 20);
    const riskScore = 100 - safetyScore; // Risk score is inverse of safety
    
    // Determine status based on risk level
    let status = 'safe';
    if (risk === 'high' || risk === 'critical') {
      status = 'unsafe';
    } else if (risk === 'medium') {
      status = 'caution';
    }
    
    // Generate intelligent recommendations based on score and findings
    const recommendations = generateRecommendations(safetyScore, {
      heuristics: heuristicInfo,
      blocklist,
      gsb,
      http: httpInfo,
      dns: dnsInfo,
      tls: tlsInfo,
      url
    });
    
    // Generate detailed score breakdown
    const scoreBreakdown = generateScoreBreakdown({
      heuristics: heuristicInfo,
      blocklist,
      gsb,
      http: httpInfo,
      dns: dnsInfo,
      tls: tlsInfo,
      url
    });

    // Prepare response
    const scanResult = {
      inputUrl: requestUrl,
      availability,
      http: httpInfo,
      dns: dnsInfo,
      tls: tlsInfo,
      heuristics: heuristicInfo,
      blocklist,
      gsb,
      verdict: { availability, risk, notes },
      scores: {
        safety: Math.round(safetyScore),
        risk: Math.round(riskScore),
        heuristic: heuristicInfo.score || 0
      },
      status: status,
      scoreBreakdown: scoreBreakdown,
      recommendations,
      configApplied: {
        enableDNS,
        enableSSL,
        enableGSB,
        enableHeuristics,
        customWeightsUsed: Object.keys(heuristicWeights).length > 0
      }
    };

    // Save scan result to database (async, don't wait)
    const completeScanData = {
      inputUrl: url,
      http: httpInfo,
      dns: dnsInfo,
      tls: tlsInfo,
      heuristics: heuristicInfo,
      blocklist,
      gsb,
      verdict: { availability, risk, notes },
      recommendations
    };
    
    dbManager.saveScan(completeScanData).then(scanId => {
      console.log(`💾 Scan saved to database: ID ${scanId}`);
      // Update statistics with proper data
      const heuristicScore = heuristicInfo.score || 0;
      let safetyScore = 100 - heuristicScore;
      if (blocklist.match) safetyScore = Math.min(safetyScore, 25);
      if (gsb.verdict === 'unsafe' || (gsb.threats && gsb.threats.length > 0)) {
        safetyScore = Math.min(safetyScore, 20);
      }
      const riskScore = 100 - safetyScore;
      
      let status = 'safe';
      if (risk === 'high' || risk === 'critical') {
        status = 'unsafe';
      } else if (risk === 'medium') {
        status = 'caution';
      }
      
      return dbManager.updateStatistics({
        status: status,
        risk_score: Math.round(riskScore),
        gsb_threats: gsb.threats || [],
        blocklist_match: blocklist.match || false
      });
    }).catch(err => {
      console.error(`❌ Failed to save scan: ${err.message}`);
    });

    return res.json(scanResult);
  } catch (e) {
    // Save error/exception to database (async, don't wait)
    const errorScanData = {
      inputUrl: requestUrl || 'unknown',
      http: { error: e.message },
      dns: { error: e.message },
      tls: null,
      heuristics: { skipped: true, error: true },
      blocklist: { match: false },
      gsb: { verdict: "error", reason: "exception" },
      verdict: { availability: "error", risk: "unknown", notes: `Scan exception: ${e.message}` },
      recommendations: []
    };
    
    dbManager.saveScan(errorScanData).then(scanId => {
      console.log(`💾 Error scan saved to database: ID ${scanId}`);
      // Update statistics for error scans
      return dbManager.updateStatistics({
        status: 'unsafe', // Errors are treated as unsafe
        risk_score: 100, // Max risk for errors
        gsb_threats: [],
        blocklist_match: false
      });
    }).catch(err => {
      console.error(`❌ Failed to save error scan: ${err.message}`);
    });

    res.status(500).json({ error: "scan_failed", details: e.message });
  }
});

// ===== Database API Routes =====
// Scan history
app.get("/api/scans/recent", async (req, res) => {
  try {
    await dbRoutes.getRecentScansRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/scans/search", async (req, res) => {
  try {
    await dbRoutes.searchScansRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/scans/:id", async (req, res) => {
  try {
    await dbRoutes.getScanByIdRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Statistics
app.get("/api/stats/today", async (req, res) => {
  try {
    await dbRoutes.getTodayStatsRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/stats/summary", async (req, res) => {
  try {
    await dbRoutes.getSummaryStatsRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/stats/range", async (req, res) => {
  try {
    await dbRoutes.getStatsRangeRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Blocklist management
app.get("/api/blocklist", async (req, res) => {
  try {
    await dbRoutes.getBlocklistRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/blocklist", async (req, res) => {
  try {
    await dbRoutes.addToBlocklistRoute(req, res);
    // Reload blocklist after adding
    await loadFeeds();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/blocklist/:value", async (req, res) => {
  try {
    await dbRoutes.removeFromBlocklistRoute(req, res);
    // Reload blocklist after removal
    await loadFeeds();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/blocklist/check/:value", async (req, res) => {
  try {
    await dbRoutes.checkBlocklistRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Configuration management
app.get("/api/config", async (req, res) => {
  try {
    await dbRoutes.getAllConfigRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/config/:key", async (req, res) => {
  try {
    await dbRoutes.getConfigRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/config", async (req, res) => {
  try {
    await dbRoutes.setConfigRoute(req, res);
    // Reload config immediately after update for real-time changes
    await loadDbConfig();
    console.log(`🔄 Configuration reloaded in real-time`);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cleanup operations
app.post("/api/cleanup/old-scans", async (req, res) => {
  try {
    await dbRoutes.cleanupOldScansRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/cleanup/enforce-limit", async (req, res) => {
  try {
    await dbRoutes.enforceMaxHistoryRoute(req, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    ok: true, 
    feeds: { urls: badFull.size, hosts: badHosts.size, loadedAt: feedsLoadedAt }, 
    gsb: { enabled: !!getGSBKey() },
    database: { connected: databaseConnected, config: Object.keys(dbConfig).length }
  });
});

const port = process.env.PORT || 5050;
const server = app.listen(port, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ URLY Scanner API - Running on http://localhost:${port}  ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  
  console.log(`\n📡 Core Endpoints:`);
  console.log(`   POST http://localhost:${port}/api/scan`);
  console.log(`   GET  http://localhost:${port}/health`);
  
  console.log(`\n� Database Endpoints:`);
  console.log(`   Scans:       GET /api/scans/recent, /api/scans/:id, /api/scans/search`);
  console.log(`   Statistics:  GET /api/stats/today, /api/stats/summary, /api/stats/range`);
  console.log(`   Blocklist:   GET|POST /api/blocklist, DELETE /api/blocklist/:value`);
  console.log(`   Config:      GET|POST /api/config, GET /api/config/:key`);
  
  console.log(`\n�🛡️ Features:`);
  console.log(`   - Google Safe Browsing: ${!!getGSBKey() ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Blocklist URLs: ${badFull.size}`);
  console.log(`   - Blocklist Hosts: ${badHosts.size}`);
  console.log(`   - Database Config: ${Object.keys(dbConfig).length} settings`);
  console.log(`   - Real-time Config: ✅ Enabled (30s refresh)`);
  console.log(`   - Auto-save Scans: ✅ Enabled`);
  
  console.log(`\n⚡ Server ready to accept requests!`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
});

// Keep the server alive
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${port} is already in use!`);
    console.error(`Try: kill the process using port ${port} or use a different port`);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

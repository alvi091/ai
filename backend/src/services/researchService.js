/*
 * Research service — background web research for products.
 * Gathers manufacturer info, expert reviews, community discussions,
 * common problems, and better alternatives using web search.
 *
 * Uses Bright Data SERP API for real Google results (when configured),
 * falls back to Gemini simulation otherwise.
 */

const AIService = require('../ai/AIService');
const config = require('../config');
const prisma = require('../database');

/**
 * Real web search via Bright Data SERP API.
 * Uses the same endpoint as Web Unlocker but with a SERP API zone.
 * Falls back to Gemini simulation if SERP API key is not configured.
 */
async function webSearch(query, numResults = 5) {
  // 1. Try Bright Data SERP API (real Google results)
  if (config.serpApi?.key) {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=in&num=${numResults}`;
      const res = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.serpApi.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone: config.serpApi.zone,
          url: searchUrl,
          format: 'raw',
          data_format: 'parsed_light',
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.organic && data.organic.length > 0) {
          return data.organic.slice(0, numResults).map((r) => ({
            title: r.title || '',
            url: r.link || '',
            snippet: r.description || '',
            domain: r.link ? new URL(r.link).hostname.replace('www.', '') : '',
          }));
        }
      } else {
        const errBody = await res.text().catch(() => '');
        console.warn(`[research] SERP API ${res.status}: ${errBody.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[research] SERP API failed, falling back to Gemini:', err.message);
    }
  }

  // 2. Fallback: Gemini simulation (when SERP API key not configured)
  try {
    const ai = AIService.create('gemini');
    const prompt = `Search the web for: "${query}". Return a JSON array of objects with fields: title, url, snippet, domain. Return ONLY the JSON array, no other text. Limit to ${numResults} results.`;
    const raw = await ai.provider._call(prompt, null, 10000);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  } catch (err) {
    console.error('[research] Web search failed:', err.message);
    return [];
  }
}

async function researchProduct({ productUrl, productName, brand, category }) {
  const queries = [
    `${brand || ''} ${productName || ''} review expert`.trim(),
    `${brand || ''} ${productName || ''} common problems issues`.trim(),
    `${brand || ''} ${productName || ''} alternatives better option`.trim(),
    `${brand || ''} ${productName || ''} reddit discussion`.trim(),
  ];

  const results = await Promise.allSettled(
    queries.map((q) => webSearch(q, 3).catch(() => []))
  );

  const findings = [];
  for (const r of results) {
    for (const item of (r.value || [])) {
      findings.push({
        productUrl,
        productName,
        sourceUrl: item.url || null,
        sourceTitle: item.title || null,
        sourceDomain: item.url ? new URL(item.url).hostname : null,
        sourceType: detectSourceType(item.url, item.domain),
        finding: item.snippet || item.title || '',
        relevance: 0.8,
        confidence: 0.7,
      });
    }
  }

  return findings;
}

function detectSourceType(url, domain) {
  const d = String(domain || url || '').toLowerCase();
  if (/reddit\.com|quora\.com|stackoverflow\.com|forum|discourse|stackexchange/.test(d)) return 'community';
  if (/youtube\.com|youtu\.be|vimeo/.test(d)) return 'review';
  const MARKETPLACE_LIST = ['amazon','flipkart','myntra','meesho','ajio','croma','reliance','tatacliq','jiomart','zepto','blinkit','instamart','swiggy','bigbasket','nykaa','lenskart','boat-lifestyle','jbl','sony.com','samsung.com','apple.com','google.com','oneplus','realme','xiaomi','oppo','vivo','honor','huawei','nokia.com','motorola.com','icici','paytm','phonepe','googlepay','cred'];
  if (MARKETPLACE_LIST.some((m) => d.includes(m))) return 'marketplace';
  if (/wikipedia\.org|official|manufacturer|\.gov|\.edu/.test(d)) return 'brand';
  const NEWS_LIST = ['techcrunch','theverge','engadget','gsmarena','notebookcheck','pcmag','wired.com','arstechnica','venturebeat','androidauthority','androidcentral','9to5google','9to5mac','tomsguide','tomshardware','digitaltrends','mashable','ndtv.com','gadgets360','91mobiles','smartprix','pricebaba','cashify','mysmartprice'];
  if (NEWS_LIST.some((n) => d.includes(n))) return 'news';
  if (/instagram\.com|twitter\.com|x\.com|facebook\.com|linkedin\.com/.test(d)) return 'social';
  return 'other';
}

async function findCommonProblems({ productName, brand, reviews = [] }) {
  const reviewComplaints = [];
  for (const r of reviews) {
    if (r.polarity === 'negative' || (r.rating != null && r.rating <= 2)) {
      reviewComplaints.push(String(r.text || '').slice(0, 200));
    }
  }

  let aiProblems = [];
  try {
    const ai = AIService.create('gemini');
    const prompt = `Based on these negative review excerpts for "${brand || ''} ${productName}":
${reviewComplaints.slice(0, 15).join('\n---\n')}

Identify the top 3-5 common problems. Return JSON array with fields: problem, severity (critical/moderate/minor), description. Only return JSON.`;
    const raw = await Promise.race([
      ai.provider._call(prompt, null, 12000),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 13000)),
    ]);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) aiProblems = JSON.parse(match[0]);
  } catch (err) {
    console.log('[research] Gemini problems skipped, using SERP fallback');
  }

  if (aiProblems.length === 0) {
    try {
      const results = await webSearch(`${brand || ''} ${productName} common problems issues complaints`, 5);
      aiProblems = results
        .filter((r) => r.snippet && r.snippet.length > 20)
        .map((r) => ({
          problem: r.title.replace(/[:?].*$/, '').trim().slice(0, 80),
          severity: 'moderate',
          description: r.snippet,
          source: r.url,
        }));
    } catch (e2) {
      console.error('[research] SERP problems fallback failed:', e2.message);
    }
  }

  return aiProblems;
}

async function findAlternatives({ productName, brand, category, price }) {
  let alternatives = [];
  try {
    const ai = AIService.create('gemini');
    const prompt = `Suggest 3-5 alternative products to "${brand || ''} ${productName}" in the "${category || 'general'}" category, priced around ₹${price || 'unknown'}.
Return JSON array with fields: name, brand, price (approximate INR), advantage, disadvantage, category (better_value/cheaper/better_performance/similar/premium).
Only return JSON.`;
    const raw = await Promise.race([
      ai.provider._call(prompt, null, 12000),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 13000)),
    ]);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) alternatives = JSON.parse(match[0]);
  } catch (err) {
    console.log('[research] Gemini alternatives skipped, using SERP fallback');
  }

  if (alternatives.length === 0) {
    try {
      const results = await webSearch(`${brand || ''} ${productName} alternatives better option ${category || ''}`, 5);
      alternatives = results.map((r) => ({
        name: r.title.replace(/[:?].*$/, '').trim().slice(0, 80),
        brand: brand || '',
        price: price || null,
        advantage: r.snippet,
        disadvantage: '',
        category: 'similar',
        source: r.url,
      }));
    } catch (e2) {
      console.error('[research] SERP alternatives fallback failed:', e2.message);
    }
  }

  return alternatives;
}

module.exports = { researchProduct, findCommonProblems, findAlternatives, webSearch };

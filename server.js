const express = require('express');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Load prompts database
const promptsFile = path.join(__dirname, 'prompts.json');
const allPrompts = JSON.parse(fs.readFileSync(promptsFile, 'utf8'));

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://ai-visibility-frontend-psi.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

const commonCompetitors = [
  'Salesforce', 'HubSpot', 'Microsoft', 'Google', 'Amazon', 'IBM',
  'Adobe', 'Oracle', 'Accenture', 'Deloitte', 'SAP', 'ServiceNow'
];

const knownCompanyDomains = {
  Stripe: 'stripe.com',
  PayPal: 'paypal.com',
  Adyen: 'adyen.com',
  Square: 'squareup.com',
  Block: 'block.xyz',
  Wise: 'wise.com',
  Revolut: 'revolut.com',
  Brex: 'brex.com',
  Chime: 'chime.com',
  Robinhood: 'robinhood.com',
  Shopify: 'shopify.com',
  BigCommerce: 'bigcommerce.com',
  WooCommerce: 'woocommerce.com',
  Salesforce: 'salesforce.com',
  HubSpot: 'hubspot.com',
  Oracle: 'oracle.com',
  SAP: 'sap.com',
  ServiceNow: 'servicenow.com',
  Notion: 'notion.so',
  Asana: 'asana.com',
  Monday: 'monday.com',
  Zoho: 'zoho.com',
  QuickBooks: 'quickbooks.intuit.com',
  Intuit: 'intuit.com',
  Xero: 'xero.com',
  Plaid: 'plaid.com',
  Klarna: 'klarna.com',
  Affirm: 'affirm.com',
  Nubank: 'nubank.com',
  Coinbase: 'coinbase.com',
  OpenAI: 'openai.com',
  Anthropic: 'anthropic.com'
};

const blockedCompetitorTerms = new Set([
  'global reach',
  'competitive landscape',
  'market positioning',
  'market share',
  'customer support',
  'ai visibility',
  'thought leadership',
  'industry trends',
  'best practices',
  'business model',
  'growth opportunities',
  'regulatory landscape',
  'product features',
  'brand awareness',
  'category leader',
  'market leader',
  'global market',
  'local market',
  'comparison analysis',
  'competitive advantage',
  'centric approach',
  'customer centric approach',
  'global strategy',
  'market maturity'
]);

const blockedCompetitorTokens = new Set([
  'global', 'reach', 'competitive', 'landscape', 'market', 'positioning',
  'category', 'analysis', 'visibility', 'presence', 'opportunity', 'trend',
  'insight', 'strategy', 'benchmark', 'performance', 'leadership',
  'centric', 'approach', 'framework', 'maturity'
]);

function normalizeCompanyCandidate(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/^[\s\-•\d\.)(:]+/, '')
    .replace(/[\s,;.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLowerSafe(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function looksLikeCompanyName(candidate) {
  if (!candidate) return false;

  const normalized = normalizeCompanyCandidate(candidate);
  if (!normalized || normalized.length < 2 || normalized.length > 40) return false;

  const lower = toLowerSafe(normalized);
  if (blockedCompetitorTerms.has(lower)) return false;
  if (/\b(analysis|category|market|positioning|visibility|landscape)\b/i.test(normalized)) return false;
  if (/\d{3,}/.test(normalized)) return false;

  const tokens = normalized.split(' ');
  if (tokens.length > 4) return false;

  const blockedTokenRatio = tokens.filter((token) => blockedCompetitorTokens.has(toLowerSafe(token))).length / tokens.length;
  if (blockedTokenRatio >= 0.5) return false;

  // Proper noun heuristic: at least one token starts with uppercase or is all-caps acronym.
  const hasProperNounShape = tokens.some((token) => /^[A-Z][a-zA-Z&'.-]*$/.test(token) || /^[A-Z]{2,}$/.test(token));
  if (!hasProperNounShape) return false;

  return true;
}

function inferDomainsFromBrands(brands) {
  const inferred = [];
  brands.forEach((brand) => {
    const domain = knownCompanyDomains[brand];
    if (domain) inferred.push(domain);
  });
  return Array.from(new Set(inferred));
}

function classifySourceType(domain) {
  const lower = toLowerSafe(domain);
  if (/reddit|quora|medium|substack|discord/.test(lower)) return 'community';
  if (/techcrunch|forbes|wired|venturebeat|bloomberg|cnbc|businessinsider|theinformation/.test(lower)) return 'media';
  if (/association|journal|whitepaper|report|industry|insider|review|g2|capterra/.test(lower)) return 'industry';
  return 'product';
}

function confidenceRank(level) {
  return { low: 1, medium: 2, high: 3 }[level] || 1;
}

function scoreSourceQuality(source, industry) {
  const type = classifySourceType(source);
  const typeWeights = {
    product: 85,
    media: 75,
    industry: 68,
    community: 55
  };
  const industryBoost = source.includes(toLowerSafe(industry)) ? 5 : 0;
  return {
    source,
    type,
    authority: Math.min(100, typeWeights[type] + industryBoost)
  };
}

function buildSourceEntry(domain, industry, inferred = false, mentionCount = 1) {
  const scored = scoreSourceQuality(domain, industry || 'general');
  return {
    source: scored.source,
    type: scored.type,
    confidence: inferred ? 'medium' : 'high',
    inferred,
    mentionCount,
    authority: scored.authority
  };
}

function mergeSourceEntry(existing, incoming) {
  if (!existing) return { ...incoming };
  const dominantConfidence = confidenceRank(incoming.confidence) > confidenceRank(existing.confidence)
    ? incoming.confidence
    : existing.confidence;
  return {
    source: existing.source,
    type: existing.authority >= incoming.authority ? existing.type : incoming.type,
    confidence: dominantConfidence,
    inferred: existing.inferred && incoming.inferred,
    mentionCount: existing.mentionCount + incoming.mentionCount,
    authority: Math.max(existing.authority, incoming.authority)
  };
}

function isTrustedCompetitor(competitorName, industry) {
  if (!looksLikeCompanyName(competitorName)) return false;
  if (knownCompanyDomains[competitorName]) return true;
  return scoreCompetitorRelevance(competitorName, industry) >= 2;
}

// Get real response from OpenAI API with smart prompt engineering
async function getAIResponse(prompt, brandName = null, analysisType = 'generic', industry = null, mode = 'quick') {
  try {
    // Enhanced prompt construction based on category and industry
    let finalPrompt = prompt;
    let systemContext = 'You are an AI visibility and market intelligence analyst. Focus on strategic insights, competitive positioning, real competitor brands, and real source domains rather than generic responses.';

    if (brandName && industry) {
      if (analysisType === 'comparison') {
        finalPrompt = `Analyze how ${brandName} compares to other ${industry} solutions. Examine positioning, competitive advantages, and market dynamics.`;
        systemContext = `You are a market intelligence analyst specializing in ${industry}. Focus on competitive positioning, feature comparisons, and market share dynamics.`;

      } else if (analysisType === 'brand') {
        finalPrompt = `Evaluate ${brandName}'s market presence and positioning in ${industry}. Assess strategic positioning and market challenges.`;
        systemContext = `You are an AI visibility strategist specializing in ${industry} brand positioning. Analyze how brands perform in AI-generated responses and provide strategic insights.`;

      } else if (analysisType === 'niche') {
        finalPrompt = `When considering specialized ${industry} applications, evaluate market positioning and competitive landscape.`;
        systemContext = `You are a ${industry} market researcher. Focus on niche segments and specialized use cases.`;

      } else { // generic
        finalPrompt = `In the context of ${industry} solutions, analyze market trends and positioning.`;
        systemContext = `You are a market intelligence analyst specializing in ${industry}. Focus on strategic insights and competitive positioning.`;
      }
    }

    console.log('\n📡 Calling OpenAI API...');
    console.log(`   Analysis Type: ${analysisType}`);
    console.log(`   Brand: ${brandName}`);
    console.log(`   Industry: ${industry}`);
    console.log(`   Prompt: "${finalPrompt.substring(0, 120)}..."`);

    // Add timeout wrapper for OpenAI call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI request timeout after 30 seconds')), 30000);
    });

    if (mode === 'full') {
      systemContext += ' For full analysis, provide richer evidence, mention real competitor brands when appropriate, and cite real websites or domains when they are implied by the market context.';
    }

    const openaiPromise = openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: systemContext
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: mode === 'full' ? 0.45 : 0.6,
      max_tokens: mode === 'full' ? 950 : 700
    });

    const response = await Promise.race([openaiPromise, timeoutPromise]);

    const content = response.choices[0].message.content;
    console.log(`   ✅ Response received (${content.length} characters)`);
    console.log(`   Preview: ${content.substring(0, 120)}...`);

    return content;
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    throw error;
  }
}

// Detect brand mentions in text (case-insensitive)
function detectBrandMentions(brandName, text) {
  const regex = new RegExp(`\\b${brandName}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Extract competitor names from text (strict company-only extraction)
function extractCompetitors(text, industry = null, brandName = null) {
  if (!text) return [];

  const found = new Set();

  const excludedBrand = brandName ? toLowerSafe(brandName) : null;

  // Dynamic extraction patterns for company-like names.
  const companyPatterns = [
    /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}\b/g,
    /\b[A-Z][a-z]+[A-Z][a-zA-Z]+\b/g,
    /\b[A-Z]{2,}\b/g,
    /\b[A-Z][a-zA-Z]+(?:\.[A-Z][a-zA-Z]+)?\b/g
  ];

  companyPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const candidate = normalizeCompanyCandidate(match);
        if (!looksLikeCompanyName(candidate)) return;
        if (excludedBrand && toLowerSafe(candidate) === excludedBrand) return;

        if (!industry || scoreCompetitorRelevance(candidate, industry) > 0 || knownCompanyDomains[candidate]) {
          found.add(candidate);
        }
      });
    }
  });

  // Extract companies near comparison keywords.
  const competitorIndicators = /\b(vs|versus|compared to|vs\.|alternative to|competitor to|rivals?|challengers?)\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|\.|\?|!|$)/gi;
  let match;
  while ((match = competitorIndicators.exec(text)) !== null) {
    const competitor = normalizeCompanyCandidate(match[2]);
    if (!looksLikeCompanyName(competitor)) continue;
    if (excludedBrand && toLowerSafe(competitor) === excludedBrand) continue;
    if (!industry || scoreCompetitorRelevance(competitor, industry) > 0 || knownCompanyDomains[competitor]) {
      found.add(competitor);
    }
  }

  // Add known brands if directly mentioned in text.
  Object.keys(knownCompanyDomains).forEach((company) => {
    const pattern = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(text)) {
      if (!excludedBrand || toLowerSafe(company) !== excludedBrand) {
        found.add(company);
      }
    }
  });

  const allCompetitors = Array.from(found)
    .filter((comp) => looksLikeCompanyName(comp))
    .filter((comp) => !excludedBrand || toLowerSafe(comp) !== excludedBrand)
    .filter((comp) => isTrustedCompetitor(comp, industry));

  // Return only real-looking company names; empty means no trustworthy competitor signal.
  if (allCompetitors.length === 0) {
    return [];
  }

  return allCompetitors.slice(0, 10);
}

// Analyze brand position in response text
function analyzeBrandPosition(brandName, text) {
  if (!text || text.length === 0) {
    return { position: 'none', percentage: 0 };
  }

  const lowerText = toLowerSafe(text);
  const lowerBrand = toLowerSafe(brandName);
  const index = lowerText.indexOf(lowerBrand);

  if (index === -1) {
    return { position: 'none', percentage: 0 };
  }

  const percentage = (index / text.length) * 100;

  if (percentage < 15) return { position: 'beginning', percentage: Math.round(percentage) };
  if (percentage < 50) return { position: 'middle', percentage: Math.round(percentage) };
  return { position: 'end', percentage: Math.round(percentage) };
}

// Detect context format of brand mention
function detectMentionContext(brandName, text) {
  const contexts = {
    listFormat: false,
    comparisonFormat: false,
    paragraphExplanation: false
  };

  if (!text) return contexts;

  const lowerText = toLowerSafe(text);
  const lowerBrand = toLowerSafe(brandName);

  // List format detection: numbered/bulleted lists
  if (/^[\s]*[\d\.\-*•]\s+.+{brandName}/im.test(text) || 
      /Top\s+\d+|Leading|Popular|Best/.test(text)) {
    contexts.listFormat = true;
  }

  // Comparison format detection: vs, compared, versus, etc.
  if (/vs\.?|versus|compared|against|alternative|rival/.test(text)) {
    contexts.comparisonFormat = true;
  }

  // Paragraph explanation: longer explanatory context
  const sentenceWithBrand = text.split('.').find(s => toLowerSafe(s).includes(lowerBrand));
  if (sentenceWithBrand && sentenceWithBrand.length > 50) {
    contexts.paragraphExplanation = true;
  }

  return contexts;
}

// Extract URLs and domain references; infer from real brand mentions when URLs are absent.
function extractSources(text, industry = null, competitors = [], mode = 'quick') {
  if (!text) return [];

  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z]+\.[a-z]{2,}/gi;
  const matches = text.match(urlRegex) || [];

  const extractedSources = matches
    .filter(url => url.length > 4)
    .map(url => {
      const cleanUrl = url.replace(/[,;.!?]$/, '');
      try {
        const domain = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`).hostname;
        return domain.replace('www.', '');
      } catch {
        return cleanUrl.replace('www.', '');
      }
    })
    .filter(domain => {
      // Remove only clearly irrelevant/spammy domains
      const irrelevant = [
        'example.com', 'example.org', 'test.com', 'localhost', 'google.com', 
        'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'wikipedia.org', 'reddit.com', 'quora.com', 'stackoverflow.com', 'github.com',
        'amazon.com', 'ebay.com', 'craigslist.org', 'etsy.com', 'pinterest.com',
        'tiktok.com', 'snapchat.com', 'discord.com', 'twitch.tv', 'tumblr.com'
      ];
      
      return !irrelevant.includes(domain) && 
             domain.length > 4 &&
             domain.length < 50 &&
             !domain.includes('spam') &&
             !domain.includes('fake') &&
             !domain.includes('test');
    })
    .map(domain => {
      // Score each source by quality and industry relevance
      const quality = scoreSourceQuality(domain, industry || 'general');
      return { ...quality, domain };
    })
    .sort((a, b) => b.authority - a.authority)
    .map(item => item.source);

  const dedupedSources = [...new Set(extractedSources)]
    .slice(0, 8)
    .map((domain) => buildSourceEntry(domain, industry, false, 1));

  if (dedupedSources.length > 0) {
    return dedupedSources;
  }

  const inferredSources = inferDomainsFromBrands(competitors);
  return inferredSources.slice(0, mode === 'full' ? 5 : 3).map((domain) => buildSourceEntry(domain, industry, true, 1));
}

// Build detailed competitor analysis
function analyzeCompetitorsDetailed(allResults) {
  const competitorMap = {};

  allResults.forEach(result => {
    result.competitors.forEach(competitor => {
      if (!competitorMap[competitor]) {
        competitorMap[competitor] = {
          totalMentions: 0,
          byCategory: { generic: 0, niche: 0, comparison: 0, brand: 0 }
        };
      }
      competitorMap[competitor].totalMentions += 1;
      if (competitorMap[competitor].byCategory[result.category] !== undefined) {
        competitorMap[competitor].byCategory[result.category] += 1;
      }
    });
  });

  const breakdown = {};
  Object.keys(competitorMap).forEach(comp => {
    breakdown[comp] = competitorMap[comp];
  });

  const byCategory = { generic: {}, niche: {}, comparison: {}, brand: {} };
  Object.values(['generic', 'niche', 'comparison', 'brand']).forEach(cat => {
    const sorted = Object.entries(competitorMap)
      .filter(([_, data]) => data.byCategory[cat] > 0)
      .sort((a, b) => b[1].byCategory[cat] - a[1].byCategory[cat])
      .slice(0, 5)
      .map(([name, data]) => ({ name, mentions: data.byCategory[cat] }));
    byCategory[cat] = sorted;
  });

  return { breakdown, byCategory };
}

// Rate competitor by industry relevance
function scoreCompetitorRelevance(competitorName, industry) {
  // Filter out non-competing general tech companies
  const genericTech = ['Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Facebook', 'Twitter', 'LinkedIn'];
  if (genericTech.includes(competitorName)) return 0; // Not a direct competitor
  
  // Industry-specific scoring
  const industryRelated = {
    fintech: ['Stripe', 'PayPal', 'Square', 'Wise', 'Adyen', 'Revolut', 'Brex', 'Chime', 'Robinhood'],
    saas: ['Salesforce', 'HubSpot', 'Slack', 'Asana', 'Notion', 'Monday', 'Jira'],
    realestate: ['Zillow', 'Redfin', 'Realtor', 'Trulia', 'Rightmove'],
    education: ['Coursera', 'Udemy', 'Skillshare', '2U', 'edX', 'MasterClass'],
    ecommerce: ['Shopify', 'WooCommerce', 'BigCommerce', 'Wix', 'Magento']
  };
  
  const normalizedIndustry = toLowerSafe(industry).replace(/\s+/g, '');
  const relevantsForIndustry = industryRelated[normalizedIndustry] || [];
  
  if (relevantsForIndustry.includes(competitorName)) return 3;
  if (knownCompanyDomains[competitorName]) return 2;
  return 0; // Not relevant
}

// Analyze competitor presence with quantitative benchmarking
function analyzeCompetitorPresence(competitors, globalResults, brandName) {
  const analysis = [];
  
  // Calculate brand mention frequency
  const brandMentions = globalResults.reduce((sum, r) => sum + r.mentions, 0);
  const brandAvgMention = brandMentions / globalResults.length;
  
  for (const competitor of competitors.slice(0, 3)) {
    const mentions = globalResults.filter(r => r.competitors.includes(competitor)).length;
    const percentage = (mentions / globalResults.length * 100);
    const coverage = mentions;
    
    if (mentions > 0) {
      // Calculate relative frequency vs brand
      let relativeFrequency = 'N/A';
      if (brandAvgMention > 0) {
        const ratio = (mentions / brandMentions * (globalResults.length / globalResults.length)).toFixed(1);
        relativeFrequency = `${ratio}x`;
      }
      
      analysis.push({
        competitor,
        mentions,
        percentage: parseFloat(percentage.toFixed(1)),
        coverage: `${coverage}/${globalResults.length} prompts`,
        relativeFrequency,
        // Evidence-based signal, not speculation
        signal: percentage > 50 
          ? `appears in ${coverage}/${globalResults.length} prompts (${percentage.toFixed(0)}% coverage)`
          : percentage > 25
          ? `mentioned in ${coverage}/${globalResults.length} responses (${percentage.toFixed(0)}% coverage)`
          : `mentioned in only ${coverage}/${globalResults.length} responses (${percentage.toFixed(0)}% coverage)`
      });
    }
  }
  
  return analysis;
}

// Identify brand gaps with evidence-based reasoning
function analyzeBrandGaps(categoryScores, globalResults, brandName, weakestCategory, industry) {
  const weakCategoryResults = globalResults.filter(r => r.category === weakestCategory);
  const responsesWithBrand = weakCategoryResults.filter(r => r.mentions > 0).length;
  const responseRate = parseFloat((responsesWithBrand / weakCategoryResults.length * 100).toFixed(1));
  const totalResponses = weakCategoryResults.length;
  
  // Evidence-based signal only
  const signal = {
    coverage: `${responsesWithBrand}/${totalResponses}`,
    percentage: responseRate
  };
  
  return { responseRate, signal };
}

// Build competitor vs brand comparison matrix
function buildCompetitorComparison(competitors, globalResults, brandName) {
  const brandMentions = globalResults.reduce((sum, r) => sum + r.mentions, 0);
  const brandAvgPerPrompt = (brandMentions / globalResults.length).toFixed(2);
  
  const competitorStats = competitors.map(comp => {
    const mentions = globalResults.filter(r => r.competitors.includes(comp)).length;
    const coverage = (mentions / globalResults.length * 100).toFixed(1);
    return {
      name: comp,
      mentions,
      coverage: parseFloat(coverage),
      mentionsPerPrompt: (mentions / globalResults.length).toFixed(2),
      relevanceScore: scoreCompetitorRelevance(comp, 'general')
    };
  });
  
  return {
    brand: {
      name: brandName,
      totalMentions: brandMentions,
      avgPerPrompt: brandAvgPerPrompt,
      coverage: (brandMentions / globalResults.length * 100).toFixed(1)
    },
    competitors: competitorStats
  };
}

function aggregateSources(allResults, industry, mode) {
  const merged = new Map();

  (allResults || []).forEach((result) => {
    (result.sources || []).forEach((entry) => {
      const key = entry.source;
      merged.set(key, mergeSourceEntry(merged.get(key), entry));
    });
  });

  const competitorFallback = {};
  (allResults || []).forEach((result) => {
    (result.competitors || []).forEach((competitor) => {
      competitorFallback[competitor] = (competitorFallback[competitor] || 0) + 1;
    });
  });

  if (mode === 'full' && merged.size < 3) {
    Object.entries(competitorFallback)
      .sort((a, b) => b[1] - a[1])
      .forEach(([competitor, mentionCount]) => {
        const domain = knownCompanyDomains[competitor];
        if (!domain) return;
        if (merged.has(domain)) return;
        merged.set(domain, buildSourceEntry(domain, industry, true, mentionCount));
      });
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const confidenceDelta = confidenceRank(b.confidence) - confidenceRank(a.confidence);
      if (confidenceDelta !== 0) return confidenceDelta;
      if (b.mentionCount !== a.mentionCount) return b.mentionCount - a.mentionCount;
      return b.authority - a.authority;
    })
    .slice(0, 5)
    .map(({ source, type, confidence, inferred, mentionCount }) => ({
      source,
      type,
      confidence,
      inferred,
      mentionCount
    }));
}

function buildChannelPerformance(topSources) {
  const grouped = {};
  (topSources || []).forEach((source) => {
    const key = source.type || 'industry';
    grouped[key] = (grouped[key] || 0) + (source.mentionCount || 0);
  });

  return Object.entries(grouped).map(([channel, contribution]) => ({
    channel,
    contribution
  }));
}

function calculateSourceConfidenceScore(topSources) {
  if (!Array.isArray(topSources) || topSources.length === 0) return 0;
  const totalMentions = topSources.reduce((sum, item) => sum + (item.mentionCount || 0), 0) || 1;
  const weighted = topSources.reduce((sum, item) => sum + confidenceRank(item.confidence) * (item.mentionCount || 0), 0);
  return Math.round((weighted / (totalMentions * 3)) * 100);
}

function calculateCompetitorPressureScore(topCompetitors, totalPrompts) {
  if (!Array.isArray(topCompetitors) || topCompetitors.length === 0) return 0;
  const pressure = topCompetitors.reduce((sum, item) => sum + (item.mentionCount || 0), 0);
  return Math.min(100, Math.round((pressure / Math.max(1, totalPrompts)) * 35));
}

function calculateVisibilityScore(results, topSources, topCompetitors) {
  const totalPrompts = Math.max(1, (results || []).length);
  const promptsWithBrand = (results || []).filter((item) => (item.mentions || 0) > 0).length;
  const totalMentions = (results || []).reduce((sum, item) => sum + (item.mentions || 0), 0);
  const mentionCoverage = (promptsWithBrand / totalPrompts) * 100;
  const mentionIntensity = Math.min(100, (totalMentions / totalPrompts) * 45);
  const sourceConfidenceScore = calculateSourceConfidenceScore(topSources);
  const competitorPressureScore = calculateCompetitorPressureScore(topCompetitors, totalPrompts);
  return Math.max(0, Math.min(100, Math.round((mentionCoverage * 0.5) + (mentionIntensity * 0.25) + (sourceConfidenceScore * 0.2) - (competitorPressureScore * 0.15))));
}

function calculateVisibilityRiskScore(visibilityScore, competitorPressureScore, sourceConfidenceScore) {
  const rawRisk = 100 - visibilityScore + (competitorPressureScore * 0.45) + ((100 - sourceConfidenceScore) * 0.2);
  return Math.max(0, Math.min(100, Math.round(rawRisk)));
}

// Generate specific, actionable recommendations tied to actual data
// Helper: Generate opening narrative summary
function generateNarrativeSummary(brandName, globalScore, brandCoveragePercent, topCompetitor) {
  if (globalScore < 0.5) {
    return `${brandName} is INVISIBLE to AI systems. Appears in <${brandCoveragePercent}% of responses—essentially unknown in ${topCompetitor ? `comparison to ${topCompetitor.name}` : 'this market'}. Fixing this is YOUR #1 priority.`;
  } else if (globalScore < 0.8) {
    return `${brandName} is UNDERREPRESENTED. AI systems mention it in ~${brandCoveragePercent}% of responses—competitors dominate. This visibility gap is directly suppressing new customer discovery.`;
  } else if (globalScore < 1.5) {
    return `${brandName} has MODERATE visibility. Appears in ${brandCoveragePercent}% of responses but with a specific weakness: certain buyer journey stages are completely missed. Fix the gaps to multiply impact.`;
  } else {
    return `${brandName} has STRONG visibility. Appears in ${brandCoveragePercent}% of responses across most categories. Opportunity: Convert dominance into category ownership.`;
  }
}

// Helper: Map category to content types
function contentTypeForCategory(category) {
  const contentMap = {
    generic: 'Comparison guides, "how to choose", beginner resources, category primers',
    niche: 'Use-case specific content, vertical case studies, implementation playbooks',
    comparison: 'vs competitor content, feature matrices, evaluation frameworks, customer stories',
    brand: 'Brand storytelling, founder insights, company milestones, ROI case studies, social proof'
  };
  return contentMap[category] || 'Educational content';
}

// Helper: Map category to query types
function queryTypeForCategory(category) {
  const queryMap = {
    generic: 'broad discovery queries ("what is ...", "how do I choose ...", "options for ...")',
    niche: 'vertical/use-case queries ("for healthcare", "in manufacturing", "for startups")',
    comparison: 'evaluation queries ("vs", "alternatives", "comparison", "best for")',
    brand: 'branded queries (company name + keywords, category + brand, reviews)'
  };
  return queryMap[category] || 'relevant search queries';
}

// Helper: Get full content strategy for category
function getContentStrategyForCategory(category) {
  const strategies = {
    generic: {
      contentTypes: 'Comparison guides, "how to choose" articles, beginner primers, category overviews',
      queryPatterns: 'generic discovery queries ("what are the options", "how do I choose", "best for")\n',
      opportunity: 'Own the entry point. Buyers asking "what should I consider?" need your answers',
      pieceCount: '8-12 pieces',
      businessImpact: 'Highest volume buyer intent'
    },
    niche: {
      contentTypes: 'Vertical case studies, use-case guides, implementation playbooks, ROI calculators',
      queryPatterns: 'segment-specific queries ("for healthcare", "in real estate", "for enterprises")',
      opportunity: 'Dominate specific buyer segments. Less competition than generic but higher intent',
      pieceCount: '5-8 pieces per vertical',
      businessImpact: 'Higher conversion than generic'
    },
    comparison: {
      contentTypes: 'Direct comparison content, feature matrices, vs guides, differentiation research',
      queryPatterns: 'evaluation queries ("vs competitors", "alternatives", "comparison matrix")',
      opportunity: 'Flip competitor-seeking buyers. Comparison queries have highest purchase intent',
      pieceCount: '10-15 competitive assets',
      businessImpact: 'Highest conversion rate'
    },
    brand: {
      contentTypes: 'Brand storytelling, founder stories, company milestones, customer testimonials',
      queryPatterns: 'branded queries (company name + keywords, brand prestige, company news)',
      opportunity: 'Build preference and trust. Branded queries convert at different rate',
      pieceCount: '6-10 brand assets',
      businessImpact: 'Trust multiplier'
    }
  };
  return strategies[category] || strategies.generic;
}

// Generate comprehensive strategic insights - DECISION-DRIVEN NARRATIVE WITH SEVERITY SCORING
function generateInsights(brandName, globalScore, countryScore, globalCategoryScores, countryCategoryScores, competitorBreakdown, industry, globalResults = [], mode = 'quick', analysisContext = {}) {
  const insights = {};
  const competitorList = Object.keys(competitorBreakdown).slice(0, 3);
  const topCompetitors = analysisContext.topCompetitors || [];
  const topSources = analysisContext.topSources || [];
  const competitorPressureScore = analysisContext.competitorPressureScore || 0;
  const sourceConfidenceScore = analysisContext.sourceConfidenceScore || 0;
  const visibilityRiskScore = analysisContext.visibilityRiskScore || 0;
  
  // === BUILD EVIDENCE BASE ===
  
  // 1. Total mention counts across all prompts
  const totalPrompts = globalResults.length;
  const totalBrandMentions = globalResults.reduce((sum, r) => sum + r.mentions, 0);
  const brandCoveragePercent = totalPrompts > 0
    ? parseFloat((totalBrandMentions / totalPrompts * 100).toFixed(1))
    : 0;
  
  // 2. Category evidence
  const weakestCategory = Object.entries(globalCategoryScores).reduce((a, b) => (b[1] < a[1] ? b : a), ['generic', Infinity]);
  const strongestCategory = Object.entries(globalCategoryScores).reduce((a, b) => (b[1] > a[1] ? b : a), ['generic', 0]);
  const weakCategoryResults = globalResults.filter(r => r.category === weakestCategory[0]);
  const weakCategoryCoverage = weakCategoryResults.filter(r => r.mentions > 0).length;
  const weakCategoryPercent = weakCategoryResults.length > 0
    ? parseFloat((weakCategoryCoverage / weakCategoryResults.length * 100).toFixed(1))
    : 0;
  
  // 3. Competitor evidence  
  const competitorComparison = buildCompetitorComparison(competitorList, globalResults, brandName);
  const topCompetitor = competitorComparison.competitors[0];
  
  // === DECISION-DRIVEN INSIGHTS GROUPED BY NARRATIVE TYPE ===
  
  // CRITICAL ISSUES: Things that must be fixed (HIGH severity)
  const criticalIssues = [];
  
  // Issue 1: Visibility crisis
  if (globalScore < 0.8) {
    criticalIssues.push({
      type: 'visibility_crisis',
      severity: 'HIGH',
      businessImpact: 'Revenue-limiting',
      problem: `${brandName} has LOW overall AI visibility (score: ${globalScore.toFixed(2)})`,
      impact: `When AI systems are asked about ${industry}, ${brandName} rarely appears—competitors own customer discovery`,
      cause: `Appears in only ${totalBrandMentions} of ${totalPrompts} responses (${brandCoveragePercent}% coverage). This is your AI baseline today.`,
      opportunity: `Every 10% coverage increase directly multiplies discovery queries captured from AI systems`,
      action: `Audit all four categories. Build content in 2-3 highest ROI segments (generic + comparison).`,
      metrics: {
        currentCoverage: `${brandCoveragePercent}%`,
        totalMentions: totalBrandMentions,
        targetCoverage: '50%+',
        signsOfProgress: 'Increase mentions, improve coverage %, appear in more diverse queries'
      }
    });
  }
  
  // Issue 2: Category extinction
  if (weakCategoryPercent < 20) {
    criticalIssues.push({
      type: 'category_absence',
      severity: 'HIGH',
      businessImpact: 'Market access lost',
      problem: `${brandName} is INVISIBLE in the ${weakestCategory[0].toUpperCase()} category—absent in ${100 - weakCategoryPercent}% of queries`,
      impact: `Customers asking AI "how do I choose?" or "what are ${industry} options?" never see ${brandName}. This is how new buyers discover solutions.`,
      cause: `Measured signal: Appears in only ${weakCategoryCoverage} of ${weakCategoryResults.length} ${weakestCategory[0]} queries. Competitors fill this gap.`,
      opportunity: `This category is where you win the most defensive battles. Competitors leave openings here.`,
      action: `Create ${contentTypeForCategory(weakestCategory[0])}. Target ${queryTypeForCategory(weakestCategory[0])}. Ship in 30 days.`,
      metrics: {
        gapSize: `${100 - weakCategoryPercent}% of queries`,
        currentAppearances: `${weakCategoryCoverage}/${weakCategoryResults.length}`,
        targetAppearances: `>${Math.ceil(weakCategoryResults.length * 0.5)}`,
        gapVsLeader: `${(strongestCategory[1] - weakestCategory[1]).toFixed(1)} mention points below ${strongestCategory[0]}`
      }
    });
  } else if (weakCategoryPercent < 50) {
    criticalIssues.push({
      type: 'category_weakness',
      severity: 'HIGH',
      businessImpact: 'Market share at risk',
      problem: `${weakestCategory[0].toUpperCase()} category is weak: ${weakCategoryPercent}% coverage vs ${strongestCategory[1]}% in top area`,
      impact: `${brandName} loses category definition battle in this segment. Competitors own buyer intent here.`,
      cause: `Measured signal: ${weakCategoryCoverage}/${weakCategoryResults.length} appearances. Competitors average 2-3x higher.`,
      opportunity: `Doubling presence here yields highest relative market capture improvement`,
      action: `Add ${contentTypeForCategory(weakestCategory[0])} to content roadmap. 60-day priority.`,
      metrics: {
        currentCoverage: `${weakCategoryPercent}%`,
        coverageGap: `${50 - weakCategoryPercent}% below 50% target`,
        appearances: `${weakCategoryCoverage}/${weakCategoryResults.length}`,
        competitorComparison: topCompetitor ? `${topCompetitor.coverage}% for ${topCompetitor.name}` : 'Competitors above 60%'
      }
    });
  }
  
  // === OPPORTUNITIES: Where to win (MEDIUM severity)
  const opportunities = [];
  
  // Opportunity 1: Leverage current strength
  const strongCategoryScore = globalCategoryScores[strongestCategory[0]];
  const strongCategoryResults = globalResults.filter(r => r.category === strongestCategory[0]);
  const strongCategoryCoverage = strongCategoryResults.filter(r => r.mentions > 0).length;
  
  opportunities.push({
    type: 'leverage_strength',
    severity: 'MEDIUM',
    businessImpact: 'Unlock adjacencies',
    problem: `${brandName} dominates ${strongestCategory[0].toUpperCase()} (${strongCategoryScore} mentions) but fails to leverage this into other categories`,
    impact: `Your strongest asset stays isolated. Cross-category mention synergy is 60%+ untapped.`,
    cause: `Measured signal: ${strongCategoryScore.toFixed(1)} score in ${strongestCategory[0]} vs ${weakestCategory[1].toFixed(1)} in ${weakestCategory[0]}. No bridge content.`,
    opportunity: `Use ${strongestCategory[0]} authority as gateway. Repurpose, relink, reposition into weak segments.`,
    action: `Create 5-10 "bridge" assets: take top ${strongestCategory[0]} content, link/expand to ${weakestCategory[0]} use cases`,
    metrics: {
      currentStrength: `${strongCategoryScore.toFixed(1)} in ${strongestCategory[0]}`,
      weakArea: `${weakestCategory[1].toFixed(1)} in ${weakestCategory[0]}`,
      synegyPotential: `${((strongCategoryScore / (weakestCategory[1] || 1)) * 100).toFixed(0)}% uplift potential`,
      bridgeContentCount: '5-10 interconnected assets'
    }
  });
  
  // Opportunity 2: Content gap with high ROI
  const contentGuidance = getContentStrategyForCategory(weakestCategory[0]);
  opportunities.push({
    type: 'content_gap',
    severity: 'MEDIUM',
    businessImpact: 'Direct visibility multiplier',
    problem: `${brandName} lacks differentiated ${weakestCategory[0]} content where buyers make decisions`,
    impact: `You're invisible at critical buyer decision points. Every unwritten comparison is a lost sale.`,
    cause: `Category coverage at ${weakCategoryPercent}% vs ${strongCategoryScore}% benchmark. Buyers searching this segment don't encounter ${brandName}.`,
    opportunity: `${contentGuidance.opportunity}. High conversion funnel position.`,
    action: `Write and distribute: ${contentGuidance.contentTypes}. Target: ${contentGuidance.queryPatterns}`,
    metrics: {
      coverageGap: `${(strongCategoryScore - weakestCategory[1]).toFixed(1)} mentions`,
      contentPiecesNeeded: contentGuidance.pieceCount,
      estimatedCoverageImprovement: `${(weakCategoryPercent + 20).toFixed(0)}% in 90 days`,
      roi: 'Direct appearance in AI-generated recommendations'
    }
  });
  
  // === COMPETITIVE THREATS: Opponents to watch (varies)
  const threats = [];
  
  if (topCompetitor && topCompetitor.mentions > 0) {
    const competitorRatio = parseFloat((topCompetitor.mentions / (totalBrandMentions || 1)).toFixed(1));
    const threatSeverity = competitorRatio > 3 ? 'HIGH' : competitorRatio > 1.5 ? 'MEDIUM' : 'LOW';
    
    threats.push({
      type: 'competitor_dominance',
      severity: threatSeverity,
      businessImpact: 'Category leadership at risk',
      problem: `${topCompetitor.name} mentioned ${topCompetitor.mentions}/${totalPrompts} times (${topCompetitor.coverage}%)—${competitorRatio}x more than ${brandName}`,
      impact: `${topCompetitor.name} defines buyer understanding of category. Their narrative becomes THE narrative.`,
      cause: `Measured signals: ${topCompetitor.name} appears in ${topCompetitor.coverage}% of prompts; ${brandName} in ${brandCoveragePercent}%. Likely from superior content + PR.`,
      opportunity: `Steal momentum: Find categories where ${topCompetitor.name} is weak, own those completely`,
      action: `Create direct comparison content. Identify ${topCompetitor.name}'s weakest category, dominate it.`,
      metrics: {
        competitorMentions: topCompetitor.mentions,
        competitorCoverage: `${topCompetitor.coverage}%`,
        mentionRatio: `${competitorRatio}:1 vs ${brandName}`,
        defensibleArea: `${strongestCategory[0]} is your stronghold—protect it`
      }
    });
  } else {
    threats.push({
      type: 'open_market',
      severity: 'LOW',
      businessImpact: 'Define market on your terms',
      problem: `No single competitor dominates—fragmented competitive landscape`,
      impact: `You have opportunity to be category leader before market consolidates`,
      cause: `No competitor appears >25% of the time. Market is building.`,
      opportunity: `Move fast. Own one category completely, become the reference point`,
      action: `Focus all resources on ONE category. Make it undisputed.`,
      metrics: {
        topCompetitors: competitorComparison.competitors.slice(0, 3).map(c => `${c.name} (${c.coverage}%)`).join('; '),
        leadership_opportunity: 'First-mover advantage in category definition',
        strategic_focus: 'Concentration beats dispersion'
      }
    });
  }
  
  // === ORGANIZE INTO NARRATIVE STRUCTURE ===
  insights.strategicNarrative = {
    summary: generateNarrativeSummary(brandName, globalScore, brandCoveragePercent, topCompetitor),
    criticalIssues: criticalIssues,
    opportunities: opportunities,
    competitiveThreats: threats
  };
  
  // === KEEP LEGACY FIELDS FOR BACKWARD COMPATIBILITY ===
  const isLimitedData = mode === 'quick' || totalPrompts <= 6;
  const visibilityLabel = globalScore > 1.5 ? 'HIGH' : globalScore > 0.8 ? 'MODERATE' : 'LOW';
  const summaryEvidence = brandCoveragePercent >= 50 
    ? `Appears in ${totalBrandMentions}/${totalPrompts} prompts (${brandCoveragePercent}% coverage).`
    : brandCoveragePercent >= 20
    ? `Mentioned in ${totalBrandMentions} of ${totalPrompts} responses (${brandCoveragePercent}% coverage). Competitors get more mentions.`
    : `Appears in only ${totalBrandMentions}/${totalPrompts} responses (${brandCoveragePercent}% coverage). Limited presence detected.`;

  const limitedDataPrefix = isLimitedData ? 'Based on limited sample size. ' : '';
  const limitedVisibilityLabel = globalScore > 1.5 ? 'strong visibility signal' : globalScore > 0.8 ? 'moderate visibility signal' : 'very low visibility signal';

  const problemLine = isLimitedData
    ? `Problem: ${brandName} shows ${limitedVisibilityLabel} in ${totalPrompts} sampled prompts.`
    : `Problem: ${brandName} has ${toLowerSafe(visibilityLabel)} AI visibility with ${totalBrandMentions}/${totalPrompts} mentions.`;

  const evidenceLine = topCompetitor
    ? `Evidence: ${brandName} appears in ${totalBrandMentions}/${totalPrompts} prompts while ${topCompetitor.name} appears in ${topCompetitor.mentions}/${Math.max(1, totalPrompts)} prompts. Source confidence score: ${sourceConfidenceScore}/100.`
    : `Evidence: ${brandName} appears in ${totalBrandMentions}/${totalPrompts} prompts with ${topSources.length} meaningful sources detected.`;

  const impactLine = visibilityRiskScore > 70
    ? `Impact: High risk of losing decision-stage traffic with visibility risk ${visibilityRiskScore}/100.`
    : `Impact: Visibility pressure remains material with risk ${visibilityRiskScore}/100 and competitor pressure ${competitorPressureScore}/100.`;

  const causeLine = topCompetitor
    ? `Cause: ${topCompetitor.name} appears in ${topCompetitor.mentions}/${Math.max(1, totalPrompts)} prompts (${topCompetitor.coverage}%), outperforming ${brandName} in this query set.`
    : `Cause: Competitor and source signals are limited in this dataset, reducing model confidence.`;

  const actionLine = isLimitedData
    ? `Action: Publish ${weakestCategory[0]} comparison content this week and run full analysis for high-confidence priorities.`
    : `Action: Prioritize ${weakestCategory[0]} content and direct comparison pages in the next 7 days to recover high-intent traffic.`;

  insights.summaryInsight = isLimitedData
    ? `${limitedDataPrefix}${problemLine} ${evidenceLine} ${impactLine} ${causeLine} ${actionLine}`
    : `${problemLine} ${evidenceLine} ${impactLine} ${causeLine} ${actionLine}`;

  insights.biggestWeakness = isLimitedData
    ? `${brandName} shows limited presence in ${weakestCategory[0]} queries (${weakCategoryCoverage}/${Math.max(1, weakCategoryResults.length)} appearances in this sample).`
    : `${weakestCategory[0].toUpperCase()} CRISIS: Absent in ${100 - weakCategoryPercent}% of queries (${weakCategoryCoverage}/${weakCategoryResults.length} appearances). ${brandName} is invisible where competitors define category.`;

  insights.strongestArea = isLimitedData
    ? `${brandName} appears most consistently in ${strongestCategory[0]} queries (${strongCategoryCoverage}/${Math.max(1, strongCategoryResults.length)} appearances in this sample).`
    : `${strongestCategory[0].toUpperCase()} DOMINANCE: ${brandName} appears in ${strongCategoryCoverage}/${strongCategoryResults.length} responses. Use this position to enter weaker categories.`;
  
  const competitorEvidence = competitorComparison.competitors
    .map(c => `${c.name}: ${c.coverage}% of prompts`)
    .join('; ');
  
  insights.competitorThreat = topCompetitor 
    ? `${topCompetitor.name} appears in ${topCompetitor.mentions}/${Math.max(1, totalPrompts)} prompts (${topCompetitor.coverage}%). ${brandName} appears ${(totalBrandMentions / Math.max(1, topCompetitor.mentions)).toFixed(1)}x as often in this sample. Key competitors: ${competitorEvidence}`
    : `No competitors detected in this sample.`;
  
  insights.contentOpportunity = isLimitedData
    ? `${brandName} appears in only ${weakCategoryCoverage}/${Math.max(1, weakCategoryResults.length)} ${weakestCategory[0]} queries in this sample. Prioritize ${contentGuidance.contentTypes} for ${weakestCategory[0]} intent.`
    : `CREATE: ${contentGuidance.contentTypes}. TARGET: "${contentGuidance.queryPatterns}". EVIDENCE: This category has ${weakCategoryPercent}% coverage vs ${strongCategoryScore}% in top category. ROI: Closing this gap directly increases AI visibility.`;
  
  // === SMART RECOMMENDATIONS - Evidence-tied, Decision-driven ===
  const sourceFrequency = {};
  (globalResults || []).forEach(r => {
    (r.sources || []).forEach(s => {
      sourceFrequency[s] = (sourceFrequency[s] || 0) + 1;
    });
  });
  
  const recs = [];
  
    // Special recommendation for quick mode limitations
    if (totalPrompts <= 3) {
      recs.push({
        priority: 'CRITICAL',
        action: 'Upgrade to full analysis for comprehensive AI visibility insights',
        target: 'Complete visibility assessment with 16+ prompts vs current 3',
        metric: `Current: ${totalPrompts} prompts analyzed. Full analysis: 16+ prompts`,
        content: 'Full analysis provides detailed competitor analysis, content opportunities, and strategic recommendations',
        queries: 'Complete market intelligence across all AI query categories',
        timeline: 'Immediate',
        expectedImpact: 'Transform limited data into actionable business intelligence'
      });
    }
  
  // Rec 1: Critical gap
  if (weakCategoryPercent < 20) {
    recs.push({
      priority: 'CRITICAL',
      action: `Build ${weakestCategory[0]} content library—this is your #1 visibility blocker`,
      target: `Close ${100 - weakCategoryPercent}% visibility gap in ${weakestCategory[0]} category`,
      metric: `Current: ${weakCategoryCoverage}/${weakCategoryResults.length} prompts. Target: >50% coverage (${Math.ceil(weakCategoryResults.length * 0.5)}+ appearances)`,
      content: contentGuidance.contentTypes,
      queries: `Target "${weakestCategory[0]}" discovery queries where ${competitorList[0] || 'competitors'} currently rank`,
      timeline: '30 days',
      expectedImpact: 'Direct visibility multiplier'
    });
  } else if (weakCategoryPercent < 50) {
    recs.push({
      priority: 'CRITICAL',
      action: `Expand ${weakestCategory[0]} presence—bridge the visible gap`,
      target: `Increase visibility from ${weakCategoryPercent}% to 60%+`,
      metric: `Add minimum 3-5 pieces targeting ${weakestCategory[0]} segment`,
      content: contentGuidance.contentTypes,
      queries: `Capture undefended "${weakestCategory[0]}" queries—this segment converts well`,
      timeline: '45 days',
      expectedImpact: 'Unlock new customer discovery path'
    });
  }
  
  // Rec 2: Leverage existing strength
  recs.push({
    priority: 'HIGH',
    action: `Convert ${strongestCategory[0]} dominance into category expansion—bridge to weak zones`,
    target: `Repurpose your strongest assets to enter ${weakestCategory[0]}`,
    metric: `Take top 3 ${strongestCategory[0]} pieces, create 5-10 "bridge" variations linking to weak category needs`,
    strategy: `Cross-linking, expanded use cases, complementary narratives`,
    timeline: '30 days',
    expectedImpact: 'Synergy multiplier—leverage existing authority'
  });
  
  // Rec 3: Counter specific competitor
  if (topCompetitor && topCompetitor.mentions > 0) {
    recs.push({
      priority: 'HIGH',
      action: `Create differentiation content vs ${topCompetitor.name}—compete where they win`,
      target: `Reduce ${topCompetitor.name}'s relative dominance by owning comparison narrative`,
      metric: `${topCompetitor.name} appears in ${topCompetitor.coverage}% of prompts. Create alternative frameworks that position ${brandName} as superior`,
      content: `Direct comparison guides, feature matrices, customer stories, differentiation research`,
      timeline: '60 days',
      expectedImpact: 'Flip competitive intent queries to ${brandName} preference'
    });
  }
  
  // Rec 4: Invest in high-leverage sources
  const topSourcesList = Object.entries(sourceFrequency).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topSourcesList.length > 0) {
    const topSources = topSourcesList.map(([src]) => src).join(', ');
    recs.push({
      priority: 'MEDIUM',
      action: `Secure placements on high-influence sources—these drive AI citations`,
      target: `Get featured in: ${topSources}`,
      metric: `These sources appear in ${topSourcesList[0][1]}+ AI responses. Being cited directly = visibility lift`,
      strategy: `Thought leadership, PR, guest posts, partnerships, 3rd-party research`,
      timeline: '90 days',
      expectedImpact: 'Multiply organic citations across multiple AI systems'
    });
  }
  
  insights.recommendations = recs;
  
  return insights;
}

// Perform real analysis with OpenAI API responses
async function performAnalysis(brandName, prompts, analysisType = 'generic', industry = null) {
  console.log(`\n🔍 Starting Analysis for brand: "${brandName}"`);
  console.log(`   Analysis Type: ${analysisType}`);
  console.log(`   Industry: ${industry}`);
  console.log(`   Processing ${prompts.length} prompt(s)...`);
  
  const analyzedResponses = [];
  let totalMentions = 0;
  const mentionsByPrompt = [];
  const competitorsSet = new Set();

  // Analyze each prompt
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`\n   [${i + 1}/${prompts.length}] Analyzing: "${prompt}"`);
    
    // Pass brandName, analysisType, and industry to improve prompt engineering
    const response = await getAIResponse(prompt, brandName, analysisType, industry);
    const mentions = detectBrandMentions(brandName, response);
    const competitors = extractCompetitors(response, industry);
    
    console.log(`       Brand "${brandName}" mentioned: ${mentions} time(s)`);
    console.log(`       Competitors found: ${competitors.length > 0 ? competitors.join(', ') : 'none'}`);
    
    totalMentions += mentions;
    mentionsByPrompt.push({
      prompt,
      mentions,
      competitors,
      analysisType
    });
    
    competitors.forEach(comp => competitorsSet.add(comp));
    
    analyzedResponses.push({
      prompt,
      response,
      brandMentions: mentions,
      competitorsFound: competitors,
      analysisType
    });
  }

  // Calculate visibility score (0-100)
  // Based on: average mentions per prompt + presence in responses
  const avgMentionsPerPrompt = prompts.length > 0 ? totalMentions / prompts.length : 0;
  const mentionScore = Math.min(avgMentionsPerPrompt * 10, 100);
  const visibilityScore = Math.round(mentionScore);

  console.log(`\n✨ Analysis Complete:`);
  console.log(`   Visibility Score: ${visibilityScore}`);
  console.log(`   Total Mentions: ${totalMentions}`);
  console.log(`   Unique Competitors: ${Array.from(competitorsSet).length}`);

  return {
    visibilityScore,
    totalMentions,
    mentionsByPrompt,
    competitors: Array.from(competitorsSet).sort(),
    analyzedResponses,
    analysisType
  };
}

// Routes
app.post('/analyze', async (req, res) => {
  try {
    const { brandName, prompts, analysisType = 'generic' } = req.body;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 NEW REQUEST: /analyze');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Validate input
    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: 'brandName required' });
    }
    
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'prompts required' });
    }

    const safeBrandName = brandName.trim();
    if (!safeBrandName) {
      return res.status(400).json({ error: 'brandName required' });
    }

    const safePrompts = prompts
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    if (safePrompts.length === 0) {
      return res.status(400).json({ error: 'prompts required' });
    }
    
    // Validate analysisType
    const validTypes = ['generic', 'comparison', 'attribute'];
    const finalAnalysisType = validTypes.includes(analysisType) ? analysisType : 'generic';
    
    console.log(`   Brand: ${safeBrandName}`);
    console.log(`   Analysis Type: ${finalAnalysisType}`);
    console.log(`   Prompts: ${JSON.stringify(safePrompts)}`);
    
    // Perform real analysis with OpenAI API responses
    const analysis = await performAnalysis(safeBrandName, safePrompts, finalAnalysisType);
    
    console.log('\n📤 Sending Response...');
    res.json({
      brand: safeBrandName,
      ...analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Comprehensive prompt testing with all 50 prompts
app.post('/test', async (req, res) => {
  try {
    const { brandName } = req.body;
    
    console.log('\n' + '═'.repeat(60));
    console.log('🧪 COMPREHENSIVE PROMPT TESTING');
    console.log('═'.repeat(60));
    
    // Validate input
    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ 
        error: 'brandName is required and must be a string' 
      });
    }
    
    console.log(`\n📊 Testing brand: "${brandName}"`);
    console.log(`📋 Running ${allPrompts.length} prompts across 4 categories...`);
    
    // Organize prompts by category
    const promptsByCategory = {};
    allPrompts.forEach(item => {
      if (!promptsByCategory[item.category]) {
        promptsByCategory[item.category] = [];
      }
      promptsByCategory[item.category].push(item);
    });
    
    // Run all prompts sequentially
    const detailedResults = [];
    const categoryData = {};
    
    for (const [category, prompts] of Object.entries(promptsByCategory)) {
      console.log(`\n🔹 Category: ${category.toUpperCase()} (${prompts.length} prompts)`);
      categoryData[category] = {
        totalMentions: 0,
        responses: [],
        competitors: new Set()
      };
      
      for (let i = 0; i < prompts.length; i++) {
        const item = prompts[i];
        const progressText = `  [${i + 1}/${prompts.length}] ${item.description}`;
        
        try {
          // Construct intelligent prompt based on category
          let finalPrompt = item.prompt;
          if (category === 'comparison') {
            if (!item.prompt.includes(brandName) && !toLowerSafe(item.prompt).includes('vs')) {
              finalPrompt = `Compare "${brandName}" with other leading options for: ${item.prompt}. What are key differences?`;
            }
          } else if (category === 'brand') {
            if (!item.prompt.includes(brandName)) {
              finalPrompt = `${item.prompt.replace('?', '')} specifically, and how does it compare to competitors?`;
            }
          }
          
          // Call OpenAI API
          const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages: [{ role: 'user', content: finalPrompt }],
            temperature: 0.7,
            max_tokens: 500
          });
          
          const content = response.choices[0].message.content;
          const mentions = detectBrandMentions(brandName, content);
          const competitors = extractCompetitors(content);
          
          // Update category data
          categoryData[category].totalMentions += mentions;
          categoryData[category].competitors = new Set([
            ...categoryData[category].competitors,
            ...competitors
          ]);
          categoryData[category].responses.push({
            subcategory: item.subcategory,
            prompt: item.prompt,
            mentions,
            competitors
          });
          
          detailedResults.push({
            category,
            subcategory: item.subcategory,
            prompt: item.prompt,
            response: content,
            mentions,
            competitors
          });
          
          console.log(`${progressText}: ${mentions} mention(s)`);
          
          // Rate limiting: add small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`${progressText}: ERROR - ${error.message}`);
          detailedResults.push({
            category,
            subcategory: item.subcategory,
            prompt: item.prompt,
            error: error.message,
            mentions: 0,
            competitors: []
          });
        }
      }
    }
    
    // Calculate scores
    console.log('\n📈 CALCULATING SCORES...');
    const categoryScores = {};
    let totalAllMentions = 0;
    const allCompetitors = new Set();
    
    for (const [category, data] of Object.entries(categoryData)) {
      const numPrompts = promptsByCategory[category].length;
      const avgMentions = numPrompts > 0 ? data.totalMentions / numPrompts : 0;
      const score = Math.round(Math.min(avgMentions * 10, 100));
      
      categoryScores[category] = score;
      totalAllMentions += data.totalMentions;
      data.competitors.forEach(comp => allCompetitors.add(comp));
      
      console.log(`   ${category}: ${score}/100 (${data.totalMentions} total mentions, ${data.competitors.size} competitors)`);
    }
    
    // Calculate overall score
    const totalPrompts = allPrompts.length;
    const overallAvgMentions = totalPrompts > 0 ? totalAllMentions / totalPrompts : 0;
    const overallScore = Math.round(Math.min(overallAvgMentions * 10, 100));
    
    console.log(`\n🎯 OVERALL SCORE: ${overallScore}/100`);
    console.log(`   Total mentions: ${totalAllMentions}`);
    console.log(`   Total unique competitors: ${allCompetitors.size}`);
    
    // Get top competitors
    const competitorMentions = {};
    detailedResults.forEach(result => {
      if (result.competitors) {
        result.competitors.forEach(comp => {
          competitorMentions[comp] = (competitorMentions[comp] || 0) + 1;
        });
      }
    });
    
    const topCompetitors = Object.entries(competitorMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, mentions: count }));
    
    console.log(`\n🏆 TOP COMPETITORS:`);
    topCompetitors.forEach((comp, idx) => {
      console.log(`   ${idx + 1}. ${comp.name}: ${comp.mentions} mentions`);
    });
    
    console.log('\n✅ Testing complete. Sending results...\n');
    
    // Return comprehensive results
    res.json({
      success: true,
      data: {
        brand: brandName,
        testMetadata: {
          totalPrompts: totalPrompts,
          categoriesTestedCount: Object.keys(categoryScores).length,
          totalResponses: detailedResults.length,
          timestamp: new Date().toISOString()
        },
        overallScore,
        categoryScores,
        topCompetitors,
        categoryBreakdown: Object.entries(categoryScores).map(([category, score]) => ({
          category,
          score,
          promptsCount: promptsByCategory[category].length,
          totalMentions: categoryData[category].totalMentions,
          competitors: Array.from(categoryData[category].competitors)
        })),
        detailedResults
      }
    });
  } catch (error) {
    console.error('❌ Testing error:', error.message);
    res.status(500).json({
      error: 'Testing failed',
      message: error.message
    });
  }
});

// Dynamic prompt generation helpers
const industryThemes = {
  real_estate: {
    label: 'real estate',
    terms: ['villas', 'property', 'investment', 'real estate developers', 'land']
  },
  education: {
    label: 'education',
    terms: ['universities', 'degrees', 'master’s programs', 'international students', 'scholarships']
  },
  fintech: {
    label: 'fintech',
    terms: ['payments', 'banking', 'cards', 'transfers', 'payment gateways']
  }
};

function normalizeIndustry(industry) {
  if (!industry || typeof industry !== 'string') return null;
  return toLowerSafe(industry.trim()).replace(/\s+/g, '_');
}

function getIndustryConfig(industry) {
  const key = normalizeIndustry(industry);
  return industryThemes[key] || {
    label: toLowerSafe(industry || 'industry'),
    terms: ['product', 'service', 'market', 'growth', 'strategy']
  };
}

function buildCategoryTemplates(category, industryConfig, brandName, targetCountry) {
  const c = industryConfig;
  const countrySuffix = targetCountry ? ` in ${targetCountry}` : '';

  const genericPhrases = [
    `What are the most reliable ${c.label} providers${countrySuffix}?`,
    `Which ${c.terms[0]} options should market leaders choose${countrySuffix}?`,
    `How is the global ${c.label} sector shifting${countrySuffix}?`,
    `Which ${c.terms[1]} players are emerging fast${countrySuffix}?`,
    `What technology patterns are changing ${c.label}${countrySuffix}?`,
    `How can small businesses adopt ${c.terms[2]} effectively${countrySuffix}?`,
    `What are the biggest pain points in ${c.label}${countrySuffix}?`,
    `Where is innovation strongest in ${c.terms[3]}${countrySuffix}?`,
    `What are growth opportunities for ${c.label}${countrySuffix}?`,
    `How do regulations shape ${c.terms[4]}${countrySuffix}?`,
    `What regional differences matter in ${c.label}${countrySuffix}?`,
    `How does customer demand differ in ${c.label}${countrySuffix}?`,
    `What future trends should teams watch in ${c.label}${countrySuffix}?`
  ];

  const nichePhrases = [
    `In ${c.terms[0]}, what niche solutions are gaining traction${countrySuffix}?`,
    `What are high-impact use cases for ${c.terms[1]}${countrySuffix}?`,
    `How can operators make ${c.terms[2]} more efficient${countrySuffix}?`,
    `Which subsegments need better ${c.terms[3]} support${countrySuffix}?`,
    `How can international students evaluate ${c.terms[4]} packages${countrySuffix}?`,
    `How can ${brandName} target ${c.terms[0]} users${countrySuffix}?`,
    `What unique features matter for ${c.terms[1]} enterprises${countrySuffix}?`,
    `What is the risk profile in ${c.terms[2]} for the next 12 months${countrySuffix}?`,
    `Which emerging markets are open for ${c.label} growth${countrySuffix}?`,
    `What partnerships drive adoption of ${c.terms[3]}${countrySuffix}?`,
    `How should customer success teams handle ${c.terms[4]} queries${countrySuffix}?`,
    `What benchmarks matter for ${c.label} in the current year${countrySuffix}?`,
    `How do local taxation rules impact ${c.label}${countrySuffix}?`
  ];

  const comparisonPhrases = [
    `Which ${c.label} provider should a buyer shortlist first${countrySuffix}?`,
    `What is the best ${c.label} option for high-intent buyers comparing vendors${countrySuffix}?`,
    `Which ${c.terms[0]} platform wins when decision-makers compare pricing, support, and reliability${countrySuffix}?`,
    `What alternatives do buyers compare before choosing ${brandName}${countrySuffix}?`,
    `Compare ${brandName} to other players in ${c.label}${countrySuffix}.`,
    `How does ${brandName} perform versus incumbents in ${c.terms[0]}${countrySuffix}?`,
    `What are the pros/cons of ${brandName} vs major ${c.terms[1]} providers${countrySuffix}?`,
    `Compare user journey in ${c.terms[2]} for ${brandName} and competitors${countrySuffix}.`,
    `Which features set ${brandName} apart in ${c.terms[3]}${countrySuffix}?`,
    `How does pricing for ${brandName} compare in ${c.terms[4]}${countrySuffix}?`,
    `What is better for enterprise customers: ${brandName} or alternatives in ${c.label}${countrySuffix}?`,
    `Which brand is safest in ${c.terms[0]}${countrySuffix}?`,
    `How does market share compare between ${brandName} and peers in ${c.label}${countrySuffix}?`,
    `What are tradeoffs in using ${brandName} vs others for ${c.label}${countrySuffix}?`,
    `For newcomers, should they pick ${brandName} or leading rivals in ${c.terms[1]}${countrySuffix}?`,
    `Does ${brandName} offer better support than competitors in ${c.label}${countrySuffix}?`,
    `How do contract terms differ between ${brandName} and peers in ${c.label}${countrySuffix}?`
  ];

  const brandPhrases = [
    `How can ${brandName} become a thought leader in ${c.label}${countrySuffix}?`,
    `What messaging helps ${brandName} win in ${c.terms[0]}${countrySuffix}?`,
    `How does ${brandName} deliver value in ${c.terms[1]}${countrySuffix}?`,
    `What success stories drive trust in ${brandName} for ${c.terms[2]}${countrySuffix}?`,
    `How should ${brandName} talk about ${c.terms[3]} to investors${countrySuffix}?`,
    `What positioning works best for ${brandName} in ${c.terms[4]}${countrySuffix}?`,
    `What customer segments are ideal for ${brandName} in ${c.label}${countrySuffix}?`,
    `How can ${brandName} reduce churn in ${c.label}${countrySuffix}?`,
    `What is ${brandName}’s competitive edge in ${c.label}${countrySuffix}?`,
    `How can ${brandName} showcase ROI in ${c.terms[0]}${countrySuffix}?`,
    `Which brand narratives resonate for ${brandName} in ${c.label}${countrySuffix}?`,
    `How can ${brandName} leverage partnerships in ${c.label}${countrySuffix}?`,
    `What roadmap items should ${brandName} prioritize in ${c.label}${countrySuffix}?`
  ];

  const categoryMap = {
    generic: genericPhrases,
    niche: nichePhrases,
    comparison: comparisonPhrases,
    brand: brandPhrases
  };

  return categoryMap[category] || [];
}

function spawnPrompts(brandName, industry, targetCountry) {
  const industryConfig = getIndustryConfig(industry);

  const categories = ['generic', 'niche', 'comparison', 'brand'];

  const globalPrompts = categories.flatMap(category =>
    buildCategoryTemplates(category, industryConfig, brandName, null).map(prompt => ({ category, prompt }))
  );

  const countryPrompts = categories.flatMap(category =>
    buildCategoryTemplates(category, industryConfig, brandName, targetCountry).map(prompt => ({ category, prompt }))
  );

  // Guarantee 50 unique prompts with minimal replication.
  const normalizeSet = (arr) => {
    const unique = Array.from(new Map(arr.map(item => [item.prompt, item])).values());
    if (unique.length >= 50) {
      return unique.slice(0, 50);
    }

    // When under 50 (e.g., custom industry), create structured variants to avoid exact duplicates.
    const result = [...unique];
    let idx = 0;

    while (result.length < 50) {
      const base = unique[idx % unique.length];
      const extra = {
        category: base.category,
        prompt: `${base.prompt} (expanded insight)`
      };
      if (!result.some(x => x.prompt === extra.prompt)) {
        result.push(extra);
      }
      idx += 1;
      if (idx > unique.length * 5) break;
    }

    return result.slice(0, 50);
  };

  return {
    globalPrompts: normalizeSet(globalPrompts),
    countryPrompts: normalizeSet(countryPrompts),
    metadata: {
      brandName,
      industry: industryConfig.label,
      targetCountry: targetCountry || 'global',
      timestamp: new Date().toISOString(),
      categories
    }
  };
}

// Dynamic prompt generation route
app.post('/generate-prompts', (req, res) => {
  const { brandName, industry, targetCountry } = req.body;

  if (!brandName || typeof brandName !== 'string') {
    return res.status(400).json({ error: 'brandName is required and must be a non-empty string' });
  }

  if (!industry || typeof industry !== 'string') {
    return res.status(400).json({ error: 'industry is required and must be a non-empty string' });
  }

  const prompts = spawnPrompts(brandName, industry, targetCountry);

  res.json({
    success: true,
    data: {
      brandName,
      industry: prompts.metadata.industry,
      targetCountry: prompts.metadata.targetCountry,
      globalPrompts: prompts.globalPrompts,
      countryPrompts: prompts.countryPrompts
    }
  });
});

async function executePromptSetSequentially(prompts, brandName, setName, industry, mode = 'quick') {
  const results = [];

  // Add overall timeout for the entire prompt set execution (5 minutes max)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Prompt set execution timeout after 5 minutes for ${setName}`)), 300000);
  });

  const executionPromise = async () => {
    for (let i = 0; i < prompts.length; i++) {
      const item = prompts[i];
      const progress = `${i + 1}/${prompts.length}`;
      console.log(`\n[${setName}] ${progress} - Running prompt (${item.category}): ${item.prompt}`);

      let responseText = '';
      let mentions = 0;
      let competitors = [];
      let positionAnalysis = {};
      let contextAnalysis = {};
      let sources = [];

      try {
        responseText = await getAIResponse(item.prompt, brandName, item.category, industry, mode);
        mentions = detectBrandMentions(brandName, responseText);
        competitors = extractCompetitors(responseText, industry, brandName);
        positionAnalysis = analyzeBrandPosition(brandName, responseText);
        contextAnalysis = detectMentionContext(brandName, responseText);
        sources = extractSources(responseText, industry, competitors, mode);

        console.log(`[${setName}] ${progress} - mentions: ${mentions}, competitors: ${competitors.join(', ') || 'none'}`);
      } catch (error) {
        console.error(`[${setName}] ${progress} - request failed: ${error.message}`);
        responseText = '';
        mentions = 0;
        competitors = [];
        positionAnalysis = { position: 'none', percentage: 0 };
        contextAnalysis = { listFormat: false, comparisonFormat: false, paragraphExplanation: false };
        sources = [];
      }

      results.push({
        category: item.category,
        prompt: item.prompt,
        response: responseText,
        mentions,
        competitors,
        positionAnalysis,
        contextAnalysis,
        sources
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  };

  try {
    return await Promise.race([executionPromise(), timeoutPromise]);
  } catch (error) {
    console.error(`❌ ${setName} prompt set execution failed: ${error.message}`);
    // Return partial results if available, or empty array
    return results.length > 0 ? results : [];
  }
}

function calculateCategoryScores(analysisResults) {
  const categories = ['generic', 'niche', 'comparison', 'brand'];
  const categoryStats = {
    generic: [0, 0],
    niche: [0, 0],
    comparison: [0, 0],
    brand: [0, 0]
  };

  analysisResults.forEach(item => {
    if (!categoryStats[item.category]) return;
    categoryStats[item.category][0] += item.mentions;
    categoryStats[item.category][1] += 1;
  });

  const categoryScores = {};
  Object.keys(categoryStats).forEach(category => {
    const [totalMentions, count] = categoryStats[category];
    const avgMention = count > 0 ? totalMentions / count : 0;
    categoryScores[category] = parseFloat(avgMention.toFixed(2));
  });

  const allMentions = analysisResults.reduce((sum, item) => sum + item.mentions, 0);
  const overallScore = analysisResults.length > 0
    ? parseFloat((allMentions / analysisResults.length).toFixed(2))
    : 0;

  return { categoryScores, overallScore };
}

function aggregateCompetitors(globalResults, countryResults, industry) {
  const allResults = globalResults.concat(countryResults);
  const frequency = {};
  const rawCompetitors = new Set();

  allResults.forEach(item => {
    const uniquePerPrompt = new Set(item.competitors || []);
    uniquePerPrompt.forEach(comp => {
      rawCompetitors.add(comp);
      frequency[comp] = (frequency[comp] || 0) + 1;
    });
  });

  const hasInvalidCompetitor = Array.from(rawCompetitors).some((name) => {
    const normalized = normalizeCompanyCandidate(name);
    if (!normalized) return false;
    if (!looksLikeCompanyName(normalized)) return true;
    if (/\b(approach|strategy|landscape|reach|model|positioning|framework|category)\b/i.test(normalized)) return true;
    if (/\b(competitive|global|centric)\b/i.test(normalized)) return true;
    return false;
  });

  // Fail-safe: any invalid competitor candidate invalidates the whole list.
  if (hasInvalidCompetitor) {
    return [];
  }

  const totalPrompts = Math.max(1, allResults.length);

  return Object.entries(frequency)
    .filter(([_, mentionCount]) => mentionCount >= 2)
    .filter(([name]) => isTrustedCompetitor(name, industry))
    .map(([name, mentionCount]) => {
      const relevanceScore = scoreCompetitorRelevance(name, industry || 'general');
      const appearanceRate = parseFloat(((mentionCount / totalPrompts) * 100).toFixed(1));
      const priorityScore = mentionCount * 10 + relevanceScore * 3;
      return {
        name,
        mentionCount,
        appearanceRate,
        relevanceScore,
        whyItAppears: `${name} appears in ${mentionCount}/${totalPrompts} prompts with ${appearanceRate}% appearance across the analysis set.`,
        priorityScore,
        // Backward-compatible aliases
        count: mentionCount,
        score: mentionCount
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map(({ name, mentionCount, appearanceRate, relevanceScore, whyItAppears, count, score }) => ({
      name,
      mentionCount,
      appearanceRate,
      relevanceScore,
      whyItAppears,
      count,
      score
    }));
}

function getSourceConfidence(topSources) {
  const score = calculateSourceConfidenceScore(topSources);
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function buildSummary(globalCategoryScores, countryCategoryScores) {
  const globalEntries = Object.entries(globalCategoryScores);
  const countryEntries = Object.entries(countryCategoryScores);

  const globalStrongest = globalEntries.reduce((a, b) => (b[1] > a[1] ? b : a), ['generic', 0]);
  const globalWeakest = globalEntries.reduce((a, b) => (b[1] < a[1] ? b : a), ['generic', Infinity]);

  const countryStrongest = countryEntries.reduce((a, b) => (b[1] > a[1] ? b : a), ['generic', 0]);
  const countryWeakest = countryEntries.reduce((a, b) => (b[1] < a[1] ? b : a), ['generic', Infinity]);

  const biggestGap = Math.abs(globalCategoryScores[globalStrongest[0]] - countryCategoryScores[globalStrongest[0]]);

  const globalAvg = Object.values(globalCategoryScores).reduce((sum, val) => sum + val, 0) / Object.values(globalCategoryScores).length;
  const countryAvg = Object.values(countryCategoryScores).reduce((sum, val) => sum + val, 0) / Object.values(countryCategoryScores).length;

  return {
    insight: `AI visibility analysis reveals strategic positioning opportunities. ${globalStrongest[0]} category shows strongest performance (${globalStrongest[1].toFixed(2)} avg mentions) while ${globalWeakest[0]} represents the biggest gap (${globalWeakest[1].toFixed(2)} avg mentions). Geographic consistency between global (${globalAvg.toFixed(2)}) and local (${countryAvg.toFixed(2)}) performance suggests ${Math.abs(globalAvg - countryAvg) < 0.3 ? 'effective universal positioning' : 'need for localization strategy'}.`,
    biggestGap: `Category performance gap analysis: ${globalStrongest[0]} shows ${biggestGap.toFixed(2)} differential between global and local contexts, indicating ${biggestGap > 0.5 ? 'significant localization opportunities' : 'consistent market positioning'}.`,
    strongestArea: `${globalStrongest[0]} category demonstrates market leadership potential with ${globalStrongest[1].toFixed(2)} average mentions, positioning it as a key competitive advantage.`
  };
}

function filterPromptsByMode(prompts, mode) {
  const modeMap = {
    quick: 3,
    full: 16
  };

  const targetCount = modeMap[mode] || 3;

  if (prompts.length <= targetCount) {
    return prompts;
  }

  const categories = ['generic', 'niche', 'comparison', 'brand'];
  const categoryGroups = {};
  categories.forEach(cat => {
    categoryGroups[cat] = prompts.filter(p => p.category === cat);
  });

  if (mode === 'full') {
    const decisionPriority = {
      generic: /(reliable|choose|pain points|growth opportunities|future trends)/i,
      niche: /(use cases|benchmarks|emerging markets|partnerships|efficient|risk)/i,
      comparison: /(compare|versus|vs|alternatives|better|pick|pricing|tradeoffs|decision)/i,
      brand: /(competitive edge|showcase roi|positioning|thought leader|customer segments|roadmap)/i
    };

    categories.forEach((cat) => {
      categoryGroups[cat] = categoryGroups[cat].sort((a, b) => {
        const aPriority = decisionPriority[cat].test(a.prompt) ? 1 : 0;
        const bPriority = decisionPriority[cat].test(b.prompt) ? 1 : 0;
        return bPriority - aPriority;
      });
    });
  }

  const result = [];
  const itemsPerCategory = Math.floor(targetCount / 4);
  const remainder = targetCount % 4;

  categories.forEach((cat, idx) => {
    const count = itemsPerCategory + (idx < remainder ? 1 : 0);
    result.push(...categoryGroups[cat].slice(0, count));
  });

  return result.slice(0, targetCount);
}

// Full AI visibility analysis endpoint
app.post('/full-analysis', async (req, res) => {
  const startTime = Date.now();
  console.log(`\n🚀 Starting full analysis request at ${new Date().toISOString()}`);

  try {
    const { brandName, industry, targetCountry, mode = 'quick' } = req.body;

    console.log(`📋 Request parameters: brand="${brandName}", industry="${industry}", country="${targetCountry}", mode="${mode}"`);

    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid brand name',
        details: 'brandName is required and must be a non-empty string'
      });
    }

    if (!industry || typeof industry !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid industry',
        details: 'industry is required and must be a non-empty string'
      });
    }

    if (!['quick', 'full'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode',
        details: 'mode must be "quick" or "full"'
      });
    }

    const promptSets = spawnPrompts(brandName, industry, targetCountry);
    console.log(`📝 Generated ${promptSets.globalPrompts.length} global prompts and ${promptSets.countryPrompts.length} country prompts`);

    const globalPrompts = filterPromptsByMode(promptSets.globalPrompts, mode);
    const countryPrompts = filterPromptsByMode(promptSets.countryPrompts, mode);

    const modeLabel = mode === 'quick' ? '(QUICK - 3 prompts)' : '(FULL - 16 prompts)';
    console.log(`\n= Full analysis starting ${modeLabel} (global prompts) =`);
    const globalResults = await executePromptSetSequentially(globalPrompts, brandName, 'GLOBAL', industry, mode);
    console.log(`✅ Global analysis complete: ${globalResults.length} results`);

    console.log(`\n= Full analysis starting ${modeLabel} (country prompts) =`);
    const countryResults = await executePromptSetSequentially(countryPrompts, brandName, 'COUNTRY', industry, mode);
    console.log(`✅ Country analysis complete: ${countryResults.length} results`);

    console.log(`🔄 Processing results and generating insights...`);

    const globalScores = calculateCategoryScores(globalResults);
    const countryScores = calculateCategoryScores(countryResults);

    const topCompetitors = aggregateCompetitors(globalResults, countryResults, industry);
    const competitorAnalysis = topCompetitors.length > 0
      ? analyzeCompetitorsDetailed(globalResults.concat(countryResults))
      : { breakdown: {}, byCategory: { generic: [], niche: [], comparison: [], brand: [] } };
    const summary = buildSummary(globalScores.categoryScores, countryScores.categoryScores);

    // Aggregate position analysis
    const positionData = { beginning: 0, middle: 0, end: 0, none: 0 };
    globalResults.concat(countryResults).forEach(result => {
      if (result.positionAnalysis.position !== 'none') {
        positionData[result.positionAnalysis.position] += 1;
      } else {
        positionData.none += 1;
      }
    });

    // Aggregate context analysis
    const contextData = { listFormat: 0, comparisonFormat: 0, paragraphExplanation: 0 };
    globalResults.concat(countryResults).forEach(result => {
      if (result.contextAnalysis.listFormat) contextData.listFormat += 1;
      if (result.contextAnalysis.comparisonFormat) contextData.comparisonFormat += 1;
      if (result.contextAnalysis.paragraphExplanation) contextData.paragraphExplanation += 1;
    });

    const allResults = globalResults.concat(countryResults);
    const topSources = aggregateSources(allResults, industry, mode);
    const channelPerformance = buildChannelPerformance(topSources);

    const sourceDataMessage = topSources.length === 0
      ? 'Traffic sources require deeper analysis. Run full analysis to unlock.'
      : '';

    const confidenceLevel = mode === 'quick' ? 'low' : 'high';
    const sourceConfidence = getSourceConfidence(topSources);
    const sourceConfidenceScore = calculateSourceConfidenceScore(topSources);
    const competitorPressureScore = calculateCompetitorPressureScore(topCompetitors, allResults.length);
    const visibilityScore = calculateVisibilityScore(globalResults, topSources, topCompetitors);
    const countryVisibilityScore = calculateVisibilityScore(countryResults, topSources, topCompetitors);
    const visibilityRiskScore = calculateVisibilityRiskScore(visibilityScore, competitorPressureScore, sourceConfidenceScore);

    // Generate insights
    const insights = generateInsights(
      brandName,
      visibilityScore,
      countryVisibilityScore,
      globalScores.categoryScores,
      countryScores.categoryScores,
      competitorAnalysis.breakdown,
      industry,
      globalResults,
      mode,
      {
        topCompetitors,
        topSources,
        visibilityScore,
        competitorPressureScore,
        sourceConfidenceScore,
        visibilityRiskScore
      }
    );

    // Generate pseudo-trend data based on category performance
    const generatePseudoTrend = () => {
      const categories = Object.keys(globalScores.categoryScores);
      const trendData = [];
      const baseDate = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });

        const categoryData = {};
        categories.forEach(cat => {
          const baseScore = globalScores.categoryScores[cat] || 0;
          const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
          categoryData[cat] = Math.max(0, baseScore * (1 + variation));
        });

        trendData.push({
          month: monthName,
          ...categoryData,
          total: Object.values(categoryData).reduce((sum, val) => sum + val, 0)
        });
      }

      return trendData;
    };

    const trend = generatePseudoTrend();

    const processingTime = Date.now() - startTime;
    console.log(`✅ Analysis complete in ${processingTime}ms - returning ${JSON.stringify({
      globalScore: visibilityScore,
      countryScore: countryVisibilityScore,
      competitors: topCompetitors.length,
      sources: topSources.length
    })}`);

    res.json({
      success: true,
      data: {
        brandName,
        industry: promptSets.metadata.industry,
        targetCountry: promptSets.metadata.targetCountry,
        mode,
        confidenceLevel,
        sourceConfidence,
        sourceConfidenceScore,
        competitorPressureScore,
        visibilityScore,
        visibilityRiskScore,
        promptsUsed: {
          global: globalResults.length,
          country: countryResults.length
        },
        globalScore: visibilityScore,
        countryScore: countryVisibilityScore,
        globalCategoryScores: globalScores.categoryScores,
        countryCategoryScores: countryScores.categoryScores,
        topCompetitors,
        competitorBreakdown: competitorAnalysis.breakdown,
        topCompetitorsByCategory: competitorAnalysis.byCategory,
        positionAnalysis: positionData,
        contextAnalysis: contextData,
        topSources,
        channelPerformance,
        sourceDataMessage,
        insights,
        summary: {
          insight: insights.summaryInsight
        },
        trend,
        biggestWeakness: insights.biggestWeakness,
        strongestArea: insights.strongestArea,
        contentOpportunity: insights.contentOpportunity,
        competitorThreat: insights.competitorThreat,
        recommendations: insights.recommendations,
        detail: { globalResults, countryResults }
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Full analysis failed:', error.message);
    console.error('   Error details:', error.stack);
    console.error(`   Failed after ${processingTime}ms`);

    // Always return success: true with fallback data for frontend stability
    const fallbackData = {
      brandName: req.body.brandName || 'Unknown Brand',
      industry: req.body.industry || 'Unknown Industry',
      targetCountry: req.body.targetCountry || 'Global',
      mode: req.body.mode || 'quick',
      confidenceLevel: (req.body.mode || 'quick') === 'quick' ? 'low' : 'high',
      sourceConfidence: 'low',
      sourceConfidenceScore: 0,
      competitorPressureScore: 0,
      visibilityScore: 0,
      visibilityRiskScore: 75,
      promptsUsed: { global: 0, country: 0 },
      globalScore: 0,
      countryScore: 0,
      globalCategoryScores: { generic: 0, niche: 0, comparison: 0, brand: 0 },
      countryCategoryScores: { generic: 0, niche: 0, comparison: 0, brand: 0 },
      topCompetitors: [],
      competitorBreakdown: [],
      topCompetitorsByCategory: { generic: [], niche: [], comparison: [], brand: [] },
      positionAnalysis: { beginning: 0, middle: 0, end: 0, none: 0 },
      contextAnalysis: { listFormat: 0, comparisonFormat: 0, paragraphExplanation: 0 },
      topSources: [],
      channelPerformance: [],
      sourceDataMessage: 'Traffic sources require deeper analysis. Run full analysis to unlock.',
      insights: {
        summaryInsight: 'Analysis temporarily unavailable due to service issues. Our AI systems are working to restore full functionality.',
        biggestWeakness: 'Unable to determine at this time',
        strongestArea: 'Unable to determine at this time',
        competitorThreat: 'Analysis in progress - service temporarily unavailable',
        contentOpportunity: 'Analysis temporarily unavailable - please try again later',
        recommendations: [
          'Please retry the analysis in a few moments',
          'Check your internet connection',
          'Contact support if the issue persists',
          'Service restoration in progress'
        ]
      },
      summary: {
        insight: 'AI analysis service is temporarily unavailable. Full functionality will be restored shortly.'
      },
      trend: [],
      biggestWeakness: 'generic',
      strongestArea: 'generic',
      contentOpportunity: 'Analysis temporarily unavailable',
      competitorThreat: 'Service restoration in progress',
      recommendations: [
        'Please retry the analysis',
        'Check your internet connection',
        'Contact support if issue persists'
      ],
      detail: { globalResults: [], countryResults: [] }
    };

    console.log(`📤 Returning fallback response after ${processingTime}ms`);

    res.json({
      success: true,
      data: fallbackData,
      fallback: true,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   AI Visibility Tool - Backend Started    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n🌐 Server: http://localhost:${PORT}`);
  console.log(`📊 POST /analyze - Analyze brand visibility with real OpenAI calls`);
  console.log(`💓 GET /health - Health check`);
  console.log('\n⏳ Waiting for requests...\n');
});

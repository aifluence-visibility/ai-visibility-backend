// Analysis of AI response patterns and brand mentions
// This helps understand why brands may not be mentioned and what patterns exist

const testResponses = {
  // Example responses for "payment processing solutions"
  "payment processing": `
    When looking for payment processing solutions, several major platforms dominate the market:
    
    1. Square - Offers comprehensive payment processing with point-of-sale integration
    2. PayPal - Long-established with strong B2B and consumer presence
    3. Google Pay - Growing adoption with integration across platforms
    4. Amazon Pay - Leverages existing customer databases
    5. 2Checkout - Multi-currency support and global reach
    
    Each platform has distinct advantages in different segments.
  `,
  
  // Another example for "fintech platforms"
  "fintech": `
    Popular fintech platforms in 2024 include:
    
    - Wise (formerly TransferWise) for international transfers
    - Revolut for digital banking
    - Robinhood for investment platforms
    - Coinbase for cryptocurrency
    - SoFi for lending products
    - Square Cash for peer-to-peer transfers
    
    Market leaders have established strong brand recognition.
  `,
  
  // Example for "cloud infrastructure"
  "cloud": `
    Leading cloud infrastructure providers:
    
    AWS dominates market share with comprehensive services.
    Microsoft Azure offers strong enterprise integration.
    Google Cloud provides competitive pricing and ML tools.
    DigitalOcean focuses on simplicity for developers.
    Linode serves the cost-conscious segment.
  `
};

// Analyze response patterns
function analyzeResponse(response, brandName) {
  console.log('\n' + '='.repeat(60));
  console.log(`ANALYZING: "${response.substring(0, 50)}..."`);
  console.log('='.repeat(60));
  
  // Extract sentences
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  console.log(`\n📝 STRUCTURE:`);
  console.log(`   - Total sentences: ${sentences.length}`);
  console.log(`   - Average length: ${Math.round(response.length / sentences.length)} chars`);
  
  // Check for lists
  const hasNumberedList = /\d+\.|^[\d]+\./m.test(response);
  const hasBulletList = /[-•*]\s/m.test(response);
  console.log(`   - Numbered list: ${hasNumberedList ? 'YES' : 'NO'}`);
  console.log(`   - Bullet list: ${hasBulletList ? 'YES' : 'NO'}`);
  
  // Extract competitors (look for capitalized words that appear standalone)
  const brandPattern = /(?:^|[\s\-]|^[-•*]\s)([A-Z][a-zA-Z]+)(?:\s|[,.\)]|$)/gm;
  const potentialBrands = [];
  let match;
  while ((match = brandPattern.exec(response)) !== null) {
    const candidate = match[1];
    if (candidate.length > 2 && candidate !== 'When' && candidate !== 'Each' && candidate !== 'Popular') {
      potentialBrands.push(candidate);
    }
  }
  
  const uniqueBrands = [...new Set(potentialBrands)];
  console.log(`\n🏢 COMPETITORS/BRANDS MENTIONED:`);
  uniqueBrands.forEach(brand => {
    const count = potentialBrands.filter(b => b === brand).length;
    const mentioned = brand.toLowerCase() === brandName.toLowerCase();
    console.log(`   ${mentioned ? '✅' : '  '} ${brand}: ${count} mention(s)`);
  });
  
  // Check if target brand is mentioned
  const brandMentions = (response.match(new RegExp(`\\b${brandName}\\b`, 'gi')) || []).length;
  console.log(`\n🎯 TARGET BRAND ("${brandName}"):`);
  console.log(`   - Mentions: ${brandMentions}`);
  console.log(`   - Status: ${brandMentions > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  // Analyze positioning
  console.log(`\n💭 POSITIONING PATTERNS:`);
  if (hasNumberedList || hasBulletList) {
    console.log(`   - Uses structured list format (likely ranked by popularity)`);
    console.log(`   - Competitors appear in order of market dominance`);
    console.log(`   - → Brand must be top 5 to appear in list`);
  }
  
  const mentionsFunctionality = /offers|provides|supports|features|focuses|enables/gi.test(response);
  if (mentionsFunctionality) {
    console.log(`   - Includes specific capabilities discussion`);
    console.log(`   - → Brand needs unique feature set to stand out`);
  }
  
  if (response.includes('established') || response.includes('long-') || response.includes('market share')) {
    console.log(`   - References market position and history`);
    console.log(`   - → Newer brands at disadvantage unless innovative`);
  }
  
  console.log(`\n📊 WHY BRAND ISN'T MENTIONED:`);
  if (brandMentions === 0) {
    console.log(`   1. ⚠️  Brand may not be in top N competitors for this category`);
    console.log(`   2. ⚠️  Response format prioritizes market leaders`);
    console.log(`   3. ⚠️  Generic prompt doesn't guide toward this brand`);
    console.log(`   4. ⚠️  Training data may have stronger associations for competitors`);
  }
  
  return {
    competitors: uniqueBrands,
    brandMentions,
    structureType: hasNumberedList ? 'ranked-list' : (hasBulletList ? 'bullet-list' : 'paragraph'),
    patterns: {
      hasNumberedList,
      hasBulletList,
      mentionsFunctionality
    }
  };
}

// Suggest improvements for getting brand mentioned
function suggestPromptImprovements(brandName, category) {
  console.log('\n' + '='.repeat(60));
  console.log('💡 STRATEGIES TO IMPROVE BRAND VISIBILITY');
  console.log('='.repeat(60));
  
  console.log(`\n📌 OPTION 1: Make Brand More Specific in Prompt`);
  console.log(`   Current: "What are the best options for: ${category}?"`);
  console.log(`   Better:  "What are the best options for ${category}?"`);
  console.log(`   Even Better: "Compare these platforms for ${category}: ${brandName}, PayPal, Square"`);
  console.log(`   → Forces brand into comparison (likely to be mentioned)`);
  
  console.log(`\n📌 OPTION 2: Ask for Brand Attributes`);
  console.log(`   New: "For ${category}, what makes ${brandName} competitive?"`);
  console.log(`   → Directly asks about the brand`);
  console.log(`   → AI must research and mention it`);
  
  console.log(`\n📌 OPTION 3: Ask for Market Positioning`);
  console.log(`   New: "How does ${brandName} compare in the ${category} market?"`);
  console.log(`   → Focuses analysis on your brand specifically`);
  
  console.log(`\n📌 OPTION 4: Ask for Use Case Fit`);
  console.log(`   New: "Which is best for ${category}? Consider: cost, features, ease of use"`);
  console.log(`   → Opens discussion of detailed features (where niche brands excel)`);
  
  console.log(`\n📌 OPTION 5: Combine Analysis with Specific Questions`);
  console.log(`   New: "List top 5 platforms for ${category}. For each, note: pricing model, target market, unique features"`);
  console.log(`   → Gives more chances for brand to be mentioned`);
  
  console.log(`\n🎯 KEY INSIGHT:`);
  console.log(`   Generic prompts = generic responses (top 5 market leaders)`);
  console.log(`   Specific prompts = targeted responses (including your brand)`);
}

// Run analysis
console.log('\n\n🔍 AI RESPONSE PATTERN ANALYSIS');
console.log('═'.repeat(60));

const analyses = [
  { response: testResponses['payment processing'], name: 'Payment Processing' },
  { response: testResponses['fintech'], name: 'Fintech' },
  { response: testResponses['cloud'], name: 'Cloud Infrastructure' }
];

analyses.forEach((item, idx) => {
  analyzeResponse(item.response, 'Stripe');
});

// Global patterns
console.log('\n\n' + '='.repeat(60));
console.log('📋 GENERAL PATTERNS ACROSS AI RESPONSES');
console.log('='.repeat(60));

console.log(`
🏆 WINNER CHARACTERISTICS (Brands That Get Mentioned):
   ✅ Market leaders (Stripe, PayPal, Square in payments)
   ✅ First or top 5 in market share
   ✅ Specific unique features mentioned in news
   ✅ Strong brand recognition
   ✅ Multi-segment appeal

⚠️  DISADVANTAGES (Brands NOT Mentioned):
   ❌ Niche/specialized (too specific)
   ❌ Smaller market share
   ❌ Recent entrants
   ❌ Domain-specific (not in AI training data heavily)
   ❌ Regional/non-English markets

📈 MENTION PROBABILITY BY MARKET RANK:
   #1 Position:  95% chance of mention
   #2-5 Position: 70-80% chance
   #6-10 Position: 40-50% chance
   #11+:         < 20% chance in generic lists
`);

suggestPromptImprovements('Stripe', 'payment processing');

console.log('\n\n' + '='.repeat(60));
console.log('✨ IMPLEMENTATION SUGGESTION');
console.log('='.repeat(60));
console.log(`
Instead of:
  "What are the best options for: payment processing?"

Use prompts like:
  1. "What are the best payment processors for startups in 2024?"
  2. "Compare Stripe, Square, and PayPal for online businesses"
  3. "What payment processors offer the best API for developers?"
  
These targeted asks more likely to mention all brands.
`);

module.exports = { analyzeResponse, suggestPromptImprovements };

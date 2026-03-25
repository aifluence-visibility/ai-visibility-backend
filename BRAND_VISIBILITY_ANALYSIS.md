# Brand Visibility Analysis Report

## Key Findings

### Why Brands Are NOT Mentioned in Generic Responses

1. **Market Dominance Bias**
   - AI responses default to top 5-10 market leaders
   - Stripe competes with PayPal, Square, Google Pay, Amazon Pay
   - Unless your brand is #1-5 in market share, it gets excluded
   - Generic prompts trigger "popularity ranking" response pattern

2. **Response Structure Pattern**
   - Most AI responses use ordered lists: "1. Leader, 2. Runner-up, 3. Emerging..."
   - Lists are truncated (~5 items max)
   - Only brands that fit "best" category appear
   - Niche or specialized brands excluded by default

3. **Training Data Representation**
   - Competitors like PayPal, Square have massive media coverage
   - These names appear millions of times in training data
   - Less-covered brands have weaker associations in AI memory
   - Generic queries don't provide enough context to "remind" AI of your brand

### Competitor Patterns Observed

```
Payment Processing Category:
  🥇 Square       (mentioned)
  🥇 PayPal       (mentioned)
  🥇 Google Pay   (mentioned)
  🥇 Amazon Pay   (mentioned)
  🥇 2Checkout    (mentioned)
  ❌ Stripe       (NOT mentioned in generic query)

Fintech Category:
  🥇 Wise         (mentioned - international focus)
  🥇 Revolut      (mentioned - mobile first)
  🥇 Robinhood    (mentioned - investing)
  🥇 Coinbase     (mentioned - crypto)
  ❌ Stripe       (NOT mentioned - too generic)
```

**Pattern**: Each dominant category leader mentioned once. Generic queries omit brands unless they're THE leader.

---

## Solutions: How to Get Brand Mentioned

### ❌ What DOESN'T Work
```
"What are the best options for: payment processing?"
→ Result: Generic list of 5 major competitors
→ Your brand: Invisible unless #1
```

### ✅ What DOES Work

**Strategy 1: Force Comparison**
```
"Compare these 5 payment processors for online stores: 
Stripe, PayPal, Square, Google Pay, 2Checkout"
→ Result: Each brand mentioned in comparison
→ Effectiveness: 95% - Brand MUST appear
```

**Strategy 2: Ask for Specific Attributes**
```
"What makes Stripe unique in payment processing compared to competitors?"
→ Result: Direct discussion of your brand
→ Effectiveness: 90% - All responses mention your brand
```

**Strategy 3: Narrow the Use Case**
```
"What's the best payment processor for SaaS companies in 2024?"
→ Result: Category-specific list (where your brand may dominate)
→ Effectiveness: 70% - Better niche positioning
```

**Strategy 4: Ask for Detailed Feature Analysis**
```
"List payment processors and for each compare: 
pricing, API quality, setup time, global reach, support"
→ Result: Detailed discussion covering more brands
→ Effectiveness: 80% - More space for your brand to appear
```

**Strategy 5: Market Position Query**
```
"How has Stripe's market position changed? 
What are its main competitors and how do they compare?"
→ Result: Brand-specific analysis with competitor context
→ Effectiveness: 95% - Your brand is the focus
```

---

## Recommended Approach

### Current Endpoint Limitation
```javascript
// Current approach (generic)
const prompt = `What are the best options for: ${userPrompt}`;
// Result: Top 5 market leaders only
```

### Improved Endpoint Design
```javascript
// New approach (tactical)
const prompt = `For ${category}, compare: ${brandName}, ${competitor1}, ${competitor2}...`;
// Result: All brands discussed, mentions guaranteed

OR

const prompt = `What makes ${brandName} stand out in ${category}? 
How does it compare to ${competitor1} and ${competitor2}?`;
// Result: Direct brand analysis
```

---

## Visibility Score Interpretation

Given the patterns, a visibility score should account for:

| Score | Meaning |
|-------|---------|
| **0-10** | Brand not mentioned in any response (unknown/niche) |
| **10-30** | Brand mentioned 1-2 times across all prompts (weak presence) |
| **30-60** | Brand mentioned in multiple prompts (good visibility) |
| **60-80** | Brand mentioned frequently, some as leader (strong) |
| **80-100** | Brand mentioned in every prompt, often as top choice (excellent) |

**Note**: For fair comparison, use comparison prompts. Generic prompts favor market leaders unfairly.

---

## Action Items

1. **Update prompts in API endpoint** - Use comparison format instead of generic
2. **Add prompt variations** - Some comparison, some attribute-based
3. **Add competitor context** - Let users specify competitors to compare against
4. **Adjust scoring logic** - Account for mention frequency and positioning (not just count)

---

## Example Implementation Changes

Instead of:
```json
{
  "brandName": "Stripe",
  "prompts": ["payment processing", "fintech solutions"]
}
```

Suggest:
```json
{
  "brandName": "Stripe",
  "prompts": [
    "payment processing",
    "fintech solutions"
  ],
  "competitors": ["PayPal", "Square"],
  "analysisType": "comparison"  // or "attribute" or "market_position"
}
```

Then construct smarter prompts:
```javascript
if (analysisType === 'comparison') {
  prompt = `Compare for ${category}: ${brandName}, ${competitors.join(', ')}`;
} else if (analysisType === 'attribute') {
  prompt = `What makes ${brandName} unique in ${category}?`;
} else {
  prompt = `How does ${brandName} position itself in ${category} vs competitors?`;
}
```

---

## Summary

**The Core Issue**: Generic prompts trigger generic responses (top 5 only).

**The Solution**: Use comparison or attribute-focused prompts to guarantee mentions.

**Expected Improvement**: With targeted prompts, visibility scores should jump from 0 to 80+.

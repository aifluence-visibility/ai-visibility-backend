# Comprehensive Prompt Testing System Guide

## Overview

The `/test` endpoint runs 50 strategically-designed prompts across 4 categories to comprehensively measure brand visibility in AI responses.

## Prompt Categories

### 1. Generic Prompts (12 total)
**Purpose**: Measure baseline brand awareness without guidance

#### Subcategories:
- **market_overview** (4 prompts) - General questions about the market
  - "What are the best options for payment processing?"
  - "Which fintech platforms are most popular right now?"
  - "What are the leading cloud infrastructure providers?"
  - "Name the top SaaS platforms for business management"

- **product_type** (4 prompts) - Questions about specific product categories
  - "What payment solutions exist for e-commerce?"
  - "List popular billing and invoicing tools"
  - "What are the main alternatives for digital wallets?"
  - "Which platforms offer API-first payment infrastructure?"

- **use_case** (4 prompts) - Questions about specific use cases
  - "What payment processor should I use for my startup?"
  - "Best payment methods for international transactions?"
  - "Top platforms for subscription billing"
  - "What tools handle recurring payments effectively?"

**Expected Visibility**: 20-30% (brand only appears if top 5 market leader)

---

### 2. Niche Prompts (12 total)
**Purpose**: Measure visibility when targeting specific segments/features

#### Subcategories:
- **vertical** (4 prompts) - Industry/market vertical specific
  - "Best payment solutions for SaaS companies specifically"
  - "Payment platforms optimized for marketplaces"
  - "Top solutions for high-risk merchant payments"
  - "Payment processors for cryptocurrency transactions"

- **feature** (4 prompts) - Feature/capability focused
  - "Which platforms offer the best developer API?"
  - "Platforms with advanced fraud detection capabilities"
  - "Solutions with built-in analytics and reporting"
  - "Payment systems with white-label options"

- **price_point** (4 prompts) - Price/cost focused
  - "Most affordable payment processor for small businesses"
  - "Payment platforms with lowest transaction fees"
  - "Enterprise-grade payment solutions comparison"
  - "Most cost-effective payment gateway for startups"

**Expected Visibility**: 40-60% (brand appears when niche is relevant)

---

### 3. Comparison Prompts (12 total)
**Purpose**: Force balanced comparison of multiple brands

#### Subcategories:
- **head_to_head** (4 prompts) - Direct brand comparisons
  - "Compare Stripe and PayPal for online payments"
  - "Square vs Stripe vs PayPal: which is best?"
  - "Comparing payment processors: features and pricing"
  - "How do modern payment platforms differentiate?"

- **feature_focus** (4 prompts) - Feature-based comparisons
  - "Which payment processor has the best API documentation?"
  - "Comparing developer experience across payment platforms"
  - "Security features: payments providers ranked"
  - "Settlement speed comparison among major processors"

- **use_case_specific** (4 prompts) - Use-case specific comparisons
  - "Best payment processor for e-commerce in 2024"
  - "Payment solutions ranked for SaaS businesses"
  - "Top payment platforms for marketplaces"
  - "Payment processors evaluated for global commerce"

**Expected Visibility**: 80-95% (brand must appear in comparison)

---

### 4. Brand Prompts (14 total)
**Purpose**: Measure brand positioning and perception directly

#### Subcategories:
- **attributes** (4 prompts) - Brand differentiation
  - "What makes Stripe stand out in payment processing?"
  - "Why do developers prefer Stripe?"
  - "Stripe's competitive advantages in fintech"
  - "How has Stripe evolved as a payment platform?"

- **positioning** (4 prompts) - Brand market position
  - "Is Stripe the best payment processor?"
  - "Stripe's market position vs competitors"
  - "What companies use Stripe and why?"
  - "Stripe's role in the fintech ecosystem"

- **features** (4 prompts) - Brand technical capabilities
  - "Analyzing Stripe's API capabilities"
  - "Stripe's features for payment processing excellence"
  - "How does Stripe handle complex payment workflows?"
  - "Stripe's approach to payment security"

- **market_strategy** (2 prompts) - Brand business strategy
  - "Stripe's expansion strategy in emerging markets"
  - "How investors view Stripe's business model"
  - "Stripe's innovation in payment technology"
  - "Stripe's future in the payments industry"

**Expected Visibility**: 95%+ (brand is focus of all prompts)

---

## How Category Scores Are Calculated

1. **Per-Prompt Mentions**: Count how many times brand is mentioned in each response
2. **Average Per Category**: Total mentions ÷ number of prompts in category
3. **Score Conversion**: Average mentions × 10, capped at 100
4. **Final Score**: Math.round(Math.min(avgMentions × 10, 100))

### Examples:

**Generic Category**:
```
12 prompts, 18 total mentions
Average: 18 ÷ 12 = 1.5 mentions per prompt
Score: Math.min(1.5 × 10, 100) = Math.min(15, 100) = 15
```

**Comparison Category**:
```
12 prompts, 72 total mentions  
Average: 72 ÷ 12 = 6 mentions per prompt
Score: Math.min(6 × 10, 100) = Math.min(60, 100) = 60
```

**Brand Category**:
```
14 prompts, 98 total mentions
Average: 98 ÷ 14 = 7 mentions per prompt
Score: Math.min(7 × 10, 100) = Math.min(70, 100) = 70
```

---

## Overall Score Calculation

```
Overall Score = (Total mentions across ALL 50 prompts ÷ 50) × 10
```

### Score Interpretation

| Score | Category | Interpretation |
|-------|----------|-----------------|
| 0-10 | Very Low | Virtually unknown in market |
| 10-30 | Low | Minor player or niche position |
| 30-50 | Moderate | Established middle-tier player |
| 50-70 | Good | Strong market position |
| 70-90 | Very Good | Major market leader |
| 90-100 | Excellent | Dominant leader |

---

## Test Response Structure

```json
{
  "success": true,
  "data": {
    "brand": "Stripe",
    "testMetadata": {
      "totalPrompts": 50,
      "categoriesTestedCount": 4,
      "totalResponses": 50,
      "timestamp": "2026-03-23T14:30:00.000Z"
    },
    "overallScore": 72,
    "categoryScores": {
      "generic": 20,
      "niche": 55,
      "comparison": 92,
      "brand": 95
    },
    "topCompetitors": [
      { "name": "PayPal", "mentions": 28 },
      { "name": "Square", "mentions": 24 },
      { "name": "Google Pay", "mentions": 19 },
      ...
    ],
    "categoryBreakdown": [
      {
        "category": "generic",
        "score": 20,
        "promptsCount": 12,
        "totalMentions": 24,
        "competitors": ["PayPal", "Square", "Google Pay"]
      },
      ...
    ],
    "detailedResults": [
      {
        "category": "generic",
        "subcategory": "market_overview",
        "prompt": "What are the best options for payment processing?",
        "response": "[Full AI response]",
        "mentions": 0,
        "competitors": ["PayPal", "Square"]
      },
      ...
    ]
  }
}
```

---

## Example Test Commands

### Test a Single Brand
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"brandName": "Stripe"}'
```

### Test Multiple Brands (run separately)
```bash
# Test Stripe
curl -X POST http://localhost:3000/test -d '{"brandName": "Stripe"}'

# Test PayPal
curl -X POST http://localhost:3000/test -d '{"brandName": "PayPal"}'

# Test Square
curl -X POST http://localhost:3000/test -d '{"brandName": "Square"}'
```

---

## Understanding the Results

### Category Score Analysis

**High Generic Score (70+)**:
- Brand is top-of-mind in market
- Broad market awareness
- Strong brand recognition

**High Niche Score (70+)**:
- Brand shown in specialized use cases
- Good vertical/feature positioning
- Relevant to specific segments

**High Comparison Score (70+)**:
- Brand can compete in direct comparisons
- Stands well against competitors
- Fair competitive positioning

**High Brand Score (80+)**:
- Strong brand positioning
- Clear differentiation
- Market leadership perception

### Competitor Intelligence

**Top Competitors List**:
- Shows which brands appear most frequently
- Indicates direct competition
- Helps identify market positioning

**Competitor Appearance by Category**:
- Generic: Shows main market competitors
- Niche: Shows niche-specific competitors
- Comparison: Shows direct competitors
- Brand: Shows brands mentioned in relation to target

---

## Best Practices

1. **Run Full Test First**
   - Establishes baseline visibility
   - Identifies strength/weakness categories
   - Reveals competitor landscape

2. **Track Over Time**
   - Run same test monthly
   - Monitor score trends
   - Track competitor mentions

3. **Compare Against Competitors**
   - Test your brand
   - Test main competitors
   - Build competitive matrix

4. **Use Results Strategically**
   - Low generic = work on market awareness
   - Low niche = develop vertical solutions
   - Low comparison = strengthen marketing
   - Low brand = improve brand positioning

---

## Technical Implementation

### Sequential Processing
- Prompts run one-by-one (not parallel)
- 100ms delay between API calls
- Prevents rate limiting issues
- Full results collected before response

### Rate Limiting
- 50 prompts × 100ms = ~5-7 seconds total
- Respects OpenAI API rate limits
- Can be adjusted in server.js

### Logging
Every step is logged to console:
- Start of test
- Progress through each category
- Results for each prompt
- Final score calculations
- Completion timestamp

---

## File Reference

- `prompts.json` - All 50 test prompts with metadata
- `server.js` - `/test` endpoint implementation
- `README.md` - API documentation
- This file - Comprehensive guide

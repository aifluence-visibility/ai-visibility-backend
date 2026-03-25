# AI Visibility Tool Backend

A Node.js + Express backend for analyzing AI visibility across different prompts using real OpenAI API responses.

## Project Structure

```
ai-visibility-tool/
├── server.js          # Main server file
├── config.js          # Configuration management
├── package.json       # Dependencies and scripts
├── .env.example       # Example environment variables
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## Getting Started

### 1. Set Up OpenAI API Key

Create a `.env` file in the project root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

**To get an API key:**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/account/api-keys)
4. Create a new API key
5. Copy and paste it into your `.env` file

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/analyze` | POST | Analyze brand on custom prompts with strategy options |
| `/test` | POST | Comprehensive testing across 50 prompts (4 categories) |
| `/health` | GET | Health check |

### Endpoint Details

Analyzes brand visibility across given prompts using real OpenAI API responses with smart prompt engineering.

**Request Body:**
```json
{
  "brandName": "MyBrand",
  "prompts": [
    "best AI tools",
    "machine learning platforms",
    "AI automation solutions"
  ],
  "analysisType": "comparison"
}
```

**Parameters:**
- `brandName` (string, required) - The brand to analyze
- `prompts` (array, required) - List of search/market prompts to analyze
- `analysisType` (string, optional) - Strategy for analysis:
  - `generic` (default) - Standard "best options" query
  - `comparison` - Compares brand against competitors  
  - `attribute` - Focuses on what makes brand unique

### POST /test

**Comprehensive prompt testing system** - Automatically runs 50 strategically-designed prompts across 4 categories to measure brand visibility comprehensively.

**Request Body:**
```json
{
  "brandName": "Stripe"
}
```

**Parameters:**
- `brandName` (string, required) - The brand to test

**Response:**
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
      "generic": 25,
      "niche": 68,
      "comparison": 95,
      "brand": 100
    },
    "topCompetitors": [
      { "name": "PayPal", "mentions": 28 },
      { "name": "Square", "mentions": 24 },
      { "name": "Google Pay", "mentions": 19 }
    ],
    "categoryBreakdown": [
      {
        "category": "generic",
        "score": 25,
        "promptsCount": 12,
        "totalMentions": 30,
        "competitors": ["PayPal", "Square"]
      }
    ],
    "detailedResults": [
      {
        "category": "generic",
        "subcategory": "market_overview",
        "prompt": "What are the best options for payment processing?",
        "response": "[AI response text...]",
        "mentions": 0,
        "competitors": ["PayPal", "Square", "Google Pay"]
      }
    ]
  }
}
```

**Analysis Type Strategies:**

| Type | Example Prompt | Best For | Expected Mentions |
|------|---|---|---|
| **generic** | "What are the best options for: payment processing?" | Baseline comparison | Low (top 5 only) |
| **comparison** | "Compare Stripe with PayPal, Square..." | Fair competitor analysis | High (all brands discussed) |
| **attribute** | "What makes Stripe unique in payments?" | Brand differentiation | Very High (brand focused) |

**Response:**
```json
{
  "success": true,
  "data": {
    "brand": "MyBrand",
    "analysisType": "comparison",
    "visibilityScore": 85,
    "totalMentions": 12,
    "mentionsByPrompt": [
      {
        "prompt": "best AI tools",
        "mentions": 4,
        "competitors": ["OpenAI", "Google"],
        "analysisType": "comparison"
      }
    ],
    "competitors": ["Google", "OpenAI", "Microsoft"],
    "analyzedResponses": [
      {
        "prompt": "best AI tools",
        "response": "[Real response from OpenAI discussing the brand]",
        "brandMentions": 4,
        "competitorsFound": ["OpenAI", "Google"],
        "analysisType": "comparison"
      }
    ],
    "timestamp": "2026-03-23T10:00:00.000Z"
  }
}
```

### GET /health

Health check endpoint to verify server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

## Example Usage

### Example 1: Simple Analysis with Custom Prompts
```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Stripe",
    "prompts": ["payment processing", "fintech solutions"],
    "analysisType": "comparison"
  }'
```

### Example 2: Comprehensive Prompt Testing (50 Prompts)
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"brandName": "Stripe"}'
```

This runs your brand through 50 carefully-designed prompts across 4 categories:
- **Generic** (12 prompts) - Market-level inquiries  
- **Niche** (12 prompts) - Vertical/feature-focused questions
- **Comparison** (12 prompts) - Head-to-head competitive prompts
- **Brand** (14 prompts) - Brand-specific positioning queries

Returns comprehensive scores and competitor analysis by category.

## Understanding Visibility Scores

The visibility score (0-100) indicates how often and prominently your brand appears in AI responses:

| Score Range | Interpretation | Analysis Type |
|---|---|---|
| 0-20 | Brand rarely mentioned | Generic prompts, niche position |
| 20-40 | Weak visibility | Needs better market position or targeted prompts |
| 40-60 | Moderate visibility | Established player, comparison helps |
| 60-80 | Good visibility | Strong brand awareness, comparison shows value |
| 80-100 | Excellent visibility | Market leader or perfectly targeted prompts |

**Why analysis type matters**: Generic prompts bias toward market leaders. Comparison and attribute analyses provide more accurate brand positioning.

## How It Works

1. **API Request**: For each prompt, the system sends a request to OpenAI with smart prompt engineering
2. **Prompt Strategy**: Based on `analysisType`, constructs different prompts:
   - `generic`: Standard market inquiry
   - `comparison`: Forces brand into head-to-head comparison
   - `attribute`: Asks what makes brand unique
3. **Brand Detection**: Analyzes responses to detect mentions of the specified brand (case-insensitive)
4. **Competitor Extraction**: Identifies known competitors mentioned in the responses
5. **Visibility Scoring**: Calculates a visibility score (0-100) based on mention frequency
6. **Response Collection**: Returns all analyzed responses along with structured metrics

## Understanding Brand Visibility

See [BRAND_VISIBILITY_ANALYSIS.md](BRAND_VISIBILITY_ANALYSIS.md) for a detailed analysis of:
- Why brands don't appear in generic responses
- Competitor patterns across different markets
- Strategies to improve brand visibility
- How to interpret visibility scores

**Key Insight**: Generic prompts return top 5 market leaders only. Use `analysisType: "comparison"` or `"attribute"` to get more accurate brand visibility metrics.

## Configuration

Edit `config.js` or set environment variables to customize:

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `OPENAI_MODEL` - Model to use (default: `gpt-4o-mini`)
- `PORT` - Server port (default: `3000`)
- **Mentions**: Random per prompt
- **Competitors**: 3 mock competitors with random scores

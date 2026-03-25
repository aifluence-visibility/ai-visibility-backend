# Prompt Testing System - Quick Start

## What You Get

✅ **50 strategically-designed prompts** organized into 4 categories:
- Generic (12) - Market-level inquiries
- Niche (12) - Vertical/feature-focused
- Comparison (12) - Head-to-head competitive
- Brand (14) - Brand-specific positioning

✅ **Comprehensive scoring** by category and overall

✅ **Competitor intelligence** - Top competitors identified and ranked

✅ **Detailed results** - Full response text + mention counts

## How to Use

### Start the Server
```bash
npm start
```

### Run Comprehensive Test
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"brandName": "Stripe"}'
```

### Test Duration
~5-7 seconds (sequential processing, 50 prompts)

## Interpreting Results

### Overall Score (0-100)
- **0-20**: Unknown brand or very niche
- **20-40**: Smaller market share
- **40-60**: Established mid-tier player  
- **60-80**: Strong market position
- **80-100**: Market leader

### Category Scores Breakdown
- **Generic Score 0-30**: Brand not in top 5 market leaders
- **Generic Score 30-70**: Recognized but specialized
- **Generic Score 70+**: Market leader

- **Niche Score 0-30**: Weak vertical positioning
- **Niche Score 30-70**: Good vertical presence
- **Niche Score 70+**: Strong in segments

- **Comparison Score 0-30**: Lost in comparisons
- **Comparison Score 30-70**: Competitive but not dominant
- **Comparison Score 70+**: Strong competitive position

- **Brand Score 0-50**: Weak brand positioning
- **Brand Score 50-80**: Established brand identity
- **Brand Score 80+**: Strong brand differentiation

### Top Competitors
Shows which brands appear most frequently:
- High mentions = Direct competition
- Consistent across categories = Major market rival
- Category-specific = Segment competitors

## Response Format

```json
{
  "brand": "Stripe",
  "overallScore": 72,
  "categoryScores": {
    "generic": 25,      // Low: not in top 5
    "niche": 68,        // Good: strong in segments
    "comparison": 95,   // Excellent: competitive
    "brand": 100        // Perfect: brand leadership
  },
  "topCompetitors": [
    {"name": "PayPal", "mentions": 28},
    {"name": "Square", "mentions": 24}
  ],
  "detailedResults": [...50 detailed prompt results...]
}
```

## Key Insights

### Reading the Category Scores

If your results look like this:
```
Generic: 20    → You're NOT a market leader in general awareness
Niche: 75      → You EXCEL in specific segments/features
Comparison: 90 → You're STRONG in direct comparisons
Brand: 85      → You have good brand perception
```

**Interpretation**: You're positioned as a strong specialist, not a general market leader. This is optimal for companies serving specific segments.

---

If your results look like this:
```
Generic: 85    → You're a MARKET LEADER
Niche: 75      → You maintain position in segments
Comparison: 80 → You compete well
Brand: 75      → Your brand is recognized
```

**Interpretation**: You're a dominant market player. Focus on maintaining leadership and expanding segments.

## Testing Strategy

### Week 1: Baseline
- Test your brand
- Test 2-3 main competitors
- Create competitive matrix

### Week 2-4: Deep Analysis
- Use detailed results to improve messaging
- Identify weak categories
- Plan content strategies

### Monthly: Trending
- Run test same time monthly
- Track score improvements
- Monitor competitor mentions

## Customizing Prompts

The 50 prompts cover standard business scenarios. To add industry-specific prompts:

1. Edit `prompts.json`
2. Add objects with: category, subcategory, prompt, description
3. Restart server
4. Run `/test` again

## Production Notes

- Sequential processing avoids rate limits
- 100ms delay between API calls (configurable)
- Full error handling and logging
- All responses included in results
- Timestamps for traceability

## Files Reference

| File | Purpose |
|------|---------|
| `prompts.json` | 50 test prompts |
| `server.js` | `/test` endpoint |
| `PROMPT_TESTING_GUIDE.md` | Full documentation |
| `README.md` | API documentation |

## Example Workflow

```bash
# 1. Start server
npm start

# 2. Test your brand
curl -X POST http://localhost:3000/test -d '{"brandName":"YourBrand"}' > results_your_brand.json

# 3. Test competitor
curl -X POST http://localhost:3000/test -d '{"brandName":"CompetitorA"}' > results_competitor.json

# 4. Test another competitor
curl -X POST http://localhost:3000/test -d '{"brandName":"CompetitorB"}' > results_competitor2.json

# 5. Compare results and develop strategy
```

---

## Troubleshooting

**"429 - Rate limit"**: 
- Wait a few minutes
- OpenAI API quota exhausted
- Check account billing

**"Empty detection"**:
- Brand might not be mentioned often
- Try with a well-known brand first
- Check capitalization

**"Long response time"**:
- Normal: 5-7 seconds for 50 prompts
- Check internet connection
- Verify OpenAI API is responding

## Next Steps

Once you have baseline data:

1. **Identify weak categories** - Focus improvement efforts
2. **Benchmark against competitors** - See relative positioning
3. **Track over time** - Monitor improvement
4. **Refine marketing messages** - Target weak categories
5. **Measure success** - Run test monthly

---

**Ready to test?** 

```bash
npm start
curl -X POST http://localhost:3000/test -d '{"brandName":"Stripe"}'
```

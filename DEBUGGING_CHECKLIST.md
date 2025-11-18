# HiFinder Debugging Checklist

## Quick Reference: The "5-Minute Rule"

**Never spend more than 5 minutes guessing.** After 5 minutes without finding the root cause, switch to systematic logging and trace the full data flow.

---

## The 7-Step Data Flow Pipeline

When something breaks, identify which step is failing:

```
User Action → Event Handler → State Update → API Request → Server Processing → Client Receives → UI Renders
   Step 1         Step 2          Step 3         Step 4          Step 5            Step 6          Step 7
```

### Binary Search Approach
Start in the **middle** (Step 4: API Request), then work backwards or forwards based on results.

---

## Failure Pattern Recognition

Match your symptoms to these patterns:

| Symptom | Likely Failed Step | What to Check |
|---------|-------------------|---------------|
| **Nothing happens when I interact** | Steps 1-2 | Event handlers attached? Console errors? |
| **UI updates but data doesn't change** | **Step 4** | Network tab - check ALL API parameters |
| **Data changes but UI doesn't update** | Step 7 | React keys, memo, component re-render |
| **Item count updates but items don't** | Step 6 | Response parsing, state setter logic |
| **Works on page refresh but not live** | Step 3 | State update logic, dependency arrays |
| **Constant numbers ("always 12")** | Step 4 | Stale state being sent to API |

---

## The "Always 12" Rule

**If a number never changes across different inputs, it's a DATA issue, not a RENDERING issue.**

Example from budget slider bug:
- Slider moves from $250 → $500 → $1500
- Item count stays "12 cans, 20 iems" (constant)
- **Smoking gun**: API is receiving wrong parameters

---

## Network Tab First Protocol

**Before touching any code, check the Network tab:**

1. Open DevTools → Network tab
2. Trigger the action (move slider, click button, etc.)
3. Find the API request
4. Check **ALL** parameters in the request URL/body
5. Compare expected vs actual parameters

**Time saved**: 3 minutes vs days of React debugging

---

## Systematic Debugging Workflow

### Phase 1: Observation (1 minute)
- [ ] What SHOULD happen?
- [ ] What ACTUALLY happens?
- [ ] Is there a pattern? (always same number, works on refresh, etc.)

### Phase 2: Binary Search (2 minutes)
- [ ] Check Network tab for API requests (Step 4)
- [ ] If request looks good → Check server response (Step 6)
- [ ] If request looks bad → Check state values (Step 3)

### Phase 3: Systematic Logging (5 minutes)
Add strategic console.logs:
```typescript
// Step 3: State update
console.log('🔵 STATE UPDATE:', { budget, customAllocation })

// Step 4: API request
console.log('📤 API REQUEST:', { url, params })

// Step 6: Response received
console.log('📥 API RESPONSE:', { data, count: data.length })

// Step 7: UI render
console.log('🎨 RENDER:', { cans: cans.length, timestamp: Date.now() })
```

### Phase 4: Verify Full Pipeline (10 minutes)
- [ ] Step 1: User action fires? (add onClick/onChange log)
- [ ] Step 2: Handler executes? (log handler entry)
- [ ] Step 3: State updates? (log state setter)
- [ ] Step 4: Request has correct params? (Network tab)
- [ ] Step 5: Server returns expected data? (log response)
- [ ] Step 6: Response parsed correctly? (log parsed data)
- [ ] Step 7: Component re-renders? (log render count)

---

## Common React Gotchas

### Stale State in API Requests
**Problem**: State from previous render sent to API
```typescript
// ❌ BAD: customAllocation never cleared
useEffect(() => {
  fetchData(budget, customBudgetAllocation) // ← stale value!
}, [budget])

// ✅ GOOD: Clear dependent state when parent changes
useEffect(() => {
  setCustomBudgetAllocation(null)
}, [budget])
```

### Problematic React Keys
**Problem**: Keys prevent React from detecting content changes
```typescript
// ❌ BAD: Same key when count unchanged
<div key={`cans-${budget}-${cans.length}`}>
  {/* cans.length might be same (12) even with different items */}
</div>

// ✅ GOOD: Let React manage or use stable unique IDs
<div>
  {cans.map(can => <Card key={can.id} {...can} />)}
</div>
```

### Stale Closures in Callbacks
**Problem**: Callback captures old state value
```typescript
// ❌ BAD: fetchData captures initial budget value
const fetchData = useCallback(() => {
  api.get(`/recommendations?budget=${budget}`) // ← stale!
}, []) // Empty deps!

// ✅ GOOD: Include all used values in deps
const fetchData = useCallback(() => {
  api.get(`/recommendations?budget=${budget}`)
}, [budget])
```

---

## State Verification Checklist

When state seems wrong:

- [ ] Check React DevTools Components tab for current state values
- [ ] Add `console.log` at state setter location
- [ ] Verify useEffect dependencies include all used values
- [ ] Check for stale closures (callbacks with empty dependency arrays)
- [ ] Verify state isn't being reset by parent component re-render
- [ ] Check for competing state updates (race conditions)

---

## API Request Checklist

When API returns wrong data:

- [ ] Network tab shows request was made
- [ ] ALL query parameters are correct (not just the obvious ones)
- [ ] Request body matches expected format
- [ ] Request headers include auth tokens if needed
- [ ] Server logs show expected query (not stale values)
- [ ] Response status is 200 (not 304 cached)
- [ ] Response data structure matches expected format

---

## Pro Tips from Budget Slider Bug

### The Timestamp Test
If timestamp updates but data doesn't:
- ✅ React IS rendering (not a render issue)
- ✅ State IS updating (not a state issue)
- ❌ Data is WRONG (API/data issue)

### The Network Tab Is Truth
Don't trust console.logs of "what I'm sending" - check what ACTUALLY got sent:
```typescript
// Your code says:
console.log('Sending budget:', budget) // 500

// But Network tab shows:
// ?budget=500&customBudgetAllocation={"headphones":{"amount":225}}
//                                    ↑ stale allocation overrides budget!
```

### The Constant Number Rule
If you see the same number across different conditions:
- "Always 12 cans" regardless of budget
- "Always 20 iems" regardless of filters
- **Stop looking at React rendering**
- **Check API parameters immediately**

---

## When to Use Each Debugging Tool

| Tool | Best For | Time Investment |
|------|----------|-----------------|
| **Network tab** | API issues, stale parameters | 1 min |
| **React DevTools** | Current state values, component tree | 2 min |
| **Console.logs** | Data flow tracking, pipeline verification | 5 min |
| **Breakpoints** | Complex logic, async timing issues | 10 min |
| **Binary search** | Unknown failure location | 15 min |

---

## Decision Tree: Where Is My Bug?

```
Does ANYTHING happen when you interact?
├─ NO → Check Steps 1-2 (event handlers, onClick)
└─ YES → Does the URL/visible state change?
    ├─ NO → Check Step 3 (state update logic)
    └─ YES → Does the API request fire?
        ├─ NO → Check Step 4 (fetch call, conditions)
        └─ YES → Open Network tab and check parameters
            ├─ WRONG PARAMS → Check Step 3-4 (what's being sent)
            └─ CORRECT PARAMS → Check response
                ├─ WRONG DATA → Check Step 5 (server logic)
                └─ CORRECT DATA → Check Step 6-7 (parsing, rendering)
```

---

## Example: Budget Slider Bug Postmortem

### What Happened
Moving budget slider didn't update recommendation cards.

### Symptoms Observed
- ✅ URL updated correctly
- ✅ Loading overlay appeared
- ✅ Filter pill counts updated
- ✅ Timestamp updated
- ❌ Item count constant (12 cans, 20 iems)
- ❌ Same cards displayed

### Critical Clue Missed
"Item count constant" = DATA issue, not RENDERING issue

### What Was Checked (Incorrectly)
- ❌ React keys (Step 7)
- ❌ useMemo dependencies (Step 7)
- ❌ Component re-renders (Step 7)

### What SHOULD Have Been Checked (Correctly)
1. ✅ Network tab (Step 4) → Would show stale `customBudgetAllocation`
2. ✅ ALL API parameters (not just `budget`)
3. ✅ Server logs to compare expected vs actual

### Root Cause
`customBudgetAllocation` state persisted from initial load:
```typescript
// Budget changed: $250 → $500
// But customBudgetAllocation still sent: { headphones: { amount: 225 }}
// API ignored new budget and used stale allocation
```

### Fix
```typescript
useEffect(() => {
  setCustomBudgetAllocation(null) // Clear on budget change
}, [userPrefs.budget])
```

### Time to Fix
- **Days of React debugging** (wrong approach)
- **Would have been 3 minutes** with Network tab first

### Lesson Learned
**"Always X" → Check data, not React**

---

## Remember

1. **Network tab first** - 1 minute can save days
2. **Check ALL parameters** - not just the obvious ones
3. **Constant numbers = data issue** - stop debugging React
4. **5-minute rule** - switch to systematic logging
5. **Binary search** - start in the middle of the pipeline
6. **Trust the Network tab** - not console.logs of "what I think I'm sending"

---

## Quick Commands

```bash
# Check server logs for API requests
npm run dev | grep "GET /api"

# Test API endpoint directly
curl "http://localhost:3000/api/recommendations/v2?budget=500"

# Check for stale state in React DevTools
# Components tab → Find component → Inspect hooks
```

---

*Created after budget slider debugging session - May this checklist save you from days of misguided React debugging!*

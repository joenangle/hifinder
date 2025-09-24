# Claude Code Notes for HiFinder

## QA Tasks Completed
- ✅ Authentication performance fix (2000ms+ → <200ms)
- ✅ Development environment cleanup
- ✅ CSV import path fixes

## High Priority: Summit-Fi Component Data Gaps

**Current Issues:**
- ❌ **ZERO high-end DACs** in database
- ❌ **ZERO high-end AMPs** in database
- ❌ **DAC/AMP combos maxed at $199** (need $500-$5000+ range)
- ⚠️ **IEM data corruption** (inflated prices like $4.3M for Stax)

**Data Gathering Strategy:**
1. **Immediate Manual (Phase 1):** Research 20-30 essential models per category
2. **Semi-Automated (Phase 2):** Web scraping ASR, Head-Fi, retailers
3. **Community Integration (Phase 3):** API integration with forums

**Key Sources:**
- ASR (Audio Science Review) - measured performance
- Head-Fi buying guides - community recommendations
- r/headphones guides - popular picks by price tier
- Audio46, Drop, Amazon - current pricing

**To implement:** Ask Claude to "start the summit-fi component data project"

## Claude Code Skill Development

**User Request:** Be proactive about suggesting optimizations and advanced techniques

**Current Level:** ~3 weeks experience
- ✅ Basic file operations, bash commands
- ✅ Background processes, multi-tool calls
- ✅ Database queries, git workflows
- 🎯 **Next:** Project files, advanced patterns, automation

**Optimization Areas to Watch:**
- Suggest parallel tool usage when sequential operations are independent
- Recommend Glob over manual file searches
- Point out MultiEdit opportunities for complex refactoring
- Suggest background processes for long-running tasks
- Share advanced grep/search patterns
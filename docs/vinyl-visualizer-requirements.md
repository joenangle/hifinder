# Vinyl Visualizer Feature — Requirements Document

## Overview

A web-based feature that uses the device microphone to detect music playing from a turntable, displays real-time audio visualizations, shows track metadata, and links to lyrics on Genius.

**Target Use Case:** A user playing vinyl records wants an ambient visual experience on a nearby screen (laptop, tablet, phone, or TV via browser), with automatic track identification and easy access to lyrics.

---

## Target Platforms

| Platform | Browser Support | Status |
|----------|-----------------|--------|
| Desktop | Chrome, Firefox, Safari, Edge | Full support |
| Mobile (Phone) | iOS Safari, Android Chrome | Supported with constraints |
| Mobile (Tablet) | iOS Safari, Android Chrome | Supported with constraints |
| Smartwatch | — | Out of scope |

### Mobile Constraints

- **iOS Safari:** AudioContext must be initiated from a user gesture (e.g., tap "Start Listening"). Background audio capture is not possible.
- **Android Chrome:** More permissive, but extended listening sessions will impact battery life.
- **Responsive design** required for varying screen sizes.

---

## Functional Requirements

### FR1: Audio Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1.1 | Capture audio from device microphone using Web Audio API (`getUserMedia`) | Must |
| FR1.2 | Provide clear "Start Listening" button to initiate audio context (required for iOS) | Must |
| FR1.3 | Display microphone permission request with explanation of why it's needed | Must |
| FR1.4 | Handle permission denial gracefully with instructions to enable in browser settings | Must |
| FR1.5 | Show visual indicator when actively listening (e.g., pulsing mic icon) | Should |
| FR1.6 | Allow user to stop/pause listening | Must |

### FR2: Music Identification

| ID | Requirement | Priority |
|----|-------------|----------|
| FR2.1 | Send audio samples to fingerprinting service (ACRCloud or AudD) for identification | Must |
| FR2.2 | Identify currently playing track within 10-15 seconds of listening | Must |
| FR2.3 | Display track title, artist, and album when identified | Must |
| FR2.4 | Display album art when available (from fingerprinting API or supplemental lookup) | Should |
| FR2.5 | Handle identification failures gracefully (show "Unknown Track" or similar) | Must |
| FR2.6 | Re-identify periodically (e.g., every 30-60 seconds) to detect track changes | Must |
| FR2.7 | Cache recent identifications to avoid redundant API calls for same audio | Should |
| FR2.8 | Target ≥80% identification accuracy for vinyl playback with typical surface noise | Should |

### FR3: Visualization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR3.1 | Provide real-time audio visualization using Web Audio API's AnalyserNode | Must |
| FR3.2 | Include at least 5 visualization presets | Must |
| FR3.2.1 | — Spectrum analyzer (frequency bars) | Must |
| FR3.2.2 | — Waveform / oscilloscope | Must |
| FR3.2.3 | — Abstract generative / particle system | Should |
| FR3.2.4 | — Circular / radial visualization | Should |
| FR3.2.5 | — Minimal / ambient mode | Should |
| FR3.3 | Allow user to switch between presets | Must |
| FR3.4 | Provide customization options: color theme, sensitivity/reactivity, symmetry | Should |
| FR3.5 | Persist user's visualization preferences across sessions (localStorage) | Should |
| FR3.6 | Support fullscreen mode | Should |
| FR3.7 | Visualizations must work offline (without track identification) | Must |

### FR4: Lyrics Linking

| ID | Requirement | Priority |
|----|-------------|----------|
| FR4.1 | When a track is identified, search Genius API for matching song | Must |
| FR4.2 | Display "View Lyrics on Genius" button/link when match found | Must |
| FR4.3 | Open Genius lyrics page in new tab | Must |
| FR4.4 | If no Genius match found, hide or disable lyrics button | Must |
| FR4.5 | Cache Genius URLs to avoid redundant API calls for same track | Should |
| FR4.6 | Strip version/remaster suffixes from search queries to improve match rate | Should |

### FR5: User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR5.1 | Responsive layout supporting desktop and mobile viewports | Must |
| FR5.2 | Track info panel showing: album art, title, artist, album name | Must |
| FR5.3 | Visualization area as primary visual focus | Must |
| FR5.4 | Settings/preferences panel (accessible via icon/menu) | Should |
| FR5.5 | Minimalist UI that doesn't distract from visualizations | Should |
| FR5.6 | Dark mode / ambient-friendly color scheme | Should |

---

## Non-Functional Requirements

### NFR1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1.1 | Audio processing latency | <100ms |
| NFR1.2 | Visualization frame rate on mid-range devices (2020+) | ≥30fps |
| NFR1.3 | Visualization frame rate on modern desktop | ≥60fps |
| NFR1.4 | Initial page load time on 4G connection | <3 seconds |
| NFR1.5 | Time to first visualization frame after "Start" | <500ms |

### NFR2: Privacy & Security

| ID | Requirement |
|----|-------------|
| NFR2.1 | Audio data sent only to fingerprinting service for identification |
| NFR2.2 | No permanent storage of audio recordings without explicit user consent |
| NFR2.3 | Clear privacy policy explaining microphone usage and data flow |
| NFR2.4 | All API communications over HTTPS |
| NFR2.5 | API keys stored server-side, not exposed to client |

### NFR3: Reliability

| ID | Requirement |
|----|-------------|
| NFR3.1 | Graceful degradation if fingerprinting service is unavailable (visualizer still works) |
| NFR3.2 | Graceful degradation if Genius API is unavailable (track info still shows) |
| NFR3.3 | Handle network interruptions without crashing |

### NFR4: Installability

| ID | Requirement |
|----|-------------|
| NFR4.1 | PWA manifest for home screen installation on iOS and Android |
| NFR4.2 | Service worker for offline visualization capability |
| NFR4.3 | Appropriate icons and splash screens for installed app experience |

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (PWA)                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐│
│  │  Mic Capture │ → │ Audio Router │ → │  Visualizer (Canvas/GL)  ││
│  │ (getUserMedia)│   │ (Web Audio)  │   │                          ││
│  └──────────────┘   └──────┬───────┘   └──────────────────────────┘│
│                            │                                        │
│                            ↓                                        │
│                     ┌──────────────┐                               │
│                     │ Audio Buffer │                               │
│                     │ (for upload) │                               │
│                     └──────┬───────┘                               │
│                            │                                        │
│  ┌─────────────────────────┼───────────────────────────────────────┐│
│  │              Track Info Display                                 ││
│  │  ┌─────────┐  ┌─────────────────┐  ┌──────────────────────┐    ││
│  │  │Album Art│  │ Title / Artist  │  │ "Lyrics on Genius" → │    ││
│  │  └─────────┘  └─────────────────┘  └──────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ↓
┌────────────────────────────────────────────────────────────────────┐
│                     Backend (API Layer)                            │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐       ┌─────────────────┐                     │
│  │ /identify      │ ←───→ │ ACRCloud / AudD │                     │
│  │ endpoint       │       │ (fingerprinting)│                     │
│  └───────┬────────┘       └─────────────────┘                     │
│          │                                                         │
│          ↓                                                         │
│  ┌────────────────┐       ┌─────────────────┐                     │
│  │ /lyrics        │ ←───→ │ Genius API      │                     │
│  │ endpoint       │       │ (free)          │                     │
│  └────────────────┘       └─────────────────┘                     │
│                                                                    │
│  ┌────────────────┐                                               │
│  │ Cache Layer    │ (Redis or in-memory for recent lookups)       │
│  └────────────────┘                                               │
└────────────────────────────────────────────────────────────────────┘
```

### Key Technical Components

| Component | Technology Options |
|-----------|-------------------|
| Audio capture | Web Audio API, `getUserMedia()` |
| Audio analysis (for visualizer) | `AnalyserNode.getByteFrequencyData()` |
| Audio buffering (for fingerprint upload) | `AudioWorklet` or `ScriptProcessorNode` |
| Visualization rendering | Canvas 2D, WebGL, Three.js, or p5.js |
| Fingerprinting service | ACRCloud (recommended) or AudD |
| Lyrics linking | Genius API (free tier) |
| State management | Framework-dependent (React state, Vuex, etc.) |
| Offline support | Service Worker + Cache API |

---

## External API Dependencies

### Audio Fingerprinting (Choose One)

| Service | Pros | Cons | Estimated Cost |
|---------|------|------|----------------|
| **ACRCloud** | Good accuracy, supports streaming recognition | Paid per recognition | ~$0.001-0.002/request |
| **AudD** | Simple API, affordable | Smaller database | ~$0.001/request |

**Recommendation:** Start with ACRCloud for better vinyl recognition accuracy. Budget for testing phase to validate accuracy with real vinyl recordings.

### Lyrics Linking

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Genius API** | Free, large database, returns direct URLs | No lyrics text in API (link only) | Free |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Vinyl surface noise degrades fingerprinting accuracy | Medium | High | Test early with real vinyl; tune audio preprocessing; accept graceful failure |
| iOS audio permission UX friction | High | Medium | Clear onboarding explaining mic usage; prominent "Start" button |
| Fingerprinting API costs scale unexpectedly | Low | Medium | Implement caching; rate-limit re-identification; monitor usage |
| Genius API changes or restricts access | Low | Low | Fallback to Google search link for lyrics |

---

## Open Questions

1. **Re-identification frequency:** How often should we re-fingerprint to detect track changes? More frequent = better UX but higher API costs. Recommendation: every 45-60 seconds, or on significant audio change detection.

2. **Vinyl-specific audio preprocessing:** Should we apply noise reduction or filtering before sending to fingerprinting service? May improve accuracy but adds complexity.

3. **Fallback for unknown tracks:** When identification fails, should we show a manual search input? Or just display "Unknown Track" with visualizer still running?

4. **Album art source:** Fingerprinting APIs sometimes return low-res art. Should we supplement with a secondary lookup (Spotify, Discogs, etc.)?

5. **Analytics:** What usage metrics should we track? (e.g., identification success rate, popular visualizer presets, session duration)

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Track identification success rate (vinyl source) | ≥80% |
| Time to identify playing track | <15 seconds |
| Visualizer frame rate (mobile) | ≥30fps |
| User can start listening with ≤2 taps/clicks | Yes |
| Feature works offline (visualizer only) | Yes |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2024-XX-XX | Initial draft |


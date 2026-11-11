<div align="center">

# TeamSync – Event-Based Team Formation and Matching System

### Last-Minute Event Teammate Matching Platform with 24-Hour Recruitment Cutoff Protocol

<br/>

<div align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#24-hour-recruitment-protocol">24-Hour Protocol</a> •
    <a href="#matching-algorithm">Matching Engine</a> •
    <a href="#deployment">Deployment</a>
</div>

<br/>

A full-stack, neo-brutalist web application designed for students, developers, competitive programmers, and participants in hackathons, esports, robotics arenas, and college activities. **TeamSync – Event-Based Team Formation and Matching System** connects incomplete teams with available talent, powers intelligent compatibility calculations, and enforces a strict, server-verified 24-hour recruitment freeze before event kickoff backed by Firebase Firestore.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Zod](https://img.shields.io/badge/Validation-Zod%203.23-3E67B1?style=flat-square)](https://zod.dev/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

</div>

<br/>

---

## Architecture

```mermaid
flowchart TD
    subgraph Client_Layer [Frontend Presentation & Neo-Brutalist UI]
        U["Browser Client"]
        U --> P1["Landing Page & Live Stats"]
        U --> P2["Dual-Tab Marketplace (/discover)"]
        U --> P3["Team & Roster Manager (/teams/[id])"]
        U --> P4["Direct Messaging & Notifications"]
        U --> P5["Moderation Center (/admin)"]
    end

    subgraph Logic_Layer [Next.js App Router & Engine Services]
        P1 & P2 & P3 & P4 & P5 --> API["API Endpoints & Server Handlers"]
        API --> M1["Matching Engine\n(Skills 40%, Category 20%, Mode 15%, Availability 15%, Interests 10%)"]
        API --> M2["Cutoff Protocol Validator\n(Server-Side Enforcement)"]
        API --> M3["Authentication & Session Service\n(JWT HS256 & bcrypt)"]
        API --> M4["Zod Request Validation"]
    end

    subgraph Safety_Protocol [Recruitment Cutoff Engine]
        M2 -->|Join Request Submitted| C1{"Cutoff Evaluation"}
        C1 -->|now >= event.startDate - 24h| C2["400 Reject: Recruitment Closed"]
        C1 -->|team.members >= team.maxMembers| C3["400 Reject: Team Full"]
        C1 -->|Valid & Open| C4["Batch Commit: Add Member & Increment Count"]
    end

    subgraph Data_Layer [Firebase Cloud Firestore Persistence]
        C4 & M1 & M3 --> FIREBASE["Firebase Admin SDK Firestore Singleton"]
        FIREBASE --> DB[("Google Cloud Firestore")]
    end
```

---

## Key Features

<table>
<tr>
<td width="50%" valign="top">

### 24-Hour Recruitment Cutoff Protocol
Enforces recruitment closures when an event is less than 24 hours away. Client components provide real-time reactive countdowns and urgency badges, while server-side request handlers strictly reject unauthorized submissions after the cutoff timestamp.

</td>
<td width="50%" valign="top">

### Weighted Compatibility Engine
Calculates deterministic 0-100% compatibility scores between candidates and squads based on required/preferred skills (40%), event domain (20%), mode and location (15%), availability (15%), and shared interests (10%).

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Dual-Tab Marketplace
Facilitates two-way discovery with dedicated tabs for teams seeking specific roles (e.g. 3/4 filled) and individual builders posting availability profiles with skill tags, bios, and experience highlights.

</td>
<td width="50%" valign="top">

### Team Lifecycle & Join Requests
Interactive join pitch modal with team leader management controls. Team leaders can review candidate profiles, accept or reject applicants, and have listings automatically locked when max capacity is reached.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Direct Messaging & Alerts
In-app direct messaging system allowing recruiters and candidates to coordinate logistics directly, backed by real-time notification feeds for requests, approvals, and urgency warnings.

</td>
<td width="50%" valign="top">

### Trust & Moderation Suite
Protected admin interface for reviewing community reports, moderating listings, and toggling user suspensions to maintain a safe and spam-free platform.

</td>
</tr>
</table>

---

## 24-Hour Recruitment Protocol

The 24-hour cutoff rule prevents last-second team reorganization and ensures squads are locked before competition day.

```text
[ Event Kickoff - 48h ] ----------> [ Event Kickoff - 24h ] ----------> [ Event Kickoff ]
       Status: OPEN                         Status: CLOSED                    Status: ACTIVE
    Recruitment Active                   Recruitment Frozen                 Event in Progress
```

### Protocol Invariants
1. **Freeze Window Calculation**: Cutoff Timestamp = `event.startDate - (24 * 60 * 60 * 1000)`.
2. **Server-Side Guard**: Every call to `/api/teams/join-request` executes `checkRecruitmentAllowed()`. If the server clock exceeds the cutoff timestamp, the request is rejected with HTTP 400.
3. **Capacity Guard**: When accepted members equal `team.maxMembers`, `team.status` automatically updates to `FULL` and remaining open slots are locked.

---

## Matching Algorithm

Compatibility scores are calculated using a weighted multi-factor formula:

$$\text{Score} = S_{\text{skills}} (40\%) + C_{\text{category}} (20\%) + L_{\text{location/mode}} (15\%) + A_{\text{availability}} (15\%) + I_{\text{interests}} (10\%)$$

```typescript
// Core factor distribution
const SKILL_WEIGHT = 0.40;
const CATEGORY_WEIGHT = 0.20;
const LOCATION_MODE_WEIGHT = 0.15;
const AVAILABILITY_WEIGHT = 0.15;
const INTERESTS_WEIGHT = 0.10;
```

---

## Project Structure

```text
TeamSync/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Authentication login
│   │   └── register/page.tsx        # Registration with interactive tag inputs
│   ├── admin/page.tsx               # Protected platform moderation dashboard
│   ├── create/
│   │   ├── orphan/page.tsx          # Post availability profile
│   │   └── team/page.tsx            # Post team requirement listing
│   ├── dashboard/page.tsx           # User command center and match feed
│   ├── discover/page.tsx            # Dual-tab marketplace with filters
│   ├── events/
│   │   ├── [id]/page.tsx            # Event details, countdown, teams roster
│   │   └── page.tsx                 # Events directory
│   ├── messages/page.tsx            # Direct messaging chat interface
│   ├── notifications/page.tsx       # In-app notifications feed
│   ├── profile/[username]/page.tsx  # Builder public profile
│   ├── teams/
│   │   ├── [id]/page.tsx            # Team roster, empty slots, leader manager
│   │   └── page.tsx                 # Teams directory
│   ├── api/                         # REST handlers for auth, teams, requests, admin
│   ├── globals.css                  # Neo-brutalist theme definitions
│   └── layout.tsx                   # Root layout, fonts, navigation, footer
├── components/
│   ├── cards/                       # TeamCard, OrphanCard, EventCard
│   ├── modals/                      # JoinRequestModal, ReportModal, MessageModal
│   ├── navbar/                      # Sticky brutalist navbar with alerts
│   └── ui/                          # BrutalButton, BrutalCard, Countdown, MatchScore
├── lib/
│   ├── auth.ts                      # JWT and session management
│   ├── cutoff.ts                    # 24-hour protocol validator
│   ├── db.ts                        # Unified database export
│   ├── firebase.ts                  # Firebase Client SDK
│   ├── firebase-admin.ts            # Firebase Admin SDK & Firestore instance
│   ├── matching.ts                  # Compatibility scoring engine
│   ├── utils.ts                     # Utility helpers
│   └── validation.ts                # Zod schemas
├── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18.0 or higher
- npm, pnpm, or yarn
- A Firebase project with Firestore Database enabled

### 2. Installation
```bash
git clone https://github.com/pprbkt/TeamSync.git
cd TeamSync
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# JWT & App
JWT_SECRET="your_secure_jwt_secret_key_change_in_production"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Firebase Admin SDK (Server)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

```bash
# Compile and optimize production bundle
npm run build

# Start production server
npm run start
```

---

## Deployment

### Vercel Deployment with Firebase
1. Push the repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set your environment variables in Vercel project settings:
   - `JWT_SECRET`
   - `NEXT_PUBLIC_FIREBASE_*` configuration variables
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or `FIREBASE_SERVICE_ACCOUNT_JSON` as a base64-encoded string)
4. Trigger deployment.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

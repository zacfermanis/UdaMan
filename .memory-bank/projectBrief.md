# Project Brief: Udaman

## Project Overview
Udaman is a digital platform that brings the tradition of friendly competition and camaraderie to families and groups worldwide. Born from a 30+ year family tradition of "The Happy Hackers" golf tournament, Udaman has evolved into a comprehensive competition management system that allows users to create, organize, and participate in multi-event competitions with sophisticated scoring and social features.

## Historical Context
The Udaman tradition began when the eldest grandson's bachelor party featured a day of golf, mini golf, and high-speed go-kart racing with his father, three uncles, and their sons. The success of this competitive celebration led to an annual tradition where the previous year's winner announces the next summer's events during the family Christmas party. 

The competition has grown from 8 participants to 12 as the family expanded, featuring diverse events including:
- **Mainstay**: Golf (winner chooses course)
- **Past Events**: Model Rocketry, Pine Wood Derby, Bench Press, Poetry Writing, Fire Making, Archery, Axe Throwing, Fishing, Kayak Racing, Marksmanship (Rifle, Handgun, Shotgun), Chess, Ping Pong, Foosball, Mario Kart

**Trophy System**: Winners receive a traditional trophy with their name, while last-place finishers ("panty-waist losers") receive a ballerina trophy to display proudly for the year.

## Core Requirements

### Primary Goals
1. **Competition Management**: Enable users to create and manage multi-event competitions
2. **User Authentication**: Provide secure login via OIDC social media or email registration
3. **Event Organization**: Allow competition creators to set up events with detailed rules and scoring
4. **Participant Management**: Facilitate invitation and participation tracking
5. **Scoring System**: Implement sophisticated point-based scoring with tie-breaking logic
6. **Monetization**: Freemium model with tiered functionality
7. **Social Features**: Enable banter, rivalry, and camaraderie among participants

### Key Features
- **User Authentication**: OIDC social login (Google, Facebook, Microsoft) + email registration
- **Competition Creation**: Multi-event competition setup with custom rules and creator-specific naming
- **Event Management**: Detailed event configuration with smart dropdowns for event types
- **Participant Invitation**: Email-based invitation system for contenders (3 free, unlimited premium)
- **Scoring System**: Position-based points with tie-breaking logic
- **Permission Management**: Role-based access control (creator, admin, participant, read-only)
- **Results Tracking**: Real-time score entry and leaderboard updates
- **Trophy System**: Digital trophy display and historical tracking
- **Freemium Tiers**: Basic functionality free (3 participants), premium features paid
- **Payment Processing**: Stripe, PayPal, and Bitcoin support
- **Compliance**: GDPR, CCPA, and US privacy law compliance

## Technical Requirements
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **Authentication**: OIDC social login integration
- **Database**: Supabase (PostgreSQL) for user data, competition data, and scoring storage
- **Email Service**: Invitation and notification system
- **Payment Processing**: Stripe, PayPal, and Bitcoin subscription management
- **Compliance**: GDPR, CCPA, and US privacy law compliance
- **Environment**: .env.local for secure configuration management
- **Deployment**: Vercel-ready
- **Performance**: Optimized for mobile and desktop

## Success Criteria
- Fast, responsive website
- Professional design that reflects competition values
- Easy navigation and information access
- Mobile-first approach
- SEO optimized
- Accessible to all users

## Project Scope
**Phase 1**: User authentication and basic competition creation
**Phase 2**: Event management and participant invitation system
**Phase 3**: Scoring system and results tracking
**Phase 4**: Advanced features (social features, analytics, premium tiers)

## Constraints
- Must maintain brand consistency with existing Udaman identity and tradition
- Should be easily maintainable by non-technical users
- Must work across all modern browsers and devices
- Must support OIDC authentication standards
- Must implement secure payment processing for freemium model (Stripe, PayPal, Bitcoin)
- Must comply with GDPR, CCPA, and applicable US privacy laws
- Should scale to support multiple concurrent competitions

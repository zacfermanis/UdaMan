# System Patterns: Udaman

## Architecture Overview

### Technology Stack
- **Frontend Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Testing**: Jest + React Testing Library
- **Authentication**: OIDC social login (Google, Facebook, Microsoft)
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Email Service**: Invitation and notification system
- **Payment Processing**: Stripe, PayPal, and Bitcoin subscription management
- **Compliance**: GDPR, CCPA, and US privacy law compliance
- **Environment**: .env.local for secure configuration
- **Fonts**: Geist Sans and Geist Mono (Google Fonts)
- **Deployment**: Vercel-ready configuration

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Home page component
│   ├── auth/              # Authentication pages
│   ├── competitions/      # Competition management pages
│   ├── events/            # Event management pages
│   ├── dashboard/         # User dashboard
│   └── __tests__/         # Test files for app components
├── components/            # Reusable React components
│   ├── auth/              # Authentication components
│   ├── competitions/      # Competition components
│   ├── events/            # Event components
│   ├── scoring/           # Scoring system components
│   └── ui/                # Generic UI components
├── lib/                   # Utility functions and helpers
│   ├── auth/              # Authentication utilities
│   ├── supabase/          # Supabase client and database operations
│   ├── scoring/           # Scoring calculation logic
│   └── email/             # Email service utilities
├── types/                 # TypeScript type definitions
└── styles/                # Component-specific styles
```

## Key Technical Decisions

### 1. Next.js App Router
- **Rationale**: Latest Next.js architecture with improved performance and developer experience
- **Benefits**: Server components, improved routing, better SEO
- **Pattern**: Use server components by default, client components when needed

### 2. TypeScript Strict Mode
- **Rationale**: Catch errors early, improve code quality and maintainability
- **Pattern**: No `any` types, proper type definitions for all data structures
- **Testing**: Use real schemas/types in tests, never redefine them

### 3. Tailwind CSS
- **Rationale**: Utility-first CSS framework for rapid development and consistent design
- **Pattern**: Mobile-first responsive design with custom design tokens
- **Configuration**: Custom color palette and spacing system

### 4. Test-Driven Development
- **Rationale**: Ensure code quality and prevent regressions
- **Pattern**: Write tests first, test behavior not implementation
- **Coverage**: 100% coverage based on business behavior

## Design Patterns

### Component Architecture
- **Server Components**: Default for static content and SEO
- **Client Components**: Only when interactivity is needed
- **Composition**: Prefer composition over inheritance
- **Props**: Immutable props, no direct state mutations

### State Management
- **Local State**: React useState for component-specific state
- **Global State**: Context API or Zustand for app-wide state
- **Server State**: React Query or SWR for API data
- **Authentication State**: User session and permissions
- **Competition State**: Active competition data and scoring
- **Pattern**: Immutable updates, pure functions

### Data Flow
- **Unidirectional**: Props down, events up
- **Immutable**: No direct mutations of props or state
- **Type Safety**: Full TypeScript coverage for all data structures

### Error Handling
- **Boundaries**: React Error Boundaries for component errors
- **Validation**: Input validation with proper error messages
- **Fallbacks**: Graceful degradation for failed features
- **Logging**: Structured error logging for debugging

## Performance Patterns

### Optimization Strategies
- **Images**: Next.js Image component with optimization
- **Fonts**: Google Fonts with proper loading strategies
- **Code Splitting**: Automatic with Next.js App Router
- **Caching**: Static generation where possible

### Loading Patterns
- **Skeleton Loading**: For dynamic content
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Lazy Loading**: Components and images loaded on demand

## Security Patterns

### Input Validation
- **Client-side**: Immediate feedback for user experience
- **Server-side**: Always validate on the server
- **Sanitization**: Clean user inputs before processing

### Authentication
- **OIDC Social Login**: Google, Facebook, Microsoft integration
- **Email Registration**: Traditional email/password with verification
- **Supabase Auth**: Built-in authentication with JWT tokens
- **Session Management**: Secure session handling with Supabase
- **Authorization**: Role-based access control (creator, admin, participant, read-only)
- **Permission Delegation**: Competition creators can delegate admin permissions

### Data Protection
- **Privacy by Design**: Built-in privacy controls and data minimization
- **GDPR Compliance**: EU data protection regulation compliance
- **CCPA Compliance**: California privacy law compliance
- **Data Encryption**: Encryption at rest and in transit
- **Consent Management**: User consent tracking and management

## Testing Patterns

### Test Organization
- **Behavior Tests**: Test user interactions and business logic
- **Component Tests**: Test React component rendering and interactions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user journeys (future)

### Test Data
- **Factories**: Factory functions for test data creation
- **Fixtures**: Reusable test data sets
- **Mocks**: Minimal mocking, prefer real implementations

## Deployment Patterns

### Environment Configuration
- **Environment Variables**: .env.local for local development, Vercel environment variables for production
- **Supabase Configuration**: Project ID and database password stored securely
- **Build Process**: Optimized production builds
- **Static Assets**: Optimized image and font delivery

### Monitoring
- **Error Tracking**: Structured error logging
- **Performance Monitoring**: Core Web Vitals tracking
- **Analytics**: User behavior tracking (future)

## Code Quality Patterns

### Linting and Formatting
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

### Git Workflow
- **Feature Branches**: Isolated development
- **Pull Requests**: Code review process
- **Semantic Commits**: Clear commit messages

## Future Considerations

### Scalability
- **Microservices**: API separation for different features
- **CDN**: Global content delivery
- **Database**: Proper data modeling and optimization

### Maintainability
- **Documentation**: Comprehensive code documentation
- **Refactoring**: Regular code cleanup and optimization
- **Dependencies**: Regular updates and security patches

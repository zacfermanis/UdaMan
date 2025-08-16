# Technical Context: Udaman

## Technology Stack

### Core Technologies
- **Next.js**: 15.4.5 - React framework with App Router
- **React**: 19.1.0 - UI library
- **TypeScript**: 5.x - Type-safe JavaScript
- **Tailwind CSS**: 4.x - Utility-first CSS framework
- **OIDC Authentication**: Social login integration
- **Supabase**: PostgreSQL database with real-time features
- **Email Service**: Invitation and notification system
- **Payment Processing**: Stripe, PayPal, and Bitcoin subscription management
- **Compliance**: GDPR, CCPA, and US privacy law compliance

### Development Tools
- **Node.js**: Runtime environment
- **npm/yarn**: Package managers
- **ESLint**: 9.x - Code linting
- **Jest**: 30.0.5 - Testing framework
- **React Testing Library**: 16.3.0 - Component testing

### Fonts and Assets
- **Geist Sans**: Primary font family
- **Geist Mono**: Monospace font for code
- **Custom Icons**: SVG icons in public directory
- **Favicon**: Multiple sizes generated automatically

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git for version control

### Installation
```bash
# Clone repository
git clone [repository-url]
cd UdaMan

# Install dependencies
npm install
# or
yarn install
```

### Development Commands
```bash
# Start development server
npm run dev
# or
yarn dev

# Build for production
npm run build
# or
yarn build

# Start production server
npm run start
# or
yarn start

# Run tests
npm run test
# or
yarn test

# Run tests in watch mode
npm run test:watch
# or
yarn test:watch

# Run tests with coverage
npm run test:coverage
# or
yarn test:coverage

# Lint code
npm run lint
# or
yarn lint

# Generate favicon
npm run generate-favicon
# or
yarn generate-favicon
```

## Project Configuration

### Next.js Configuration
- **App Router**: Enabled for modern routing
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended configuration
- **PostCSS**: Tailwind CSS processing
- **SWC**: Fast compilation

### TypeScript Configuration
- **Strict Mode**: All strict checks enabled
- **Target**: ES2017 for modern browsers
- **Module**: ESNext for latest features
- **JSX**: React JSX transform

### Tailwind CSS Configuration
- **Version**: 4.x with new architecture
- **Custom Colors**: Brand-specific color palette
- **Responsive Design**: Mobile-first approach
- **Custom Utilities**: Extended utility classes

### Testing Configuration
- **Jest**: Test runner with JSDOM environment
- **React Testing Library**: Component testing utilities
- **Coverage**: Istanbul coverage reporting
- **Setup**: Custom test setup file

## Dependencies

### Production Dependencies
```json
{
  "@zacfermanis/memory-bank": "^2.2.5",
  "@supabase/supabase-js": "^2.x",
  "next": "15.4.5",
  "react": "19.1.0",
  "react-dom": "19.1.0"
}
```

### Development Dependencies
```json
{
  "@eslint/eslintrc": "^3",
  "@tailwindcss/postcss": "^4",
  "@testing-library/dom": "^10.4.1",
  "@testing-library/jest-dom": "^6.6.4",
  "@testing-library/react": "^16.3.0",
  "@testing-library/user-event": "^14.6.1",
  "@types/jest": "^30.0.0",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "15.4.5",
  "jest": "^30.0.5",
  "jest-environment-jsdom": "^30.0.5",
  "sharp": "^0.34.3",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

## File Structure

### Source Code
```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── __tests__/         # App tests
├── components/            # Reusable components (future)
├── lib/                   # Utility functions (future)
│   └── supabase/          # Supabase client and operations
├── types/                 # TypeScript types (future)
└── styles/                # Component styles (future)
```

### Public Assets
```
public/
├── favicon/               # Favicon files
├── Udaman_Logo.webp      # Main logo
├── file.svg              # Icon assets
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

### Configuration Files
```
├── .cursorrules          # Memory bank rules
├── .memory-bank/         # Memory bank documentation
├── .specs/               # Feature specifications
├── .env.local            # Environment variables (not in git)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.ts        # Next.js configuration
├── postcss.config.mjs    # PostCSS configuration
├── eslint.config.mjs     # ESLint configuration
├── jest.config.js        # Jest configuration
└── jest.setup.js         # Jest setup file
```

## Development Workflow

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code style and quality rules
- **Prettier**: Code formatting (via ESLint)
- **Testing**: Jest with React Testing Library

### Git Workflow
- **Feature Branches**: Isolated development
- **Pull Requests**: Code review process
- **Semantic Commits**: Clear commit messages
- **Memory Bank**: Documentation updates

### Testing Strategy
- **Unit Tests**: Component and utility testing
- **Integration Tests**: Component interaction testing
- **Behavior Tests**: User interaction testing
- **Coverage**: 100% coverage target

## Deployment

### Vercel Deployment
- **Platform**: Vercel for hosting
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Variables**: Configured in Vercel dashboard

### Build Process
- **Static Generation**: Where possible
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic with App Router
- **Performance**: Core Web Vitals optimization

## Performance Considerations

### Optimization Strategies
- **Images**: Next.js Image optimization
- **Fonts**: Google Fonts optimization
- **JavaScript**: Code splitting and tree shaking
- **CSS**: Tailwind CSS purging

### Monitoring
- **Core Web Vitals**: Performance metrics
- **Error Tracking**: Application errors
- **Analytics**: User behavior (future)

## Security

### Best Practices
- **Input Validation**: Client and server-side
- **HTTPS**: Secure connections
- **Environment Variables**: .env.local for local secrets, Vercel env vars for production
- **Supabase Security**: Row Level Security (RLS) policies
- **Dependencies**: Regular security updates
- **Data Protection**: GDPR and CCPA compliance measures
- **Privacy Controls**: Built-in privacy and consent management

### Environment Configuration
- **Local Development**: .env.local file with Supabase project ID and database password
- **Production**: Vercel environment variables
- **Secrets Management**: Never commit .env.local to version control

## Troubleshooting

### Common Issues
- **TypeScript Errors**: Check strict mode compliance
- **Build Failures**: Verify dependency versions
- **Test Failures**: Check test data and mocks
- **Performance Issues**: Monitor Core Web Vitals

### Debug Tools
- **React DevTools**: Component debugging
- **Next.js Debug**: Framework debugging
- **Jest Debug**: Test debugging
- **Browser DevTools**: Client-side debugging

import { UserProfile, AuthError, AuthErrorType } from '../../types/auth'

// Check if user is authenticated
export function requireAuth(user: UserProfile | null): { isAuthenticated: boolean; error?: AuthError } {
  if (!user) {
    return {
      isAuthenticated: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }
    }
  }

  return { isAuthenticated: true }
}

// Check if user is verified
export function requireVerified(user: UserProfile | null): { isVerified: boolean; error?: AuthError } {
  const authCheck = requireAuth(user)
  if (!authCheck.isAuthenticated) {
    return {
      isVerified: false,
      error: authCheck.error
    }
  }

  if (!user!.email_verified) {
    return {
      isVerified: false,
      error: {
        type: AuthErrorType.EMAIL_NOT_VERIFIED,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      }
    }
  }

  return { isVerified: true }
}

// Check if user has premium subscription
export function requirePremium(user: UserProfile | null): { isPremium: boolean; error?: AuthError } {
  const verifiedCheck = requireVerified(user)
  if (!verifiedCheck.isVerified) {
    return {
      isPremium: false,
      error: verifiedCheck.error
    }
  }

  if (user!.subscription_tier !== 'premium') {
    return {
      isPremium: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED'
      }
    }
  }

  return { isPremium: true }
}

// Check if user has given consent
export function requireConsent(user: UserProfile | null): { hasConsent: boolean; error?: AuthError } {
  const authCheck = requireAuth(user)
  if (!authCheck.isAuthenticated) {
    return {
      hasConsent: false,
      error: authCheck.error
    }
  }

  if (!user!.consent_given) {
    return {
      hasConsent: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: 'Data processing consent required',
        code: 'CONSENT_REQUIRED'
      }
    }
  }

  return { hasConsent: true }
}

// Check if user can create competitions (free tier: 3 participants max, premium: unlimited)
export function canCreateCompetition(user: UserProfile | null, participantCount: number): { canCreate: boolean; error?: AuthError } {
  const verifiedCheck = requireVerified(user)
  if (!verifiedCheck.isVerified) {
    return {
      canCreate: false,
      error: verifiedCheck.error
    }
  }

  if (user!.subscription_tier === 'free' && participantCount > 3) {
    return {
      canCreate: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: 'Premium subscription required for competitions with more than 3 participants',
        code: 'PARTICIPANT_LIMIT_EXCEEDED'
      }
    }
  }

  return { canCreate: true }
}

// Check if user can access premium features
export function canAccessPremiumFeature(user: UserProfile | null, featureName: string): { canAccess: boolean; error?: AuthError } {
  const premiumCheck = requirePremium(user)
  if (!premiumCheck.isPremium) {
    return {
      canAccess: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: `Premium subscription required to access ${featureName}`,
        code: 'PREMIUM_FEATURE_REQUIRED'
      }
    }
  }

  return { canAccess: true }
}

// Check if user can manage competition (creator or admin)
export function canManageCompetition(
  user: UserProfile | null,
  competitionCreatorId: string,
  userRole: 'creator' | 'admin' | 'participant' | 'read-only'
): { canManage: boolean; error?: AuthError } {
  const verifiedCheck = requireVerified(user)
  if (!verifiedCheck.isVerified) {
    return {
      canManage: false,
      error: verifiedCheck.error
    }
  }

  // Creator can always manage
  if (user!.id === competitionCreatorId) {
    return { canManage: true }
  }

  // Admin can manage
  if (userRole === 'admin') {
    return { canManage: true }
  }

  return {
    canManage: false,
    error: {
      type: AuthErrorType.CONSENT_REQUIRED,
      message: 'Insufficient permissions to manage this competition',
      code: 'INSUFFICIENT_PERMISSIONS'
    }
  }
}

// Check if user can view competition
export function canViewCompetition(
  user: UserProfile | null,
  userRole: 'creator' | 'admin' | 'participant' | 'read-only'
): { canView: boolean; error?: AuthError } {
  const verifiedCheck = requireVerified(user)
  if (!verifiedCheck.isVerified) {
    return {
      canView: false,
      error: verifiedCheck.error
    }
  }

  // All roles can view
  return { canView: true }
}

// Check if user can participate in competition
export function canParticipateInCompetition(
  user: UserProfile | null,
  userRole: 'creator' | 'admin' | 'participant' | 'read-only'
): { canParticipate: boolean; error?: AuthError } {
  const verifiedCheck = requireVerified(user)
  if (!verifiedCheck.isVerified) {
    return {
      canParticipate: false,
      error: verifiedCheck.error
    }
  }

  // Only participants and above can participate
  if (userRole === 'read-only') {
    return {
      canParticipate: false,
      error: {
        type: AuthErrorType.CONSENT_REQUIRED,
        message: 'Read-only users cannot participate in competitions',
        code: 'READ_ONLY_USER'
      }
    }
  }

  return { canParticipate: true }
}

// Get user's permission level for a competition
export function getUserPermissionLevel(
  user: UserProfile | null,
  competitionCreatorId: string,
  userRole: 'creator' | 'admin' | 'participant' | 'read-only'
): 'creator' | 'admin' | 'participant' | 'read-only' | 'none' {
  const authCheck = requireAuth(user)
  if (!authCheck.isAuthenticated) {
    return 'none'
  }

  if (user!.id === competitionCreatorId) {
    return 'creator'
  }

  return userRole
}

// Check if user can invite participants
export function canInviteParticipants(
  user: UserProfile | null,
  competitionCreatorId: string,
  userRole: 'creator' | 'admin' | 'participant' | 'read-only',
  currentParticipantCount: number
): { canInvite: boolean; error?: AuthError } {
  const manageCheck = canManageCompetition(user, competitionCreatorId, userRole)
  if (!manageCheck.canManage) {
    return {
      canInvite: false,
      error: manageCheck.error
    }
  }

  const competitionCheck = canCreateCompetition(user, currentParticipantCount + 1)
  if (!competitionCheck.canCreate) {
    return {
      canInvite: false,
      error: competitionCheck.error
    }
  }

  return { canInvite: true }
}

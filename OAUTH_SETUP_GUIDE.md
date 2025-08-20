# OAuth Provider Setup Guide

## Overview
This guide provides step-by-step instructions for setting up OAuth providers (Google, Facebook, and Microsoft) for the Udaman application. You'll need to configure each provider and add the credentials to your `.env.local` file.

## Prerequisites
- A Google account (for Google OAuth)
- A Facebook account (for Facebook OAuth)
- A Microsoft account (for Microsoft OAuth)
- Your application's domain (for redirect URI configuration)

## Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Udaman OAuth`
4. Click "Create"

### Step 2: Enable Google+ API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" and click on it
3. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: Udaman
   - User support email: [your-email]
   - Developer contact information: [your-email]
   - Authorized domains: [your-domain]
4. Click "Save and Continue" through the remaining steps

### Step 4: Configure OAuth Client
1. Application type: Web application
2. Name: Udaman Web Client
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/oauth/callback/google` (development)
   - `https://your-domain.com/api/auth/oauth/callback/google` (production)
4. Click "Create"

### Step 5: Copy Credentials
1. Copy the **Client ID** and **Client Secret**
2. Add them to your `.env.local` file:
   ```
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

## Facebook OAuth Setup

### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as the app type
4. Enter app name: `Udaman`
5. Enter contact email: [your-email]
6. Click "Create App"

### Step 2: Add Facebook Login Product
1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" platform
4. Enter your site URL: `http://localhost:3000` (development)
5. Click "Save and Continue"

### Step 3: Configure Facebook Login Settings
1. Go to "Facebook Login" → "Settings"
2. Valid OAuth Redirect URIs:
   - `http://localhost:3000/api/auth/oauth/callback/facebook` (development)
   - `https://your-domain.com/api/auth/oauth/callback/facebook` (production)
3. Click "Save Changes"

### Step 4: Get App Credentials
1. Go to "Settings" → "Basic"
2. Copy the **App ID** and **App Secret**
3. Add them to your `.env.local` file:
   ```
   FACEBOOK_CLIENT_ID=your-app-id-here
   FACEBOOK_CLIENT_SECRET=your-app-secret-here
   ```

### Step 5: Configure App Permissions
1. Go to "App Review" → "Permissions and Features"
2. Request these permissions:
   - `email` (Basic)
   - `public_profile` (Basic)
3. These are basic permissions that don't require app review

## Microsoft OAuth Setup

### Step 1: Register Application in Azure
1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for "Azure Active Directory" and click on it
3. Click "App registrations" → "New registration"
4. Name: `Udaman`
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI: Web → `http://localhost:3000/api/auth/oauth/callback/microsoft` (development)
7. Click "Register"

### Step 2: Configure Authentication
1. In your app, go to "Authentication"
2. Add platform: Web
3. Redirect URIs:
   - `http://localhost:3000/api/auth/oauth/callback/microsoft` (development)
   - `https://your-domain.com/api/auth/oauth/callback/microsoft` (production)
4. Implicit grant and hybrid flows: Check "Access tokens" and "ID tokens"
5. Click "Save"

### Step 3: Create Client Secret
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: `Udaman OAuth Secret`
4. Expiration: 24 months (recommended)
5. Click "Add"
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again)

### Step 4: Configure API Permissions
1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph" → "Delegated permissions"
4. Add these permissions:
   - `User.Read` (Sign in and read user profile)
   - `email` (View users' email address)
   - `profile` (View users' basic profile)
   - `openid` (Sign users in)
5. Click "Add permissions"

### Step 5: Copy Credentials
1. Go to "Overview"
2. Copy the **Application (client) ID**
3. Use the client secret from Step 3
4. Add them to your `.env.local` file:
   ```
   MICROSOFT_CLIENT_ID=your-application-id-here
   MICROSOFT_CLIENT_SECRET=your-client-secret-here
   ```

## Environment Configuration

### Update Your .env.local File
Add these variables to your `.env.local` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-client-id-here
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret-here

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret-here
```

### Production Configuration
For production deployment, you'll need to:

1. **Update Redirect URIs**: Replace `http://localhost:3000` with your production domain
2. **Configure App Domains**: Add your production domain to each provider's settings
3. **Set Environment Variables**: Add the OAuth credentials to your production environment

## Security Considerations

### Best Practices
1. **Never commit secrets**: Ensure `.env.local` is in your `.gitignore`
2. **Use environment variables**: Store secrets in your deployment platform
3. **Rotate secrets regularly**: Update client secrets periodically
4. **Monitor usage**: Check OAuth usage in provider dashboards
5. **Validate redirect URIs**: Ensure only authorized domains are configured

### Provider-Specific Security
- **Google**: Enable "Restrict key" in API credentials
- **Facebook**: Set app to "Live" mode when ready for production
- **Microsoft**: Configure conditional access policies if needed

## Testing Your Configuration

### Development Testing
1. Start your development server: `npm run dev`
2. Navigate to `/auth/login`
3. Click on social login buttons
4. Verify OAuth flows complete successfully
5. Check that user accounts are created in your database

### Common Issues
- **Redirect URI mismatch**: Ensure URIs match exactly (including protocol and port)
- **Invalid client ID/secret**: Double-check credentials in `.env.local`
- **CORS issues**: Ensure your domain is authorized in provider settings
- **Scope permissions**: Verify required scopes are configured

## Next Steps

Once you've configured all OAuth providers:

1. **Test the implementation**: Verify all OAuth flows work correctly
2. **Monitor usage**: Check provider dashboards for authentication metrics
3. **Implement error handling**: Add comprehensive error handling for OAuth failures
4. **Add analytics**: Track OAuth usage and user preferences
5. **Security audit**: Review OAuth implementation for security best practices

## Support Resources

### Provider Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

### Troubleshooting
- Check provider status pages for service issues
- Review provider documentation for common issues
- Test with provider-specific debugging tools
- Monitor application logs for OAuth errors

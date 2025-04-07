import { NextRequest, NextResponse } from 'next/server';
import { handleAuth } from '@auth0/nextjs-auth0';
import { authConfig } from '../../../../../auth.config';

// Create handler for Auth0 endpoints using the SDK's built-in handler
export const GET = handleAuth(authConfig); 
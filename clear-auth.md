# Clear Authentication Instructions

To test the authentication flow properly, please:

1. **Open Chrome DevTools** (F12 or Cmd+Option+I)
2. **Go to Application tab** > Storage
3. **Clear all data**:
   - Cookies: Delete all `sb-*` cookies
   - Local Storage: Clear all entries  
   - Session Storage: Clear all entries
4. **Or use incognito/private window** for clean testing

Then test the flow:
1. Visit `http://localhost:3000` → Should redirect to `/login`
2. Try accessing `http://localhost:3000/dashboard` → Should redirect to `/login`
3. Sign up with a new email or sign in with existing credentials
4. After successful login → Should redirect to `/dashboard`
5. Dashboard should load without API errors
6. Logout should work and redirect back to `/login`
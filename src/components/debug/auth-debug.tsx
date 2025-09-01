"use client";

import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AuthDebug() {
  const { user, session, loading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading, hasAccess, isAdmin, isSuperAdmin } = usePermissions();
  const [showDetails, setShowDetails] = useState(false);

  if (!showDetails) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDetails(true)}
          className="text-xs"
        >
          🐛 Debug Auth
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Card className="bg-white border shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Auth Debug</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetails(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <strong>Auth Status:</strong>
            <Badge variant={authLoading ? "secondary" : user ? "default" : "destructive"} className="ml-2 text-xs">
              {authLoading ? "Loading" : user ? "Authenticated" : "Not Auth"}
            </Badge>
          </div>
          
          {user && (
            <div>
              <strong>User:</strong> {user.email}
            </div>
          )}
          
          <div>
            <strong>Session:</strong>
            <Badge variant={session ? "default" : "secondary"} className="ml-2 text-xs">
              {session ? "Active" : "None"}
            </Badge>
          </div>
          
          <div>
            <strong>Permissions Loading:</strong>
            <Badge variant={permissionsLoading ? "secondary" : "default"} className="ml-2 text-xs">
              {permissionsLoading ? "Yes" : "No"}
            </Badge>
          </div>
          
          {permissions && (
            <>
              <div>
                <strong>Role:</strong>
                <Badge variant="outline" className="ml-2 text-xs">
                  {permissions.role}
                </Badge>
              </div>
              
              <div>
                <strong>Modules:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(permissions.permissions).map(([module, access]) => (
                    <Badge 
                      key={module} 
                      variant={access ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {module}: {access ? "✓" : "✗"}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <strong>Admin:</strong>
                <Badge variant={isAdmin() ? "default" : "secondary"} className="ml-2 text-xs">
                  {isAdmin() ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div>
                <strong>Super Admin:</strong>
                <Badge variant={isSuperAdmin() ? "default" : "secondary"} className="ml-2 text-xs">
                  {isSuperAdmin() ? "Yes" : "No"}
                </Badge>
              </div>
            </>
          )}
          
          <div className="pt-2 border-t">
            <strong>Environment:</strong>
            <div className="text-xs text-muted-foreground">
              URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)}...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
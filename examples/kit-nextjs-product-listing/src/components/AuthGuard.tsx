import React, { useState } from 'react';
import useOrderCloudContext from '@/hooks/useOrderCloudContext';
import LoginModal from '@/components/ordercloud/LoginModal';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean; // Allow components to opt-in to auth requirement
  loadingComponent?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = false,
  loadingComponent,
}) => {
  const { isAuthenticated, authLoading, allowAnonymous } = useOrderCloudContext();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )
    );
  }

  // Check if authentication is required
  const authRequired = requireAuth || (!allowAnonymous && !isAuthenticated);

  // If auth is required and user is not authenticated, show fallback or default login prompt
  if (authRequired) {
    return (
      <>
        {fallback || (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Authentication Required
                </h3>
                <p className="text-gray-600 mb-6">
                  Please log in to access this content and start shopping.
                </p>
              </div>

              <Button onClick={() => setShowLoginModal(true)} className="w-full">
                Sign In
              </Button>

              <p className="text-xs text-gray-500 mt-4">Secure login powered by OrderCloud</p>
            </div>
          </div>
        )}

        {/* Login Modal */}
        <LoginModal
          disclosure={{
            isOpen: showLoginModal,
            onClose: () => setShowLoginModal(false),
          }}
        />
      </>
    );
  }

  // User is authenticated or anonymous access is allowed
  return <>{children}</>;
};

// Convenience hook for checking auth status in components
export const useAuthGuard = () => {
  const { isAuthenticated, authLoading, allowAnonymous } = useOrderCloudContext();

  return {
    isAuthenticated,
    authLoading,
    allowAnonymous,
    requiresAuth: !allowAnonymous && !isAuthenticated,
    canAccess: allowAnonymous || isAuthenticated,
  };
};

import useFirebase from './useFirebase';

/**
 * Example of using Firebase verification functions
 * This file shows how to use the new functions to ensure
 * that logout is performed correctly
 */

export const useFirebaseVerification = () => {
  const {
    logoutFirebase,
    isUserAuthenticated,
    getAuthenticationStatus
  } = useFirebase();

  /**
   * Function that verifies and performs logout securely
   */
  const secureLogout = async () => {
    try {
      // 1. Check initial status
      const initialStatus = await getAuthenticationStatus();
      console.log('Initial status:', initialStatus);

      if (!initialStatus.isAuthenticated) {
        console.log('User not authenticated, no logout needed');
        return { success: true, message: 'User not authenticated' };
      }

      // 2. Perform logout
      await logoutFirebase();

      // 3. Verify logout was successful
      const finalStatus = await getAuthenticationStatus();
      console.log('Final status:', finalStatus);

      if (finalStatus.isAuthenticated) {
        return { 
          success: false, 
          message: 'Logout did not complete successfully',
          error: 'User is still authenticated'
        };
      }

      return { 
        success: true, 
        message: 'Logout successfully confirmed' 
      };

    } catch (error) {
      console.error('Error during secure logout:', error);
      return { 
        success: false, 
        message: 'Error during logout',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  /**
   * Function that periodically checks authentication status
   */
  const monitorAuthenticationStatus = (callback: (status: any) => void, intervalMs: number = 30000) => {
    const interval = setInterval(async () => {
      const status = await getAuthenticationStatus();
      callback(status);
    }, intervalMs);

    // Return function to stop monitoring
    return () => clearInterval(interval);
  };

  /**
   * Function that verifies if the user has valid permissions
   */
  const validateUserPermissions = async () => {
    const status = await getAuthenticationStatus();
    
    if (!status.isAuthenticated) {
      return {
        hasPermissions: false,
        reason: 'User not authenticated'
      };
    }

    // Here you can add additional logic to verify specific permissions
    // For example, verify roles, Firestore permissions, etc.

    return {
      hasPermissions: true,
      userId: status.userId
    };
  };

  return {
    secureLogout,
    monitorAuthenticationStatus,
    validateUserPermissions,
    isUserAuthenticated,
    getAuthenticationStatus
  };
};

export default useFirebaseVerification; 
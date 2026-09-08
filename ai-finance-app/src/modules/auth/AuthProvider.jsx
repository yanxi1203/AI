import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createAuthController } from './authController.js';
import { AuthContext } from './authReactContext.js';
import { supabaseBrowserClient } from './supabaseBrowserClient.js';

export default function AuthProvider({ children, client = supabaseBrowserClient }) {
  const controller = useMemo(() => createAuthController({ authClient: client }), [client]);
  const auth = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  const value = useMemo(() => ({
    ...auth,
    signInAsGuest: controller.signInAsGuest,
    signInWithPassword: controller.signInWithPassword,
    signUpWithPassword: controller.signUpWithPassword,
    signOut: controller.signOut
  }), [auth, controller]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

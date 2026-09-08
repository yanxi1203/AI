import FinanceApp from './app/FinanceApp';
import AuthLoadingScreen from './pages/AuthLoadingScreen.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AuthProvider from './modules/auth/AuthProvider.jsx';
import { useAuth } from './modules/auth/authReactContext.js';
import { resolveAuthView } from './modules/auth/authViewModel.js';

function AuthenticatedApp() {
  const auth = useAuth();
  const view = resolveAuthView(auth.status);

  if (view === 'loading') return <AuthLoadingScreen />;
  if (view === 'login') {
    return (
      <LoginPage
        status={auth.status}
        message={auth.message}
        onSignIn={auth.signInWithPassword}
        onSignUp={auth.signUpWithPassword}
        onContinueAsGuest={auth.signInAsGuest}
      />
    );
  }

  const userId = auth.session.user.id;
  return (
    <FinanceApp
      key={userId}
      userId={userId}
      accessToken={auth.session.access_token}
      isAnonymous={auth.session.user.is_anonymous === true}
      userEmail={auth.session.user.email || ''}
      onSignOut={auth.signOut}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

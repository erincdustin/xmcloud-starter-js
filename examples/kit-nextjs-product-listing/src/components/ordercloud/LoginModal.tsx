import useOrderCloudContext from '@/hooks/useOrderCloudContext';
import { Button } from '@/components/ui/button';
import { OrderCloudError } from 'ordercloud-javascript-sdk';
import { FC, FormEvent, useCallback, useRef, useState } from 'react';

interface ILoginForm {
  initialFocusRef?: React.RefObject<HTMLInputElement | null>;
  onSuccess?: () => void;
}

const LoginForm: FC<ILoginForm> = ({ initialFocusRef, onSuccess }) => {
  const { login } = useOrderCloudContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<OrderCloudError | undefined>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        await login(username, password, rememberMe);
        setError(undefined);
        if (onSuccess) {
          onSuccess();
        }
      } catch (ex) {
        setError(ex as OrderCloudError);
      } finally {
        setLoading(false);
      }
    },
    [login, username, password, rememberMe, onSuccess]
  );

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-6">
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">@</span>
          </div>
          <input
            ref={initialFocusRef}
            id="username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔒</span>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 text-sm"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="remember-me"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={loading}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
        />
        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
          Keep me logged in
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !username || !password} className="px-6">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </div>

      {error?.errors?.map((e, i) => (
        <div key={i} className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{e.Message}</p>
            </div>
          </div>
        </div>
      ))}
    </form>
  );
};

interface ILoginModal {
  disclosure: {
    isOpen: boolean;
    onClose: () => void;
  };
}

const LoginModal: FC<ILoginModal> = ({ disclosure: { onClose, isOpen } }) => {
  const { allowAnonymous } = useOrderCloudContext();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [passwordResetSuccessfully, setPasswordResetSuccessfully] = useState(false);
  const [usernameRetrievedSuccessfully, setUsernameRetrievedSuccessfully] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  const getHeadingText = () => {
    if (showForgotPassword) {
      return passwordResetSuccessfully ? 'Forgot password email sent' : 'Forgot Password';
    }
    if (showForgotUsername) {
      return usernameRetrievedSuccessfully ? 'Forgot username email sent' : 'Forgot Username';
    }
    return allowAnonymous ? 'Login' : 'Login Required';
  };

  const getDescriptionText = () => {
    if (showForgotPassword) {
      return passwordResetSuccessfully
        ? 'Please check your email for the verification code to reset your password'
        : 'Please provide the email associated with your account';
    }
    if (showForgotUsername) {
      return usernameRetrievedSuccessfully
        ? 'Please check your email for further instructions to retrieve your username'
        : 'Please provide the email associated with your account';
    }
    return '';
  };

  const setForm = () => {
    // Commented out forgot password forms for now - can be implemented later
    // if (showForgotPassword && !passwordResetSuccessfully) {
    //   return (
    //     <ForgotPasswordForm
    //       onSuccess={() => {
    //         setShowForgotPassword(true);
    //         setPasswordResetSuccessfully(true);
    //       }}
    //     />
    //   );
    // }
    // if (showForgotUsername && !usernameRetrievedSuccessfully) {
    //   return (
    //     <ForgotUsernameForm
    //       onSuccess={() => {
    //         setShowForgotUsername(true);
    //         setUsernameRetrievedSuccessfully(true);
    //       }}
    //     />
    //   );
    // }
    // if (passwordResetSuccessfully) {
    //   return (
    //     <ForgotPasswordVerificationForm
    //       onSuccess={function (): void {
    //         throw new Error('Function not implemented.');
    //       }}
    //     />
    //   );
    // }
    return <LoginForm initialFocusRef={initialFocusRef} onSuccess={onClose} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={allowAnonymous ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block w-full max-w-2xl px-6 py-8 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Close button */}
          {allowAnonymous && (
            <div className="absolute top-4 right-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl">×</span>
              </button>
            </div>
          )}

          <div
            className={`grid gap-10 ${
              passwordResetSuccessfully && !showForgotPassword
                ? 'grid-cols-1'
                : 'grid-cols-1 lg:grid-cols-2'
            }`}
          >
            {/* Left side - branding and info */}
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 mb-6">
                <span className="text-xs text-gray-500 whitespace-nowrap">Powered by</span>
                <img
                  src="/ordercloud-horizontal-color-black-txt.svg"
                  alt="ordercloud logo"
                  className="h-6"
                />
              </div>

              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-lg font-normal text-gray-500">App Name Here</h2>
              </div>

              <h1 className="text-2xl font-semibold text-gray-700 mb-2">{getHeadingText()}</h1>

              {getDescriptionText() && (
                <p className="text-sm text-gray-600">{getDescriptionText()}</p>
              )}
            </div>

            {/* Right side - form */}
            <div>{setForm()}</div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            <button
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              onClick={() => {
                setShowForgotPassword(showForgotUsername ? false : !showForgotPassword);
                setPasswordResetSuccessfully(false);
                setShowForgotUsername(false);
                setUsernameRetrievedSuccessfully(false);
              }}
            >
              {!showForgotPassword && !showForgotUsername ? 'Forgot password' : 'Back to log in'}
            </button>
            {!showForgotPassword && !showForgotUsername && (
              <button
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                onClick={() => {
                  setShowForgotUsername((prev) => !prev);
                  setUsernameRetrievedSuccessfully(false);
                  setShowForgotPassword(false);
                  setPasswordResetSuccessfully(false);
                }}
              >
                Forgot username
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

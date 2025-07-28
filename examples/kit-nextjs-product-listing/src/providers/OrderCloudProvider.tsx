import {
  AccessToken,
  Auth,
  Configuration,
  DecodedToken,
  OrderCloudError,
  Tokens,
} from 'ordercloud-javascript-sdk';
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface IOrderCloudProvider {
  baseApiUrl: string;
  clientId: string;
}

const isAnonToken = (token: string) => {
  const parsed = jwtDecode<DecodedToken>(token);
  return !!parsed.orderid;
};

export interface IOrderCloudContext {
  /**
   * Signifies when a valid token is available.
   * This will block all auth queries by default, mutation interaction will
   * be blocked by the login modal.
   */
  isAuthenticated: boolean;
  /**
   * Signifies when an authenticated user is registered.
   */
  isLoggedIn: boolean;
  /**
   * Clears all tokens from the OrderCloud JS SDK and conditionally will
   * get a new anonymous token based on allowAnonymous
   */
  logout: () => void;
  /**
   * authenticates using the configured client ID and username / password
   */
  login: (username: string, password: string, rememberMe?: boolean) => Promise<AccessToken>;
  /**
   * authenticates using the provided OrderCloud access token
   */
  setToken: (accessToken: string) => void;
  /**
   * Signifies when authorization is in a loading state
   */
  authLoading: boolean;

  /**
   * If anonymous, this will retrieve a new anon token, useful for anonymous
   * users who want to submit more than one order.
   * @returns empty promise
   */
  newAnonSession: () => Promise<void>;

  baseApiUrl: string;
  clientId: string;
  token?: string;
}

const INITIAL_ORDERCLOUD_CONTEXT: IOrderCloudContext = {
  isAuthenticated: false,
  isLoggedIn: false,
  logout: () => {},
  login: async (username: string, password: string, rememberMe?: boolean) => {
    return Promise.reject({ username, password, rememberMe });
  },
  setToken: async (accessToken: string) => {
    return Promise.reject({ accessToken });
  },
  newAnonSession: async () => {
    return Promise.reject();
  },
  authLoading: true,
  baseApiUrl: 'https://api.ordercloud.io/v1',
  clientId: 'xxxx',
  token: undefined,
};

export const OrderCloudContext = createContext<IOrderCloudContext>(INITIAL_ORDERCLOUD_CONTEXT);

let interceptorSetup = false;
const OrderCloudProvider: FC<PropsWithChildren<IOrderCloudProvider>> = ({
  children,
  baseApiUrl,
  clientId,
}) => {
  Configuration.Set({ baseApiUrl, clientID: clientId });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [authLoading, setAuthLoading] = useState(true);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsLoggedIn(false);
    setToken(undefined);
    Tokens.RemoveAccessToken();
    Tokens.RemoveRefreshToken();
    setAuthLoading(false);
  }, []);

  const handleLogin = useCallback(
    async (username: string, password: string, rememberMe?: boolean) => {
      setAuthLoading(true);
      try {
        const response = await Auth.Login(username, password, clientId);
        const { access_token, refresh_token } = response;
        Tokens.SetAccessToken(access_token);
        setToken(access_token);
        if (rememberMe && refresh_token) {
          Tokens.SetRefreshToken(refresh_token);
        }
        setIsAuthenticated(true);
        setIsLoggedIn(true);
        setAuthLoading(false);
        return response;
      } catch (ex) {
        setAuthLoading(false);
        return Promise.reject(ex as OrderCloudError);
      }
    },
    [clientId]
  );

  const verifyToken = useCallback(
    async (accessToken?: string) => {
      setAuthLoading(true);

      try {
        if (accessToken) {
          Tokens.SetAccessToken(accessToken);
          Tokens.RemoveRefreshToken();
        }

        const validToken = await Tokens.GetValidToken();

        if (validToken) {
          const isAnon = isAnonToken(validToken);

          if (isAnon) {
            handleLogout();
            return;
          }
          setIsAuthenticated(true);
          setToken(validToken);
          if (!isAnon) setIsLoggedIn(true);
          setAuthLoading(false);
          return;
        }

        try {
          const response = await Auth.Anonymous(clientId);

          if (!response.access_token) {
            throw new Error('No access token in Auth.Anonymous response');
          }

          Tokens.SetAccessToken(response.access_token);
          if (response.refresh_token) {
            Tokens.SetRefreshToken(response.refresh_token);
          }

          setIsAuthenticated(true);
          setIsLoggedIn(false);
          setToken(response.access_token);
        } catch (anonError) {
          setIsAuthenticated(false);
          setIsLoggedIn(false);
        }

        setAuthLoading(false);
      } catch (error) {
        setAuthLoading(false);
        setIsAuthenticated(false);
        setIsLoggedIn(false);
      }
    },
    [clientId, handleLogout]
  );

  const newAnonSession = useCallback(async () => {
    try {
      const token = await Tokens.GetValidToken();
      const isAnon = isAnonToken(token);

      if (isAnon) {
        try {
          const response = await Auth.Anonymous(clientId);

          if (!response.access_token) {
            throw new Error('No access token in new anon session response');
          }

          Tokens.SetAccessToken(response.access_token);
          if (response.refresh_token) {
            Tokens.SetRefreshToken(response.refresh_token);
          }
          setIsAuthenticated(true);
          setIsLoggedIn(false);
          setToken(response.access_token);
        } catch (error) {
          setIsAuthenticated(false);
          setIsLoggedIn(false);
        }
      } else {
        console.warn('Improper usage of `newAnonSession`: User is not anonymous.');
      }
    } catch (error) {
      console.error('newAnonSession error:', error);
    }
  }, [clientId]);

  // ✅ Setup interceptor only once and avoid infinite loops
  useEffect(() => {
    if (!interceptorSetup) {
      axios.interceptors.request.use(
        async (config) => {
          // ✅ Don't call verifyToken again, just use existing token
          const currentToken = Tokens.GetAccessToken();
          if (currentToken) {
            config.headers.Authorization = `Bearer ${currentToken}`;
          }
          return config;
        },
        function (error) {
          return Promise.reject(error);
        }
      );
      interceptorSetup = true; // ✅ Fixed: set to true after setup
    }
  }, []); // ✅ Empty dependency array - setup only once

  // ✅ Initial verification only once
  useEffect(() => {
    verifyToken();
  }, [verifyToken]); // ✅ Empty dependency array to avoid infinite loops

  const handleProvidedToken = useCallback(
    async (accessToken: string) => {
      await verifyToken(accessToken);
    },
    [verifyToken]
  );

  const ordercloudContext = useMemo(() => {
    return {
      baseApiUrl,
      clientId,
      isAuthenticated,
      isLoggedIn,
      newAnonSession,
      token,
      authLoading,
      logout: handleLogout,
      login: handleLogin,
      setToken: handleProvidedToken,
    };
  }, [
    baseApiUrl,
    clientId,
    isAuthenticated,
    isLoggedIn,
    newAnonSession,
    token,
    authLoading,
    handleLogout,
    handleLogin,
    handleProvidedToken,
  ]);

  return (
    <OrderCloudContext.Provider value={ordercloudContext}>{children}</OrderCloudContext.Provider>
  );
};

export default OrderCloudProvider;

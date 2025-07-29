import {
  AccessToken,
  Auth,
  Configuration,
  DecodedToken,
  OrderCloudError,
  Tokens,
  Cart,
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

interface CartData {
  lineItemCount: number;
  total?: number;
}

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
   * Whether anonymous users are allowed
   */
  allowAnonymous: boolean;
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

  // Cart functionality
  cartData: CartData;
  isCartLoading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productID: string, quantity?: number) => Promise<void>;
  isAddingToCart: boolean;
}

const INITIAL_ORDERCLOUD_CONTEXT: IOrderCloudContext = {
  isAuthenticated: false,
  isLoggedIn: false,
  allowAnonymous: true,
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
  // Cart defaults
  cartData: { lineItemCount: 0 },
  isCartLoading: false,
  refreshCart: async () => {
    return Promise.reject();
  },
  addToCart: async (productID: string, quantity?: number) => {
    return Promise.reject({ productID, quantity });
  },
  isAddingToCart: false,
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

  // Cart state
  const [cartData, setCartData] = useState<CartData>({ lineItemCount: 0 });
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartData({ lineItemCount: 0 });
      return;
    }

    try {
      setIsCartLoading(true);
      const cartResponse = await Cart.Get();

      // Count line items from the cart
      const lineItemCount = cartResponse.LineItemCount || 0;
      const total = cartResponse.Total || 0;

      setCartData({ lineItemCount, total });
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      setCartData({ lineItemCount: 0 });
    } finally {
      setIsCartLoading(false);
    }
  }, [isAuthenticated]);

  const addToCart = useCallback(
    async (productID: string, quantity: number = 1) => {
      if (!isAuthenticated) return;

      try {
        setIsAddingToCart(true);
        await Cart.CreateLineItem({
          ProductID: productID,
          Quantity: quantity,
        });

        // Refresh cart data after adding item
        await refreshCart();
      } catch (error) {
        console.error('Failed to add product to cart:', error);
        throw error;
      } finally {
        setIsAddingToCart(false);
      }
    },
    [isAuthenticated, refreshCart]
  );

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsLoggedIn(false);
    setToken(undefined);
    setCartData({ lineItemCount: 0 }); // Clear cart on logout
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
        // Refresh cart after login
        await refreshCart();
        return response;
      } catch (ex) {
        setAuthLoading(false);
        return Promise.reject(ex as OrderCloudError);
      }
    },
    [clientId, refreshCart]
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

          // ✅ Keep anonymous tokens - don't logout for anonymous users
          setIsAuthenticated(true);
          setToken(validToken);
          setIsLoggedIn(!isAnon); // Only logged in if NOT anonymous
          setAuthLoading(false);
          // Refresh cart after authentication
          await refreshCart();
          return;
        }

        // Only create new anonymous token if no valid token exists
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
    [clientId, refreshCart]
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
          // Refresh cart for new session
          await refreshCart();
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
  }, [clientId, refreshCart]);

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
      allowAnonymous: true,
      newAnonSession,
      token,
      authLoading,
      logout: handleLogout,
      login: handleLogin,
      setToken: handleProvidedToken,
      // Cart functionality
      cartData,
      isCartLoading,
      refreshCart,
      addToCart,
      isAddingToCart,
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
    cartData,
    isCartLoading,
    refreshCart,
    addToCart,
    isAddingToCart,
  ]);

  return (
    <OrderCloudContext.Provider value={ordercloudContext}>{children}</OrderCloudContext.Provider>
  );
};

export default OrderCloudProvider;

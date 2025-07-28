'use client';

import { Link as ContentSdkLink, LinkField } from '@sitecore-content-sdk/nextjs';
import { useToggleWithClickOutside } from '@/hooks/useToggleWithClickOutside';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { useI18n } from 'next-localization';
import { useEffect } from 'react';
import useOrderCloudContext from '@/hooks/useOrderCloudContext';

const DICTIONARY_KEYS = {
  GO_TO_CART_LABEL: 'Go_To_Cart',
  MINI_CART_LABEL: 'Your_Cart',
  CART_EMPTY_LABEL: 'Cart_Empty',
  ITEMS_IN_CART: 'Items_In_Cart',
};

export const MiniCart = ({ cartLink }: { cartLink: LinkField }) => {
  const { t } = useI18n();
  const { isVisible, setIsVisible, ref } = useToggleWithClickOutside<HTMLDivElement>(false);
  const { isAuthenticated, authLoading, cartData, isCartLoading, refreshCart } =
    useOrderCloudContext();

  // Refresh cart when popover opens
  useEffect(() => {
    if (isVisible && isAuthenticated) {
      refreshCart();
    }
  }, [isVisible, isAuthenticated, refreshCart]);

  // Don't render anything while authentication is loading
  if (authLoading) {
    return (
      <div className="p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <ContentSdkLink
        field={cartLink}
        prefetch={false}
        className="block p-4 relative"
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
      >
        <FontAwesomeIcon icon={faShoppingCart} width={24} height={24} />
        {cartData.lineItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1">
            {cartData.lineItemCount}
          </span>
        )}
      </ContentSdkLink>

      <div
        className={`fixed lg:absolute top-14 left-0 right-0 lg:top-full lg:left-0 lg:right-0
          h-[calc(100vh-3.5rem)] lg:h-auto overflow-auto lg:w-80 lg:border lg:rounded-lg lg:shadow-lg
          ${
            isVisible
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 lg:translate-y-2 pointer-events-none'
          }
          bg-background transition-all duration-300 ease-in-out z-50
        `}
      >
        <div className="pt-18 p-8 lg:pt-8">
          <h5 className="mb-4 uppercase font-semibold">
            {t(DICTIONARY_KEYS.MINI_CART_LABEL) || 'Your Cart'}
          </h5>

          {!isAuthenticated ? (
            <p className="mb-8 text-gray-600">Please log in to view your cart.</p>
          ) : isCartLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : cartData.lineItemCount > 0 ? (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                {cartData.lineItemCount} {cartData.lineItemCount === 1 ? 'item' : 'items'} in cart
              </p>
              {cartData.total !== undefined && (
                <p className="font-semibold">Total: ${cartData.total.toFixed(2)}</p>
              )}
            </div>
          ) : (
            <p className="mb-8 text-gray-600">
              {t(DICTIONARY_KEYS.CART_EMPTY_LABEL) || 'Your cart is currently empty.'}
            </p>
          )}

          <ContentSdkLink
            field={cartLink}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 w-full text-center"
          >
            {t(DICTIONARY_KEYS.GO_TO_CART_LABEL) || 'Go to Cart'}
          </ContentSdkLink>
        </div>
      </div>
    </div>
  );
};

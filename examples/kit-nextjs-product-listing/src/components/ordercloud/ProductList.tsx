import { JSX, useState, useEffect } from 'react';
import { BuyerProduct, Me } from 'ordercloud-javascript-sdk';
import useOrderCloudContext from '@/hooks/useOrderCloudContext';
import { Button } from '@/components/ui/button';
interface ProductImage {
  ThumbnailUrl: string;
  Url: string;
}
interface MyProductXp {
  Images?: ProductImage[];
}

// Internal React component - not registered with Sitecore
const ProductCardInternal = ({ product }: { product: BuyerProduct<MyProductXp> }): JSX.Element => {
  const firstImage = product.xp?.Images?.[0];
  const { addToCart, isAddingToCart } = useOrderCloudContext();

  const handleAddToCart = async () => {
    if (!product.ID) return;

    try {
      await addToCart(product.ID, 1);
      // Cart will be automatically refreshed by the OrderCloud context
    } catch (error) {
      console.error('Failed to add product to cart:', error);
      // You could add error handling/notification here
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full border border-gray-200 flex flex-col">
      {firstImage && (
        <img
          src={firstImage.Url}
          alt={product.Name || 'Product image'}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">{product.Name}</h4>
          {product.PriceSchedule?.PriceBreaks?.[0].Price && (
            <h5 className="text-lg font-semibold text-gray-900 mb-2">
              ${product.PriceSchedule?.PriceBreaks?.[0].Price}
            </h5>
          )}
          {product.Description && (
            <p className="text-gray-600 text-sm mb-4">{product.Description}</p>
          )}
        </div>
        <Button onClick={handleAddToCart} disabled={isAddingToCart}>
          {isAddingToCart ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding...
            </>
          ) : (
            'Add to Cart'
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * JSS ProductList component - Uses centralized OrderCloud context with built-in cart functionality
 */
const ProductList = (): JSX.Element => {
  const { isAuthenticated, authLoading } = useOrderCloudContext();
  const [products, setProducts] = useState<BuyerProduct<MyProductXp>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await Me.ListProducts({
          filters: { 'xp.Images': '*', SpecCount: '0' },
          pageSize: 8,
        });
        setProducts(response.Items || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">
          <span className="sr-only">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600">
          <span className="sr-only">Loading products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h4 className="text-red-800 font-semibold mb-2">Error loading products</h4>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
        No products available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {products.map((product) => (
        <div key={product.ID}>
          <ProductCardInternal product={product} />
        </div>
      ))}
    </div>
  );
};

export default ProductList;

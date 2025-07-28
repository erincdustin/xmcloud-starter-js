import { JSX, useState, useEffect } from 'react';
import { BuyerProduct, Me } from 'ordercloud-javascript-sdk';
import useOrderCloudContext from '@/hooks/useOrderCloudContext';
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

  return (
    <div className="card h-100">
      {firstImage && (
        <img
          src={firstImage.Url}
          alt={product.Name || 'Product image'}
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="card-body">
        <h3 className="card-title">
          {product.Name} | {product.PriceSchedule?.PriceBreaks?.[0].Price}
        </h3>
        {product.Description && <p className="card-text">{product.Description}</p>}
      </div>
    </div>
  );
};

/**
 * JSS ProductList component - Uses centralized OrderCloud context
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

        const response = await Me.ListProducts({ filters: { 'xp.Images': '*' }, pageSize: 5 });
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
      <div className="d-flex justify-content-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Error loading products</h4>
        <p>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return <div className="alert alert-info">No products available.</div>;
  }

  return (
    <div className="row g-3">
      {products.map((product) => (
        <div key={product.ID} className="col-12 col-sm-6 col-md-4 col-lg-3">
          <ProductCardInternal product={product} />
        </div>
      ))}
    </div>
  );
};

export default ProductList;

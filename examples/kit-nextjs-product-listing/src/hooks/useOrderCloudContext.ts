import { OrderCloudContext } from '@/providers/OrderCloudProvider';
import { useContext } from 'react';

const useOrderCloudContext = () => {
  return useContext(OrderCloudContext);
};

export default useOrderCloudContext;

import { useState } from 'react';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

export default function useCreateCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCase = async (payload, onSuccess) => {
    try {
      setLoading(true);
      setError(null);

      const result = await adminCasesService.createCase(payload);

      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      setError(err);

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCase,
    loading,
    error,
  };
}

import { useState } from 'react';

import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

export default function useSecretaryCreateCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCase = async (payload) => {
    try {
      setLoading(true);
      setError(null);
      return await secretaryCasesService.createCase(payload);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createCase, loading, error };
}

import { useState } from 'react';
import Swal from '@/core/utils/themedSwal';

import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

export default function useSecretaryCreateCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCase = async (payload) => {
    try {
      setLoading(true);
      setError(null);

      const result = await secretaryCasesService.createCase(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Case created successfully.',
        timer: 1500,
        showConfirmButton: false,
      });

      return result;
    } catch (err) {
      setError(err);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.errors?.[0] ||
          'Failed to create case.',
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createCase, loading, error };
}

import { useEffect, useState } from 'react';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

const useSecretaryCases = (params = {}) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCases = async (isMounted = true) => {
    setLoading(true);
    setError(null);

    try {
      const response = await secretaryCasesService.getMyCases(params);

      if (isMounted) {
        setCases(response.cases || []);
      }
    } catch (err) {
      if (isMounted) {
        setError(err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadCases(isMounted);

    return () => {
      isMounted = false;
    };
  }, []); // keep empty only if params never change

  return {
    cases,
    loading,
    error,
    refetch: () => loadCases(true),
  };
};

export default useSecretaryCases;

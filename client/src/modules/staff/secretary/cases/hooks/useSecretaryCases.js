import { useEffect, useState } from 'react';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

const useSecretaryCases = (params = {}) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCases = async () => {
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

    loadCases();

    return () => {
      isMounted = false;
    };
  }, []); // keep empty only if params never change

  return {
    cases,
    loading,
    error,
  };
};

export default useSecretaryCases;

import { useEffect, useState } from 'react';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

const useSecretaryCaseDetails = (caseId) => {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caseId) return;

    let isMounted = true;

    const loadCase = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await secretaryCasesService.getMyCaseById(caseId);

        if (isMounted) {
          setCaseData(data);
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

    loadCase();

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  return {
    caseData,
    loading,
    error,
  };
};

export default useSecretaryCaseDetails;

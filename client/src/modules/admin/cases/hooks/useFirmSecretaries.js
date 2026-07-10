import { useEffect, useState } from 'react';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

export default function useFirmSecretaries() {
  const [secretaries, setSecretaries] = useState([]);

  const fetchSecretaries = async () => {
    try {
      const res = await adminCasesService.getSecretaries();

      setSecretaries(res?.data?.secretaries || []);
    } catch (err) {
      console.error('Failed to load secretaries:', err);
      setSecretaries([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadSecretaries = async () => {
      try {
        const res = await adminCasesService.getSecretaries();

        if (!mounted) return;

        setSecretaries(res?.data?.secretaries || []);
      } catch (err) {
        console.error('Failed to load secretaries:', err);

        if (mounted) {
          setSecretaries([]);
        }
      }
    };

    loadSecretaries();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    secretaries,
    refetch: fetchSecretaries,
  };
}

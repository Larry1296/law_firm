import { useEffect, useState } from 'react';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

export default function useFirmLawyers() {
  const [lawyers, setLawyers] = useState([]);

  const fetchLawyers = async () => {
    try {
      const res = await adminCasesService.getLawyers();

      const lawyers = res?.data?.lawyers || [];

      setLawyers(lawyers);
    } catch (err) {
      console.error('Failed to load lawyers:', err);
      setLawyers([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadLawyers = async () => {
      try {
        const res = await adminCasesService.getLawyers();

        if (!mounted) return;

        setLawyers(res?.data?.lawyers || []);
      } catch (err) {
        console.error('Failed to load lawyers:', err);

        if (mounted) {
          setLawyers([]);
        }
      }
    };

    loadLawyers();

    return () => {
      mounted = false;
    };
  }, []);

  return { lawyers, refetch: fetchLawyers };
}

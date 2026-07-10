import { useQuery } from '@tanstack/react-query';

import lawyerTasksService from '@/modules/staff/lawyer/tasks/services/lawyerTasksService';

export const useLawyerTasks = (params = {}) => {
  const query = useQuery({
    queryKey: ['lawyer-tasks', params],
    queryFn: () => lawyerTasksService.getTasks(params),
  });

  return {
    ...query,
    tasks: query.data?.tasks || [],
  };
};

export default useLawyerTasks;

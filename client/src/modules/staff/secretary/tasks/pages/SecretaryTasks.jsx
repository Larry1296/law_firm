import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryTasksService from '@/modules/staff/secretary/tasks/services/secretaryTasksService';

export default function SecretaryTasks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['secretary-tasks'],
    queryFn: secretaryTasksService.getTasks,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='Tasks' subtitle='Assigned secretarial tasks' />

      <Card className='p-6'>
        {isLoading && <p>Loading tasks...</p>}
        {error && <p>{error?.response?.data?.detail || 'Failed to load tasks.'}</p>}
        {!isLoading &&
          !error &&
          (data?.tasks || []).map((task) => (
            <div key={task.id} className='border-b py-3'>
              <strong>{task.title}</strong>
              <p>{task.priority} - {task.status} - Due {task.due_date}</p>
            </div>
          ))}
      </Card>
    </div>
  );
}

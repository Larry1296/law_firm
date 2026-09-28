import MyWorkList from '@/modules/staff/common/components/MyWorkList';
import secretaryTasksService from '@/modules/staff/secretary/tasks/services/secretaryTasksService';

export default function SecretaryTasks() {
  return (
    <MyWorkList
      queryKey={['secretary-tasks']}
      queryFn={() => secretaryTasksService.getTasks()}
      caseBasePath='/secretary/cases'
      subtitle='Deadlines on the matters you support, and tasks assigned to you.'
    />
  );
}

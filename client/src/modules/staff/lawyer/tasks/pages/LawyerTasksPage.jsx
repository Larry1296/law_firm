import MyWorkList from '@/modules/staff/common/components/MyWorkList';
import lawyerTasksService from '@/modules/staff/lawyer/tasks/services/lawyerTasksService';

export default function LawyerTasksPage() {
  return (
    <MyWorkList
      queryKey={['lawyer-tasks']}
      queryFn={() => lawyerTasksService.getTasks()}
      caseBasePath='/lawyer/cases'
      subtitle='Court, filing and limitation deadlines on your matters, and tasks assigned to you.'
    />
  );
}

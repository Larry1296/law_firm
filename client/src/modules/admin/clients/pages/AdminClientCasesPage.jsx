import { Navigate, useParams } from 'react-router-dom';

export default function AdminClientCasesPage() {
  const { id } = useParams();
  return <Navigate to={`/admin/clients/${id}`} replace />;
}

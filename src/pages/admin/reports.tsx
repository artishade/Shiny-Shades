import type { ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { AdminReports } from '@/components/admin/CouponsInventoryReportsShared';
import type { NextPageWithLayout } from '@/types/layout';

const AdminReportsPage: NextPageWithLayout = () => <AdminReports />;

AdminReportsPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminReportsPage;

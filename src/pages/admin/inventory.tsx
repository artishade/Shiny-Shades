import type { ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { AdminInventory } from '@/components/admin/CouponsInventoryReportsShared';
import type { NextPageWithLayout } from '@/types/layout';

const AdminInventoryPage: NextPageWithLayout = () => <AdminInventory />;

AdminInventoryPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminInventoryPage;

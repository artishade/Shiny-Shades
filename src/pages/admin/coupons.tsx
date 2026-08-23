import type { ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { AdminCoupons } from '@/components/admin/CouponsInventoryReportsShared';
import type { NextPageWithLayout } from '@/types/layout';

const AdminCouponsPage: NextPageWithLayout = () => <AdminCoupons />;

AdminCouponsPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminCouponsPage;

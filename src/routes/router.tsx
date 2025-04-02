import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import NotFound from '@/pages/NotFound/NotFound';
import Sender from '@/pages/Sender/Sender';
import History from '@/pages/History/History';
import { PageTrackingComponent } from '@/providers/AnalyticsProvider';

// AnalyticsWrapperコンポーネントの作成
const AnalyticsWrapper = ({ children }: { children: React.ReactNode }) => {
  const isAnalyticsEnabled = import.meta.env.VITE_GA_MEASUREMENT === 'true';
  return (
    <>
      <PageTrackingComponent isEnabled={isAnalyticsEnabled} />
      {children}
    </>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/sender" replace />,
  },
  {
    path: '/sender',
    element: (
      <AnalyticsWrapper>
        <Layout>
          <Sender />
        </Layout>
      </AnalyticsWrapper>
    ),
  },
  {
    path: '/history',
    element: (
      <AnalyticsWrapper>
        <Layout>
          <History />
        </Layout>
      </AnalyticsWrapper>
    ),
  },
  {
    path: '*',
    element: (
      <AnalyticsWrapper>
        <Layout>
          <NotFound />
        </Layout>
      </AnalyticsWrapper>
    ),
  },
]);

import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Top from '../pages/Top/Top';
import NotFound from '../pages/NotFound/NotFound';
import Sender from '../pages/Sender/Sender';
import History from '../pages/History/History';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <Top />
      </Layout>
    ),
  },
  {
    path: '/sender',
    element: (
      <Layout>
        <Sender />
      </Layout>
    ),
  },
  {
    path: '/history',
    element: (
      <Layout>
        <History />
      </Layout>
    ),
  },
  {
    path: '*',
    element: (
      <Layout>
        <NotFound />
      </Layout>
    ),
  },
]);

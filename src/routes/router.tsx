import { createBrowserRouter } from 'react-router-dom';
import Top from '../pages/Top/Top';
import NotFound from '../pages/NotFound/NotFound';
import Sender from '../pages/Sender/Sender';
import History from '../pages/History/History';
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Top />,
  },
  {
    path: '/sender',
    element: <Sender />,
  },
  {
    path: '/history',
    element: <History />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

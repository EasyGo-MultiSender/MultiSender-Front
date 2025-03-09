import { createBrowserRouter } from 'react-router-dom';
import Top from '../pages/Top/Top';
import NotFound from '../pages/NotFound/NotFound';
import Sender from '../pages/Sender/Sender';
import Log from '../pages/Log/Log';
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
    path: '/log',
    element: <Log />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

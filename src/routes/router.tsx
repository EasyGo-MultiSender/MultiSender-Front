import { createBrowserRouter } from "react-router-dom";
import Top from "../pages/Top/Top";
import NotFound from "../pages/NotFound/NotFound";
import Sender from "../pages/Sender/Sender";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Top />,
  },
  {
    path: "/bulksender",
    element: <Sender />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

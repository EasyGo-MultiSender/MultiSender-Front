import { createBrowserRouter } from "react-router-dom";
import Top from "../pages/Top/Top";
import NotFound from "../pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Top />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

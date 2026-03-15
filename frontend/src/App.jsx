import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assets from "./pages/Assets.jsx";
import AssetDetail from "./pages/AssetDetail.jsx";
import Audit from "./pages/Audit.jsx";
import Analytics from "./pages/Analytics.jsx";
import Categories from "./pages/Categories.jsx";
import Inventories from "./pages/Inventories.jsx";
import InventoryDetail from "./pages/InventoryDetail.jsx";
import Aging from "./pages/Aging.jsx";
import QrView from "./pages/QrView.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="inventories" element={<Inventories />} />
        <Route path="inventories/:id" element={<InventoryDetail />} />
        <Route path="aging" element={<Aging />} />
        <Route path="qr" element={<QrView />} />
        <Route path="qr/:token" element={<QrView />} />
        <Route path="audit" element={<Audit />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}

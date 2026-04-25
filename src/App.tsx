import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { RetailersPage } from "@/pages/retailers/RetailersPage";
import { RetailerFinderPage } from "@/pages/retailers/RetailerFinderPage";
import { RetailerDetailPage } from "@/pages/retailers/RetailerDetailPage";
import { RetailerImportPage } from "@/pages/retailers/RetailerImportPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="retailers" element={<RetailersPage />} />
        <Route path="retailers/find" element={<RetailerFinderPage />} />
        <Route path="retailers/import" element={<RetailerImportPage />} />
        <Route path="retailers/:id" element={<RetailerDetailPage />} />
      </Route>
    </Routes>
  );
}

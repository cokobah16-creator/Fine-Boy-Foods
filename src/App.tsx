import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { OperationsDashboardPage } from "@/pages/operations/OperationsDashboardPage";
import { InventoryPage } from "@/pages/operations/InventoryPage";
import { OrdersPage } from "@/pages/operations/OrdersPage";
import { NewOrderPage } from "@/pages/operations/NewOrderPage";
import { OrderDetailPage } from "@/pages/operations/OrderDetailPage";
import { CustomersPage } from "@/pages/operations/CustomersPage";
import { ProductionPage } from "@/pages/operations/ProductionPage";
import { QualityControlPage } from "@/pages/operations/QualityControlPage";
import { DistributionPage } from "@/pages/operations/DistributionPage";
import { FinancePage } from "@/pages/operations/FinancePage";
import { AnalyticsPage } from "@/pages/operations/AnalyticsPage";
import { AlertsPage } from "@/pages/operations/AlertsPage";
import { SettingsPage } from "@/pages/operations/SettingsPage";
import { RetailersPage } from "@/pages/retailers/RetailersPage";
import { RetailerFinderPage } from "@/pages/retailers/RetailerFinderPage";
import { RetailerDetailPage } from "@/pages/retailers/RetailerDetailPage";
import { RetailerImportPage } from "@/pages/retailers/RetailerImportPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<OperationsDashboardPage />} />

          {/* Operations */}
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="quality" element={<QualityControlPage />} />
          <Route path="distribution" element={<DistributionPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Retailer CRM (existing) */}
          <Route path="retailers" element={<RetailersPage />} />
          <Route path="retailers/find" element={<RetailerFinderPage />} />
          <Route path="retailers/import" element={<RetailerImportPage />} />
          <Route path="retailers/:id" element={<RetailerDetailPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NightAuditDashboard from './NightAuditDashboard';
import AuditProgressScreen from './AuditProgressScreen';
import AuditReportViewer from './AuditReportViewer';

const NightAuditRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<NightAuditDashboard />} />
      <Route path=":id/progress" element={<AuditProgressScreen />} />
      <Route path=":id/report" element={<AuditReportViewer />} />
    </Routes>
  );
};

export default NightAuditRoutes;

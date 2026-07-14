import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RiderVerification from './pages/RiderVerification';
import LiveMonitoring from './pages/LiveMonitoring';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import Complaints from './pages/Complaints';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161618',
            color: '#fafafa',
            border: '1px solid #27272a',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#161618' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#161618' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="riders/verification" element={<RiderVerification />} />
          <Route path="monitoring" element={<LiveMonitoring />} />
          <Route path="users" element={<Users />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

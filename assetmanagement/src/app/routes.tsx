import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => {
      const mod = await import('./components/Login');
      return { Component: mod.Login };
    },
  },
  {
    path: '/assets/print/qr',
    lazy: async () => {
      const mod = await import('./components/QrPrintSheet');
      return { Component: mod.QrPrintSheet };
    },
  },
  {
    path: '/',
    lazy: async () => {
      const mod = await import('./components/RootLayout');
      return { Component: mod.RootLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const mod = await import('./components/Dashboard');
          return { Component: mod.Dashboard };
        },
      },
      {
        path: 'assets',
        lazy: async () => {
          const mod = await import('./components/AssetList');
          return { Component: mod.AssetList };
        },
      },
      {
        path: 'assets/new',
        lazy: async () => {
          const mod = await import('./components/AssetForm');
          return { Component: mod.AssetForm };
        },
      },
      {
        path: 'assets/:id',
        lazy: async () => {
          const mod = await import('./components/AssetDetail');
          return { Component: mod.AssetDetail };
        },
      },
      {
        path: 'assets/:id/edit',
        lazy: async () => {
          const mod = await import('./components/AssetForm');
          return { Component: mod.AssetForm };
        },
      },
      {
        path: 'audit',
        lazy: async () => {
          const mod = await import('./components/AuditLogs');
          return { Component: mod.AuditLogs };
        },
      },
      {
        path: 'scanner',
        lazy: async () => {
          const mod = await import('./components/QRScanner');
          return { Component: mod.QRScanner };
        },
      },
      {
        path: 'categories',
        lazy: async () => {
          const mod = await import('./components/CategoryManagement');
          return { Component: mod.CategoryManagement };
        },
      },
      {
        path: 'requests',
        lazy: async () => {
          const mod = await import('./components/AssetRequests');
          return { Component: mod.AssetRequests };
        },
      },
      {
        path: 'users',
        lazy: async () => {
          const mod = await import('./components/Users');
          return { Component: mod.Users };
        },
      },
      {
        path: 'signup-requests',
        lazy: async () => {
          const mod = await import('./components/EmployeeSignupRequests');
          return { Component: mod.EmployeeSignupRequests };
        },
      },
    ],
  },
]);

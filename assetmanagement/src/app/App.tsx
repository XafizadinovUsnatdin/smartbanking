import { Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './components/AuthProvider';
import { I18nProvider } from './i18n/I18nProvider';

export default function App() {
  return (
    <>
      <I18nProvider>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
                Loading...
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </I18nProvider>
    </>
  );
}

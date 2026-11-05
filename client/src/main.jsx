import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';

import '@/assets/styles/theme.css';
import '@/index.css';

import App from '@/App';
import AuthProvider from '@/core/store/AuthProvider';
import { installFormValidationUX } from '@/core/forms/installFormValidationUX';
import { queryClient } from '@/core/live/liveData';
import { installNumberInputGuard } from '@/core/forms/installNumberInputGuard';

installFormValidationUX();
installNumberInputGuard();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

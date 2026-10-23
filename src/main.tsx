import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Dashboard } from './dashboard/dashboard';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Dashboard />
    </MantineProvider>
  </React.StrictMode>,
);

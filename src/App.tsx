import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { SessionSyncStatus } from './components/SessionSyncStatus';

export default function App() {
  return <><SessionSyncStatus /><RouterProvider router={router} /></>;
}

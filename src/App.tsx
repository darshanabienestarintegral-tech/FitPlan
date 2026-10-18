import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { RoutineCloudStatus } from './components/RoutineCloudStatus';
import { SessionSyncStatus } from './components/SessionSyncStatus';

export default function App() {
  return <><SessionSyncStatus /><RoutineCloudStatus /><RouterProvider router={router} /></>;
}

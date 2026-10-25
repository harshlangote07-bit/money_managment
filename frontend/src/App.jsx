import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Workspace from './Workspace.jsx';
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Workspace />} />
    <Route path="/login" element={<Workspace />} />
    <Route path="/dashboard" element={<Workspace />} />
    <Route path="/planner" element={<Workspace />} />
    <Route path="/simulator" element={<Workspace />} />
    <Route path="/recovery" element={<Workspace />} />
    <Route path="/recommendations" element={<Workspace />} />
    <Route path="/profile" element={<Workspace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}

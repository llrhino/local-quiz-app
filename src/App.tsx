import { Route, Routes } from 'react-router-dom';

import Layout from './components/layout/Layout';
import HistoryPage from './pages/HistoryPage';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/quiz/:packId" element={<QuizPage />} />
        <Route path="/history/:packId" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

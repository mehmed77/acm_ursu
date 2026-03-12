import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Status from './pages/Status';
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import ContestScoreboard from './pages/ContestScoreboard';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import SystemGuide from './pages/SystemGuide';
import NewsList from './pages/NewsList';
import NewsDetail from './pages/NewsDetail';

import AdminLogin from './admin/pages/AdminLogin';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminProblems from './admin/pages/AdminProblems';
import AdminProblemForm from './admin/pages/AdminProblemForm';
import AdminUsers from './admin/pages/AdminUsers';
import AdminContests from './admin/pages/AdminContests';
import AdminContestForm from './admin/pages/AdminContestForm';
import AdminLatexGuide from './admin/pages/AdminLatexGuide';
import AdminNews from './admin/pages/AdminNews';
import AdminNewsForm from './admin/pages/AdminNewsForm';

import { useEffect } from 'react';
import { useThemeStore } from './store/themeStore';

export default function App() {
  const initTheme = useThemeStore(state => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="problems" element={<Problems />} />
          <Route path="problems/:slug" element={<ProblemDetail />} />
          <Route path="status" element={<Status />} />
          <Route path="contests" element={<Contests />} />
          <Route path="contests/:slug" element={<ContestDetail />} />
          <Route path="contests/:slug/scoreboard" element={<ContestScoreboard />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="system" element={<SystemGuide />} />
          <Route path="news" element={<NewsList />} />
          <Route path="news/:id" element={<NewsDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="problems" element={<AdminProblems />} />
          <Route path="problems/new" element={<AdminProblemForm />} />
          <Route path="problems/:slug" element={<AdminProblemForm />} />
          <Route path="contests" element={<AdminContests />} />
          <Route path="contests/new" element={<AdminContestForm />} />
          <Route path="contests/:slug" element={<AdminContestForm />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="news/new" element={<AdminNewsForm />} />
          <Route path="news/:id" element={<AdminNewsForm />} />
          <Route path="latex-guide" element={<AdminLatexGuide />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

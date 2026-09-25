import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui';
import { RedirectIfAuthed, RequireAuth } from '@/auth/guards';
import { JobsListPage } from '@/features/public/JobsListPage';

// Code-splitting por área: candidato não baixa o bundle do admin e vice-versa.
const ResumeBuilderPage = lazy(() => import('@/features/public/ResumeBuilderPage'));
const JobDetailPage = lazy(() => import('@/features/public/JobDetailPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const MyApplicationsPage = lazy(() => import('@/features/candidate/MyApplicationsPage'));
const CandidateProfilePage = lazy(() => import('@/features/candidate/CandidateProfilePage'));
const EmployerDashboardPage = lazy(() => import('@/features/employer/EmployerDashboardPage'));
const EmployerJobsPage = lazy(() => import('@/features/employer/EmployerJobsPage'));
const JobFormPage = lazy(() => import('@/features/employer/JobFormPage'));
const JobApplicationsPage = lazy(() => import('@/features/employer/JobApplicationsPage'));
const CandidateSearchPage = lazy(() => import('@/features/employer/CandidateSearchPage'));
const TalentPoolPage = lazy(() => import('@/features/employer/TalentPoolPage'));
const CompanyProfilePage = lazy(() => import('@/features/employer/CompanyProfilePage'));
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
const AdminModerationPage = lazy(() => import('@/features/admin/AdminModerationPage'));
const AdminUsersPage = lazy(() => import('@/features/admin/AdminUsersPage'));
const ChatPage = lazy(() => import('@/features/chat/ChatPage'));
const NotFoundPage = lazy(() => import('@/features/public/NotFoundPage'));

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<JobsListPage />} />
          <Route path="vagas/:id" element={<JobDetailPage />} />
          <Route path="curriculo" element={<ResumeBuilderPage />} />
          <Route path="entrar" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="cadastro" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />

          <Route path="candidato">
            <Route path="candidaturas" element={<RequireAuth roles={['JOB_SEEKER']}><MyApplicationsPage /></RequireAuth>} />
            <Route path="perfil" element={<RequireAuth roles={['JOB_SEEKER']}><CandidateProfilePage /></RequireAuth>} />
          </Route>

          <Route path="empresa">
            <Route index element={<RequireAuth roles={['EMPLOYER']}><EmployerDashboardPage /></RequireAuth>} />
            <Route path="vagas" element={<RequireAuth roles={['EMPLOYER']}><EmployerJobsPage /></RequireAuth>} />
            <Route path="vagas/nova" element={<RequireAuth roles={['EMPLOYER']}><JobFormPage /></RequireAuth>} />
            <Route path="vagas/:id/editar" element={<RequireAuth roles={['EMPLOYER']}><JobFormPage /></RequireAuth>} />
            <Route path="vagas/:id/candidatos" element={<RequireAuth roles={['EMPLOYER']}><JobApplicationsPage /></RequireAuth>} />
            <Route path="talentos" element={<RequireAuth roles={['EMPLOYER']}><CandidateSearchPage /></RequireAuth>} />
            <Route path="banco-de-talentos" element={<RequireAuth roles={['EMPLOYER']}><TalentPoolPage /></RequireAuth>} />
            <Route path="perfil" element={<RequireAuth roles={['EMPLOYER']}><CompanyProfilePage /></RequireAuth>} />
          </Route>

          <Route path="admin">
            <Route index element={<RequireAuth roles={['ADMIN']}><AdminDashboardPage /></RequireAuth>} />
            <Route path="moderacao" element={<RequireAuth roles={['ADMIN']}><AdminModerationPage /></RequireAuth>} />
            <Route path="usuarios" element={<RequireAuth roles={['ADMIN']}><AdminUsersPage /></RequireAuth>} />
          </Route>

          <Route path="mensagens" element={<RequireAuth roles={['JOB_SEEKER', 'EMPLOYER']}><ChatPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

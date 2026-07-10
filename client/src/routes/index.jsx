import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PageLoader from '@/components/common/PageLoader';

/* =========================================================
   GUARDS
========================================================= */
import ProtectedRoute from '@/routes/ProtectedRoute';
import RoleRoute from '@/core/guards/RoleRoute';

/* =========================================================
   LAYOUT WRAPPERS
========================================================= */
import PublicLayoutWrapper from '@/layouts/public/PublicLayoutWrapper';
import AuthLayoutWrapper from '@/layouts/public/AuthLayoutWrapper';

import AdminLayoutWrapper from '@/layouts/admin/AdminLayoutWrapper';

import LawyerLayoutWrapper from '@/layouts/staff/lawyer/LawyerLayoutWrapper';
import SecretaryLayoutWrapper from '@/layouts/staff/secretary/SecretaryLayoutWrapper';
import AccountantLayoutWrapper from '@/layouts/staff/accountant/AccountantLayoutWrapper';
import HRLayoutWrapper from '@/layouts/staff/hr/HRLayoutWrapper';
import ITLayoutWrapper from '@/layouts/staff/it/ITLayoutWrapper';

import ClientLayoutWrapper from '@/layouts/client/ClientLayoutWrapper';
import PortalLayoutWrapper from '@/layouts/portal/ClientLayoutWrapper';

/* =========================================================
   PUBLIC
========================================================= */
const HomePage = lazy(() => import('@/modules/public/HomePage'));
const NotFound = lazy(() => import('@/modules/public/NotFound'));

/* =========================================================
   AUTH
========================================================= */
const Login = lazy(() => import('@/modules/auth/pages/Login'));
const Register = lazy(() => import('@/modules/auth/pages/Register'));
const ForgotPassword = lazy(
  () => import('@/modules/auth/pages/ForgotPassword'),
);
const ResetPassword = lazy(() => import('@/modules/auth/pages/ResetPassword'));
const RecoverAccount = lazy(
  () => import('@/modules/auth/pages/RecoverAccount'),
);

const AdminDashboard = lazy(
  () => import('@/modules/admin/dashboard/pages/AdminDashboardPage'),
);

/* CASES */
const AdminCasesPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCasesPage'),
);
const AdminCreateCasesPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCreateCasePage'),
);
const AdminCaseDetailsPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCaseDetailsPage'),
);
const AdminCaseAIAnalysisPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCaseAIAnalysisPage'),
);
const AdminCaseAssignmentsPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCaseAssignmentsPage'),
);
const AdminCaseCourtroomPage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCaseCourtroomPage'),
);
const AdminCaseTimelinePage = lazy(
  () => import('@/modules/admin/cases/pages/AdminCaseTimelinePage'),
);

/* CLIENTS */
const AdminClientsPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientsPage'),
);
const AdminCreateClientPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminCreateClientPage'),
);
const AdminClientDetailsPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientDetailsPage'),
);
const AdminClientCasesPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientCasesPage'),
);
const AdminClientDocumentsPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientDocumentsPage'),
);
const AdminClientCommunicationPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientCommunicationPage'),
);
const AdminClientBillingPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientBillingPage'),
);
const AdminClientActivityPage = lazy(
  () => import('@/modules/admin/clients/pages/AdminClientActivityPage'),
);

/* STAFF */
const AdminStaffPage = lazy(
  () => import('@/modules/admin/staff/pages/AdminStaffPage'),
);
const AdminCreateStaffPage = lazy(
  () => import('@/modules/admin/staff/pages/AdminCreateStaffPage'),
);
const AdminStaffDetailsPage = lazy(
  () => import('@/modules/admin/staff/pages/AdminStaffDetailsPage'),
);

/* HEARINGS */
const AdminHearingsPage = lazy(
  () => import('@/modules/admin/hearings/pages/AdminHearingsPage'),
);
const AdminHearingDetailsPage = lazy(
  () => import('@/modules/admin/hearings/pages/AdminHearingDetailsPage'),
);
const AdminVirtualCourtroomPage = lazy(
  () => import('@/modules/admin/hearings/pages/AdminVirtualCourtroomPage'),
);

/* DOCUMENTS */
const AdminDocumentsPage = lazy(
  () => import('@/modules/admin/documents/pages/AdminDocumentsPage'),
);
const AdminDocumentRequestsPage = lazy(
  () => import('@/modules/admin/documents/pages/AdminDocumentRequestsPage'),
);
const AdminDocumentTemplatePage = lazy(
  () => import('@/modules/admin/documents/pages/AdminDocumentTemplatePage'),
);
const AdminGeneratedDocumentsPage = lazy(
  () => import('@/modules/admin/documents/pages/AdminGeneratedDocumentsPage'),
);

/* BILLING */
const AdminBillingPage = lazy(
  () => import('@/modules/admin/billing/pages/AdminBillingPage'),
);
const AdminInvoicesPage = lazy(
  () => import('@/modules/admin/billing/pages/AdminInvoicesPage'),
);
const AdminPaymentsPage = lazy(
  () => import('@/modules/admin/billing/pages/AdminPaymentsPage'),
);

/* REPORTS */
const AdminReportsPage = lazy(
  () => import('@/modules/admin/reports/pages/AdminReportsPage'),
);
const AdminITReportPage = lazy(
  () => import('@/modules/admin/it/pages/AdminITReportPage'),
);

/* COMMUNICATION */
const AdminChatPage = lazy(
  () => import('@/modules/admin/communication/pages/AdminChatPage'),
);
const AdminNotificationsCenterPage = lazy(
  () =>
    import('@/modules/admin/communication/pages/AdminNotificationsCenterPage'),
);
const StaffInternalChatPage = lazy(
  () => import('@/modules/staff/common/pages/StaffInternalChatPage'),
);

/* COMPLIANCE */
const AdminAuditLogsPage = lazy(
  () => import('@/modules/admin/compliance/pages/AdminAuditLogsPage'),
);

/* SETTINGS */
const AdminSettingsPage = lazy(
  () => import('@/modules/admin/settings/pages/AdminSettingsPage'),
);

/* FIRM */
const AdminFirmPage = lazy(
  () => import('@/modules/admin/firm/pages/AdminFirmPage'),
);

/* AI */
const AdminAIOverviewPage = lazy(
  () => import('@/modules/admin/ai/pages/AdminAIOverviewPage'),
);
const AdminAIRecommendationsPage = lazy(
  () => import('@/modules/admin/ai/pages/AdminAIRecommendationsPage'),
);
const AdminCasePredictionsPage = lazy(
  () => import('@/modules/admin/ai/pages/AdminCasePredictionsPage'),
);
const AdminLegalResearchAIPage = lazy(
  () => import('@/modules/admin/ai/pages/AdminLegalResearchAIPage'),
);

/* CALENDAR */
const AdminCalendarPage = lazy(
  () => import('@/modules/admin/calendar/pages/AdminCalendarPage'),
);

/* =========================================================
   LAWYER
========================================================= */
const LawyerDashboard = lazy(
  () => import('@/modules/staff/lawyer/dashboard/pages/LawyerDashboardPage'),
);

const LawyerAI = lazy(
  () => import('@/modules/staff/lawyer/ai/pages/LawyerAIPage'),
);
const LawyerResearchAI = lazy(
  () => import('@/modules/staff/lawyer/ai/pages/LawyerResearchAIPage'),
);

const LawyerCases = lazy(
  () => import('@/modules/staff/lawyer/cases/pages/LawyerCasesPage'),
);
const LawyerCaseDetailsPage = lazy(
  () => import('@/modules/staff/lawyer/cases/pages/LawyerCaseDetailsPage'),
);
const LawyerCreateCase = lazy(
  () => import('@/modules/staff/lawyer/cases/pages/LawyerCreateCasePage'),
);

const LawyerChat = lazy(
  () => import('@/modules/staff/lawyer/communication/pages/LawyerChatPage'),
);
const LawyerNotifications = lazy(
  () =>
    import('@/modules/staff/lawyer/communication/pages/LawyerNotificationsPage'),
);

const LawyerDocumentsPage = lazy(
  () => import('@/modules/staff/lawyer/documents/pages/LawyerDocumentsPage'),
);
const LawyerTemplatesPage = lazy(
  () => import('@/modules/staff/lawyer/documents/pages/LawyerTemplatesPage'),
);

const LawyerHearings = lazy(
  () => import('@/modules/staff/lawyer/hearings/pages/LawyerHearingsPage'),
);
const LawyerHearingDetails = lazy(
  () =>
    import('@/modules/staff/lawyer/hearings/pages/LawyerHearingDetailsPage'),
);

const LawyerResearch = lazy(
  () => import('@/modules/staff/lawyer/research/pages/LawyerResearchPage'),
);
const LawyerAuthorities = lazy(
  () => import('@/modules/staff/lawyer/research/pages/LawyerAuthoritiesPage'),
);

const LawyerTasks = lazy(
  () => import('@/modules/staff/lawyer/tasks/pages/LawyerTasksPage'),
);
const LawyerApprovals = lazy(
  () => import('@/modules/staff/lawyer/tasks/pages/LawyerApprovalsPage'),
);

const LawyerProfile = lazy(
  () => import('@/modules/staff/lawyer/profile/pages/LawyerProfilePage'),
);
const LawyerSecurity = lazy(
  () => import('@/modules/staff/lawyer/security/pages/LawyerSecurityPage'),
);
const LawyerCalendar = lazy(
  () => import('@/modules/staff/lawyer/calendar/pages/LawyerCalendar'),
);

/* =========================================================
   SECRETARY
========================================================= */
const SecretaryDashboard = lazy(
  () => import('@/modules/staff/secretary/dashboard/pages/SecretaryDashboard'),
);

const SecretaryClients = lazy(
  () => import('@/modules/staff/secretary/clients/pages/SecretaryClients'),
);

const SecretaryClientDetails = lazy(
  () =>
    import('@/modules/staff/secretary/clients/pages/SecretaryClientDetails'),
);

const SecretaryChat = lazy(
  () => import('@/modules/staff/secretary/communication/pages/SecretaryChat'),
);

const SecretaryCalendar = lazy(
  () => import('@/modules/staff/secretary/calendar/pages/SecretaryCalendar'),
);

const SecretaryCasesPage = lazy(
  () => import('@/modules/staff/secretary/cases/pages/SecretaryCasesPage'),
);

const SecretaryCreateCasePage = lazy(
  () => import('@/modules/staff/secretary/cases/pages/SecretaryCreateCasePage'),
);

const SecretaryCaseDetailsPage = lazy(
  () =>
    import('@/modules/staff/secretary/cases/pages/SecretaryCaseDetailsPage'),
);

const SecretaryDocuments = lazy(
  () => import('@/modules/staff/secretary/documents/pages/SecretaryDocuments'),
);

const SecretaryTasks = lazy(
  () => import('@/modules/staff/secretary/tasks/pages/SecretaryTasks'),
);

const SecretaryProfile = lazy(
  () => import('@/modules/staff/secretary/profile/pages/SecretaryProfile'),
);

/* =========================================================
   ACCOUNTANT
========================================================= */
const AccountantDashboard = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantDashboard'),
);
const AccountantBilling = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantBilling'),
);
const AccountantTasks = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantTasks'),
);
const AccountantDocuments = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantDocuments'),
);
const AccountantCalendar = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantCalendar'),
);
const AccountantNotifications = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantNotifications'),
);
const AccountantProfile = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantProfile'),
);
const AccountantSecurity = lazy(
  () => import('@/modules/staff/accountant/pages/AccountantSecurity'),
);

/* =========================================================
   HR
========================================================= */
const HRDashboard = lazy(() => import('@/modules/staff/hr/pages/HRDashboard'));
const HRStaffRecords = lazy(
  () => import('@/modules/staff/hr/pages/HRStaffRecords'),
);
const HRTasks = lazy(() => import('@/modules/staff/hr/pages/HRTasks'));
const HRDocuments = lazy(() => import('@/modules/staff/hr/pages/HRDocuments'));
const HRCalendar = lazy(() => import('@/modules/staff/hr/pages/HRCalendar'));
const HRNotifications = lazy(
  () => import('@/modules/staff/hr/pages/HRNotifications'),
);
const HRProfile = lazy(() => import('@/modules/staff/hr/pages/HRProfile'));
const HRSecurity = lazy(() => import('@/modules/staff/hr/pages/HRSecurity'));

/* =========================================================
   IT
========================================================= */
const ITDashboard = lazy(() => import('@/modules/staff/it/pages/ITDashboard'));
const ITSystems = lazy(() => import('@/modules/staff/it/pages/ITSystems'));
const ITTasks = lazy(() => import('@/modules/staff/it/pages/ITTasks'));
const ITDocuments = lazy(() => import('@/modules/staff/it/pages/ITDocuments'));
const ITCalendar = lazy(() => import('@/modules/staff/it/pages/ITCalendar'));
const ITNotifications = lazy(
  () => import('@/modules/staff/it/pages/ITNotifications'),
);
const ITProfile = lazy(() => import('@/modules/staff/it/pages/ITProfile'));
const ITSecurity = lazy(() => import('@/modules/staff/it/pages/ITSecurity'));

/* =========================================================
   CLIENT (FIRM)
========================================================= */
const ClientDashboardPage = lazy(
  () => import('@/modules/client/dashboard/pages/ClientDashboardPage'),
);
const ClientCasesPage = lazy(
  () => import('@/modules/client/cases/pages/ClientCasesPage'),
);
const ClientCaseDetailsPage = lazy(
  () => import('@/modules/client/cases/pages/ClientCaseDetailsPage'),
);
const ClientCaseDocuments = lazy(
  () => import('@/modules/client/documents/pages/ClientCaseDocumentsPage'),
);
const ClientProfile = lazy(
  () => import('@/modules/client/profile/pages/ClientProfilePage'),
);
const ClientCalendarPage = lazy(
  () => import('@/modules/client/calendar/pages/ClientCaseCalendarPage'),
);
const ClientCommunicationPage = lazy(
  () =>
    import('@/modules/client/communication/pages/ClientCaseCommunicationPage'),
);
const ClientNotificationsPage = lazy(
  () => import('@/modules/client/notifications/pages/ClientNotificationsPage'),
);

/* =========================================================
   PORTAL
========================================================= */
const PortalDashboard = lazy(
  () => import('@/modules/portal/dashboard/PortalDashboard'),
);
const PortalConsultations = lazy(
  () => import('@/modules/portal/consultations/PortalConsultations'),
);
const BookConsultation = lazy(
  () => import('@/modules/portal/consultations/BookConsultation'),
);
const ConsultationDetails = lazy(
  () => import('@/modules/portal/consultations/ConsultationDetails'),
);

const PortalMessages = lazy(
  () => import('@/modules/portal/communications/PortalMessages'),
);
const PortalSupport = lazy(
  () => import('@/modules/portal/communications/PortalSupport'),
);

const PortalDocuments = lazy(
  () => import('@/modules/portal/documents/PortalDocuments'),
);
const UploadDocuments = lazy(
  () => import('@/modules/portal/documents/UploadDocuments'),
);

const IntakeForms = lazy(() => import('@/modules/portal/intake/IntakeForms'));
const IntakeStatus = lazy(() => import('@/modules/portal/intake/IntakeStatus'));
const NewIntakeForm = lazy(
  () => import('@/modules/portal/intake/NewIntakeForm'),
);

const PortalNotifications = lazy(
  () => import('@/modules/portal/notifications/PortalNotifications'),
);

const BecomeClient = lazy(
  () => import('@/modules/portal/onboarding/BecomeClient'),
);
const FirmMembershipStatus = lazy(
  () => import('@/modules/portal/onboarding/FirmMembershipStatus'),
);

const PortalProfile = lazy(
  () => import('@/modules/portal/profile/PortalProfile'),
);
/* =========================================================
   ROUTER
========================================================= */
const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC */}
        <Route element={<PublicLayoutWrapper />}>
          <Route path='/' element={<HomePage />} />
        </Route>

        {/* AUTH */}
        <Route element={<AuthLayoutWrapper />}>
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/recover-account' element={<RecoverAccount />} />
          <Route path='/reset-password/:token' element={<ResetPassword />} />
        </Route>

        <Route
          path='/admin/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />

          {/* DASHBOARD */}
          <Route path='dashboard' element={<AdminDashboard />} />

          {/* CASES */}
          <Route path='cases' element={<AdminCasesPage />} />
          <Route path='cases/create' element={<AdminCreateCasesPage />} />
          <Route path='cases/:id' element={<AdminCaseDetailsPage />} />
          <Route path='cases/:id/ai' element={<AdminCaseAIAnalysisPage />} />
          <Route
            path='cases/:id/assignments'
            element={<AdminCaseAssignmentsPage />}
          />
          <Route
            path='cases/:id/courtroom'
            element={<AdminCaseCourtroomPage />}
          />
          <Route
            path='cases/:id/timeline'
            element={<AdminCaseTimelinePage />}
          />

          {/* CLIENTS */}
          <Route path='clients' element={<AdminClientsPage />} />
          <Route path='clients/create' element={<AdminCreateClientPage />} />
          <Route path='clients/:id' element={<AdminClientDetailsPage />} />
          <Route path='clients/:id/cases' element={<AdminClientCasesPage />} />
          <Route
            path='clients/:id/documents'
            element={<AdminClientDocumentsPage />}
          />
          <Route
            path='clients/:id/communication'
            element={<AdminClientCommunicationPage />}
          />
          <Route
            path='clients/:id/billing'
            element={<AdminClientBillingPage />}
          />
          <Route
            path='clients/:id/activity'
            element={<AdminClientActivityPage />}
          />

          {/* STAFF */}
          <Route path='staff' element={<AdminStaffPage />} />
          <Route path='staff/create' element={<AdminCreateStaffPage />} />
          <Route path='staff/:id' element={<AdminStaffDetailsPage />} />

          {/* HEARINGS */}
          <Route path='hearings' element={<AdminHearingsPage />} />
          <Route path='hearings/:id' element={<AdminHearingDetailsPage />} />
          <Route
            path='hearings/:id/courtroom'
            element={<AdminVirtualCourtroomPage />}
          />

          {/* DOCUMENTS */}
          <Route path='documents' element={<AdminDocumentsPage />} />
          <Route
            path='documents/requests'
            element={<AdminDocumentRequestsPage />}
          />
          <Route
            path='documents/templates'
            element={<AdminDocumentTemplatePage />}
          />
          <Route
            path='documents/generated'
            element={<AdminGeneratedDocumentsPage />}
          />

          {/* BILLING */}
          <Route path='billing' element={<AdminBillingPage />} />
          <Route path='billing/invoices' element={<AdminInvoicesPage />} />
          <Route path='billing/payments' element={<AdminPaymentsPage />} />

          {/* REPORTS */}
          <Route path='reports' element={<AdminReportsPage />} />
          <Route path='it-report' element={<AdminITReportPage />} />

          {/* COMMUNICATION */}
          <Route path='communication' element={<AdminChatPage />} />
          <Route
            path='communication/notifications'
            element={<AdminNotificationsCenterPage />}
          />

          {/* COMPLIANCE */}
          <Route path='compliance' element={<AdminAuditLogsPage />} />

          {/* SETTINGS */}
          <Route path='settings' element={<AdminSettingsPage />} />

          {/* FIRM */}
          <Route path='firm' element={<AdminFirmPage />} />

          {/* AI */}
          <Route path='ai' element={<AdminAIOverviewPage />} />
          <Route
            path='ai/recommendations'
            element={<AdminAIRecommendationsPage />}
          />
          <Route path='ai/predictions' element={<AdminCasePredictionsPage />} />
          <Route path='ai/research' element={<AdminLegalResearchAIPage />} />

          {/* CALENDAR */}
          <Route path='calendar' element={<AdminCalendarPage />} />
        </Route>
        {/* LAWYER */}
        <Route
          path='/lawyer/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['LAWYER']}>
                <LawyerLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<LawyerDashboard />} />
          <Route path='calendar' element={<LawyerCalendar />} />
          <Route path='ai' element={<LawyerAI />} />
          <Route path='research-ai' element={<LawyerResearchAI />} />
          <Route path='cases' element={<LawyerCases />} />
          <Route path='cases/create' element={<LawyerCreateCase />} />
          <Route path='cases/:id' element={<LawyerCaseDetailsPage />} />
          <Route path='documents' element={<LawyerDocumentsPage />} />
          <Route path='documents/:id' element={<LawyerTemplatesPage />} />
          <Route path='chat' element={<LawyerChat />} />
          <Route path='notifications' element={<LawyerNotifications />} />
          <Route path='hearings' element={<LawyerHearings />} />
          <Route path='hearings/:id' element={<LawyerHearingDetails />} />
          <Route path='research' element={<LawyerResearch />} />
          <Route path='authorities' element={<LawyerAuthorities />} />
          <Route path='tasks' element={<LawyerTasks />} />
          <Route path='approvals' element={<LawyerApprovals />} />
          <Route path='profile' element={<LawyerProfile />} />
          <Route path='security' element={<LawyerSecurity />} />
        </Route>

        {/* SECRETARY */}
        <Route
          path='/secretary/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SECRETARY']}>
                <SecretaryLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />

          <Route path='dashboard' element={<SecretaryDashboard />} />

          {/* CLIENTS */}
          <Route path='clients' element={<SecretaryClients />} />
          <Route path='clients/create' element={<AdminCreateClientPage />} />
          <Route path='clients/:id' element={<SecretaryClientDetails />} />

          {/* CASES */}
          <Route path='cases' element={<SecretaryCasesPage />} />
          <Route path='cases/create' element={<SecretaryCreateCasePage />} />
          <Route path='cases/:id' element={<SecretaryCaseDetailsPage />} />

          {/* CALENDAR */}
          <Route path='calendar' element={<SecretaryCalendar />} />

          {/* DOCUMENTS */}
          <Route path='documents' element={<SecretaryDocuments />} />

          {/* TASKS */}
          <Route path='tasks' element={<SecretaryTasks />} />

          {/* COMMUNICATION */}
          <Route path='chat' element={<SecretaryChat />} />

          {/* PROFILE */}
          <Route path='profile' element={<SecretaryProfile />} />
        </Route>

        {/* ACCOUNTANT */}
        <Route
          path='/accountant/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ACCOUNTANT']}>
                <AccountantLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<AccountantDashboard />} />
          <Route path='billing' element={<AccountantBilling />} />
          <Route path='tasks' element={<AccountantTasks />} />
          <Route path='documents' element={<AccountantDocuments />} />
          <Route path='calendar' element={<AccountantCalendar />} />
          <Route path='chat' element={<StaffInternalChatPage />} />
          <Route path='notifications' element={<AccountantNotifications />} />
          <Route path='profile' element={<AccountantProfile />} />
          <Route path='security' element={<AccountantSecurity />} />
        </Route>

        {/* HR */}
        <Route
          path='/hr/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['HR']}>
                <HRLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<HRDashboard />} />
          <Route path='staff-records' element={<HRStaffRecords />} />
          <Route path='tasks' element={<HRTasks />} />
          <Route path='documents' element={<HRDocuments />} />
          <Route path='calendar' element={<HRCalendar />} />
          <Route path='chat' element={<StaffInternalChatPage />} />
          <Route path='notifications' element={<HRNotifications />} />
          <Route path='profile' element={<HRProfile />} />
          <Route path='security' element={<HRSecurity />} />
        </Route>

        {/* IT */}
        <Route
          path='/it/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['IT']}>
                <ITLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<ITDashboard />} />
          <Route path='systems' element={<ITSystems />} />
          <Route path='tasks' element={<ITTasks />} />
          <Route path='documents' element={<ITDocuments />} />
          <Route path='calendar' element={<ITCalendar />} />
          <Route path='chat' element={<StaffInternalChatPage />} />
          <Route path='notifications' element={<ITNotifications />} />
          <Route path='profile' element={<ITProfile />} />
          <Route path='security' element={<ITSecurity />} />
        </Route>

        {/* CLIENT */}
        <Route
          path='/client/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['OFFICIAL_CLIENT']}>
                <ClientLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<ClientDashboardPage />} />
          <Route path='cases' element={<ClientCasesPage />} />
          <Route path='cases/:id' element={<ClientCaseDetailsPage />} />
          <Route
            path='cases/:id/communication'
            element={<ClientCommunicationPage />}
          />
          <Route path='calendar' element={<ClientCalendarPage />} />
          <Route path='communication' element={<ClientCommunicationPage />} />
          <Route
            path='communication/:caseId'
            element={<ClientCommunicationPage />}
          />
          <Route path='documents' element={<ClientCaseDocuments />} />
          <Route path='notifications' element={<ClientNotificationsPage />} />
          <Route path='profile' element={<ClientProfile />} />
        </Route>

        {/* PORTAL */}
        <Route
          path='/portal/*'
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['PORTAL_CLIENT']}>
                <PortalLayoutWrapper />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path='' element={<Navigate to='dashboard' replace />} />
          <Route path='dashboard' element={<PortalDashboard />} />
          <Route path='consultations' element={<PortalConsultations />} />
          <Route path='consultations/book' element={<BookConsultation />} />
          <Route path='consultations/:id' element={<ConsultationDetails />} />
          <Route path='messages' element={<PortalMessages />} />
          <Route path='support' element={<PortalSupport />} />
          <Route path='documents' element={<PortalDocuments />} />
          <Route path='documents/upload' element={<UploadDocuments />} />
          <Route path='intake/forms' element={<IntakeForms />} />
          <Route path='intake/status' element={<IntakeStatus />} />
          <Route path='intake/new' element={<NewIntakeForm />} />
          <Route path='notifications' element={<PortalNotifications />} />
          <Route path='become-client' element={<BecomeClient />} />
          <Route path='membership-status' element={<FirmMembershipStatus />} />
          <Route path='profile' element={<PortalProfile />} />
        </Route>

        {/* 404 */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

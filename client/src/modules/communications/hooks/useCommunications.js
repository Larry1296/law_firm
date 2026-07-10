import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import communicationService from '@/modules/communications/services/communicationService';

export const communicationKeys = {
  adminAnnouncements: ['communications', 'admin-announcements'],
  announcementInbox: ['communications', 'announcement-inbox'],
  threads: (params = {}) => ['communications', 'threads', params],
  adminThreads: (params = {}) => ['communications', 'admin-threads', params],
  staffContacts: ['communications', 'staff-contacts'],
  secretaryCaseThreads: ['communications', 'secretary-case-threads'],
  threadMessages: (threadId) => ['communications', 'thread-messages', threadId],
  caseThread: (caseId) => ['communications', 'case-thread', caseId],
  caseMessages: (caseId) => ['communications', 'case-messages', caseId],
};

export const useAdminAnnouncements = () =>
  useQuery({
    queryKey: communicationKeys.adminAnnouncements,
    queryFn: communicationService.getAdminAnnouncements,
  });

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communicationService.createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.adminAnnouncements,
      });
      queryClient.invalidateQueries({
        queryKey: communicationKeys.announcementInbox,
      });
    },
  });
};

export const useAnnouncementInbox = () =>
  useQuery({
    queryKey: communicationKeys.announcementInbox,
    queryFn: communicationService.getAnnouncementInbox,
  });

export const useMarkAnnouncementRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communicationService.markAnnouncementRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.announcementInbox,
      });
    },
  });
};

export const useThreads = (params = {}) =>
  useQuery({
    queryKey: communicationKeys.threads(params),
    queryFn: () => communicationService.getThreads(params),
  });

export const useAdminThreads = (params = {}) =>
  useQuery({
    queryKey: communicationKeys.adminThreads(params),
    queryFn: () => communicationService.getAdminThreads(params),
  });

export const useSecretaryCaseThreads = () =>
  useQuery({
    queryKey: communicationKeys.secretaryCaseThreads,
    queryFn: communicationService.getSecretaryCaseThreads,
  });

export const useStartStaffThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communicationService.startStaffThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
};

export const useStaffContacts = () =>
  useQuery({
    queryKey: communicationKeys.staffContacts,
    queryFn: communicationService.getStaffContacts,
  });

export const useCaseThread = (caseId) =>
  useQuery({
    queryKey: communicationKeys.caseThread(caseId),
    queryFn: () => communicationService.getCaseThread(caseId),
    enabled: Boolean(caseId),
  });

export const useOpenCaseThread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: communicationService.getCaseThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
};

export const useThreadMessages = (threadId) =>
  useQuery({
    queryKey: communicationKeys.threadMessages(threadId),
    queryFn: () => communicationService.getThreadMessages(threadId),
    enabled: Boolean(threadId),
  });

export const useSendThreadMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, body }) =>
      communicationService.sendThreadMessage(threadId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.threadMessages(variables.threadId),
      });
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
};

export const useCaseMessages = (caseId) =>
  useQuery({
    queryKey: communicationKeys.caseMessages(caseId),
    queryFn: () => communicationService.getCaseMessages(caseId),
    enabled: Boolean(caseId),
  });

export const useSendCaseMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, body }) =>
      communicationService.sendCaseMessage(caseId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communicationKeys.caseMessages(variables.caseId),
      });
      queryClient.invalidateQueries({
        queryKey: communicationKeys.caseThread(variables.caseId),
      });
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
};

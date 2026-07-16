import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import courtroomService from '@/modules/courtroom/services/courtroomService';

export const courtroomKeys = {
  today: ['courtroom', 'today'],
  providers: ['courtroom', 'providers'],
  sessions: (params = {}) => ['courtroom', 'sessions', params],
  attendance: (sessionId) => ['courtroom', 'sessions', sessionId, 'attendance'],
  recordings: (sessionId) => ['courtroom', 'sessions', sessionId, 'recordings'],
  causeListSyncs: ['courtroom', 'cause-list-syncs'],
  analytics: ['courtroom', 'analytics'],
};

export const useTodayCourtroomEvents = () =>
  useQuery({
    queryKey: courtroomKeys.today,
    queryFn: courtroomService.getTodayCourtroomEvents,
  });

export const useCreateCaseEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseId, payload }) =>
      courtroomService.createCaseEvent(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.today });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

export const useUpdateCourtroomLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }) =>
      courtroomService.updateCourtroomLink(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.today });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

export const useCourtroomProviders = () =>
  useQuery({
    queryKey: courtroomKeys.providers,
    queryFn: courtroomService.getProviders,
  });

export const useCreateCourtroomProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courtroomService.createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.providers });
    },
  });
};

export const useCourtroomSessions = (params = {}) =>
  useQuery({
    queryKey: courtroomKeys.sessions(params),
    queryFn: () => courtroomService.getSessions(params),
  });

export const useCreateCourtroomSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courtroomService.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courtroom'] });
      queryClient.invalidateQueries({ queryKey: courtroomKeys.today });
    },
  });
};

export const useUpdateCourtroomSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, payload }) =>
      courtroomService.updateSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courtroom'] });
      queryClient.invalidateQueries({ queryKey: courtroomKeys.today });
    },
  });
};

export const useCreateCourtroomAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, payload }) =>
      courtroomService.createAttendance(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.attendance(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: ['courtroom'] });
    },
  });
};

export const useCreateCourtroomRecording = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, payload }) =>
      courtroomService.createRecording(sessionId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.recordings(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: ['courtroom'] });
    },
  });
};

export const useCourtroomCauseListSyncs = () =>
  useQuery({
    queryKey: courtroomKeys.causeListSyncs,
    queryFn: courtroomService.getCauseListSyncs,
  });

export const useCreateCourtroomCauseListSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: courtroomService.createCauseListSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courtroomKeys.causeListSyncs });
    },
  });
};

export const useCourtroomAnalytics = () =>
  useQuery({
    queryKey: courtroomKeys.analytics,
    queryFn: courtroomService.getAnalytics,
  });

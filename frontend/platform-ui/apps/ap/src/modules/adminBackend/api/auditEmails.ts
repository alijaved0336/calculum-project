import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from '@/services/api/response';
import { getBaseApi } from '@/utils/getBaseApi';

export interface AuditEmailFilters {
  targetEmail?: string;
  subject?: string;
  sentAfter?: string;
  sentBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  status?: 'sent' | 'queued' | 'failed' | 'skipped';
  order?: { field: string; dir: 'asc' | 'desc' };
  page?: number;
}

export interface AuditEmail {
  id: string;
  uuid: string;
  subject: string | null;
  targetEmail: string | null;
  cc: string[] | null;
  isHtml: boolean;
  sent: string | null;
  created: string | null;
  humanDate: string | null;
  status: 'sent' | 'queued' | 'failed' | 'skipped';
  sensitive: boolean;
  bodyContent?: string | null;
  sender?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export async function getAuditEmails(filters: AuditEmailFilters = {}): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + '/api/e-mails';

  const params: Record<string, string | number> = {};

  if (filters.targetEmail) params['targetEmail'] = filters.targetEmail;
  if (filters.subject) params['subject'] = filters.subject;
  if (filters.sentAfter) params['sent[after]'] = filters.sentAfter;
  if (filters.sentBefore) params['sent[before]'] = filters.sentBefore;
  if (filters.createdAfter) params['created[after]'] = filters.createdAfter;
  if (filters.createdBefore) params['created[before]'] = filters.createdBefore;

  if (filters.status) {
    params['status'] = filters.status;
  }

  if (filters.page && filters.page > 1) params['page'] = filters.page;
  if (filters.order) {
    params[`order[${filters.order.field}]`] = filters.order.dir;
  }

  try {
    response = await axios.get(url, { params });
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getAuditEmail(uuid: string): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + `/api/e-mails/${uuid}`;

  try {
    response = await axios.get(url, {});
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

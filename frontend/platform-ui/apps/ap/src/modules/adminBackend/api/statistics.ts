import axios from '@/utils/axios';
import { ApiResponse, giveAnswer } from "@/services/api/response";
import { getBaseApi } from '@/utils/getBaseApi';

export interface ConnectedUser {
  name: string;
  email: string;
  last_activity: string;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  monthly_active_users: number;
  daily_active_users: number;
  calculum_users: number;
  connected_users_count: number;
  connected_users_list: ConnectedUser[];
  last_updated: string;
}

export interface QueueMetrics {
  memory_usage: number;
  disk_usage: number;
}

export interface QueueConsumers {
  count: number;
  utilisation: number;
}

export interface QueueMessages {
  total: number;
  ready: number;
  unacknowledged: number;
  in_memory: number;
}

export interface QueueMessage {
  payload_bytes: number;
  redelivered: boolean;
  exchange: string;
  routing_key: string;
  message_count: number;
  properties: any;
  payload: string;
  payload_encoding: string;
}

export interface QueueMessagesResponse {
  queue: string;
  messages: QueueMessage[];
  total_messages: number;
  truncated: boolean;
}

export interface Queue {
  name: string;
  status: string;
  messages: QueueMessages;
  consumers: QueueConsumers;
  metrics: QueueMetrics;
}

export interface QueueStatisticsResponse {
  queues: {
    [key: string]: Queue;
  };
  total_queues: number;
  total_messages: number;
  timestamp: string;
}




export async function getUserStatistics(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + '/api/statistics/users';
  
  try {
    response = await axios.get(url);
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getQueueStatistics(): Promise<ApiResponse> {
  let response = null;
  const url = getBaseApi() + '/api/statistics/queues';
  
  try {
    response = await axios.get(url);
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
}

export async function getQueueMessages(queueName: string, count: number = 50, truncate: number = 50000): Promise<ApiResponse> {
  let response = null;
  const url = `${getBaseApi()}/api/statistics/queues/${queueName}/messages?count=${count}&truncate=${truncate}`;
  
  try {
    response = await axios.get(url);
  } catch (e: any) {
    response = e.response;
  }

  return giveAnswer(response);
} 

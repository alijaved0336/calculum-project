import authClient from "./services/auth.client";
import negotiationClient from "./services/negotiation.client";

export interface LoginRequest {
  email: string;
  password: string;
}

// Internal frontend model — camelCase, used by the store and components.
export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  userId: string;
  role: string;
}

export interface TenantOption {
  tenantUuid: string;
  tenantId: string;
  tenantName: string;
  country: string | null;
}

// Matches the actual backend response shape (snake_case).
export interface LoginResponse {
  access_token: string;
  token_type: string;
  tenant_memberships: Array<{ tenant_id: string; role: string }> | null;
}

export interface TenantListResponse {
  tenants: TenantOption[];
}

export const authApi = {
  login: (payload: LoginRequest) =>
    authClient.post<LoginResponse>("/auth/login", payload),

  listTenants: () => negotiationClient.get<TenantListResponse>("/tenants"),
};

// SPDX-License-Identifier: MIT
import { ApiBase, ApiHttpError, ApiMethod, ApiResponse } from "../api";

export const LISTSERVER_ACCESS_NONE = 0;
export const LISTSERVER_ACCESS_VIEW = 1;
export const LISTSERVER_ACCESS_MANAGE = 2;
export type ListserverAccess = 0 | 1 | 2;

export type ListserverRootResponse = {
  server: {
    api_name: string;
    version: string;
    name: string;
    description: string;
    favicon: string;
    source: string;
    read_only: boolean;
    public: boolean;
    private: boolean;
  };
  config: {
    checkserver: boolean;
    maxsessionsperhost: number;
    maxsessionspernamedhost: number;
    protocolwhitelist: string[];
    sessiontimeout: number;
  };
  user: {
    id: number;
    name: string;
    admin: boolean;
    permissions: {
      sessions: ListserverAccess;
      hostbans: ListserverAccess;
      roles: ListserverAccess;
      users: ListserverAccess;
    };
  };
};

export type ListserverSessionResponse = {
  id: number;
  host: string;
  port: Int16Array;
  sessionid: string;
  protocol: string;
  title: string;
  users: number;
  maxusers?: number;
  password: boolean;
  nsfm: boolean;
  owner: string;
  started: string;
  lastactive: string;
  unlisted: boolean;
  updatekey: string;
  clientip: string;
  roomcode?: string;
  alias?: string;
  private: boolean;
  unlistreason?: string;
  closed: boolean;
  kicked: boolean;
  timedout: boolean;
  included: boolean;
  error?: string;
};

export type ListserverKickResponse = {
  status: string;
  updated: number[];
};

export type ListserverCreateHostBanResponse = {
  status: string;
  id: number;
};

export type ListserverUpdateHostBanResponse = {
  status: string;
};

export type ListserverDeleteHostBanResponse = {
  status: string;
};

export type ListserverHostBanResponse = {
  id: number;
  host: string;
  expires: string;
  active: boolean;
  notes?: string;
};

export type ListserverCreateRoleResponse = {
  status: string;
  id: number;
};

export type ListserverUpdateRoleResponse = {
  status: string;
};

export type ListserverDeleteRoleResponse = {
  status: string;
};

export type ListserverRoleResponse = {
  id: number;
  name: string;
  admin: boolean;
  accesssessions: ListserverAccess;
  accesshostbans: ListserverAccess;
  accessroles: ListserverAccess;
  accessusers: ListserverAccess;
  used: boolean;
};

export type ListserverCreateUserResponse = {
  status: string;
  id: number;
};

export type ListserverUpdateUserResponse = {
  status: string;
};

export type ListserverDeleteUserResponse = {
  status: string;
};

export type ListserverUserResponse = {
  id: number;
  name: string;
  role: string;
};

export type ListserverChangePasswordResponse = {
  status: string;
};

export type ListserverSessionsResponse = ListserverSessionResponse[];
export type ListserverHostBansResponse = ListserverHostBanResponse[];
export type ListserverRolesResponse = ListserverRoleResponse[];
export type ListserverUsersResponse = ListserverUserResponse[];

export function accessToString(
  access: ListserverAccess,
  admin: boolean = false
) {
  if (admin) {
    return "admin";
  } else if (access === LISTSERVER_ACCESS_NONE) {
    return "no access";
  } else if (access === LISTSERVER_ACCESS_VIEW) {
    return "view";
  } else if (access === LISTSERVER_ACCESS_MANAGE) {
    return "manage";
  } else {
    return "unknown";
  }
}

export class ListserverApi extends ApiBase {
  readonly baseUrl: string;
  private readonly auth: string;

  constructor(baseUrl: string, auth: string) {
    super();
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.auth = auth;
  }

  private async request<T>(
    path: string,
    method: ApiMethod,
    body?: object
  ): Promise<ApiResponse<T>> {
    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Basic ${this.auth}`);

    const options: RequestInit = { method, headers, credentials: "omit" };
    if (body) {
      headers.set("Content-Type", "application/json");
      options.body = JSON.stringify(body);
    }

    const requestTimestamp = Date.now();
    const res = await fetch(`${this.baseUrl}${path}`, options);
    if (res.status >= 200 && res.status <= 299) {
      return new ApiResponse<T>(
        requestTimestamp,
        Date.now(),
        JSON.parse(await res.text())
      );
    } else {
      const err = await ApiHttpError.create(res);
      return Promise.reject(err);
    }
  }

  async getRoot(): Promise<ApiResponse<ListserverRootResponse>> {
    return this.request("/", "GET");
  }

  async getSessions(): Promise<ApiResponse<ListserverSessionsResponse>> {
    return this.request("/sessions/", "GET");
  }

  async putSessions(
    sessionIds: number[],
    reason: string
  ): Promise<ApiResponse<ListserverKickResponse>> {
    return this.request("/sessions/", "PUT", {
      ids: sessionIds,
      unlisted: true,
      unlistreason: reason,
    });
  }

  async getHostBans(): Promise<ApiResponse<ListserverHostBansResponse>> {
    return this.request("/bans/", "GET");
  }

  async postHostBan(
    host: string,
    expires: string,
    notes: string
  ): Promise<ApiResponse<ListserverCreateHostBanResponse>> {
    return this.request("/bans/", "POST", { host, expires, notes });
  }

  async putHostBan(
    id: number,
    host: string,
    expires: string,
    notes: string
  ): Promise<ApiResponse<ListserverUpdateHostBanResponse>> {
    return this.request(`/bans/${id}`, "PUT", { host, expires, notes });
  }

  async deleteHostBan(
    id: number
  ): Promise<ApiResponse<ListserverDeleteHostBanResponse>> {
    return this.request(`/bans/${id}`, "DELETE");
  }

  async getRoles(): Promise<ApiResponse<ListserverRolesResponse>> {
    return this.request("/roles/", "GET");
  }

  async postRole(
    name: string,
    admin: boolean,
    accesssessions: ListserverAccess,
    accesshostbans: ListserverAccess,
    accessroles: ListserverAccess,
    accessusers: ListserverAccess
  ): Promise<ApiResponse<ListserverCreateRoleResponse>> {
    return this.request("/roles/", "POST", {
      name,
      admin,
      accesssessions,
      accesshostbans,
      accessroles,
      accessusers,
    });
  }

  async putRole(
    id: number,
    name: string,
    admin: boolean,
    accesssessions: ListserverAccess,
    accesshostbans: ListserverAccess,
    accessroles: ListserverAccess,
    accessusers: ListserverAccess
  ): Promise<ApiResponse<ListserverUpdateRoleResponse>> {
    return this.request(`/roles/${id}`, "PUT", {
      name,
      admin,
      accesssessions,
      accesshostbans,
      accessroles,
      accessusers,
    });
  }

  async deleteRole(
    id: number
  ): Promise<ApiResponse<ListserverDeleteRoleResponse>> {
    return this.request(`/roles/${id}`, "DELETE");
  }

  async getUsers(): Promise<ApiResponse<ListserverUsersResponse>> {
    return this.request("/users/", "GET");
  }

  async postUser(
    name: string,
    password: string,
    role: string
  ): Promise<ApiResponse<ListserverCreateUserResponse>> {
    return this.request("/users/", "POST", { name, password, role });
  }

  async putUser(
    id: number,
    name: string,
    password: string,
    role: string
  ): Promise<ApiResponse<ListserverUpdateUserResponse>> {
    return this.request(`/users/${id}`, "PUT", { name, password, role });
  }

  async deleteUser(
    id: number
  ): Promise<ApiResponse<ListserverDeleteUserResponse>> {
    return this.request(`/users/${id}`, "DELETE");
  }

  async changePassword(
    password: string
  ): Promise<ApiResponse<ListserverChangePasswordResponse>> {
    return this.request("/users/self/password", "PUT", { password });
  }
}

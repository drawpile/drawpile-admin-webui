// SPDX-License-Identifier: MIT
export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export class ApiResponse<T> {
  readonly requestTimestamp: number;
  readonly responseTimestamp: number;
  readonly result: T;

  constructor(requestTimestamp: number, responseTimestamp: number, result: T) {
    this.requestTimestamp = requestTimestamp;
    this.responseTimestamp = responseTimestamp;
    this.result = result;
  }

  formatResponseTimestamp(): string {
    return new Date(this.responseTimestamp).toLocaleTimeString();
  }
}

export class ApiHttpError {
  readonly status: number;
  readonly statusText: string;
  readonly message: string;

  static async create(res: Response): Promise<ApiHttpError> {
    let message = "";
    try {
      const body = JSON.parse(await res.text());
      if (body && body.message && typeof body.message === "string") {
        message = body.message.trim();
      }
    } catch (_) {
      // No message, apparently.
    }
    return new ApiHttpError(res.status, res.statusText, message);
  }

  private constructor(status: number, statusText: string, message: string) {
    this.status = status;
    this.statusText = statusText;
    this.message = message;
  }

  toString(): string {
    if (this.message === "") {
      return `Server responded with ${this.status} ${this.statusText}`;
    } else {
      return this.message;
    }
  }
}

export abstract class ApiBase {
  getErrorMessage(reason: any): string {
    const message = reason instanceof Error ? reason.message : `${reason}`;
    if (message) {
      return message.match(/\p{P}$/) ? message : `${message}.`;
    } else {
      return "An unknown error occurred";
    }
  }
}

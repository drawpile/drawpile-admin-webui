// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import { ListserverApi, ListserverRootResponse } from "./api";
import { ApiHttpError, ApiResponse } from "../api";
import { killEvent } from "../util";

export type LoginEventDetail = {
  api: ListserverApi;
  rootResponse: ApiResponse<ListserverRootResponse>;
};

@customElement("listserver-login")
export class ListserverLogin extends DrawpileElement {
  @property() apiBaseUrl!: string;
  @property({ type: Boolean }) wantLogout: boolean = false;
  @state() username: string = "";
  @state() password: string = "";
  @state() submitting: boolean = false;
  @state() errorMessage: string = "";
  @state() invalidInputs: boolean = false;

  static formatAuth(username: string, password: string): string {
    return btoa(`${username}:${password}`);
  }

  static getLocalStorageKey(apiBaseUrl: string): string {
    return `dpadmin:listserver:auth:${apiBaseUrl}`;
  }

  private get localStorageKey(): string {
    return ListserverLogin.getLocalStorageKey(this.apiBaseUrl);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.wantLogout) {
      localStorage.removeItem(this.localStorageKey);
    } else {
      const auth = localStorage.getItem(this.localStorageKey);
      if (auth) {
        this.login(auth);
      }
    }
  }

  private login(auth: string): void {
    if (!this.submitting) {
      this.submitting = true;
      this.errorMessage = "";
      this.invalidInputs = false;
      const api = new ListserverApi(this.apiBaseUrl, auth);
      api
        .getRoot()
        .then((rootResponse: ApiResponse<ListserverRootResponse>): void => {
          localStorage.setItem(this.localStorageKey, auth);
          const detail: LoginEventDetail = { api, rootResponse };
          this.emit("login", detail);
        })
        .catch((reason: any): void => {
          if (reason instanceof ApiHttpError && reason.status === 401) {
            this.errorMessage = "Incorrect username or password.";
            this.invalidInputs = true;
            localStorage.removeItem(this.localStorageKey);
          } else {
            this.errorMessage = api.getErrorMessage(reason);
          }
          this.submitting = false;
        });
    }
  }

  private submit(e: Event): void {
    killEvent(e);
    this.login(ListserverLogin.formatAuth(this.username, this.password));
  }

  override render(): RenderResult {
    const submitDisabled =
      this.username.trim() === "" ||
      this.password.trim() === "" ||
      this.submitting
        ? "disabled"
        : nothing;
    return html`
      <article>
        <header>
          <h1>List Server Admin Login</h1>
        </header>
        <form @submit="${this.submit}">
          <label for="firstname">
            Username
            <input
              .value=${this.username}
              @change="${this.bindInput("username")}"
              @keyup="${this.bindInput("username")}"
              readonly="${this.submitting || nothing}"
              aria-invalid="${this.invalidInputs || nothing}"
              type="text"
              id="username"
              name="username"
              required
              autofocus
            />
          </label>
          <label for="password">
            Password
            <input
              .value=${this.password}
              @change="${this.bindInput("password")}"
              @keyup="${this.bindInput("password")}"
              readonly="${this.submitting || nothing}"
              aria-invalid="${this.invalidInputs || nothing}"
              type="password"
              id="password"
              name="password"
              required
            />
          </label>
          <p class="error">${this.errorMessage}</p>
          <button
            type="submit"
            aria-busy="${this.submitting ? "true" : nothing}"
            disabled="${submitDisabled}"
          >
            ${this.submitting ? "Logging in…" : "Log in"}
          </button>
        </form>
      </article>
    `;
  }
}

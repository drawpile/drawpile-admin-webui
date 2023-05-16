// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import { ListserverApi } from "./api";
import { ListserverLogin } from "./login";
import { killEvent } from "../util";

@customElement("listserver-change-password-form")
export class ListserverChangePasswordForm extends DrawpileElement {
  @property() api!: ListserverApi;
  @property() username!: string;
  @state() password: string = "";
  @state() repeatPassword: string = "";
  @state() submitting: boolean = false;
  @state() error: string = "";

  private submit(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.submitting = true;
      this.error = "";
      this.api
        .changePassword(this.password)
        .then((): void => {
          this.updateAuth();
          this.emit("finish");
        })
        .catch((reason: any): void => {
          this.error = this.api.getErrorMessage(reason);
          this.submitting = false;
        });
    }
  }

  private cancel(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.emit("cancel");
    }
  }

  private updateAuth(): void {
    const key = ListserverLogin.getLocalStorageKey(this.api.baseUrl);
    const auth = ListserverLogin.formatAuth(this.username, this.password);
    localStorage.setItem(key, auth);
  }

  protected override render(): RenderResult {
    const password = this.password.trim();
    const repeat = this.repeatPassword.trim();
    const mismatch = !!((password || repeat) && password != repeat);
    const mismatchError = !!(mismatch && password && repeat);
    const canSubmit = !this.submitting && password.length && !mismatch;
    return html`
      <h3>Change Password</h3>
      <form @submit="${this.submit}">
        <label class="${mismatchError ? "error" : nothing}">
          New Password
          <input
            type="password"
            class="${mismatchError ? "error" : nothing}"
            name="password"
            value="${this.password}"
            @change="${this.bindInput("password")}"
            @keyup="${this.bindInput("password")}"
            required
            autofocus
          />
          <small class="${mismatchError ? "error" : nothing}">
            ${mismatchError
              ? "Passwords don't match."
              : "Your desired password."}
          </small>
        </label>
        <label class="${mismatchError ? "error" : nothing}">
          Repeat Password
          <input
            type="password"
            class="${mismatchError ? "error" : nothing}"
            name="repeatPassword"
            value="${this.repeatPassword}"
            @change="${this.bindInput("repeatPassword")}"
            @keyup="${this.bindInput("repeatPassword")}"
            required
          />
          <small class="${mismatchError ? "error" : nothing}">
            ${mismatchError
              ? "Passwords don't match."
              : "Repeat your new password."}
          </small>
        </label>
        ${this.renderError()}
        <div class="grid">
          <button
            type="submit"
            disabled="${!canSubmit || nothing}"
            aria-busy="${this.submitting || nothing}"
          >
            ${this.submitting ? "Changing…" : "Change"}
          </button>
          <button
            class="secondary"
            disabled="${this.submitting || nothing}"
            @click="${this.cancel}"
          >
            Cancel
          </button>
        </div>
      </form>
    `;
  }

  private renderError(): RenderResult {
    if (this.error) {
      return html`<p class="error"><strong>Error:</strong> ${this.error}</p>`;
    } else {
      return nothing;
    }
  }
}

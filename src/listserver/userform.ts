// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import {
  ListserverApi,
  ListserverRoleResponse,
  ListserverRolesResponse,
} from "./api";
import { ApiResponse } from "../api";
import { killEvent } from "../util";

@customElement("listserver-user-form")
export class ListserverUserForm extends DrawpileElement {
  @property() api!: ListserverApi;
  @property({ type: Number }) existingId?: number;
  @property() name: string = "";
  @property() role: string = "";
  @property({ type: Boolean }) deletion: boolean = false;
  @state() password: string = "";
  @state() repeatPassword: string = "";
  @state() submitting: boolean = false;
  @state() error: string = "";
  @state() roles: ListserverRolesResponse = [];
  @state() loadingRoles: boolean = false;
  @state() roleError: string = "";

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.isDeleteForm()) {
      this.loadingRoles = true;
      this.api
        .getRoles()
        .then(({ result }: ApiResponse<ListserverRolesResponse>) => {
          this.roles = result;
          if (!this.role && this.roles.length) {
            this.role = this.roles[0]!.name;
          }
        })
        .catch((reason: any) => {
          this.roleError = this.api.getErrorMessage(reason);
        })
        .finally(() => {
          this.loadingRoles = false;
        });
    }
  }

  private isCreateForm(): boolean {
    return this.existingId === undefined;
  }

  private isDeleteForm(): boolean {
    return !this.isCreateForm() && this.deletion;
  }

  private submit(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.submitting = true;
      this.error = "";
      this.submitRequest()
        .then((): void => {
          this.emit("finish");
        })
        .catch((reason: any): void => {
          this.error = this.api.getErrorMessage(reason);
          this.submitting = false;
        });
    }
  }

  private submitRequest(): Promise<ApiResponse<unknown>> {
    if (this.isCreateForm()) {
      return this.api.postUser(this.name, this.password, this.role);
    } else if (this.isDeleteForm()) {
      return this.api.deleteUser(this.existingId!);
    } else {
      return this.api.putUser(
        this.existingId!,
        this.name,
        this.password,
        this.role
      );
    }
  }

  private cancel(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.emit("cancel");
    }
  }

  protected override render(): RenderResult {
    const isCreate = this.isCreateForm();
    const isDelete = this.isDeleteForm();
    const isReadonly = this.submitting || isDelete;
    const invalidName = !isDelete && /[^a-z0-9_]/.test(this.name.trim());
    const nameClass = invalidName ? "error" : nothing;
    const password = this.password.trim();
    const repeat = this.repeatPassword.trim();
    const mismatch = !!((password || repeat) && password != repeat);
    const mismatchError = !!(mismatch && password && repeat);
    const canSubmit =
      !this.submitting &&
      (isDelete ||
        (this.name?.trim()?.length &&
          (!isCreate || this.password?.trim().length) &&
          this.role?.trim().length &&
          !invalidName &&
          !mismatch));
    return html`
      ${this.renderHeading()}
      <form @submit="${this.submit}">
        <label class="${nameClass}">
          Name
          <input
            type="text"
            name="name"
            value="${this.name}"
            class="${nameClass}"
            @change="${this.bindInput("name")}"
            @keyup="${this.bindInput("name")}"
            readonly="${isReadonly || nothing}"
            disabled="${isDelete || nothing}"
            required="${!isDelete || nothing}"
            autofocus="${!isDelete || nothing}"
          />
          ${this.renderNameInfo(isDelete, invalidName)}
        </label>
        ${this.renderPassword(
          isCreate,
          isDelete,
          isReadonly,
          password,
          mismatchError
        )}
        ${this.renderRoles()} ${this.renderError()}
        <div class="grid">
          <button
            type="submit"
            disabled="${!canSubmit || nothing}"
            aria-busy="${this.submitting || nothing}"
          >
            ${this.submitting
              ? isCreate
                ? "Creating…"
                : isDelete
                ? "Deleting…"
                : "Updating…"
              : isCreate
              ? "Create"
              : isDelete
              ? "Delete"
              : "Update"}
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

  private renderHeading(): RenderResult {
    if (this.isCreateForm()) {
      return html`<h3>Create User</h3>`;
    } else if (this.isDeleteForm()) {
      return html`<hgroup>
        <h3>Delete User</h3>
        <h4>Are you sure you want to delete this user?</h4>
      </hgroup>`;
    } else {
      return html`<h3>Edit User</h3>`;
    }
  }

  private renderNameInfo(
    isDelete: boolean,
    invalidName: boolean
  ): RenderResult {
    if (isDelete) {
      return nothing;
    } else if (invalidName) {
      return html`<small class="error">
        Can only contain
        <strong>
          lowercase <code>a-z</code>, <code>0-9</code> and
          <code>_</code></strong
        >!
      </small>`;
    } else {
      return html`<small>
        A name for the user, can only contain lowercase
        <code>a-z</code>, <code>0-9</code> and <code>_</code>.
      </small>`;
    }
  }

  private renderPassword(
    isCreate: boolean,
    isDelete: boolean,
    isReadonly: boolean,
    password: string,
    mismatchError: boolean
  ): RenderResult {
    if (isDelete) {
      return nothing;
    } else {
      const note = isCreate
        ? "The user can and should change the password after logging in."
        : "Leave this empty if you don't want to change the password.";
      return html`
        <label class="${mismatchError ? "error" : nothing}">
          ${isCreate ? "Initial Password" : "Change Password"}
          <input
            type="password"
            class="${mismatchError ? "error" : nothing}"
            name="password"
            value="${this.password}"
            @change="${this.bindInput("password")}"
            @keyup="${this.bindInput("password")}"
            readonly="${isReadonly || nothing}"
            required="${isCreate || nothing}"
          />
          <small>${note}</small>
        </label>
        ${this.renderRepeatPassword(
          isCreate,
          isReadonly,
          password,
          mismatchError
        )}
      `;
    }
  }

  private renderRepeatPassword(
    isCreate: boolean,
    isReadonly: boolean,
    password: string,
    mismatchError: boolean
  ): RenderResult {
    if (isCreate || password.length) {
      const note = mismatchError
        ? html`<small class="error">Passwords don't match.</small>`
        : nothing;
      return html`
        <label class="${mismatchError ? "error" : nothing}">
          Repeat Password
          <input
            type="password"
            class="${mismatchError ? "error" : nothing}"
            name="repeatPassword"
            value="${this.repeatPassword}"
            @change="${this.bindInput("repeatPassword")}"
            @keyup="${this.bindInput("repeatPassword")}"
            readonly="${isReadonly || nothing}"
            required="${isCreate || nothing}"
          />
          ${note}
        </label>
      `;
    } else {
      return nothing;
    }
  }

  private renderRoles(): RenderResult {
    if (this.isDeleteForm()) {
      return html`<label>
        Role
        <input type="text" name="role" value="${this.role}" readonly disabled />
      </label>`;
    } else if (this.loadingRoles) {
      return html`<label aria-busy="true">Loading roles…</label>`;
    } else if (this.roleError) {
      return html`<label class="error">
        <strong>Error loading roles:</strong> ${this.roleError}
      </label>`;
    } else if (this.roles.length) {
      return html`<label>
        Role
        <select name="role" @change="${this.bindSelect("role")}">
          ${this.roles.map(this.renderRoleOption.bind(this))}
        </select>
        <small>Which permissions this user should have.</small>
      </label>`;
    } else {
      return html`<label class="error">
        You have to <a href="#/listserver/roles/create">create a role</a> before
        you can create a user.
      </label>`;
    }
  }

  private renderRoleOption(role: ListserverRoleResponse): RenderResult {
    const { name } = role;
    return html`<option
      value="${name}"
      selected="${this.role === name || nothing}"
    >
      ${name}
    </option>`;
  }

  private renderError(): RenderResult {
    if (this.error) {
      return html`<p class="error"><strong>Error:</strong> ${this.error}</p>`;
    } else {
      return nothing;
    }
  }
}

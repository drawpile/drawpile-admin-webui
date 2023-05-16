// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";
import {
  LISTSERVER_ACCESS_MANAGE,
  LISTSERVER_ACCESS_NONE,
  LISTSERVER_ACCESS_VIEW,
  ListserverAccess,
  ListserverApi,
} from "./api";
import { ApiResponse } from "../api";
import { killEvent } from "../util";

@customElement("listserver-role-form")
export class ListserverHostBanForm extends DrawpileElement {
  @property() api!: ListserverApi;
  @property({ type: Number }) existingId?: number;
  @property() name: string = "";
  @property({ type: Boolean }) admin: boolean = false;
  @property({ type: Number }) accesssessions: ListserverAccess =
    LISTSERVER_ACCESS_NONE;
  @property({ type: Number }) accesshostbans: ListserverAccess =
    LISTSERVER_ACCESS_NONE;
  @property({ type: Number }) accessroles: ListserverAccess =
    LISTSERVER_ACCESS_NONE;
  @property({ type: Number }) accessusers: ListserverAccess =
    LISTSERVER_ACCESS_NONE;
  @property({ type: Boolean }) deletion: boolean = false;
  @state() submitting: boolean = false;
  @state() error: string = "";

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
      return this.api.postRole(
        this.name,
        this.admin,
        this.accesssessions,
        this.accesshostbans,
        this.accessroles,
        this.accessusers
      );
    } else if (this.isDeleteForm()) {
      return this.api.deleteRole(this.existingId!);
    } else {
      return this.api.putRole(
        this.existingId!,
        this.name,
        this.admin,
        this.accesssessions,
        this.accesshostbans,
        this.accessroles,
        this.accessusers
      );
    }
  }

  private cancel(e: Event): void {
    killEvent(e);
    if (!this.submitting) {
      this.emit("cancel");
    }
  }

  private bindAccess(key: keyof this): (e: Event) => void {
    return (e: Event) => {
      const elem = e.target as HTMLInputElement;
      if (elem.checked) {
        this[key] = Number.parseInt(elem.value, 10) as any;
      }
    };
  }

  protected override render(): RenderResult {
    const isCreate = this.isCreateForm();
    const isDelete = this.isDeleteForm();
    const isReadonly = this.submitting || isDelete;
    const invalidName = !isDelete && /[^a-z0-9_]/.test(this.name.trim());
    const nameClass = invalidName ? "error" : nothing;
    const canSubmit =
      !this.submitting &&
      (isDelete || (this.name?.trim()?.length && !invalidName));
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
        <fieldset>
          <label>
            <input
              type="checkbox"
              role="switch"
              name="admin"
              checked="${this.admin || nothing}"
              @change="${this.bindCheckbox("admin")}"
              readonly="${isReadonly || nothing}"
              disabled="${isDelete || nothing}"
            />
            Full admin access &ndash; can do everything, including management of
            users and roles
          </label>
        </fieldset>
        ${this.renderPermissions(
          isReadonly,
          isDelete,
          "Sessions",
          "accesssessions",
          true
        )}
        ${this.renderPermissions(
          isReadonly,
          isDelete,
          "Bans",
          "accesshostbans",
          true
        )}
        ${this.renderPermissions(
          isReadonly,
          isDelete,
          "Roles",
          "accessroles",
          false
        )}
        ${this.renderPermissions(
          isReadonly,
          isDelete,
          "Users",
          "accessusers",
          false
        )}
        ${this.renderError()}
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
      return html`<h3>Create Role</h3>`;
    } else if (this.isDeleteForm()) {
      return html`<hgroup>
        <h3>Delete Role</h3>
        <h4>Are you sure you want to delete this role?</h4>
      </hgroup>`;
    } else {
      return html`<h3>Edit Role</h3>`;
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
        A name for the role, can only contain lowercase
        <code>a-z</code>, <code>0-9</code> and <code>_</code>.
      </small>`;
    }
  }

  private renderPermissions(
    isReadonly: boolean,
    isDelete: boolean,
    title: string,
    key: keyof this,
    allowManage: boolean
  ): RenderResult {
    const value = this[key] as ListserverAccess;
    return html`
      <fieldset>
        <legend>${title}</legend>
        ${this.renderPermissionInput(
          isReadonly,
          isDelete,
          key,
          value,
          LISTSERVER_ACCESS_NONE,
          html`None &ndash; no access at all`
        )}
        ${this.renderPermissionInput(
          isReadonly,
          isDelete,
          key,
          value,
          LISTSERVER_ACCESS_VIEW,
          html`View &ndash; only viewing, no changing`
        )}
        ${allowManage
          ? this.renderPermissionInput(
              isReadonly,
              isDelete,
              key,
              value,
              LISTSERVER_ACCESS_MANAGE,
              html`Manage &ndash; can create, edit and delete`
            )
          : nothing}
      </fieldset>
    `;
  }

  private renderPermissionInput(
    isReadonly: boolean,
    isDelete: boolean,
    key: keyof this,
    value: ListserverAccess,
    access: ListserverAccess,
    title: RenderResult
  ): RenderResult {
    return html`
      <label>
        <input
          type="radio"
          name="${key}"
          value="${access}"
          checked="${value === access || nothing}"
          @change="${this.bindAccess(key)}"
          readonly="${isReadonly || nothing}"
          disabled="${isDelete || this.admin || nothing}"
        />
        ${title}
      </label>
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

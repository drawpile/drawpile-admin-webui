// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { RenderResult } from "../element";
import {
  LISTSERVER_ACCESS_MANAGE,
  LISTSERVER_ACCESS_NONE,
  ListserverAccess,
  ListserverApi,
  ListserverUserResponse,
  ListserverUsersResponse,
} from "./api";
import { ApiResponse } from "../api";
import { Router } from "../router";
import "./sessionkickform";
import {
  Column,
  ColumnDefinition,
  FilterDefinition,
  TablePage,
} from "../table";
import "./userform";
import { killEvent } from "../util";

type Row = ListserverUserResponse;

const COLUMN_DEFINITIONS_VIEW: readonly ColumnDefinition[] = Object.freeze([
  { key: "id", title: "Id", visibility: "hide", sortable: true },
  { key: "name", title: "Name", visibility: "always", sortable: true },
  { key: "role", title: "Role", visibility: "show", sortable: true },
]);

const COLUMN_DEFINITIONS_MANAGE: readonly ColumnDefinition[] = Object.freeze([
  ...COLUMN_DEFINITIONS_VIEW,
  { key: "edit", title: "Edit", visibility: "always", sortable: false },
  { key: "delete", title: "Delete", visibility: "always", sortable: false },
]);

const FILTER_DEFINITIONS: readonly FilterDefinition<Row>[] = Object.freeze([]);

@customElement("listserver-users-page")
export class ListserverUsersPage extends TablePage<Row> {
  @property() api!: ListserverApi;
  @property({ type: Number }) access!: ListserverAccess;
  @state() response: ApiResponse<ListserverUsersResponse> | undefined;
  @state() editDeleteRow: Row | undefined;

  protected override getColumnDefinitions(): readonly ColumnDefinition[] {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return COLUMN_DEFINITIONS_VIEW;
    } else {
      return COLUMN_DEFINITIONS_MANAGE;
    }
  }

  protected override getFilterDefinitions(): readonly FilterDefinition<Row>[] {
    return FILTER_DEFINITIONS;
  }

  protected override getSortColumnStorageKey(): string {
    return "dpadmin:listserver:roles:sort:column";
  }

  protected override getSortDirectionStorageKey(): string {
    return "dpadmin:listserver:roles:sort:direction";
  }

  protected override getColumnVisibilityStorageKey(key: string): string {
    return `dpadmin:listserver:roles:column:${key}`;
  }

  protected override getDefaultSortColumn(): keyof Row & string {
    return "name";
  }

  protected override needRows(): boolean {
    return !this.response;
  }

  protected override async getRows(): Promise<void> {
    try {
      this.response = await this.api.getUsers();
    } catch (e: any) {
      throw this.api.getErrorMessage(e);
    }
  }

  protected override compareRows(sortColumn: Column, a: Row, b: Row): number {
    let va: any = sortColumn.getValue(a);
    let vb: any = sortColumn.getValue(b);
    if (typeof va === "string") {
      va = va.toLowerCase();
    }
    if (typeof vb === "string") {
      vb = vb.toLowerCase();
    }
    if (va < vb) {
      return -1;
    } else if (va > vb) {
      return 1;
    } else {
      const ha = a.name?.toLowerCase();
      const hb = b.name?.toLowerCase();
      return ha < hb ? -1 : ha > hb ? 1 : 0;
    }
  }

  protected override getHeaderColumnClasses(column: Column): string[] {
    return ["listserver-users-column", `listserver-users-column-${column.key}`];
  }

  protected override getColumnClasses(_row: Row, column: Column): string[] {
    return this.getHeaderColumnClasses(column);
  }

  protected override checkPath(): void {
    Router.dispatch(
      this.path,
      ["/", null],
      [
        "/create",
        () => {
          if (this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/users");
          }
        },
      ],
      [
        "/edit",
        () => {
          if (!this.editDeleteRow || this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/users");
          }
        },
      ],
      [
        "/delete",
        () => {
          if (!this.editDeleteRow || this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/userse");
          }
        },
      ],
      [null, () => Router.replace("/listserver/users")]
    );
  }

  private showCreateForm(e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      Router.push("/listserver/users/create");
    }
  }

  private showEditForm(row: Row, e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      this.editDeleteRow = row;
      Router.push("/listserver/users/edit");
    }
  }

  private showDeleteForm(row: Row, e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      this.editDeleteRow = row;
      Router.push("/listserver/users/delete");
    }
  }

  private finishForm(e: Event): void {
    killEvent(e);
    this.editDeleteRow = undefined;
    this.response = undefined;
    this.load();
    Router.push("/listserver/users");
  }

  private cancelForm(e: Event): void {
    killEvent(e);
    this.editDeleteRow = undefined;
    Router.push("/listserver/users");
  }

  override render(): RenderResult {
    if (this.access <= LISTSERVER_ACCESS_NONE) {
      return html`<p>You don't have permission to view users.</p>`;
    } else if (this.path === "/create") {
      return this.renderCreateForm();
    } else if (this.path === "/edit") {
      return this.renderEditDeleteForm(false);
    } else if (this.path === "/delete") {
      return this.renderEditDeleteForm(true);
    } else {
      return this.renderMainPage();
    }
  }

  private renderMainPage(): RenderResult {
    return html`
      <page-controls
        .response=${this.response}
        loading="${this.loading || nothing}"
        error="${this.error}"
        @page-refresh="${this.refresh}"
      ></page-controls>
      <div class="grid">
        ${this.renderColumnVisibilityOptions()} ${this.renderNewUserButton()}
      </div>
      ${this.renderTable(this.response?.result)}
    `;
  }

  private renderNewUserButton(): RenderResult {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return html`<div></div>`;
    } else {
      return html`<button @click="${this.showCreateForm}">New user…</button>`;
    }
  }

  private renderCreateForm(): RenderResult {
    return html`
      <listserver-user-form
        .api=${this.api}
        @finish="${this.finishForm}"
        @cancel="${this.cancelForm}"
      ></listserver-user-form>
    `;
  }

  private renderEditDeleteForm(deletion: boolean): RenderResult {
    if (this.editDeleteRow) {
      const { id, name, role } = this.editDeleteRow;
      return html`
        <listserver-user-form
          .api=${this.api}
          existingId="${id}"
          name="${name}"
          role="${role}"
          deletion="${deletion || nothing}"
          @finish="${this.finishForm}"
          @cancel="${this.cancelForm}"
        ></listserver-user-form>
      `;
    } else {
      return nothing;
    }
  }

  renderColumnValueEdit(row: Row): RenderResult {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return nothing;
    } else {
      return html`<button @click="${this.showEditForm.bind(this, row)}">
        Edit
      </button>`;
    }
  }

  renderColumnValueDelete(row: Row): RenderResult {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return nothing;
    } else {
      return html`<button
        class="secondary"
        @click="${this.showDeleteForm.bind(this, row)}"
      >
        Delete
      </button>`;
    }
  }
}

// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { RenderResult } from "../element";
import {
  LISTSERVER_ACCESS_MANAGE,
  LISTSERVER_ACCESS_NONE,
  ListserverAccess,
  ListserverApi,
  ListserverHostBanResponse,
  ListserverHostBansResponse,
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
import "./hostbanform";
import { formatDate, killEvent } from "../util";

type Row = ListserverHostBanResponse;

const COLUMN_DEFINITIONS_VIEW: readonly ColumnDefinition[] = Object.freeze([
  { key: "id", title: "Id", visibility: "hide", sortable: true },
  { key: "host", title: "Host", visibility: "always", sortable: true },
  { key: "expires", title: "Expires", visibility: "show", sortable: true },
  { key: "active", title: "Status", visibility: "hide", sortable: true },
  { key: "notes", title: "Notes", visibility: "show", sortable: true },
]);

const COLUMN_DEFINITIONS_MANAGE: readonly ColumnDefinition[] = Object.freeze([
  ...COLUMN_DEFINITIONS_VIEW,
  { key: "edit", title: "Edit", visibility: "always", sortable: false },
  { key: "delete", title: "Delete", visibility: "always", sortable: false },
]);

const FILTER_DEFINITIONS: readonly FilterDefinition<Row>[] = Object.freeze([
  {
    title: "Expired",
    storageKey: "dpadmin:listserver:sessions:filter:expired",
    defaultActive: true,
    inverted: true,
    predicate: (row: Row) => !row.active,
  },
]);

function extractExpiresDate(expires: string): string | undefined {
  const match = /^([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(expires);
  return match ? match[1]! : undefined;
}

@customElement("listserver-hostbans-page")
export class ListserverHostBansPage extends TablePage<Row> {
  @property() api!: ListserverApi;
  @property({ type: Number }) access!: ListserverAccess;
  @state() response: ApiResponse<ListserverHostBansResponse> | undefined;
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
    return "dpadmin:listserver:hostbans:sort:column";
  }

  protected override getSortDirectionStorageKey(): string {
    return "dpadmin:listserver:hostbans:sort:direction";
  }

  protected override getColumnVisibilityStorageKey(key: string): string {
    return `dpadmin:listserver:hostbans:column:${key}`;
  }

  protected override getDefaultSortColumn(): keyof Row & string {
    return "host";
  }

  protected override needRows(): boolean {
    return !this.response;
  }

  protected override async getRows(): Promise<void> {
    try {
      this.response = await this.api.getHostBans();
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
      const ha = a.host?.toLowerCase();
      const hb = b.host?.toLowerCase();
      return ha < hb ? -1 : ha > hb ? 1 : 0;
    }
  }

  protected override getRowClasses(row: Row): string[] {
    const classList = [];
    if (!row.active) {
      classList.push("faded");
    }
    return classList;
  }

  protected override getHeaderColumnClasses(column: Column): string[] {
    return [
      "listserver-hostbans-column",
      `listserver-hostbans-column-${column.key}`,
    ];
  }

  protected override getColumnClasses(_row: Row, column: Column): string[] {
    return this.getHeaderColumnClasses(column);
  }

  constructor() {
    super();
  }

  protected override checkPath(): void {
    Router.dispatch(
      this.path,
      ["/", null],
      [
        "/create",
        () => {
          if (this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/hostbans");
          }
        },
      ],
      [
        "/edit",
        () => {
          if (!this.editDeleteRow || this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/hostbans");
          }
        },
      ],
      [
        "/delete",
        () => {
          if (!this.editDeleteRow || this.access < LISTSERVER_ACCESS_MANAGE) {
            Router.replace("/listserver/hostbans");
          }
        },
      ],
      [null, () => Router.replace("/listserver/hostbans")]
    );
  }

  private showCreateForm(e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      Router.push("/listserver/hostbans/create");
    }
  }

  private showEditForm(row: Row, e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      this.editDeleteRow = row;
      Router.push("/listserver/hostbans/edit");
    }
  }

  private showDeleteForm(row: Row, e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      this.editDeleteRow = row;
      Router.push("/listserver/hostbans/delete");
    }
  }

  private finishForm(e: Event): void {
    killEvent(e);
    this.editDeleteRow = undefined;
    this.response = undefined;
    this.load();
    Router.push("/listserver/hostbans");
  }

  private cancelForm(e: Event): void {
    killEvent(e);
    this.editDeleteRow = undefined;
    Router.push("/listserver/hostbans");
  }

  override render(): RenderResult {
    if (this.access <= LISTSERVER_ACCESS_NONE) {
      return html`<p>You don't have permission to view hostbans.</p>`;
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
        ${this.renderColumnVisibilityOptions()} ${this.renderFilterOptions()}
        ${this.renderNewBanButton()}
      </div>
      ${this.renderTable(this.response?.result)}
    `;
  }

  private renderNewBanButton(): RenderResult {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return html`<div></div>`;
    } else {
      return html`<button @click="${this.showCreateForm}">New ban…</button>`;
    }
  }

  private renderCreateForm(): RenderResult {
    return html`
      <listserver-hostban-form
        .api=${this.api}
        @finish="${this.finishForm}"
        @cancel="${this.cancelForm}"
      ></listserver-hostban-form>
    `;
  }

  private renderEditDeleteForm(deletion: boolean): RenderResult {
    if (this.editDeleteRow) {
      const { id, host, expires, notes } = this.editDeleteRow;
      return html`
        <listserver-hostban-form
          .api=${this.api}
          existingId="${id}"
          host="${host}"
          expires="${extractExpiresDate(expires)}"
          notes="${notes}"
          deletion="${deletion || nothing}"
          @finish="${this.finishForm}"
          @cancel="${this.cancelForm}"
        ></listserver-hostban-form>
      `;
    } else {
      return nothing;
    }
  }

  renderColumnValueExpires(row: Row): RenderResult {
    const { expires } = row;
    const date = extractExpiresDate(expires);
    return date ? formatDate(new Date(date)) : expires;
  }

  renderColumnValueActive(row: Row): RenderResult {
    return row.active ? "active" : "expired";
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

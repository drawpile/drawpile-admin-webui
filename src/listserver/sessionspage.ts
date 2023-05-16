// SPDX-License-Identifier: MIT
import { PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { RenderResult } from "../element";
import {
  LISTSERVER_ACCESS_MANAGE,
  LISTSERVER_ACCESS_NONE,
  ListserverAccess,
  ListserverApi,
  ListserverSessionResponse,
  ListserverSessionsResponse,
} from "./api";
import { ApiResponse } from "../api";
import { Router } from "../router";
import {
  Column,
  ColumnDefinition,
  FilterDefinition,
  TablePage,
} from "../table";
import "./sessionkickform";
import { killEvent } from "../util";

type Row = ListserverSessionResponse;

const COLUMN_DEFINITIONS_VIEW: readonly ColumnDefinition[] = Object.freeze([
  {
    key: "flags",
    title: html`<span title="Flags">🗝️🔒🔞🚪</span>`,
    visibility: "always",
    sortable: false,
  },
  { key: "id", title: "Id", visibility: "hide", sortable: true },
  {
    key: "sessionid",
    title: "Session Id",
    visibility: "hide",
    sortable: true,
  },
  {
    key: "roomcode",
    title: "Room code",
    visibility: "hide",
    sortable: true,
  },
  { key: "alias", title: "Alias", visibility: "hide", sortable: true },
  {
    key: "title",
    title: "Title",
    visibility: "always",
    sortable: true,
    getter: ({ error, title }: Row): string => error || title,
  },
  { key: "host", title: "Server", visibility: "show", sortable: true },
  { key: "port", title: "Port", visibility: "hide", sortable: true },
  {
    key: "protocol",
    title: "Protocol",
    visibility: "hide",
    sortable: true,
  },
  {
    key: "clientip",
    title: "Client IP",
    visibility: "hide",
    sortable: true,
  },
  { key: "owner", title: "Started by", visibility: "show", sortable: true },
  { key: "users", title: "Users", visibility: "show", sortable: true },
  { key: "started", title: "Started", visibility: "hide", sortable: true },
  {
    key: "lastactive",
    title: "Updated",
    visibility: "hide",
    sortable: true,
  },
  {
    key: "status",
    title: "Status",
    visibility: "show",
    sortable: true,
    getter: ({ error, included, unlisted }: Row): string => {
      if (error) {
        return "error";
      } else if (included) {
        return "included";
      } else if (unlisted) {
        return "unlisted";
      } else {
        return "listed";
      }
    },
  },
  {
    key: "unlistreason",
    title: "Unlist reason",
    visibility: "hide",
    sortable: true,
  },
]);

const COLUMN_DEFINITIONS_MANAGE: readonly ColumnDefinition[] = Object.freeze([
  ...COLUMN_DEFINITIONS_VIEW,
  {
    key: "select",
    title: html`<input type="checkbox" disabled />`,
    visibility: "always",
    sortable: false,
  },
]);

const FILTER_DEFINITIONS: readonly FilterDefinition<Row>[] = Object.freeze([
  {
    title: "Unlisted",
    storageKey: "dpadmin:listserver:sessions:filter:unlisted",
    defaultActive: true,
    inverted: true,
    predicate: (row: Row) => row.unlisted,
  },
  {
    title: "Included",
    storageKey: "dpadmin:listserver:sessions:filter:included",
    defaultActive: true,
    predicate: (row: Row) => row.included,
  },
  {
    title: "Errors",
    storageKey: "dpadmin:listserver:sessions:filter:error",
    defaultActive: true,
    predicate: (row: Row) => row.error,
  },
  {
    title: "Private",
    storageKey: "dpadmin:listserver:sessions:filter:private",
    defaultActive: true,
    predicate: (row: Row) => row.private,
  },
  {
    title: "Password",
    storageKey: "dpadmin:listserver:sessions:filter:password",
    defaultActive: true,
    predicate: (row: Row) => row.password,
  },
]);

@customElement("listserver-sessions-page")
export class ListserverSessionsPage extends TablePage<Row> {
  @property() api!: ListserverApi;
  @property({ type: Number }) access!: ListserverAccess;
  @state() response: ApiResponse<ListserverSessionsResponse> | undefined;
  @state() selectedIds: Set<number> = new Set();
  @state() sessionsToKick: Row[] = [];

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
    return "dpadmin:listserver:sessions:sort:column";
  }

  protected override getSortDirectionStorageKey(): string {
    return "dpadmin:listserver:sessions:sort:direction";
  }

  protected override getColumnVisibilityStorageKey(key: string): string {
    return `dpadmin:listserver:sessions:column:${key}`;
  }

  protected override getDefaultSortColumn(): keyof Row & string {
    return "host";
  }

  protected override needRows(): boolean {
    return !this.response;
  }

  protected override async getRows(): Promise<void> {
    try {
      this.response = await this.api.getSessions();
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
      const ta = a.title?.toLowerCase();
      const tb = b.title?.toLowerCase();
      if (ta < tb) {
        return -1;
      } else if (ta > tb) {
        return 1;
      } else {
        const ha = a.host?.toLowerCase();
        const hb = b.host?.toLowerCase();
        return ha < hb ? -1 : ha > hb ? 1 : 0;
      }
    }
  }

  protected override getRowClasses(row: Row): string[] {
    const { unlisted, error } = row;
    const classList = [];
    if (unlisted) {
      classList.push("faded");
    }
    if (error) {
      classList.push("error");
    }
    return classList;
  }

  protected override getHeaderColumnClasses(column: Column): string[] {
    return [
      "listserver-sessions-column",
      `listserver-sessions-column-${column.key}`,
    ];
  }

  protected override getColumnClasses(_row: Row, column: Column): string[] {
    return this.getHeaderColumnClasses(column);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("response")) {
      this.fixUpSelectedSessionIds();
    }
  }

  private fixUpSelectedSessionIds(): void {
    if (this.selectedIds.size !== 0) {
      const availableIds = new Set<number>();
      for (const { id, unlisted } of this.response?.result || []) {
        if (!unlisted) {
          availableIds.add(id);
        }
      }

      for (const id of [...this.selectedIds]) {
        if (!availableIds.has(id)) {
          this.selectedIds.delete(id);
        }
      }
    }
  }

  protected override checkPath(): void {
    Router.dispatch(
      this.path,
      [
        "/",
        (): void => {
          if (this.sessionsToKick.length !== 0) {
            this.sessionsToKick = [];
          }
        },
      ],
      [
        "/kick",
        (): void => {
          if (this.sessionsToKick.length === 0) {
            Router.replace("/listserver/sessions");
          }
        },
      ],
      [null, () => Router.replace("/listserver/sessions")]
    );
  }

  private toggleSelected({ id }: ListserverSessionResponse, e: Event): void {
    killEvent(e);
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
    this.requestUpdate();
  }

  private showKickPage(e: Event): void {
    killEvent(e);
    if (this.access >= LISTSERVER_ACCESS_MANAGE) {
      const sessions: ListserverSessionResponse[] = [];
      for (const session of this.response!.result) {
        if (this.selectedIds.has(session.id)) {
          sessions.push(session);
        }
      }
      this.sessionsToKick = sessions;
      if (this.sessionsToKick.length !== 0) {
        Router.push("/listserver/sessions/kick");
      }
    }
  }

  private finishKick(e: Event): void {
    killEvent(e);
    this.sessionsToKick = [];
    this.response = undefined;
    this.load();
    Router.push("/listserver/sessions");
  }

  private cancelKick(e: Event): void {
    killEvent(e);
    this.sessionsToKick = [];
    Router.push("/listserver/sessions");
  }

  override render(): RenderResult {
    if (this.access <= LISTSERVER_ACCESS_NONE) {
      return html`<p>You don't have permission to view sessions.</p>`;
    } else if (this.sessionsToKick.length !== 0) {
      return this.renderKickPage();
    } else {
      return this.renderMainPage();
    }
  }

  private renderMainPage(): RenderResult {
    return html`
      <page-controls
        autorefreshkey="dpadmin:listserver:sessions:refresh"
        .response=${this.response}
        loading="${this.loading || nothing}"
        error="${this.error}"
        @page-refresh="${this.refresh}"
      ></page-controls>
      <div class="grid">
        ${this.renderColumnVisibilityOptions()} ${this.renderFilterOptions()}
        ${this.renderKickButton()}
      </div>
      ${this.renderSessionTable(this.response?.result)}
    `;
  }

  private renderKickPage(): RenderResult {
    return html`
      <listserver-session-kick-form
        .api=${this.api}
        .sessions=${this.sessionsToKick}
        @finish="${this.finishKick}"
        @cancel="${this.cancelKick}"
      ></listserver-session-kick-form>
      ${this.renderSessionTable(this.sessionsToKick)}
    `;
  }

  private renderSessionTable(rows?: Row[]): RenderResult {
    return html`
      ${this.renderTable(rows)}
      <small>
        <dl class="legend">
          <dt>🗝️</dt>
          <dd>Private (room code only)</dd>
          <dt>🔒</dt>
          <dd>Password</dd>
          <dt>🔞</dt>
          <dd>Not suitable for minors (NSFM)</dd>
          <dt>🚪</dt>
          <dd>Closed (block new logins)</dd>
        </dl>
      </small>
    `;
  }

  private renderKickButton(): RenderResult {
    if (this.access < LISTSERVER_ACCESS_MANAGE) {
      return html`<div></div>`;
    } else {
      const count = this.selectedIds.size;
      return html`
        <button
          disabled="${count === 0 || nothing}"
          @click="${this.showKickPage}"
        >
          Unlist ${count === 0 ? nothing : count} selected…
        </button>
      `;
    }
  }

  renderColumnValueFlags(row: Row): RenderResult {
    const { password, nsfm, private: roomCodeOnly, closed } = row;
    const flags: RenderResult[] = [];
    if (roomCodeOnly) {
      flags.push(html`<span title="Private (room code only)">🗝️</span>`);
    }
    if (password) {
      flags.push(html`<span title="Password">🔒</span>`);
    }
    if (nsfm) {
      flags.push(html`<span title="Not suitable for minors (NSFM)">🔞</span>`);
    }
    if (closed) {
      flags.push(html`<span title="Closed (block new logins)">🚪</span>`);
    }
    return flags;
  }

  renderColumnValueUsers(row: Row): RenderResult {
    const { users, maxusers } = row;
    if (maxusers !== undefined && maxusers > 0) {
      return `${users}/${maxusers}`;
    } else {
      return `${users}`;
    }
  }

  renderColumnValueUnlistreason(session: Row): RenderResult {
    if (session.unlisted) {
      const className = session.kicked
        ? "listserver-sessions-unlist-reason-kicked"
        : session.timedout
        ? "listserver-sessions-unlist-reason-timedout"
        : "listserver-sessions-unlist-reason-unlisted";
      return html`<span class="${className}">${session.unlistreason}</span>`;
    } else {
      return nothing;
    }
  }

  renderColumnValueSelect(row: Row): RenderResult {
    const { unlisted, included } = row;
    if (this.access < LISTSERVER_ACCESS_MANAGE || unlisted || included) {
      return nothing;
    } else {
      return html`<input
        type="checkbox"
        checked="${this.selectedIds.has(row.id) || nothing}"
        disabled="${this.path === "/kick" || nothing}"
        @change="${this.toggleSelected.bind(this, row)}"
      /> `;
    }
  }
}

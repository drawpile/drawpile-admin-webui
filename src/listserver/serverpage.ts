// SPDX-License-Identifier: MIT
import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpilePageElement, RenderResult } from "../element";
import { ListserverApi, ListserverRootResponse, accessToString } from "./api";
import { ApiResponse } from "../api";
import { Router } from "../router";
import { killEvent } from "../util";

@customElement("listserver-server-page")
export class ListserverServerPage extends DrawpilePageElement {
  @property() api!: ListserverApi;
  @property() rootResponse!: ApiResponse<ListserverRootResponse>;
  @state() loading: boolean = false;
  @state() error: string = "";

  protected override checkPath(): void {
    Router.dispatch(
      this.path,
      ["/", null],
      [null, () => Router.replace("/listserver/server")]
    );
  }

  private refresh(e: Event): void {
    killEvent(e);
    if (!this.loading) {
      this.loading = true;
      this.error = "";
      this.api
        .getRoot()
        .then((response: ApiResponse<ListserverRootResponse>): void => {
          this.rootResponse = response;
          this.emit("updaterootresponse", response);
        })
        .catch((reason: any): void => {
          this.error = this.api.getErrorMessage(reason);
        })
        .finally((): void => {
          this.loading = false;
        });
    }
  }

  override render(): RenderResult {
    return html`
      <page-controls
        .response=${this.rootResponse}
        loading="${this.loading || nothing}"
        error="${this.error}"
        @page-refresh="${this.refresh}"
      ></page-controls>
      <div class="grid">
        ${this.renderServer()} ${this.renderConfig()} ${this.renderUser()}
      </div>
    `;
  }

  private renderServer(): RenderResult {
    const {
      api_name: apiName,
      version,
      name,
      description,
      favicon,
      read_only: readOnly,
      public: allowPublic,
      private: allowPrivate,
    } = this.rootResponse.result.server;
    const faviconImage = favicon
      ? html`<a href="${favicon}" target="_blank">
          <img class="favicon" src="${favicon}" alt="Favicon" />
        </a>`
      : "none";
    return html`
      <div>
        <hgroup>
          <h3>Info</h3>
          <h4>Public server information.</h4>
        </hgroup>
        <dl>
          <dt>Name:</dt>
          <dd>${name}</dd>
          <dt>API:</dt>
          <dd>${apiName}</dd>
          <dt>Version:</dt>
          <dd>${version}</dd>
          <dt>Mode:</dt>
          <dd>${readOnly ? "read-only" : "read-write"}</dd>
          <dt>Public listings:</dt>
          <dd>${allowPublic ? "allowed" : "disallowed"}</dd>
          <dt>Private listings:</dt>
          <dd>${allowPrivate ? "allowed" : "disallowed"}</dd>
          <dt>Favicon:</dt>
          <dd class="no-inline">${faviconImage}</dd>
          <dt>Description:</dt>
          <dd class="no-inline">${description}</dd>
        </dl>
      </div>
    `;
  }

  private renderConfig(): RenderResult {
    const {
      checkserver,
      maxsessionsperhost,
      maxsessionspernamedhost,
      sessiontimeout,
    } = this.rootResponse.result.config;
    return html`
      <div>
        <hgroup>
          <h3>Configuration</h3>
          <h4>Server-side settings.</h4>
        </hgroup>
        <dl>
          <dt>Check reachability:</dt>
          <dd>${checkserver ? "yes" : "no"}</dd>
          <dt>IP session limit:</dt>
          <dd>${maxsessionsperhost}</dd>
          <dt>Host session limit:</dt>
          <dd>${maxsessionspernamedhost}</dd>
          <dt>Session timeout:</dt>
          <dd>${sessiontimeout} Minutes</dd>
          <dt>Allowed protocols:</dt>
          <dd>${this.renderProtocolWhitelist()}</dd>
        </dl>
      </div>
    `;
  }

  private renderProtocolWhitelist(): RenderResult {
    const ps = this.rootResponse.result.config.protocolwhitelist;
    return html`
      <ul>
        ${ps.map((p: string): RenderResult => html`<li>${p}</li>`)}
      </ul>
    `;
  }

  private renderUser(): RenderResult {
    const { id, name, admin, permissions } = this.rootResponse.result.user;
    return html`
      <div>
        <hgroup>
          <h3>User</h3>
          <h4>What you're logged in as.</h4>
        </hgroup>
        <dl>
          <dt>Id:</dt>
          <dd>#${id}</dd>
          <dt>Name:</dt>
          <dd>${name}</dd>
          <dt>Type:</dt>
          <dd>${admin ? "Administrator" : "User"}</dd>
          <dt>Permissions:</dt>
          <dd>
            <dl>
              <dt>Sessions:</dt>
              <dd>${accessToString(permissions.sessions, admin)}</dd>
              <dt>Bans:</dt>
              <dd>${accessToString(permissions.hostbans, admin)}</dd>
              <dt>Roles:</dt>
              <dd>${accessToString(permissions.roles, admin)}</dd>
              <dt>Users:</dt>
              <dd>${accessToString(permissions.users, admin)}</dd>
            </dl>
          </dd>
        </dl>
      </div>
    `;
  }
}

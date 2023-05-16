// SPDX-License-Identifier: MIT
import { PropertyValues, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "./element";
import { ApiResponse } from "./api";
import { killEvent } from "./util";

@customElement("page-controls")
export class PageControls extends DrawpileElement {
  @property() response?: ApiResponse<any>;
  @property({ type: Boolean }) loading?: boolean = false;
  @property() autoRefreshKey: string = "";
  @property() error?: string;
  @state() autoRefreshSeconds: number = 0;
  private timeoutId?: number;
  private lastRefresh?: number;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.autoRefreshKey !== "") {
      const s = localStorage.getItem(this.autoRefreshKey);
      if (s && s !== "") {
        this.autoRefreshSeconds = parseInt(s, 10);
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.killTimeout();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has("response") || changedProperties.has("loading")) {
      this.autoRefresh();
    }
  }

  private refresh(): void {
    this.killTimeout();
    if (this.response && !this.loading) {
      this.lastRefresh = Date.now();
      this.emit("page-refresh");
    }
  }

  private setAutoRefresh(e: Event) {
    killEvent(e);
    this.killTimeout();
    this.autoRefreshSeconds = parseInt(
      (e.target as HTMLSelectElement).value,
      10
    );
    localStorage.setItem(this.autoRefreshKey, `${this.autoRefreshSeconds}`);
    this.autoRefresh();
  }

  private autoRefresh(): void {
    if (
      this.autoRefreshSeconds > 0 &&
      this.timeoutId === undefined &&
      !this.loading
    ) {
      const lastTimestamp = Math.max(
        this.response?.responseTimestamp || 0,
        this.lastRefresh || 0
      );
      const timeout =
        this.autoRefreshSeconds * 1000 + lastTimestamp - Date.now();
      if (timeout > 0) {
        this.timeoutId = setTimeout(this.timedOut.bind(this), timeout);
      } else {
        this.refresh();
      }
    }
  }

  private timedOut(): void {
    delete this.timeoutId;
    // Most browsers only trigger animation frames when the tab is visible, so
    // we take that detour to avoid pointless refreshes while nobody's looking.
    requestAnimationFrame(this.refresh.bind(this));
  }

  private killTimeout(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      delete this.timeoutId;
    }
  }

  protected override render(): RenderResult {
    return html`
      ${this.renderError()}
      <section class="grid">
        <button
          @click="${this.refresh}"
          disabled="${this.loading || nothing}"
          aria-busy="${this.loading || nothing}"
        >
          ${this.loading ? "Loading…" : "Refresh"}
        </button>
        ${this.renderAutoRefresh()}
        <div class="input-padded">${this.renderLastUpdated()}</div>
      </section>
    `;
  }

  private renderError(): RenderResult {
    if (this.error) {
      return html` <p class="error"><strong>Error:</strong> ${this.error}</p> `;
    } else {
      return nothing;
    }
  }

  private renderLastUpdated(): RenderResult {
    if (this.response) {
      return html`Last updated ${this.response.formatResponseTimestamp()}.`;
    } else {
      return nothing;
    }
  }

  private renderAutoRefresh(): RenderResult {
    if (this.autoRefreshKey !== "") {
      return html`
        <select @change="${this.setAutoRefresh}">
          ${this.renderAutoRefreshOption(0, "Manual refresh")}
          ${this.renderAutoRefreshOption(10, "Refresh every 10 seconds")}
          ${this.renderAutoRefreshOption(30, "Refresh every 30 seconds")}
          ${this.renderAutoRefreshOption(60, "Refresh every 1 minute")}
          ${this.renderAutoRefreshOption(120, "Refresh every 2 minutes")}
          ${this.renderAutoRefreshOption(300, "Refresh every 5 minutes")}
          ${this.renderAutoRefreshOption(600, "Refresh every 10 minutes")}
        </select>
      `;
    } else {
      return nothing;
    }
  }

  private renderAutoRefreshOption(value: number, title: string): RenderResult {
    return html`
      <option
        value="${value}"
        selected="${this.autoRefreshSeconds == value || nothing}"
      >
        ${title}
      </option>
    `;
  }
}

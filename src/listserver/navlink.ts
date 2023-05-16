// SPDX-License-Identifier: MIT
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { DrawpileElement, RenderResult } from "../element";

@customElement("listserver-navlink")
export class ListserverNavlink extends DrawpileElement {
  @property() path!: string;
  @property() href!: string;
  @property() label!: string;

  override render(): RenderResult {
    const isCurrent = this.path.startsWith(this.href);
    return html`
      <a
        href="#/listserver${this.href}"
        role="button"
        class="secondary${isCurrent ? "" : " outline"}"
      >
        ${this.label}
      </a>
    `;
  }
}

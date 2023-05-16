// SPDX-License-Identifier: MIT
import { TemplateResult, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DrawpileElement } from "./element";
import { killEvent } from "./util";

@customElement("top-bar")
export class TopBar extends DrawpileElement {
  private htmlElement!: HTMLElement;
  @property() logo!: string;
  @state() theme: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.htmlElement = document.querySelector("html")!;
    const storedTheme = localStorage.getItem("dpadmin:theme") || "dark";
    this.setTheme(storedTheme == "light" ? "light" : "dark");
  }

  private toggleTheme(e: Event): void {
    killEvent(e);
    this.setTheme(this.theme === "dark" ? "light" : "dark");
  }

  private setTheme(theme: string): void {
    this.htmlElement.dataset["theme"] = theme;
    this.theme = theme;
    localStorage.setItem("dpadmin:theme", theme);
  }

  override render(): TemplateResult {
    return html`
      <nav>
        <ul>
          <li>
            <a class="uncolored" href="#/">
              <img src="${this.logo}" alt="Logo" />
              Drawpile Admin
            </a>
          </li>
        </ul>
        <ul>
          <li>
            <a
              href="#"
              role="button"
              class="contrast"
              @click="${this.toggleTheme}"
            >
              Switch to ${this.theme === "light" ? "Dark" : "Light"} Mode
            </a>
          </li>
        </ul>
      </nav>
    `;
  }
}

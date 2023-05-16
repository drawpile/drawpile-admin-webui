// SPDX-License-Identifier: MIT
import { DrawpilePageElement, RenderResult } from "./element";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { killEvent, ucfirst } from "./util";

function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key);
  return value === null || value === undefined ? defaultValue : (value as T);
}

export type ColumnDefinition = {
  readonly key: string;
  readonly title: RenderResult;
  readonly visibility: "always" | "show" | "hide";
  readonly sortable: boolean;
  readonly getter?: (row: any) => any;
};

export class Column {
  private readonly def: ColumnDefinition;
  private hidden: boolean;

  get key(): string {
    return this.def.key;
  }

  get title(): RenderResult {
    return this.def.title;
  }

  get sortable(): boolean {
    return this.def.sortable;
  }

  get alwaysVisible(): boolean {
    return this.def.visibility === "always";
  }

  get defaultVisible(): boolean {
    return this.def.visibility !== "hide";
  }

  get visible(): boolean {
    return this.alwaysVisible || !this.hidden;
  }

  set visible(visible: boolean) {
    this.hidden = !visible;
  }

  private get renderColumnName(): string {
    return `renderColumnValue${ucfirst(this.def.key)}`;
  }

  constructor(def: ColumnDefinition) {
    this.def = def;
    this.hidden = def.visibility === "hide";
  }

  getValue(row: any, renderer?: any): any {
    if (renderer) {
      const renderFunction = renderer[this.renderColumnName];
      if (renderFunction) {
        return renderFunction.bind(renderer)(row);
      }
    }

    const getter = this.def.getter;
    if (getter) {
      return getter(row);
    }

    return row[this.key];
  }
}

export type FilterDefinition<T> = {
  readonly title: RenderResult;
  readonly storageKey: string;
  readonly defaultActive?: boolean;
  readonly inverted?: boolean;
  readonly predicate: (row: T) => any;
};

export class Filter<T> {
  private readonly def: FilterDefinition<T>;
  readonly index: number;
  active: boolean = false;

  get title(): RenderResult {
    return this.def.title;
  }

  get storageKey(): string {
    return this.def.storageKey;
  }

  get checked(): boolean {
    return this.def.inverted ? !this.active : this.active;
  }

  set checked(value: boolean) {
    this.active = this.def.inverted ? !value : value;
  }

  get defaultChecked(): boolean {
    const defaultActive = this.def.defaultActive;
    return this.def.inverted ? !defaultActive : !!defaultActive;
  }

  constructor(def: FilterDefinition<T>, index: number) {
    this.def = def;
    this.index = index;
    this.active = !!this.def.defaultActive;
  }

  apply(row: T): boolean {
    if (this.def.inverted) {
      return !this.active || !this.def.predicate(row);
    } else {
      return this.active || !this.def.predicate(row);
    }
  }
}

export type SortDirection = "asc" | "desc";

export abstract class TablePage<T> extends DrawpilePageElement {
  @state() columns!: Column[];
  @state() filters!: Filter<T>[];
  @state() sortColumn!: keyof T & string;
  @state() sortDirection!: SortDirection;
  @state() loading: boolean = false;
  @state() error: string = "";

  protected abstract getColumnDefinitions(): readonly ColumnDefinition[];
  protected abstract getFilterDefinitions(): readonly FilterDefinition<T>[];
  protected abstract getSortColumnStorageKey(): string;
  protected abstract getSortDirectionStorageKey(): string;
  protected abstract getColumnVisibilityStorageKey(key: string): string;
  protected abstract getDefaultSortColumn(): keyof T & string;
  protected abstract needRows(): boolean;
  protected abstract getRows(): Promise<void>;
  protected abstract compareRows(sortColumn: Column, a: T, b: T): number;

  protected getHeaderColumnClasses(_column: Column): string[] {
    return [];
  }

  protected getRowClasses(_row: T): string[] {
    return [];
  }

  protected getColumnClasses(_row: T, _column: Column): string[] {
    return [];
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.sortColumn = getFromLocalStorage(
      this.getSortColumnStorageKey(),
      this.getDefaultSortColumn()
    );
    this.sortDirection = getFromLocalStorage(
      this.getSortDirectionStorageKey(),
      "asc"
    );

    this.columns = [];
    for (const def of this.getColumnDefinitions()) {
      const column = new Column(def);
      if (!column.alwaysVisible) {
        const visibility = localStorage.getItem(
          this.getColumnVisibilityStorageKey(column.key)
        );
        if (visibility === "show") {
          column.visible = true;
        } else if (visibility === "hide") {
          column.visible = false;
        }
      }
      this.columns.push(column);
    }

    this.filters = [];
    for (const def of this.getFilterDefinitions()) {
      const filter = new Filter(def, this.filters.length);
      this.filters.push(filter);
      const storedValue = getFromLocalStorage(filter.storageKey, undefined);
      if (storedValue === "true") {
        filter.active = true;
      } else if (storedValue === "false") {
        filter.active = false;
      }
    }

    if (this.needRows()) {
      this.load();
    }
  }

  protected refresh(e: Event): void {
    killEvent(e);
    this.load();
  }

  protected async load(): Promise<void> {
    if (!this.loading) {
      this.loading = true;
      this.error = "";
      try {
        await this.getRows();
      } catch (e: any) {
        this.error = `${e}`;
      } finally {
        this.loading = false;
      }
    }
  }

  private resetColumnVisibility(e: Event): void {
    killEvent(e);
    for (const column of this.columns) {
      if (!column.alwaysVisible) {
        this.setColumnVisibility(column, column.defaultVisible);
      }
    }
    this.requestUpdate();
  }

  private toggleColumnVisibility(column: Column, e: Event): void {
    killEvent(e);
    this.setColumnVisibility(column, (e.target as HTMLInputElement).checked);
    this.requestUpdate();
  }

  private setColumnVisibility(column: Column, visible: boolean) {
    column.visible = visible;
    localStorage.setItem(
      this.getColumnVisibilityStorageKey(column.key),
      column.visible ? "show" : "hide"
    );
    // Checkbox state is overly sticky.
    const elem = this.querySelector(
      `#table-column-visibility-${column.key}`
    ) as HTMLInputElement;
    elem.checked = column.visible;
  }

  private toggleSorting({ key, sortable }: Column): void {
    if (sortable) {
      if (this.sortColumn === key) {
        if (this.sortDirection === "asc") {
          this.sortDirection = "desc";
        } else {
          this.sortDirection = "asc";
        }
      } else {
        this.sortColumn = key as keyof T & string;
        this.sortDirection = "asc";
      }
      localStorage.setItem(this.getSortColumnStorageKey(), this.sortColumn);
      localStorage.setItem(
        this.getSortDirectionStorageKey(),
        this.sortDirection
      );
    }
  }

  private resetFilters(e: Event): void {
    killEvent(e);
    for (const filter of this.filters) {
      this.setFilter(filter, filter.defaultChecked);
    }
    this.requestUpdate();
  }

  private toggleFilter(filter: Filter<T>, e: Event): void {
    killEvent(e);
    this.setFilter(filter, (e.target as HTMLInputElement).checked);
    this.requestUpdate();
  }

  private setFilter(filter: Filter<T>, checked: boolean): void {
    filter.checked = checked;
    localStorage.setItem(filter.storageKey, filter.active ? "true" : "false");
    // Checkbox state is overly sticky.
    const elem = this.querySelector(
      `#table-filter-option-${filter.index}`
    ) as HTMLInputElement;
    elem.checked = filter.checked;
  }

  protected renderTable(rows: T[] | undefined): RenderResult {
    return html`
      <figure>
        <table role="grid">
          <thead>
            ${this.renderTableHeader()}
          </thead>
          <tbody>
            ${this.renderTableBody(rows || [], this.filterAndSort(rows))}
          </tbody>
        </table>
      </figure>
    `;
  }

  protected renderColumnVisibilityOptions(): RenderResult {
    return html`
      <details role="list">
        <summary aria-haspopup="listbox">Display columns</summary>
        <ul role="listbox">
          ${this.mapHideableColumns(
            this.renderColumnVisibilityCheckbox.bind(this)
          )}
          <li>
            <a href="#" @click="${this.resetColumnVisibility.bind(this)}">
              Reset display columns
            </a>
          </li>
        </ul>
      </details>
    `;
  }

  private renderColumnVisibilityCheckbox(column: Column): RenderResult {
    return html`
      <li>
        <label>
          <input
            type="checkbox"
            id="table-column-visibility-${column.key}"
            checked="${column.visible || nothing}"
            @change="${this.toggleColumnVisibility.bind(this, column)}"
          />
          ${column.title}
        </label>
      </li>
    `;
  }

  protected renderFilterOptions(): RenderResult {
    return html`
      <details role="list">
        <summary aria-haspopup="listbox">Filters</summary>
        <ul role="listbox">
          ${this.filters.map(this.renderFilterOption.bind(this))}
          <li>
            <a href="#" @click="${this.resetFilters.bind(this)}">
              Reset filters
            </a>
          </li>
        </ul>
      </details>
    `;
  }

  private renderFilterOption(filter: Filter<T>): RenderResult {
    return html`
      <li>
        <label>
          <input
            type="checkbox"
            checked="${filter.checked || nothing}"
            id="table-filter-option-${filter.index}"
            data-checked="${filter.checked ? "true" : "false"}"
            @change="${this.toggleFilter.bind(this, filter)}"
          />
          ${filter.title}
        </label>
      </li>
    `;
  }

  private renderTableHeader(): RenderResult {
    return html`
      <tr>
        ${this.mapVisibleColumns(this.renderHeaderColumn.bind(this))}
      </tr>
    `;
  }

  private renderHeaderColumn(column: Column): RenderResult {
    const { key, title, sortable } = column;

    const classes = [...this.getHeaderColumnClasses(column)];
    if (sortable) {
      classes.push("column-sortable");
    }
    if (this.sortColumn === key) {
      if (this.sortDirection === "asc") {
        classes.push("column-sort-asc");
      } else {
        classes.push("column-sort-desc");
      }
    }

    return html`<th
      scope="col"
      class="${classes.length ? classes.join(" ") : nothing}"
      @click="${sortable ? this.toggleSorting.bind(this, column) : nothing}"
    >
      ${title}
    </th>`;
  }

  private renderTableBody(originalRows: T[], rows: T[]): RenderResult {
    if (rows.length !== 0) {
      return rows.map(this.renderTableRow.bind(this));
    } else {
      const columnCount = this.columns.reduce(
        (count: number, column: Column): number =>
          count + (column.visible ? 1 : 0),
        0
      );
      return html`
        <tr>
          <td colspan="${columnCount}" aria-busy="${this.loading || nothing}">
            ${this.loading
              ? "Loading…"
              : this.error
              ? "An error occurred."
              : originalRows.length
              ? "Everything has been filtered out."
              : "Nothing here."}
          </td>
        </tr>
      `;
    }
  }

  private filterAndSort(rows: T[] | undefined): T[] {
    if (rows?.length) {
      const result = rows.filter(this.filter.bind(this));
      const sortColumn = this.getSortColumn();
      if (sortColumn) {
        const [less, greater] = this.sortDirection == "asc" ? [-1, 1] : [1, -1];
        result.sort((a: T, b: T): number => {
          const result = this.compareRows(sortColumn, a, b);
          return result < 0 ? less : result > 0 ? greater : 0;
        });
      }
      return result;
    } else {
      return [];
    }
  }

  private getSortColumn(): Column | undefined {
    for (const column of this.columns) {
      if (column.key === this.sortColumn) {
        return column;
      }
    }
    return undefined;
  }

  private filter(row: T): boolean {
    for (const filter of this.filters) {
      if (!filter.apply(row)) {
        return false;
      }
    }
    return true;
  }

  private renderTableRow(row: T): RenderResult {
    const classes = this.getRowClasses(row);
    return html`
      <tr class="${classes?.length ? classes.join(" ") : nothing}">
        ${this.mapVisibleColumns(this.renderBodyColumn.bind(this, row))}
      </tr>
    `;
  }

  private renderBodyColumn(row: T, column: Column): RenderResult {
    const classes = this.getColumnClasses(row, column);
    return html`<td class="${classes?.length ? classes.join(" ") : nothing}">
      ${column.getValue(row, this)}
    </td>`;
  }

  private mapVisibleColumns<T>(fn: (column: Column) => T): T[] {
    return this.columns.filter((column: Column) => column.visible).map(fn);
  }

  private mapHideableColumns<T>(fn: (column: Column) => T): T[] {
    return this.columns
      .filter((column: Column) => !column.alwaysVisible)
      .map(fn);
  }
}

import type {
  DataConnectorIntent,
  GetDataTableRequest,
  GetDataTableResponse,
  RenderSelectionUiRequest,
} from "@canva/intents/data";
import { renderInCanva } from "../../app/mount";
import {
  AnnoApiError,
  getDate,
  getDateLectionary,
  getUpcomingSundays,
  getYearCalendar,
} from "../../services/anno-api.mjs";
import { CONFIG } from "../../config.mjs";
import {
  buildDailyHoursTable,
  buildDayDetailsTable,
  buildUpcomingSundaysTable,
  buildYearCalendarTable,
  parseDataSourceRef,
} from "./table-builders.mjs";
import { DataSelectionUi } from "./selection_ui";

function renderSelectionUi(request: RenderSelectionUiRequest) {
  renderInCanva(<DataSelectionUi {...request} />);
}

async function getDataTable({ dataSourceRef, limit, signal }: GetDataTableRequest): Promise<GetDataTableResponse> {
  const query = parseDataSourceRef(dataSourceRef?.source);
  try {
    let dataTable;
    if (query.preset === "upcoming_sundays") {
      const endDate = query.endDate && query.endDate >= query.date ? query.endDate : query.date;
      const list = await getUpcomingSundays(query.date, endDate, { maxRows: limit.row, signal });
      dataTable = buildUpcomingSundaysTable(list, { headerLang: query.headerLang, limit });
    } else if (query.preset === "daily_hours") {
      const lectionary = await getDateLectionary(query.date, { day: query.slug || undefined, signal });
      dataTable = buildDailyHoursTable(lectionary, { headerLang: query.headerLang, limit });
    } else if (query.preset === "year_calendar") {
      const cal = await getYearCalendar(query.year, { signal });
      dataTable = buildYearCalendarTable(cal, { headerLang: query.headerLang, limit });
    } else {
      const resolved = await getDate(query.date, { signal });
      dataTable = buildDayDetailsTable(resolved, { slug: query.slug, headerLang: query.headerLang, limit });
    }

    return {
      status: "completed",
      dataTable,
      metadata: {
        description: "Riihimäen seurakunta — Kirkkovuosi (Anno API)",
        providerInfo: { name: "Anno API", url: CONFIG.annoUrl },
      },
    };
  } catch (err) {
    if (err instanceof AnnoApiError) {
      if (err.code === "NOT_FOUND") return { status: "outdated_source_ref" };
      if (err.code === "NETWORK" || err.code === "TIMEOUT") return { status: "remote_request_failed" };
      return { status: "app_error", message: err.userMessage };
    }
    return { status: "remote_request_failed" };
  }
}

const dataConnector: DataConnectorIntent = {
  getDataTable,
  renderSelectionUi,
};

export default dataConnector;

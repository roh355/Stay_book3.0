import { Injectable } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
  NativeDateAdapter,
} from '@angular/material/core';

/** Material date formats — input field uses dd/mm/yyyy via DmyDateAdapter. */
export const DMY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: null,
    timeInput: null,
  },
  display: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
    timeInput: { hour: 'numeric', minute: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

@Injectable()
export class DmyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    if (displayFormat === DMY_DATE_FORMATS.display.dateInput) {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

export const DMY_DATE_PROVIDERS = [
  { provide: DateAdapter, useClass: DmyDateAdapter },
  { provide: MAT_DATE_FORMATS, useValue: DMY_DATE_FORMATS },
];

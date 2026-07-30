import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Booking, Stay } from './models';

export interface AdminRequests {
  bookings: Booking[];
  stays: Stay[];
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);

  getRequests(): Promise<AdminRequests> {
    return firstValueFrom(this.http.get<AdminRequests>('/api/admin/requests'));
  }

  approve(type: 'bookings' | 'stays', id: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/admin/requests/${type}/${id}/approve`, {}));
  }

  reject(type: 'bookings' | 'stays', id: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`/api/admin/requests/${type}/${id}/reject`, {}));
  }
}

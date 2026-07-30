import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Booking, Floor } from './models';

export interface NewBooking {
  roomId: string;
  date: string;
  startSlot: number;
  endSlot: number;
  topic?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private http = inject(HttpClient);

  floors(): Promise<Floor[]> {
    return firstValueFrom(this.http.get<Floor[]>('/api/conference/floors'));
  }

  onDate(date: string): Promise<Booking[]> {
    return firstValueFrom(
      this.http.get<Booking[]>('/api/bookings', { params: { date } }),
    );
  }

  mine(): Promise<Booking[]> {
    return firstValueFrom(this.http.get<Booking[]>('/api/bookings/mine'));
  }

  create(input: NewBooking): Promise<Booking> {
    return firstValueFrom(this.http.post<Booking>('/api/bookings', input));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/bookings/${id}`));
  }

  pollRejected(): Promise<{bookings: Booking[], stays: any[]}> {
    return firstValueFrom(this.http.get<{bookings: Booking[], stays: any[]}>('/api/bookings/rejected/poll'));
  }
}

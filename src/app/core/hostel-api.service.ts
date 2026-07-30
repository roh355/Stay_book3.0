import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Floor, Stay } from './models';

export interface NewStay {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guest?: string;
}

@Injectable({ providedIn: 'root' })
export class HostelApiService {
  private http = inject(HttpClient);

  floors(): Promise<Floor[]> {
    return firstValueFrom(this.http.get<Floor[]>('/api/hostel/floors'));
  }

  all(): Promise<Stay[]> {
    return firstValueFrom(this.http.get<Stay[]>('/api/stays'));
  }

  mine(): Promise<Stay[]> {
    return firstValueFrom(this.http.get<Stay[]>('/api/stays/mine'));
  }

  create(input: NewStay): Promise<Stay> {
    return firstValueFrom(this.http.post<Stay>('/api/stays', input));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/stays/${id}`));
  }
}

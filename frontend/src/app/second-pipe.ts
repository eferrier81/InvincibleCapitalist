import { Pipe, PipeTransform } from '@angular/core';

/** Formate une durée en millisecondes sous la forme heures:minutes:secondes.dixièmes. */
@Pipe({
  name: 'second',
})
export class SecondPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (ms === null || ms === undefined || Number.isNaN(ms) || ms <= 0) return '0.0s';

    const totalTenths = Math.floor(ms / 100);
    const tenths = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    if (minutes > 0) return `${minutes}:${pad(seconds)}.${tenths}`;
    return `${seconds}.${tenths}s`;
  }
}

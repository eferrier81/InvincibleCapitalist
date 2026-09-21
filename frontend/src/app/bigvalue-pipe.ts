import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formate un grand nombre (argent, score...) en notation compacte : entier
 * en dessous de 1000, puis puissances de 10 à partir du million, avec 4
 * chiffres significatifs (ex : 1.234 10^7).
 */
@Pipe({
  name: 'bigvalue',
})
export class BigvaluePipe implements PipeTransform {
  transform(valeur: number | null | undefined): string {
    if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return '0';

    const sign = valeur < 0 ? '-' : '';
    const abs = Math.abs(valeur);

    let res: string;
    if (abs < 1000) {
      res = abs.toFixed(2);
    } else if (abs < 1000000) {
      res = abs.toFixed(0);
    } else {
      res = abs.toPrecision(4);
      res = res.replace(/e\+(.*)/, ' &times;10<sup>$1</sup>');
    }

    return sign + res;
  }
}

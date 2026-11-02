# Just a Shopping Cart

Alle Shops. Ein Warenkorb. Eine deutschsprachige Wunschlisten-App mit Next.js, TypeScript, offiziellen shadcn/ui-Komponenten (Base UI, Nova) und GSAP.

## Funktionen

- Mehrere Warenkörbe erstellen, umbenennen, wechseln und löschen
- Produktlinks, Namen, Bilder, Einzelpreise und Mengen speichern und bearbeiten
- Gesamtsumme in Euro mit ganzzahliger Cent-Rechnung
- Vorlagen für Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO und IKEA
- Automatischer Import von JSON-LD- und Open-Graph-Produktdaten
- Eigene Links mit manuellen Angaben, auch nach einem fehlgeschlagenen Import
- Suche, Shop-Filter, Sortierung, Raster- und Listenansicht
- Speicherung in Cookies, Export und Import von JSON-Sicherungen
- Responsive Oberfläche und Berücksichtigung reduzierter Bewegung

## Lokal starten

Node.js 22.13 oder neuer verwenden.

```sh
npm ci
npm run dev
```

Im Browser http://localhost:3000 öffnen.

```sh
npm test
npm run build
npm start
```

Für den Betrieb wird ein Node.js-Server benötigt, z. B. ein Next.js-kompatibler Hoster. Ein reiner GitHub-Pages-Export unterstützt den serverseitigen Produktimport nicht. Es sind keine API-Schlüssel oder Datenbank nötig.

## Grenzen des Imports

Der Server ruft ausschließlich HTTPS-Seiten der unterstützten Shop-Domains ab und prüft jede Weiterleitung erneut. Er begrenzt Zeit, Weiterleitungen und Antwortgröße. Er führt kein JavaScript der Shops aus und umgeht keine Captchas, Logins oder Zugriffssperren. Shop-Daten und Verfügbarkeit können sich ändern; ein erfolgreicher Import kann nicht für jeden Link garantiert werden. Kurzlinks wie amzn.to bitte zuerst im Browser öffnen und den direkten Produktlink verwenden.

Wenn ein Shop keine Daten liefert, bleiben alle Felder manuell ausfüllbar. Fehlende oder nicht in EUR angegebene Preise werden nicht als null Euro übernommen. Preise sind Momentaufnahmen; Versand, Gutscheine und spätere Änderungen sind nicht enthalten.

## Cookies und Datenschutz

Warenkörbe werden bis zu einem Jahr in drei Cookies mit jeweils maximal 3.000 Zeichen gespeichert (insgesamt 9.000 URL-kodierte Zeichen). Die Anzahl speicherbarer Produkte hängt von der Länge der Links und Namen ab. Eine zu große Änderung wird vor dem Schreiben abgelehnt. Die App bietet maximal 12 Warenkörbe und 100 Produkte je Warenkorb, innerhalb des Cookie-Limits.

Cookies sind browser- und gerätegebunden. Löschen der Cookies oder privates Browsen kann Daten entfernen. Regelmäßig über Export sichern; Import fügt die Sicherung als neue Warenkörbe hinzu. Produktbilder werden vom jeweiligen Bildanbieter geladen. Beim automatischen Import erhält der Server den eingegebenen Produktlink und fragt den Shop ab. Keine Konten, keine Analyse-Tracker und keine serverseitige Warenkorb-Datenbank.

## Prüfung

`npm test` prüft Preisformatierung, Shop-Erkennung, Importvalidierung, Cookie-Rundlauf und Speicherlimit sowie JSON-LD-/Open-Graph-Extraktion, fehlende Preise, Fremdwährungen und blockierte Produktseiten. Browserprüfung umfasst manuelles Anlegen, Mengen, Neuladen mit Cookie-Wiederherstellung, Suche, Ansichten und mobiles Layout mit reduzierter Bewegung.

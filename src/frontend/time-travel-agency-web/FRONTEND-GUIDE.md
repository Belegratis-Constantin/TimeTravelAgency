# Frontend-Lernguide: Time·Travel Agency (Angular 21)

> Dieser Guide erklärt das Frontend **von außen nach innen**: zuerst wie die App startet, dann wie Daten fließen,
> dann die einzelnen Bausteine (Komponenten, Formulare, Routing, Styling, Tests). Jeder Abschnitt zeigt
> **echten Code aus diesem Projekt**, erklärt *was* er tut, *warum* er so geschrieben ist und welche
> **Alternative / Falle** es gibt. Am Ende jedes großen Kapitels stehen kleine Übungen.
>
> Tipp: Öffne die genannten Dateien parallel im Editor. Pfade sind relativ zu
> `src/frontend/time-travel-agency-web/src/app/`.

---

## Inhaltsverzeichnis

1. [Das große Bild](#1-das-große-bild)
2. [Tooling & Konfiguration](#2-tooling--konfiguration)
3. [Bootstrapping: Wie die App startet](#3-bootstrapping-wie-die-app-startet)
4. [Signals – das Herz der Reaktivität](#4-signals--das-herz-der-reaktivität)
5. [Zoneless & OnPush – warum Signals Pflicht sind](#5-zoneless--onpush--warum-signals-pflicht-sind)
6. [Dependency Injection mit `inject()`](#6-dependency-injection-mit-inject)
7. [Die Schichten: models → services → state → features](#7-die-schichten-models--services--state--features)
8. [HTTP-Services & Fehlerbehandlung](#8-http-services--fehlerbehandlung)
9. [State-Management: die Stores](#9-state-management-die-stores)
10. [RxJS – wo und warum es noch vorkommt](#10-rxjs--wo-und-warum-es-noch-vorkommt)
11. [Komponenten im Detail](#11-komponenten-im-detail)
12. [Die neue Template-Syntax (Control Flow)](#12-die-neue-template-syntax-control-flow)
13. [Routing, Lazy Loading & Guards](#13-routing-lazy-loading--guards)
14. [Typed Reactive Forms](#14-typed-reactive-forms)
15. [Reine Funktionen als Business-Logik (utils)](#15-reine-funktionen-als-business-logik-utils)
16. [Animation, Canvas, SVG & das Mini-Game](#16-animation-canvas-svg--das-mini-game)
17. [Styling: Design Tokens, Utility-Klassen, CSS-Variablen](#17-styling-design-tokens-utility-klassen-css-variablen)
18. [Barrierefreiheit (a11y)](#18-barrierefreiheit-a11y)
19. [Tests mit Vitest](#19-tests-mit-vitest)
20. [TypeScript-Muster, die überall vorkommen](#20-typescript-muster-die-überall-vorkommen)
21. [Ein kompletter Datenfluss zum Nachverfolgen](#21-ein-kompletter-datenfluss-zum-nachverfolgen)
22. [Umdenken: Was man anders macht als in React](#22-umdenken-was-man-anders-macht-als-in-react)
23. [Kritische Anmerkungen & Verbesserungsideen](#23-kritische-anmerkungen--verbesserungsideen)
24. [Glossar](#24-glossar)
25. [Lernpfad & Übungen](#25-lernpfad--übungen)

---

## 1. Das große Bild

Die App ist eine **Single Page Application (SPA)**: Der Browser lädt einmal `index.html` + JavaScript, danach
wechselt Angular die "Seiten" selbst, ohne den Server nach neuem HTML zu fragen. Daten holt sie per HTTP als JSON
vom ASP.NET-Backend.

```
 Browser                                                 Backend (ASP.NET, Port 5000)
┌──────────────────────────────────────────────────┐     ┌─────────────────────────┐
│  Komponenten (features/, shared/components/)     │     │                         │
│        ▲ lesen Signals        │ rufen Methoden   │     │                         │
│        │                      ▼                  │     │                         │
│  Stores (state/)  AgencyStore, ParadoxFeedStore  │     │                         │
│        ▲ setzen Signals       │ abonnieren       │     │                         │
│        │                      ▼                  │     │                         │
│  HTTP-Services (core/services/)  ── /api/* ──────┼────►│  Controller → Services  │
│                                  (Dev-Proxy)     │◄────┼── JSON (DTOs)           │
└──────────────────────────────────────────────────┘     └─────────────────────────┘
```

Die wichtigste Idee: **Daten fließen in eine Richtung.**

1. Ein Store lädt Daten über einen Service und legt sie in **Signals** ab.
2. Komponenten **lesen** diese Signals (oder davon abgeleitete `computed`s) und rendern.
3. Eine Benutzeraktion ruft eine Methode auf (z. B. `book()`), die einen HTTP-Request schickt.
4. Danach sagt die Komponente dem Store `refresh()` → neue Daten → alle Ansichten aktualisieren sich automatisch.

Das nennt man **unidirektionalen Datenfluss**. Er macht die App vorhersagbar: Es gibt genau eine Stelle, an der
die Trips liegen (`AgencyStore.trips`), nicht zehn Kopien in zehn Komponenten.

**Fachlich** gibt es fünf Rollen (Customer, Agent, Manager, Director, Time Itself). Jede Rolle sieht andere Seiten.
Es gibt kein echtes Login – man "wählt" eine Identität aus der Datenbank. Das ist eine bewusste Vereinfachung für
eine Demo-/Lern-App.

---

## 2. Tooling & Konfiguration

### `package.json`

```json
"dependencies": {
  "@angular/common": "^21.2.0", "@angular/core": "^21.2.0", "@angular/forms": "^21.2.0",
  "@angular/platform-browser": "^21.2.0", "@angular/router": "^21.2.0",
  "rxjs": "~7.8.0", "tslib": "^2.3.0"
}
```

Auffällig ist, was **fehlt**:

- **kein `zone.js`** → die App ist *zoneless* (Kapitel 5).
- **kein UI-Framework** (Angular Material, Bootstrap, Tailwind) → das Styling ist komplett selbst gebaut (Kapitel 17).
- **keine State-Library** (NgRx, Akita) → State wird mit einfachen Signal-Services gemacht (Kapitel 9).
- **kein Karma/Jasmine** → Tests laufen mit **Vitest** (Kapitel 19).

Weniger Abhängigkeiten = weniger zu lernen, weniger Updates, kleineres Bundle. Für eine App dieser Größe reicht
das, was Angular selbst mitbringt.

`^21.2.0` bedeutet "21.x.y, mindestens 21.2.0" (keine neue Major-Version). `~7.8.0` bedeutet "7.8.x" (nur Patches).

### `angular.json`

- `"builder": "@angular/build:application"` – der moderne Build auf Basis von **esbuild + Vite** (schnell).
- `"budgets"` – der Build **warnt/scheitert**, wenn das initiale Bundle > 500 kB/1 MB oder eine Komponenten-CSS
  > 8 kB/12 kB ist. Das ist eine eingebaute Qualitätsbremse gegen aufgeblähte Bundles.
- `"outputHashing": "all"` – Dateinamen bekommen einen Hash (`main-AB12CD.js`), damit Browser nach einem Deploy
  nicht alte Dateien aus dem Cache nehmen (**Cache Busting**).
- `"serve" → "proxyConfig": "proxy.conf.json"` – siehe unten.
- `"test" → "builder": "@angular/build:unit-test"` – führt Vitest aus.

### `proxy.conf.json` – warum `/api` ohne Host funktioniert

```json
{ "/api": { "target": "http://localhost:5000", "secure": false, "changeOrigin": true } }
```

Der Dev-Server läuft auf `localhost:4200`, das Backend auf `localhost:5000`. Für den Browser sind das **zwei
verschiedene Origins** – direkte Requests würden an **CORS** scheitern. Der Proxy löst das: Der Browser fragt
`localhost:4200/api/Trip`, der Dev-Server leitet intern an `localhost:5000/api/Trip` weiter. Für den Browser ist
alles "same origin".

Deshalb stehen in den Services nur relative URLs wie `'/api/Trip'` – kein hartkodierter Host.

### `tsconfig.json` – strenger TypeScript-Modus

```json
"strict": true,
"noImplicitOverride": true,
"noPropertyAccessFromIndexSignature": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
...
"angularCompilerOptions": { "strictInjectionParameters": true, "strictInputAccessModifiers": true, "strictTemplates": true }
```

- `strict` aktiviert u. a. `strictNullChecks`: `string | null` muss man explizit behandeln.
- `noPropertyAccessFromIndexSignature`: Bei `Record<string, …>` muss man `errors['required']` statt
  `errors.required` schreiben (siehe `form-field.component.ts`). Das macht sichtbar, dass der Key evtl. nicht existiert.
- `noImplicitOverride`: `override` ist Pflicht, wenn man eine Methode der Basisklasse überschreibt
  (siehe `PageTitleStrategy.updateTitle`).
- **`strictTemplates`**: Auch die **HTML-Templates werden typgeprüft**. Ein Tippfehler wie `{{ trip().tripNmae }}`
  ist ein Compile-Fehler, kein stiller Laufzeitfehler. Das ist eines der stärksten Features von Angular.

### `.prettierrc` / `.editorconfig`

Automatische Formatierung → keine Diskussionen über Einrückung in Code-Reviews.

---

## 3. Bootstrapping: Wie die App startet

### Schritt 1: `index.html`

```html
<base href="/">
...
<body>
  <app-root></app-root>
</body>
```

`<app-root>` ist ein leerer Platzhalter. `<base href="/">` sagt dem Router, wo die App "wohnt" – nötig, damit
Deep-Links wie `/trip/abc` funktionieren.

### Schritt 2: `main.ts`

```ts
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

Es gibt **kein `AppModule`**. Seit Angular 14+ (und Standard seit 17) gibt es **Standalone Components**:
Jede Komponente deklariert selbst, was sie braucht. `bootstrapApplication` startet direkt mit der Root-Komponente.

### Schritt 3: `app.config.ts` – die globalen Provider

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch()),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
```

Zeile für Zeile:

| Provider | Bedeutung |
|---|---|
| `provideZonelessChangeDetection()` | Angular nutzt **kein zone.js**. Neu gerendert wird nur, wenn sich ein Signal ändert, ein Template-Event feuert usw. (Kapitel 5) |
| `provideBrowserGlobalErrorListeners()` | Unbehandelte Fehler/Promise-Rejections im Browser landen in Angulars `ErrorHandler`. |
| `provideRouter(routes, …)` | Aktiviert den Router mit unserer Routen-Tabelle. |
| `withComponentInputBinding()` | **Route-Parameter und Query-Parameter werden automatisch an gleichnamige `input()`s gebunden.** `trip/:guid` → `readonly guid = input.required<string>()` in `TripDetailComponent`. Kein `ActivatedRoute` nötig! |
| `withInMemoryScrolling({ scrollPositionRestoration: 'top' })` | Bei Navigation wird nach oben gescrollt (sonst bliebe man mitten auf der neuen Seite). |
| `provideHttpClient(withFetch())` | Stellt `HttpClient` bereit; intern wird die moderne `fetch()`-API statt `XMLHttpRequest` benutzt. |
| `{ provide: TitleStrategy, useClass: PageTitleStrategy }` | **DI-Override**: Angulars Standard-Strategie für den Tab-Titel wird durch unsere eigene Klasse ersetzt. |

### Die eigene `TitleStrategy` (`core/page-title.strategy.ts`)

```ts
@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
  }
}
```

In `app.routes.ts` hat jede Route ein `title: 'Dashboard'`. Diese Strategie macht daraus
"Dashboard · Time·Travel Agency". **Lerneffekt:** So erweitert man Angular-Verhalten – man erbt von einer
abstrakten Klasse und registriert sie über DI. Dasselbe Prinzip gilt für `ErrorHandler`, `RouteReuseStrategy` usw.

### Schritt 4: Die Root-Komponente `app.ts`

```ts
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, ToastStackComponent, IdentityPickerModalComponent,
            JoinTravellerModalComponent, TutorialOverlayComponent],
  template: `
    <app-header />
    <main>
      <router-outlet />
    </main>

    @if (state.pendingRole()) {
      <app-identity-picker-modal />
    }
    @if (state.joinModalOpen()) {
      <app-join-traveller-modal (closed)="state.joinModalOpen.set(false)" />
    }
    @if (showTutorial()) {
      <app-tutorial-overlay (dismissed)="dismissTutorial()" />
    }
    <app-toast-stack />
  `,
})
export class App {
  protected readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);
  protected readonly showTutorial = signal(readFlag(TUTORIAL_KEY) !== '1');

  constructor() {
    this.agency.ensureLoaded();
    inject(ParadoxFeedStore).start();

    effect(() => {
      if (this.agency.status() === 'ready' && this.state.missingIdentity() && !this.state.pendingRole()) {
        const role = this.state.role();
        if (role !== 'customer' && role !== 'time') this.state.requestRole(role);
      }
    });
  }
}
```

Was hier passiert:

- **Layout-Shell:** Header oben, `<router-outlet />` ist der Platz, an dem die aktuelle Seite gerendert wird.
- **Globale Overlays** (Identity-Picker, Registrierung, Tutorial, Toasts) liegen *außerhalb* des Router-Outlets.
  So kann jede Seite sie öffnen, indem sie nur ein Signal setzt (`state.requestRole('customer')`), ohne das Modal
  selbst einzubinden. Das ist ein **"globaler UI-State"-Muster**.
- **Start der Daten:** `ensureLoaded()` lädt die Stammdaten, `start()` startet das Polling des Paradox-Feeds.
  Beides passiert genau einmal, weil `App` genau einmal erzeugt wird.
- **`effect()` als Reaktion auf Zustandskombinationen:** "Wenn Daten geladen *und* die gespeicherte Identität
  ungültig ist *und* kein Picker offen ist → Picker öffnen." Das Backend erzeugt bei jedem Neustart neue GUIDs, daher
  kann eine in `sessionStorage` gespeicherte Identität verschwinden. Der Effekt repariert das automatisch.
- **`localStorage` in `try/catch`:** Im privaten Modus mancher Browser wirft der Zugriff eine Exception.
  `readFlag()` fängt das ab. **Defensive Programmierung** bei Browser-APIs.

> **Übung 3.1:** Füge eine neue Route mit `title: 'Hilfe'` hinzu und beobachte den Browser-Tab-Titel.

---

## 4. Signals – das Herz der Reaktivität

Wenn du nur **ein** Kapitel gründlich lernst, dann dieses. Fast der gesamte Code basiert auf Signals.

### 4.1 Was ist ein Signal?

Ein Signal ist ein **Behälter für einen Wert, der Bescheid sagt, wenn sich der Wert ändert.**

```ts
const count = signal(0);   // erzeugen (WritableSignal<number>)
count();                   // lesen → 0   (Signal ist eine Funktion!)
count.set(5);              // überschreiben
count.update(n => n + 1);  // aus altem Wert neuen berechnen → 6
```

Wichtig: Man **liest** ein Signal, indem man es **aufruft**: `count()`. Im Template genauso: `{{ count() }}`.

### 4.2 `computed()` – abgeleiteter Zustand

```ts
const doubled = computed(() => count() * 2);
```

- `computed` merkt sich automatisch, **welche Signals es gelesen hat** (Dependency Tracking).
- Es rechnet **nur neu, wenn sich eine Abhängigkeit ändert**, und nur, wenn jemand den Wert liest (**lazy + memoized**).
- Man kann es nicht `set()`en – es ist read-only.

Beispiel aus `state/agency.store.ts`:

```ts
readonly trips  = signal<TripDto[]>([]);
readonly agents = signal<AgentDto[]>([]);

readonly agentsById  = computed(() => new Map(this.agents().map(a => [a.id, a])));
readonly tripsByGuid = computed(() => new Map(this.trips().map(t => [t.guid, t])));
```

Statt bei jeder Suche `agents().find(a => a.id === id)` (O(n)) zu machen, wird **einmal** eine `Map` gebaut
(O(1) Lookup). Weil es ein `computed` ist, wird die Map nur neu gebaut, wenn sich `agents` tatsächlich ändert.

Und ein `computed`, das **mehrere Signals aus verschiedenen Services** kombiniert:

```ts
readonly scopedTrips = computed((): TripDto[] => {
  const trips = this.trips();
  switch (this.app.role()) {
    case 'customer': {
      const guid = this.app.currentCustomer()?.guid;
      return guid ? trips.filter(t => t.customers.some(c => c.guid === guid)) : [];
    }
    case 'agent': { ... }
    case 'manager': { ... }
    default:
      return trips;
  }
});
```

`scopedTrips` = "meine Trips". Es hängt von `trips`, `role`, `currentCustomer` usw. ab. Wechselt der Benutzer die
Rolle, rechnet sich `scopedTrips` automatisch neu, und jede Seite, die es anzeigt, aktualisiert sich. **Niemand muss
daran denken, irgendwas manuell zu aktualisieren.** Das ist der Kern-Vorteil von Signals.

### 4.3 Ketten von `computed`s

In `features/trip-detail/trip-detail.component.ts`:

```ts
readonly guid = input.required<string>();                                     // aus der URL

protected readonly trip = computed(() => this.agency.tripsByGuid().get(this.guid()) ?? null);
protected readonly name = computed(() => { const t = this.trip(); return t ? tripDisplayName(t) : ''; });
protected readonly paradoxes = computed(() => inQueueOrder(this.feed.forTrip(this.guid())));
protected readonly openParadoxes = computed(() => this.paradoxes().filter(isOpenParadox).length);
protected readonly canManage = computed(() => {
  const manager = this.state.currentManager();
  return this.state.isManager() && !!manager && this.trip()?.managerGuid === manager.guid;
});
```

Das ist ein **Abhängigkeitsgraph**:

```
URL ─► guid ─┬─► trip ─► name
             │      └──────────┐
tripsByGuid ─┘                 ├─► canManage
currentManager, isManager ─────┘
feed.byTrip ─► paradoxes ─► openParadoxes
```

Ändert sich nur der Paradox-Feed, werden nur `paradoxes` und `openParadoxes` neu berechnet – `name` nicht.

**Best Practice:** Leite so viel wie möglich mit `computed` ab, statt Werte in zusätzliche Signals zu kopieren.
Kopien können auseinanderlaufen; `computed` kann das nicht.

### 4.4 `effect()` – Seiteneffekte

Ein `effect` läuft, wenn sich gelesene Signals ändern, und **macht etwas** (statt einen Wert zurückzugeben):
DOM-Manipulation, Logging, `localStorage`, Formularwerte setzen.

Beispiel `features/agent-missions/agent-missions.component.ts`:

```ts
readonly trip = input<string>();   // aus ?trip=<guid> (Query-Param!)

constructor() {
  effect(() => {
    const preselect = this.trip();
    if (preselect) this.form.controls.tripGuid.setValue(preselect);
  });
}
```

Reactive Forms sind (noch) keine Signals – also braucht es eine "Brücke": Wenn sich das Input ändert, schreibt der
Effekt den Wert ins Formular.

**Regeln für `effect`:**

- Nur für Dinge, die man **nicht** mit `computed` ausdrücken kann. "Wert A aus Wert B berechnen" → `computed`.
- Effekte laufen **asynchron** (gesammelt, nicht sofort bei jedem `set`).
- Effekte müssen in einem **Injection Context** erzeugt werden (Konstruktor oder Feld-Initialisierer). Sie werden
  automatisch zerstört, wenn die Komponente zerstört wird.

### 4.5 `untracked()` – lesen ohne Abhängigkeit

Aus `features/era-timeline/era-timeline.component.ts`:

```ts
let centred = false;
effect(() => {
  if (centred || this.pins().length === 0) return;
  centred = true;
  untracked(() => setTimeout(() => this.scrollToFirstPin(), 80));
});
```

`untracked(fn)` führt `fn` aus, **ohne** dass dort gelesene Signals zu Abhängigkeiten des Effekts werden.
`scrollToFirstPin()` liest selbst `pins()` – ohne `untracked` könnte das ungewollte Re-Runs auslösen.
Das lokale Flag `centred` sorgt dafür, dass nur **einmal** zentriert wird.

### 4.6 `input()` und `output()` – Signal-basierte Komponenten-API

```ts
// shared/components/modal/modal.component.ts
readonly title    = input.required<string>();   // Pflicht-Input
readonly subtitle = input<string>();            // optional → string | undefined
readonly width    = input(460);                 // optional mit Default → number
readonly closed   = output<void>();             // Event nach außen
```

Benutzung: `<app-modal [title]="'Sign in'" [width]="440" (closed)="cancel()">`.

- `input()` ist ein **read-only Signal**. Man liest es mit `this.title()` – und kann es daher direkt in `computed`s
  verwenden. Das ersetzt das alte `@Input()` + `ngOnChanges`.
- `output()` ersetzt `@Output() x = new EventEmitter()`. Man feuert mit `this.closed.emit()`.
- `input.required` erzwingt zur Compile-Zeit, dass der Parent den Wert setzt.

Vergleich alt vs. neu:

```ts
// ALT (Decorator)                                // NEU (dieses Projekt)
@Input() trip!: TripDto;                          readonly trip = input.required<TripDto>();
ngOnChanges() { this.name = ...; }                readonly name = computed(() => tripDisplayName(this.trip()));
@Output() closed = new EventEmitter<void>();      readonly closed = output<void>();
```

### 4.7 `viewChild()` – Signal-Query auf DOM-Elemente

```ts
private readonly scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');      // kann undefined sein
private readonly starCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('starCanvas'); // muss existieren
```

Im Template: `<div #scrollEl>…</div>`. Ersetzt `@ViewChild`. Ist ebenfalls ein Signal, daher
`this.scrollEl()?.nativeElement`.

### 4.8 Immutable Updates – warum `[...list]` und `{ ...p }`

Signals vergleichen standardmäßig mit `Object.is`. Wenn man ein Array **mutiert** (`list.push(x)`), bleibt die
Referenz gleich → das Signal "merkt" keine Änderung → nichts rendert neu.

Daher wird überall **eine neue Referenz** erzeugt:

```ts
// state/notification.service.ts
this.toasts.update(list => [...list, { ...toast, id }].slice(-MAX_TOASTS));
this.toasts.update(list => list.filter(t => t.id !== id));

// state/paradox-feed.store.ts
this.paradoxes.update(list => list.map(p => (p.guid === updated.guid ? updated : p)));
this.fresh.update(set => new Set([...set, ...guids]));
```

`map`, `filter`, Spread – alles erzeugt neue Arrays/Objekte. **Merke: Signals + immutable Daten gehören zusammen.**

> **Übung 4.1:** Füge in `LandingComponent` ein `computed` `bookableCount` hinzu, das zählt, wie viele der gefilterten
> Trips buchbar sind, und zeige es im Template an. Beobachte, dass es sich beim Ändern der Filter automatisch aktualisiert.
>
> **Übung 4.2:** Ändere testweise in `NotificationService.show` das `update` zu `this.toasts().push(...)`. Was passiert?
> (Danach zurückändern!)

---

## 5. Zoneless & OnPush – warum Signals Pflicht sind

### Wie Angular früher wusste, wann es neu rendern muss

Früher hat **zone.js** alle asynchronen Browser-APIs (`setTimeout`, `addEventListener`, `fetch`, Promises …)
"gepatcht". Nach *jedem* asynchronen Ereignis hat Angular den **gesamten Komponentenbaum** auf Änderungen geprüft.
Bequem, aber langsam und magisch.

### Wie es hier funktioniert

Mit `provideZonelessChangeDetection()` gibt es diese Magie nicht. Angular rendert eine Komponente neu, wenn:

1. ein **Signal**, das im Template gelesen wird, sich ändert,
2. ein **Template-Event** (`(click)`, `(input)`) feuert,
3. ein `input()` neue Werte bekommt,
4. `async`-Pipe einen Wert liefert, oder man explizit `markForCheck()` aufruft.

Zusätzlich hat **jede** Komponente `changeDetection: ChangeDetectionStrategy.OnPush`. Das heißt: "Prüfe mich nur,
wenn einer der obigen Gründe auf mich zutrifft."

### Die Falle (steht auch in `CLAUDE.md`)

```ts
// ❌ FALSCH – wird NIE angezeigt
protected loading = false;
load() {
  this.api.getAll().subscribe(list => { this.items = list; this.loading = false; });
}

// ✅ RICHTIG
protected readonly loading = signal(false);
protected readonly items = signal<Item[]>([]);
load() {
  this.api.getAll().subscribe(list => { this.items.set(list); this.loading.set(false); });
}
```

Der HTTP-Callback kommt asynchron. Ohne zone.js bekommt Angular davon nichts mit. Ein normales Feld zu ändern
löst **kein** Rendern aus. Ein Signal zu ändern schon.

Deshalb sind in diesem Projekt **alle** veränderlichen Zustände Signals: `busy`, `error`, `submitting`,
`menuOpen`, `assignOpen`, `phase` usw.

**Vorteile von Zoneless:** kleineres Bundle (kein zone.js), bessere Performance, klarere Stacktraces, und man
*versteht*, warum etwas neu rendert.

---

## 6. Dependency Injection mit `inject()`

### Services bereitstellen

```ts
@Injectable({ providedIn: 'root' })
export class TripService { ... }
```

`providedIn: 'root'` = ein **Singleton** für die gesamte App, das erst erzeugt wird, wenn es jemand braucht
(**tree-shakable**: wird es nie injiziert, landet es nicht im Bundle).

Weil alle Stores `providedIn: 'root'` sind, teilen sich *alle* Komponenten dieselbe `AgencyStore`-Instanz – das
macht sie zu einem globalen, geteilten Zustand.

### Services benutzen

```ts
export class TripActionsComponent {
  protected readonly state = inject(AppStateService);
  private readonly tripApi = inject(TripService);
}
```

`inject()` statt Konstruktor-Parameter (`constructor(private tripApi: TripService)`). Vorteile:

- Funktioniert auch in **Funktionen** (Guards, siehe Kapitel 13) und in Feld-Initialisierern.
- Kein langer Konstruktor, besser mit Vererbung kombinierbar.
- Typ wird automatisch erkannt.

**Regel:** `inject()` darf nur im **Injection Context** aufgerufen werden: Feld-Initialisierer, Konstruktor,
Factory-Funktionen, Guards. Nicht in einem `setTimeout` oder `subscribe`-Callback.

### `private` vs. `protected` vs. `public`

Ein durchgängiges Muster im Projekt:

- `private` → nur in der Klasse benutzt (z. B. `tripApi`).
- `protected` → wird im **Template** benutzt, soll aber nicht von außen (Parent-Komponenten) erreichbar sein.
  Templates dürfen seit Angular 14+ auf `protected` zugreifen.
- `readonly` (öffentlich) → Teil der öffentlichen API, v. a. `input()`/`output()`.

So zeigt schon die Signatur, wofür ein Feld gedacht ist.

### `ElementRef` und `DestroyRef`

```ts
private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);      // das eigene DOM-Element
inject(DestroyRef).onDestroy(() => this.stopLoop());                        // Aufräumen beim Zerstören
```

`DestroyRef` ist die moderne Alternative zu `ngOnDestroy` und kann auch in Services/Funktionen verwendet werden.

---

## 7. Die Schichten: models → services → state → features

```
src/app/
├── core/          ← "technische Basis", app-weit, ohne UI
│   ├── models/      TypeScript-Interfaces = Form der Backend-DTOs
│   ├── services/    Ein dünner HTTP-Service pro Backend-Controller
│   ├── http/        Fehler → lesbarer Text
│   └── guards/      Routen-Schutz
├── state/         ← App-Zustand (Signals), Stores
├── shared/        ← wiederverwendbar, fachlich "dumm"
│   ├── components/  Präsentationskomponenten (Badge, Modal, Card …)
│   ├── forms/       Validatoren, Adress-Teilformular
│   └── utils/       reine Funktionen (Labels, Datum, Buchungsregeln)
└── features/      ← die Seiten / Anwendungsfälle, eine Ordner pro Feature
```

**Abhängigkeitsregel:** `features` → `shared`/`state` → `core`. Nie umgekehrt. `shared/components` kennt kein
Feature. `core/services` kennt keinen Store. Dadurch kann man jede Schicht isoliert verstehen und testen.

### Models (`core/models/`)

```ts
export type TripType = 'Trip' | 'CriticalTrip';
export type TripStatus = 'Scheduled' | 'Active' | 'Completed' | 'Cancelled';

export interface TripDto {
  guid: string;
  dateInRealLife: string;     // ISO-String, kein Date! JSON kennt keine Dates.
  tripName: string | null;
  tripType: TripType;
  tripStatus: TripStatus;
  agentId: number | null;
  ...
}
```

- **Interfaces statt Klassen:** JSON vom Server hat keine Methoden. Ein Interface beschreibt nur die Form und
  verschwindet beim Kompilieren (null Bytes im Bundle).
- **String-Literal-Unions** (`'Scheduled' | 'Active' | …`) statt `string`: Der Compiler kennt alle erlaubten Werte,
  Autovervollständigung funktioniert, und `switch` kann auf Vollständigkeit geprüft werden.
- **`| null` explizit:** Das Backend sendet `null` für fehlende Werte; das Modell zwingt die UI, das zu behandeln.
- **Datumswerte bleiben Strings** und werden erst bei Bedarf geparst (`Date.parse(...)`).
- **Cmd vs. Dto:** `CreateTripByManagerCmd` = was wir *senden*, `TripDto` = was wir *bekommen*. Gleiche
  Benennung wie im Backend.
- **Interface-Vererbung:** `ParadoxFeedDto extends ParadoxDto`, `ManagerWithIdDto extends ManagerDto`.

---

## 8. HTTP-Services & Fehlerbehandlung

### Dünne Services (`core/services/trip.service.ts`)

```ts
@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Trip';

  getAll(): Observable<TripDto[]> {
    return this.http.get<TripDto[]>(this.base);
  }

  bookTrip(tripGuid: string, customerGuid: string): Observable<string> {
    return this.http.post(`${this.base}/${tripGuid}/book/${customerGuid}`, null, { responseType: 'text' });
  }
}
```

Lernpunkte:

- **Ein Service pro Backend-Controller.** Leicht zu finden, leicht zu warten.
- **Keine Logik, kein State** – nur URL bauen und Observable zurückgeben. State gehört in die Stores.
- `http.get<TripDto[]>` – das Generic ist eine **Behauptung**, keine Prüfung. TypeScript vertraut darauf, dass der
  Server die Form einhält. (Runtime-Validierung bräuchte z. B. Zod.)
- `responseType: 'text'`: Einige Endpunkte liefern einen reinen Text-Body. Ohne diese Option würde `HttpClient`
  versuchen, ihn als JSON zu parsen und einen Fehler werfen.
- **Observables sind "kalt":** `getAll()` schickt noch **nichts**. Erst `.subscribe()` löst den Request aus.
- **HTTP-Observables "completen" nach einer Antwort** → man muss sie nicht manuell abbestellen.

Query-Parameter sauber bauen (`paradox.service.ts`):

```ts
const params = managerGuid ? new HttpParams().set('managerGuid', managerGuid) : undefined;
return this.http.patch(`${this.base}/${paradoxGuid}/status`, { status }, { params, responseType: 'text' });
```

`HttpParams` kodiert Sonderzeichen korrekt (statt `?managerGuid=${x}` von Hand).

### Zentrale Fehlerübersetzung (`core/http/error-message.ts`)

```ts
export function toErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error && err.message ? err.message : fallback;
  }
  if (err.status === 0) return 'The agency server is unreachable — is the backend running?';

  const body = parseBody(err.error);
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const problem = body as ProblemDetails;
    if (problem.errors) {
      const first = Object.values(problem.errors).flat()[0];
      if (first) return first;
    }
    if (problem.detail) return problem.detail;
    if (problem.title) return problem.title;
  }
  return fallback;
}
```

Warum das wichtig ist:

- ASP.NET liefert Fehler in verschiedenen Formen: **ProblemDetails** (`{ title, detail }`), **Validierungsfehler**
  (`{ errors: { Email: ['...'] } }`), oder reinen Text (z. B. bei 409 Conflict).
- `status === 0` bedeutet: gar keine Antwort (Server aus, Netzwerk weg, CORS).
- Statt in jeder Komponente diese Fälle zu behandeln, gibt es **eine** Funktion. Jede Komponente macht nur:
  `error: err => this.error.set(toErrorMessage(err, 'Booking failed.'))`.
- `err: unknown` statt `any`: zwingt zu Typprüfungen (`instanceof`, `typeof`) – **Type Narrowing**.

Diese Funktion ist eine **reine Funktion** und hat eigene Tests (`error-message.spec.ts`).

---

## 9. State-Management: die Stores

Es gibt vier State-Services in `state/`. Alle folgen demselben Muster: **private Datenquelle, öffentliche Signals,
Methoden für Änderungen.** Das ist im Prinzip ein selbstgebautes, schlankes "NgRx Signal Store".

### 9.1 `AppStateService` – Wer bin ich?

```ts
export type Role = 'customer' | 'agent' | 'manager' | 'director' | 'time';
export type IdentityRole = Exclude<Role, 'time'>;

export const ROLES: readonly RoleDefinition[] = [
  { role: 'customer', label: 'Customer', home: '/' },
  { role: 'agent', label: 'Agent', home: '/missions' },
  ...
];

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly session = signal<Session>(restore());

  readonly role            = computed(() => this.session().role);
  readonly currentCustomer = computed(() => this.session().customer);
  readonly isManager       = computed(() => this.role() === 'manager');
  readonly homeRoute       = computed(() => this.roleDefinition().home);

  signInAsAgent(agent: AgentDto): void { this.update({ role: 'agent', agent }); }

  private update(patch: Partial<Session>): void {
    this.session.update(s => ({ ...s, ...patch }));
    this.pendingRole.set(null);
    persist(this.session());
  }
}
```

Wichtige Muster:

- **Ein privates `WritableSignal`, nach außen nur `computed`s.** Niemand außerhalb kann `session` direkt setzen.
  Änderungen gehen nur über benannte Methoden (`signInAsAgent`, `enterTimeMode`). Das ist **Kapselung** – wie
  private Felder + Getter, aber reaktiv.
- **`Partial<Session>`** + Spread = "Patch"-Update: nur die genannten Felder ändern.
- **Persistenz in `sessionStorage`** (überlebt Reload, aber nicht das Schließen des Tabs). `restore()` beim Start,
  `persist()` bei jeder Änderung – beides mit `try/catch`.
- **Konfiguration als Daten:** `ROLES` ist ein Array von Objekten. Header, Guards und Picker lesen daraus.
  Eine neue Rolle = ein neuer Eintrag, nicht zehn `if`s.
- `Exclude<Role, 'time'>` – ein **Utility Type**: "alle Rollen außer time". Für "Time" gibt es keine Identität.

### 9.2 `AgencyStore` – die Stammdaten

```ts
@Injectable({ providedIn: 'root' })
export class AgencyStore {
  private readonly reload$ = new Subject<void>();

  readonly trips = signal<TripDto[]>([]);
  ...
  readonly status = signal<LoadStatus>('idle');          // 'idle' | 'loading' | 'ready' | 'error'
  readonly error  = signal<string | null>(null);
  readonly initialLoading = computed(() => this.status() === 'loading' && this.trips().length === 0);

  constructor() {
    this.reload$
      .pipe(
        switchMap(() =>
          forkJoin({
            trips: this.tripApi.getAll(),
            agents: this.agentApi.getAll(),
            customers: this.customerApi.getAll(),
            managers: this.managerApi.getAllWithId(),
            director: this.directorApi.get().pipe(catchError(() => of(null))),
          }).pipe(
            map((data): LoadResult => ({ ok: true, data })),
            catchError(error => of<LoadResult>({ ok: false, error })),
          ),
        ),
      )
      .subscribe(result => (result.ok ? this.applySnapshot(result.data) : this.applyError(result.error)));
  }

  ensureLoaded(): void {
    if (this.status() === 'idle' || this.status() === 'error') this.refresh();
  }

  refresh(): void {
    this.status.set('loading');
    this.reload$.next();
  }
}
```

Das ist der lehrreichste Code im Projekt. Schritt für Schritt:

1. **`reload$` ist ein `Subject`** – ein "Knopf", den man drücken kann (`next()`). Jeder `refresh()` drückt ihn.
2. **`switchMap`**: Für jeden Knopfdruck wird ein neuer Lade-Vorgang gestartet. Läuft noch ein alter, wird er
   **abgebrochen**. Drückt man 3× schnell `refresh()`, gewinnt nur die letzte Antwort. Das verhindert
   **Race Conditions** (eine alte, langsame Antwort überschreibt eine neuere).
3. **`forkJoin({...})`**: Startet alle 5 Requests **parallel** und liefert **ein** Objekt, wenn **alle** fertig sind.
   Danach sind Trips, Agents usw. garantiert zueinander konsistent.
4. **`director: ...pipe(catchError(() => of(null)))`**: Wenn nur der Director-Request fehlschlägt, wird er durch
   `null` ersetzt, statt alles scheitern zu lassen. **Fehlertoleranz pro Request.**
5. **`catchError` *innerhalb* von `switchMap`**: Ganz wichtig! Würde der Fehler bis zur äußeren Pipe durchschlagen,
   wäre der `reload$`-Stream **für immer tot** (ein Observable, das einen Fehler wirft, ist beendet). So wird der
   Fehler zu einem normalen Wert `{ ok: false, error }` und der Store kann beim nächsten `refresh()` wieder laden.
6. **`LoadResult` als Discriminated Union**: `{ ok: true; data } | { ok: false; error }`. Nach `result.ok ? …` weiß
   TypeScript, ob `data` oder `error` existiert.
7. **Lade-Status als eigene State Machine** (`'idle' | 'loading' | 'ready' | 'error'`) statt mehrerer Booleans
   (`isLoading`, `hasError` …), die sich widersprechen könnten.
8. **`initialLoading`**: Ein Spinner nur beim **ersten** Laden. Bei Hintergrund-Refreshes bleiben die alten Daten
   sichtbar – kein Flackern. Kleines Detail, großer UX-Gewinn.
9. **`ensureLoaded()` ist idempotent**: Jede Seite darf es aufrufen; es lädt nur, wenn noch nichts da ist.

Nach dem Laden synchronisiert `syncIdentities()` die gespeicherte Identität mit den frischen Daten (oder entfernt sie,
wenn es sie nicht mehr gibt).

### 9.3 `ParadoxFeedStore` – Live-Daten per Polling

Das Backend erzeugt Paradoxe **von selbst** (Hintergrund-Simulation). Das Frontend muss also regelmäßig nachfragen
(**Polling**). Alternativen wären WebSockets/SignalR oder Server-Sent Events – Polling ist am einfachsten.

```ts
export const PARADOX_POLL_MS = 5000;

start(): void {
  if (this.started) return;          // Guard gegen doppeltes Starten
  this.started = true;
  merge(timer(0, PARADOX_POLL_MS), this.refresh$)
    .pipe(
      switchMap(() =>
        this.api.getAll().pipe(
          tap({ error: () => this.online.set(false) }),
          catchError(() => EMPTY),
        ),
      ),
    )
    .subscribe(list => this.apply(list));
}
```

- `timer(0, 5000)` – feuert sofort, dann alle 5 s.
- `merge(..., this.refresh$)` – **oder** wenn jemand `refresh()` aufruft (z. B. nach einer Statusänderung).
- `switchMap` – ein noch laufender Poll wird beim nächsten abgebrochen.
- `tap({ error })` + `catchError(() => EMPTY)` – bei Fehler "offline" markieren und den Fehler **schlucken**, damit
  das Polling weiterläuft. Der Header zeigt dann ein "Offline"-Badge.

**Neue Paradoxe erkennen** (Diffing):

```ts
private apply(list: ParadoxFeedDto[]): void {
  this.online.set(true);
  const arrivals = findArrivals(this.known, list);   // was ist neu seit dem letzten Poll?
  ...
  this.paradoxes.set(list);
  this.known = new Set(list.map(p => p.guid));
  if (arrivals.length === 0) return;
  this.agency.refresh();          // ein Paradox kann einen Trip "critical" machen → Trips neu laden
  this.markFresh(arrivals);       // für 15 s hervorheben
  for (const p of arrivals.filter(a => isParadoxRelevant(a, ctx))) {
    this.notifications.show({ tone: 'paradox', title: ..., link: ['/trip', p.tripGuid] });
  }
}
```

- `known` ist beim ersten Poll `null` → `findArrivals` liefert `[]`. So gibt es beim Laden der App **keine Toast-Flut**
  für alle existierenden Paradoxe.
- **Relevanz-Filter**: Ein Agent bekommt nur Toasts zu *seinen* Trips, Kunden nie (`paradox-relevance.ts`).
- Die Logik (`findArrivals`, `isParadoxRelevant`) ist in **reine Funktionen** ausgelagert → leicht testbar.

**Gruppieren mit `computed`:**

```ts
readonly byTrip = computed(() => {
  const map = new Map<string, ParadoxFeedDto[]>();
  for (const p of this.paradoxes()) { ... }
  return map;
});
forTrip(tripGuid: string): ParadoxFeedDto[] { return this.byTrip().get(tripGuid) ?? []; }
```

Eine normale Methode, die ein `computed` liest, ist im Template **trotzdem reaktiv** – weil beim Aufruf
`this.byTrip()` gelesen wird.

**Optimistisches Update:**

```ts
changeStatus(paradox: ParadoxFeedDto, status: ParadoxStatus): void {
  this.pendingStatus.set(paradox.guid);
  this.api.changeStatus(paradox.guid, status, managerGuid).subscribe({
    next: () => {
      this.pendingStatus.set(null);
      this.paradoxes.update(list => list.map(p => (p.guid === paradox.guid ? { ...p, paradoxStatus: status } : p)));
      this.refresh();
      this.notifications.success(...);
    },
    error: err => { this.pendingStatus.set(null); this.notifications.error(..., toErrorMessage(err)); },
  });
}
```

Nach Erfolg wird der lokale Wert **sofort** angepasst (UI reagiert ohne Wartezeit), dann wird zur Sicherheit neu
gepollt, um auch Nebeneffekte (Queue-Verschiebungen) zu holen. `pendingStatus` erlaubt der UI, die betroffene Zeile
während des Requests zu deaktivieren.

**Zwei Stile von Store-Methoden** – bewusst:

- `changeStatus()` **abonniert selbst** ("fire and forget"; Ergebnis kommt als Toast).
- `engage()`, `stabilise()`, `introduce()` **geben ein Observable zurück** – der Aufrufer (das Mini-Game) muss auf
  das Ergebnis reagieren (Phase wechseln). `tap()` erlaubt dem Store trotzdem, nebenbei seinen State zu aktualisieren.

### 9.4 `NotificationService` – Toasts

```ts
show(toast: Omit<Toast, 'id'>, durationMs = DEFAULT_DURATION_MS): number {
  const id = this.nextId++;
  this.toasts.update(list => [...list, { ...toast, id }].slice(-MAX_TOASTS));
  if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
  return id;
}
```

- `Omit<Toast, 'id'>` – der Aufrufer gibt alles außer der ID an; die ID vergibt der Service.
- `.slice(-4)` – maximal 4 Toasts, die ältesten fliegen raus.
- `setTimeout` + `dismiss` – Auto-Close. Funktioniert zoneless, weil `dismiss` ein Signal ändert.
- Die Darstellung übernimmt `ToastStackComponent`, die in `App` einmal eingebunden ist. **Trennung von "was"
  (Service) und "wie" (Komponente).**

> **Übung 9.1:** Rufe in der Browser-Konsole während des Ladens mehrmals schnell einen Rollenwechsel auf und schau im
> Netzwerk-Tab, wie `switchMap` alte Requests mit "(canceled)" abbricht.
>
> **Übung 9.2:** Stoppe das Backend. Was passiert mit dem Header? Welche Codezeile ist dafür verantwortlich?

---

## 10. RxJS – wo und warum es noch vorkommt

Signals haben einen Großteil von RxJS ersetzt. RxJS ist aber weiterhin **das richtige Werkzeug für Ereignisse über
Zeit**: HTTP, Polling, Timer, Abbrechen, Kombinieren. Faustregel:

> **Signals für Zustand ("was ist jetzt?"), RxJS für Ereignisse ("was passiert wann?").**

Verwendete Operatoren und wofür:

| Operator | Wo | Wofür |
|---|---|---|
| `Subject` | AgencyStore, ParadoxFeedStore | manueller Auslöser (`reload$.next()`) |
| `switchMap` | beide Stores | neues Ereignis bricht altes ab (keine Race Conditions) |
| `forkJoin` | AgencyStore | mehrere Requests parallel, gemeinsames Ergebnis |
| `merge` | ParadoxFeedStore | zwei Auslöser (Timer + manuell) zusammenführen |
| `timer(0, n)` | ParadoxFeedStore | sofort + periodisch |
| `interval(n)` | Loom, SimulationPanel | periodisch (Countdown, Animation) |
| `catchError` | Stores | Fehler in Werte umwandeln, Stream am Leben halten |
| `of`, `EMPTY` | Stores | Ersatzwert bzw. "nichts" ausgeben |
| `map`, `tap` | Stores | umformen bzw. Nebeneffekt ohne Umformen |
| `throwError` | ParadoxFeedStore.engage | Fehler-Observable erzeugen |
| `startWith` | FormField | sofort einen Startwert ausgeben |

### Abbestellen: `takeUntilDestroyed`

HTTP-Observables enden von selbst. **Endlose** Observables (`interval`) nicht – sie würden nach dem Verlassen der
Seite weiterlaufen (**Memory Leak**). Lösung (`loom/simulation-panel/simulation-panel.component.ts`):

```ts
constructor() {
  this.load();
  interval(1000).pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(n => {
    this.now.set(Date.now());
    if (n % 5 === 4) this.load();
  });
}
```

`takeUntilDestroyed` beendet das Abo automatisch, wenn die Komponente zerstört wird. Lehrreich auch: Ein Signal
`now`, das jede Sekunde aktualisiert wird, lässt ein `computed` (`countdown`) jede Sekunde neu rechnen – so baut man
**Live-Uhren** mit Signals.

Die Stores dagegen bestellen nie ab – das ist korrekt, weil sie `root`-Singletons sind und so lange leben wie die App.

### Brücke Signal ⇄ Observable: `toSignal` / `toObservable`

Aus `shared/components/form-field/form-field.component.ts`:

```ts
readonly control = input.required<AbstractControl>();

// Control state is not signal-based; re-evaluate whenever the control emits an event.
private readonly controlEvents = toSignal(
  toObservable(this.control).pipe(switchMap(c => c.events.pipe(startWith(null)))),
);

protected readonly error = computed(() => {
  this.controlEvents();                 // nur gelesen, um eine Abhängigkeit zu erzeugen
  const c = this.control();
  return c.touched && c.errors ? this.message(c.errors) : null;
});
```

Das ist fortgeschritten, aber sehr lehrreich:

1. `toObservable(this.control)` macht aus dem Input-Signal ein Observable.
2. `switchMap(c => c.events)` – `AbstractControl.events` ist ein Observable, das bei jeder Wert-, Status-, Touched-
   oder Pristine-Änderung feuert. Wechselt das Control, wird auf das neue umgeschaltet.
3. `toSignal(...)` macht daraus wieder ein Signal.
4. Das `computed` liest dieses Signal als "Trigger" und berechnet dann die Fehlermeldung aus dem Control.

**Warum?** Reactive Forms sind nicht signal-basiert. Ohne diese Brücke würde die OnPush/zoneless-Komponente nicht
merken, dass das Feld "touched" wurde, und die Fehlermeldung nicht anzeigen.

---

## 11. Komponenten im Detail

### 11.1 Aufbau einer Standalone-Komponente

```ts
@Component({
  selector: 'app-trip-card',                         // HTML-Tag
  changeDetection: ChangeDetectionStrategy.OnPush,   // immer
  imports: [RouterLink, StatusBadgeComponent],       // was das Template benutzt
  templateUrl: './trip-card.component.html',         // oder inline: template: `...`
  styleUrl: './trip-card.component.css',             // oder inline: styles: `...`
})
export class TripCardComponent { ... }
```

- **`imports`** ersetzt NgModules: Jede Komponente listet genau die Komponenten/Direktiven/Pipes auf, die ihr
  Template verwendet. Vergisst man eine, meldet der Compiler (dank `strictTemplates`) einen Fehler.
- **Inline vs. separate Dateien:** Kleine Komponenten (Modal, Badge, Dashboard) haben das Template inline, große
  (Trip-Detail, Loom) eigene `.html`/`.css`. Pragmatische Regel: ab ~40 Zeilen Template auslagern.
- **Styles sind gekapselt** (View Encapsulation): CSS in `trip-card.component.css` wirkt nur in dieser Komponente.
  Angular hängt dafür automatisch Attribute wie `_ngcontent-abc` an.

### 11.2 Smart vs. Dumb (Container vs. Presentational)

Ein zentrales Architekturmuster im Projekt:

| **Smart / Container** (in `features/`) | **Dumb / Presentational** (in `shared/components/`) |
|---|---|
| injiziert Stores & Services | bekommt alles über `input()` |
| kennt die Rolle, lädt Daten, ruft APIs | meldet Aktionen nur per `output()` |
| z. B. `TripDetailComponent`, `DashboardComponent` | z. B. `TripCardComponent`, `StatusBadgeComponent`, `ParadoxListComponent` |

Beispiel `ParadoxListComponent` – sie **ändert selbst nichts**, sie meldet nur Wünsche:

```ts
readonly paradoxes = input.required<ParadoxFeedDto[]>();
readonly editable  = input(false);
readonly statusChange = output<ParadoxStatusChange>();
readonly move = output<ParadoxQueueMove>();
readonly act  = output<ParadoxFeedDto>();
```

Der Parent entscheidet, was passiert:

```html
<app-paradox-list [paradoxes]="paradoxes()" [editable]="canManage()"
                  (statusChange)="feed.changeStatus($event.paradox, $event.status)"
                  (move)="feed.moveInQueue($event.paradox, $event.position)" />
```

Dieselbe Liste wird im Trip-Detail (Manager kann editieren), im Paradox-Log (Director nur lesen) und bei den
Agent-Missionen (mit "Stabilise"-Button) verwendet. **Ein Baustein, drei Verwendungen.**

**Funktionen als Inputs** – eine elegante Variante der Konfiguration:

```ts
readonly canAct     = input<((p: ParadoxFeedDto) => boolean) | null>(null);
readonly actionHint = input<((p: ParadoxFeedDto) => string | null) | null>(null);
readonly agentName  = input<((id: number) => string | null) | null>(null);
```

Der Parent übergibt eine Funktion, die Liste ruft sie pro Zeile auf. Wichtig: Im Parent sind diese als
**Arrow-Function-Felder** definiert, damit `this` korrekt gebunden ist:

```ts
protected readonly canAct = (p: ParadoxFeedDto) => canStabilise(p, this.agent()?.id);
```

Würde man `canAct(p) { ... }` als Methode übergeben, wäre `this` in der Liste `undefined`.

### 11.3 Utility-Funktionen fürs Template freigeben

```ts
protected readonly typeLabel = paradoxTypeLabel;
protected readonly ago = relativeTime;
```

Templates können nur auf Klassenmitglieder zugreifen, nicht auf importierte Funktionen. Dieses Muster macht reine
Funktionen im Template verfügbar: `{{ typeLabel(p.paradoxType) }}`.

> Hinweis: Funktionsaufrufe im Template werden bei jedem Render der Komponente ausgeführt. Bei billigen Funktionen
> ist das okay; bei teuren gehört das Ergebnis in ein `computed` (oder eine `pure` Pipe).

### 11.4 Content Projection (`<ng-content>`)

Die Modal-Komponente stellt nur den **Rahmen**; den Inhalt liefert der Aufrufer:

```html
<!-- modal.component.ts -->
<section class="dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
  <header class="head"> <h2 [id]="titleId">{{ title() }}</h2> ... </header>
  <ng-content />                                   <!-- alles andere -->
  <footer class="actions">
    <ng-content select="[modal-actions]" />        <!-- nur Elemente mit Attribut modal-actions -->
  </footer>
</section>
```

```html
<!-- Verwendung in create-trip-modal -->
<app-modal title="Create Trip" (closed)="closed.emit()">
  <form id="trip-form">...</form>                  <!-- landet im Default-Slot -->
  <div modal-actions>                              <!-- landet im Footer -->
    <button type="submit" form="trip-form">Create trip</button>
  </div>
</app-modal>
```

- **Multi-Slot-Projection** mit `select="[attr]"`.
- `form="trip-form"` am Button: Der Submit-Button steht **außerhalb** des `<form>` (im Footer), ist aber trotzdem
  per HTML-Attribut mit dem Formular verbunden. Cleveres natives HTML-Feature.
- `.actions:not(:empty)` – der Footer bekommt nur Abstand, wenn er Inhalt hat.

Auch `PageHeaderComponent` und `EmptyStateComponent` nutzen `<ng-content />` für Buttons.

### 11.5 `host`-Metadaten statt `@HostListener` / `@HostBinding`

```ts
// modal.component.ts
host: { '(document:keydown.escape)': 'closed.emit()' },

// header.component.ts
host: { '(document:click)': 'onDocumentClick($event)', '(document:keydown.escape)': 'menuOpen.set(false)' },

// timeline-pin.component.ts – Bindings auf das eigene Host-Element
host: {
  '[style.left.px]': 'pin().x - 11',
  '[style.--accent]': 'pin().zone.accent',
  '[class.selected]': 'selected()',
  '(click)': 'onClick($event)',
  '(mouseenter)': 'hovered.set(true)',
  '(mouseleave)': 'hovered.set(false)',
},
```

- `(document:click)` – globaler Listener, z. B. um ein Dropdown bei Klick **außerhalb** zu schließen.
- `keydown.escape` – Angulars Key-Event-Filter: nur bei der Escape-Taste.
- `[style.left.px]` – Style-Binding mit Einheit.
- `[style.--accent]` – setzt eine **CSS Custom Property** (Kapitel 17).
- Die offizielle Angular-Empfehlung ist inzwischen `host: {}` statt `@HostBinding`/`@HostListener`.

**"Klick außerhalb"-Logik** (`header.component.ts`):

```ts
protected onDocumentClick(event: MouseEvent): void {
  if (this.menuOpen() && !this.host.nativeElement.querySelector('.role')?.contains(event.target as Node)) {
    this.menuOpen.set(false);
  }
}
```

**"Klick auf den Hintergrund"-Logik** (`modal.component.ts`):

```ts
protected onBackdrop(event: MouseEvent): void {
  if (event.target === event.currentTarget) this.closed.emit();
}
```

`target` = worauf geklickt wurde, `currentTarget` = wo der Listener hängt. Nur wenn beide gleich sind, wurde auf den
Backdrop selbst (nicht auf den Dialog darin) geklickt.

### 11.6 Modals als bedingte Komponenten

Modals werden **nicht** versteckt, sondern **erzeugt und zerstört**:

```html
@switch (modal()) {
  @case ('createTrip')  { <app-create-trip-modal  (created)="done('Trip created')" (closed)="modal.set(null)" /> }
  @case ('createAgent') { <app-create-agent-modal (created)="done('Agent recruited')" (closed)="modal.set(null)" /> }
}
@if (assignTrip(); as trip) {
  <app-assign-agent-modal [trip]="trip" (assigned)="..." (closed)="assignTrip.set(null)" />
}
```

```ts
type DashboardModal = 'createTrip' | 'createAgent' | 'promoteAgent' | null;
protected readonly modal = signal<DashboardModal>(null);
```

- **Ein Signal für "welches Modal ist offen"** statt drei Booleans → es kann nie zwei gleichzeitig geben.
- Durch das Zerstören hat jedes Öffnen ein **frisches Formular** (kein manuelles Reset).
- Das Modal meldet `created`/`closed`, der Parent entscheidet (Toast + `agency.refresh()`).

### 11.7 Komponenten aufteilen

`TripDetailComponent` ist in Unterkomponenten zerlegt: `TripActionsComponent` (rollenabhängiges Aktionspanel),
`TripStaffComponent`, `TripReviewsComponent`. `EraTimelineComponent` in `TimelinePinComponent`,
`TimelineScrubberComponent`, `BoardingCardComponent` plus `era-timeline.config.ts` (reine Daten/Berechnungen).

Faustregeln dafür: ein klar benennbarer Teil der UI, eigener State, oder > ~150 Zeilen.

### 11.8 Lifecycle-Hooks

Das Projekt braucht kaum Lifecycle-Hooks – Signals machen `ngOnInit`/`ngOnChanges` meist überflüssig. Es bleiben:

- **Konstruktor**: Initialisierung, `effect()`s, Abos (Injection Context!).
- **`ngAfterViewInit`**: Wenn man auf gerendertes DOM zugreifen muss (Canvas in Loom und Era-Timeline).
- **`ngOnDestroy`** / **`DestroyRef.onDestroy`**: Aufräumen (`cancelAnimationFrame`, `removeEventListener`).

---

## 12. Die neue Template-Syntax (Control Flow)

Seit Angular 17 gibt es eingebauten Control Flow statt `*ngIf`/`*ngFor`/`[ngSwitch]`. Dieses Projekt nutzt
**ausschließlich** die neue Syntax.

### `@if` / `@else if` / `@else` mit `as`

```html
@if (agency.initialLoading()) {
  <p class="state-msg">Loading trip…</p>
} @else if (trip(); as t) {
  <h1>{{ name() }}</h1>
  <app-status-badge [status]="t.tripStatus" />
} @else {
  <app-empty-state title="Trip not found" ... />
}
```

`trip(); as t` speichert den Wert in einer lokalen Variable `t`. Innerhalb des Blocks weiß TypeScript: `t` ist
**nicht null** (Type Narrowing im Template). Ohne `as` müsste man überall `trip()!.tripStatus` schreiben.

Drei Zustände – **Laden, Daten, Leer/Fehler** – sollte jede datengetriebene Seite abdecken.

### `@for` mit `track` und `@empty`

```html
@for (r of t.reports; track r.guid) {
  <article class="card report">...</article>
} @empty {
  <p class="empty-hint">No field reports filed yet.</p>
}
```

- **`track` ist Pflicht.** Angular nutzt den Schlüssel, um DOM-Elemente wiederzuverwenden, wenn sich die Liste ändert.
  Mit `track r.guid` wird beim Polling nur das geänderte Element neu gerendert, nicht die ganze Liste.
  Immer eine **stabile, eindeutige ID** verwenden – nicht `$index`, wenn sich Reihenfolge ändern kann.
- `@empty` – eingebauter Leerzustand.

### `@switch` / `@case`

```html
@switch (state.role()) {
  @case ('customer') { ... Buchen ... }
  @case ('agent')    { ... Feldkonsole ... }
  @case ('manager')  { ... }
}
```

In `trip-actions.component.html` sogar **verschachtelt**: erst nach Rolle, dann nach `booking().kind`
(`'booked' | 'conflict' | 'underway' | …`). So wird aus einer Fachregel (`bookingInfo()`) direkt eine UI.

### Bindings-Überblick

```html
{{ trip().tripName }}                         <!-- Interpolation -->
[disabled]="busy()"                           <!-- Property-Binding -->
[attr.aria-expanded]="menuOpen()"             <!-- Attribut-Binding (für ARIA, SVG) -->
[class.active]="isActive()"                   <!-- einzelne Klasse an/aus -->
[class]="'badge--' + meta().tone"            <!-- Klassen-String -->
[style.width.%]="timePct()"                   <!-- Style mit Einheit -->
[style.--accent]="accent()"                   <!-- CSS-Variable -->
(click)="book()"                              <!-- Event-Binding -->
(input)="set('phase', $any($event.target).value)"   <!-- Event mit $event -->
<div #scrollEl>                                <!-- Template-Referenz für viewChild -->
```

`$any(...)` schaltet die Typprüfung für einen Ausdruck aus (hier: `$event.target` ist nur `EventTarget`, nicht
`HTMLInputElement`). Sparsam einsetzen.

### Pipes

```html
{{ t.dateInRealLife | date: 'medium' }}     <!-- DatePipe -->
{{ value | number: '1.0-0' }}               <!-- DecimalPipe (Loom) -->
{{ list | slice: 0:5 }}                     <!-- SlicePipe -->
```

Pipes müssen in `imports` stehen (`DatePipe`, `DecimalPipe`, `SlicePipe`). Für eigene Formatierungen nutzt das
Projekt meist Funktionen aus `shared/utils/` (`formatDateTime`, `relativeTime`).

---

## 13. Routing, Lazy Loading & Guards

### Routen-Tabelle (`app.routes.ts`)

```ts
{
  path: 'trip/:guid',
  title: 'Trip',
  loadComponent: () => import('./features/trip-detail/trip-detail.component').then(m => m.TripDetailComponent),
},
{
  path: 'dashboard',
  title: 'Dashboard',
  canActivate: [roleGuard('manager')],
  loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
},
{ path: 'paradox-log', redirectTo: 'paradoxes' },   // alte URL weiterleiten
{ path: '**', redirectTo: '' },                     // alles Unbekannte → Startseite
```

- **`loadComponent` + dynamisches `import()` = Lazy Loading.** Jede Seite ist ein eigener JavaScript-Chunk, der erst
  beim ersten Besuch geladen wird. Ein Kunde lädt nie den Code der Loom. Das hält das initiale Bundle klein
  (siehe Budgets in `angular.json`).
- **`:guid`** – Platzhalter. Dank `withComponentInputBinding()` landet er in `readonly guid = input.required<string>()`.
- **Query-Parameter** werden genauso gebunden: `/missions?trip=abc` → `readonly trip = input<string>()`.
- **`'**'` als letzte Route** – die Reihenfolge ist wichtig, der Router nimmt den ersten Treffer.

### Funktionaler Guard (`core/guards/role.guard.ts`)

```ts
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const app = inject(AppStateService);
    return roles.includes(app.role()) ? true : inject(Router).parseUrl(app.homeRoute());
  };
}
```

- **Guard-Factory**: `roleGuard('manager', 'director')` *erzeugt* einen Guard. Rest-Parameter `...roles` erlauben
  beliebig viele Rollen. Höhere-Ordnung-Funktion = Funktion, die eine Funktion zurückgibt.
- **Funktionale Guards** statt Klassen mit `CanActivate`-Interface – modern und kürzer. `inject()` funktioniert hier,
  weil Angular den Guard im Injection Context ausführt.
- **`UrlTree` statt `false`**: Gibt man `router.parseUrl('/loom')` zurück, **leitet** der Router dorthin um. Mit
  `false` bliebe der Benutzer einfach auf einer leeren Navigation hängen.

> ⚠️ Frontend-Guards sind **UX, keine Sicherheit**. Jeder kann JavaScript im Browser ändern. Die echte Prüfung muss
> das Backend machen (z. B. "nur der Manager des Trips darf Paradoxe ändern" → 403). Das Projekt tut das.

### Navigation

```html
<a [routerLink]="['/trip', trip().guid]">            <!-- Array-Form: Segmente werden korrekt kodiert -->
<a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
   [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
```

- `routerLinkActive="active"` setzt die Klasse `active`, wenn die Route aktiv ist.
- `exact: true` für `/` – sonst wäre "Destinations" bei *jeder* Route aktiv (jede URL beginnt mit `/`).

Programmatisch: `this.router.navigateByUrl(this.state.homeRoute())`.

### Navigation als Konfiguration (`header.component.ts`)

```ts
const NAV: Record<Role, NavItem[]> = {
  customer: [ { path: '/', label: 'Destinations', exact: true }, ... ],
  agent:    [ { path: '/missions', label: 'My Missions' } ],
  ...
};
protected readonly navItems = computed(() =>
  NAV[this.state.role()].filter(item => !item.requiresIdentity || this.state.hasIdentity(this.state.role())),
);
```

`Record<Role, …>` zwingt dazu, für **jede** Rolle einen Eintrag zu haben. Fügt man eine Rolle zum Typ `Role` hinzu,
meckert der Compiler hier, bis man die Navigation ergänzt. **Typsystem als Checkliste.**

---

## 14. Typed Reactive Forms

### Ein Formular definieren (`create-trip-modal.component.ts`)

```ts
protected readonly form = new FormGroup({
  tripName:          new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
  dateInRealLife:    new FormControl('', { nonNullable: true, validators: [Validators.required, futureDate()] }),
  durationHours:     new FormControl(4,  { nonNullable: true, validators: [Validators.required, Validators.min(0.25), Validators.max(720)] }),
  licensedAgentGuid: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});
```

- **Typed Forms**: `form.controls.durationHours.value` ist `number`, nicht `any`. Tippfehler bei Feldnamen sind
  Compile-Fehler.
- **`nonNullable: true`**: Beim `reset()` springt das Feld auf den Startwert statt auf `null` → der Typ bleibt
  `string` statt `string | null`.
- Validatoren als Array – eingebaute (`Validators.*`) und eigene (`futureDate()`).

### Template-Anbindung

```html
<form id="trip-form" class="stack" [formGroup]="form" (ngSubmit)="submit()">
  <app-form-field label="Departure" [control]="form.controls.dateInRealLife" for="trip-date">
    <input class="input" id="trip-date" type="datetime-local" formControlName="dateInRealLife" />
  </app-form-field>
</form>
```

`ReactiveFormsModule` muss in `imports` stehen. `[formGroup]` + `formControlName` verbinden Template und Modell.

### Absenden – das Standardmuster

```ts
protected submit(): void {
  const manager = this.state.currentManager();
  if (this.form.invalid || !manager) {
    this.form.markAllAsTouched();          // alle Fehlermeldungen sichtbar machen
    return;
  }
  const { tripName, dateInRealLife, durationHours, licensedAgentGuid } = this.form.getRawValue();
  this.submitting.set(true);
  this.error.set(null);

  this.api.createTrip(manager.guid, {
    tripName: tripName.trim() || null,                     // leerer String → null
    dateInRealLife: new Date(dateInRealLife).toISOString(), // lokale Zeit → UTC-ISO
    durationMinutes: Math.round(durationHours * 60),        // UI-Einheit → API-Einheit
    licensedAgentGuid,
  }).subscribe({
    next: () => this.created.emit(),
    error: err => {
      this.submitting.set(false);
      this.error.set(toErrorMessage(err, 'Failed to create trip.'));
    },
  });
}
```

Lernpunkte:

1. **`markAllAsTouched()`** – Fehler werden erst nach "touched" angezeigt (nicht schon beim Öffnen des Formulars).
   Beim Submit-Versuch werden alle Felder "touched" → alle Fehler sichtbar.
2. **`getRawValue()`** liefert alle Werte typisiert (auch deaktivierter Felder).
3. **Mapping Formular → Command**: Die UI arbeitet in Stunden und lokaler Zeit, die API in Minuten und UTC. Diese
   Umrechnung passiert an **einer** Stelle.
4. **`submitting`-Signal** → Button deaktivieren + Text "Creating…" → verhindert Doppel-Submits.
5. **Server-Fehler** (z. B. 409 "max. 5 offene Trips") werden zusätzlich angezeigt – Client-Validierung ersetzt nie
   Server-Validierung.

### Eigene Validatoren (`shared/forms/validators.ts`)

```ts
/** Mirrors the backend's MinimumAgeAttribute. */
export function minAge(years: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;           // leer? → das ist Aufgabe von `required`
    const birth = new Date(control.value);
    if (Number.isNaN(birth.getTime())) return { minAge: { requiredAge: years } };
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - years);
    return birth <= threshold ? null : { minAge: { requiredAge: years } };
  };
}

export const PHONE_PATTERN = /^\+\d{11,15}$/;   // Mirrors PhoneNumberAttribute
```

- Ein Validator ist eine Funktion `control → null (gültig) | { fehlerKey: details }`.
- **Factory-Pattern** (`minAge(18)`) für parametrisierte Validatoren.
- **Leere Werte ignorieren** – damit Validatoren kombinierbar sind (Single Responsibility).
- **Spiegeln der Backend-Regeln**: Die Kommentare verweisen auf die C#-Attribute. Der Benutzer bekommt sofortiges
  Feedback, das Backend bleibt trotzdem die Wahrheit.

### Wiederverwendbare Formular-Teile (`shared/forms/address-form.ts`)

```ts
export type AddressForm = FormGroup<{
  street: FormControl<string>; city: FormControl<string>; zipCode: FormControl<number | null>;
}>;

export function createAddressForm(): AddressForm { return new FormGroup({ ... }); }
export function toAddressDto(form: AddressForm): AddressDto { ... }

@Component({
  selector: 'app-address-fields',
  template: `<ng-container [formGroup]="group()"> ... </ng-container>`,
  styles: `:host { display: contents; }`,
})
export class AddressFieldsComponent {
  readonly group = input.required<AddressForm>();
  readonly idPrefix = input('addr-');
}
```

Drei Teile, die zusammengehören: **Factory** (erzeugt die Gruppe), **Mapper** (Gruppe → DTO), **Komponente**
(rendert die Felder). Kunden-, Manager- und Agent-Formular benutzen sie alle.

- `:host { display: contents; }` – das `<app-address-fields>`-Element selbst erzeugt **keine Box**; seine Kinder
  verhalten sich, als wären sie direkt im CSS-Grid des Parents. Sehr nützlicher CSS-Trick.
- `idPrefix` – damit IDs eindeutig bleiben, falls zwei Adressformulare auf einer Seite sind (Label `for` ↔ `id`).

### `FormFieldComponent` – Label + Fehlermeldung zentral

Statt in jedem Formular `@if (ctrl.touched && ctrl.errors?.required) { … }` zu schreiben, gibt es **eine**
Komponente, die aus den Fehler-Keys Texte macht (`message()`), ein `*` für Pflichtfelder zeigt
(`hasValidator(Validators.required)`) und Hinweise (`hint`) anzeigt. Siehe Kapitel 10 für die Signal-Brücke.

Global in `styles.css`:

```css
.input.ng-invalid.ng-touched { border-color: var(--red); }
```

Angular setzt automatisch CSS-Klassen wie `ng-valid`, `ng-invalid`, `ng-touched`, `ng-dirty` auf Formular-Elemente.

> **Übung 14.1:** Füge in `CreateTripModalComponent` einen Validator hinzu, der Trip-Namen mit weniger als 3 Zeichen
> (aber nicht leer) ablehnt, und eine passende Meldung in `FormFieldComponent.message()`.

---

## 15. Reine Funktionen als Business-Logik (utils)

Ein Kernprinzip dieses Projekts: **Fachregeln stehen nicht in Komponenten, sondern in reinen Funktionen.**

Eine *reine Funktion*: gleiche Eingabe → gleiche Ausgabe, keine Seiteneffekte, kein Zugriff auf DI/DOM/Zeit (außer
als Parameter).

### Beispiel: Buchungsregeln (`shared/utils/booking.utils.ts`)

```ts
export type BookingKind = 'booked' | 'underway' | 'over' | 'unavailable' | 'conflict' | 'bookable';

/** Single source of truth for booking rules in the UI (mirrors Customer.AssignToTrip / CheckOutOfTrip). */
export function bookingInfo(
  trip: TripDto,
  customerGuid: string | null,
  allTrips: readonly TripDto[] = [],
  now = Date.now(),                  // ← Zeit als Parameter!
): BookingInfo {
  const isBooked = !!customerGuid && trip.customers.some(c => c.guid === customerGuid);
  if (trip.tripStatus === 'Cancelled') return info('unavailable');
  if (isBooked) {
    const canCancel = trip.tripStatus === 'Scheduled' && Date.parse(trip.dateInRealLife) - now >= CANCELLATION_CUTOFF_MS;
    return info('booked', { canCancel });
  }
  if (trip.tripStatus === 'Completed' || Date.parse(trip.returnInRealLife) <= now) return info('over');
  if (trip.tripStatus === 'Active' || isDeparted(trip.dateInRealLife, now)) return info('underway');
  if (customerGuid) {
    const conflict = allTrips.find(other => ... && tripsOverlap(other, trip));
    if (conflict) return info('conflict', { conflictWith: conflict });
  }
  return info('bookable');
}
```

Warum so gut:

- **`now` als Parameter mit Default**: Im Code wird `Date.now()` benutzt, im Test kann man eine feste Zeit
  übergeben. Zeit ist sonst der Hauptgrund für flaky Tests.
- **Early Returns** (Guard Clauses): Jede Regel ist eine Zeile, keine verschachtelten `if`s.
- **Rückgabe ist ein Zustand (`kind`)**, kein Boolean. Die UI macht daraus per `@switch` den passenden Button-Text.
- **"Single source of truth"**: Landing-Filter (`bookingState`) und Aktionspanel (`bookingInfo`) benutzen dieselbe
  Funktion → sie können sich nie widersprechen.
- **Gespiegelte Backend-Regeln** mit Verweis im Kommentar (`mirrors Customer.AssignToTrip`).

### Weitere Utils

- **`status.utils.ts`** – **Lookup-Tabellen** statt `switch`:
  ```ts
  const TRIP_STATUS: Record<TripStatus, StatusMeta> = {
    Scheduled: { label: 'Scheduled', tone: 'blue' },
    Active:    { label: 'Under way', tone: 'gold' },
    ...
  };
  export function tripStatusMeta(status: string): StatusMeta {
    return TRIP_STATUS[status as TripStatus] ?? { label: status, tone: 'neutral' };
  }
  ```
  Daten statt Code: Ein neuer Status = eine Zeile. Mit Fallback (`??`) für unbekannte Werte.
  Man sieht auch: Der Backend-Wert `Active` wird in der UI als "Under way" angezeigt – **Anzeige und interner Wert
  getrennt**.
- **`date.utils.ts`** – Formatierung, Countdown (`tripTiming`), Überlappung (`tripsOverlap`, "Start inklusiv,
  Ende exklusiv" – klassische Intervall-Logik).
- **`dual-lock.utils.ts`** – "Warum darf ich (noch) nicht?" als Union: `'none' | 'closed' | 'queued' |
  'needsSupport' | 'notPartner' | 'waitingForPartner'` plus `BLOCK_TEXT`-Tabelle für Erklärtexte. Die UI zeigt nicht
  nur einen ausgegrauten Button, sondern **warum**.
- **`paradox-queue.utils.ts`** – Sortierung (`inQueueOrder` – erzeugt eine **Kopie** `[...paradoxes].sort(...)`,
  weil `sort` in-place mutiert!) und Labels ("Now", "Next", "#3").
- **`state/paradox-relevance.ts`** – wer bekommt welche Benachrichtigung.

**Faustregel:** Wenn du in einer Komponente ein `if` mit Fachlogik schreibst, frag dich, ob das in eine reine
Funktion in `utils/` gehört. Dann ist es testbar und wiederverwendbar.

---

## 16. Animation, Canvas, SVG & das Mini-Game

### 16.1 "Phase Lock" – Spiel-Logik getrennt von der Darstellung

`features/paradox-stabilizer/phase-lock.ts` enthält **nur reine Funktionen**: Puzzle erzeugen, Welle berechnen,
Resonanz messen, SVG-Pfad bauen. Die Komponente rendert nur. Dadurch ist die Spielmechanik komplett unit-getestet
(`phase-lock.spec.ts`).

**Deterministischer Zufall:**

```ts
/** Deterministic PRNG (mulberry32) seeded from the paradox GUID, so every paradox is its own puzzle. */
export function seededRandom(seed: string): () => number { ... }

protected readonly puzzle = computed(() =>
  createPuzzle(`${this.paradox().guid}#${this.attempt()}`, this.paradox().paradoxType, this.roundDual()),
);
```

`Math.random()` ist nicht reproduzierbar. Ein **seeded PRNG** liefert für denselben Seed immer dieselbe Folge.
Seed = Paradox-GUID + Versuchsnummer → jedes Paradox hat sein eigenes Rätsel, jeder Versuch ein neues, und Tests sind
deterministisch.

**Datengetriebene Spielregeln:**

```ts
export const TYPE_RULES: Record<ParadoxType, TypeRules> = {
  GrandFatherParadox: { shape: u => Math.sin(u), driftDegPerSec: 9, timeLimitMs: 45_000, briefing: '...' },
  BootstrapParadox:   { shape: u => (Math.sin(u) + 0.35 * Math.sin(2 * u)) / 1.2, driftDegPerSec: 0, ... },
  ...
};
```

Jeder Paradox-Typ ist eine Konfiguration mit einer **Funktion als Wert** (`shape`). Strategy-Pattern als Objekt.

### 16.2 Spielschleife mit `requestAnimationFrame` und Signals

```ts
private startGame(): void {
  ...
  this.phase.set('playing');
  this.lastTick = performance.now();
  this.frame = requestAnimationFrame(t => this.tick(t));
}

private tick(now: number): void {
  const dt = Math.min(100, now - this.lastTick);     // Delta-Zeit, gedeckelt
  this.lastTick = now;
  this.elapsed.update(e => e + dt);
  this.lockMs.update(ms => (this.locked() ? ms + dt : Math.max(0, ms - dt * 2)));

  if (this.lockMs() >= LOCK_HOLD_MS) return this.finish(true);
  if (this.remainingMs() <= 0) return this.finish(false);
  this.frame = requestAnimationFrame(t => this.tick(t));
}
```

- **`requestAnimationFrame`** ruft die Funktion vor dem nächsten Bildschirm-Refresh auf (~60×/s), pausiert in
  Hintergrund-Tabs. Besser als `setInterval` für Animationen.
- **Delta-Zeit (`dt`)**: Bewegung pro *Millisekunde*, nicht pro Frame → gleich schnell auf 60-Hz- und 144-Hz-Monitoren.
- **`Math.min(100, …)`**: War der Tab im Hintergrund, wäre `dt` riesig. Die Deckelung verhindert Sprünge.
- **Signals im Game-Loop**: `elapsed` ändert sich → `target`, `targetPath`, `resonance`, `locked`, `timePct`
  werden als `computed`s neu berechnet → das SVG rendert neu. Die ganze Spiel-Darstellung ist **deklarativ**.
- **Aufräumen**: `inject(DestroyRef).onDestroy(() => this.stopLoop())` – sonst liefe die Schleife nach dem Schließen
  weiter.

**Phasen als State Machine:**

```ts
type Phase = 'briefing' | 'engaging' | 'playing' | 'reporting' | 'won' | 'held' | 'lost';
```

Statt `isPlaying`, `isWon`, `isSending` … gibt es **einen** Zustand. Das Template macht `@switch (phase())`.
Unmögliche Kombinationen ("gewonnen *und* spielt noch") sind ausgeschlossen.

**"Snapshot" für die Runde:**

```ts
/** Fixed for the duration of one round, so a status change mid-round does not swap the puzzle. */
protected readonly roundDual = signal(false);
```

Das Paradox kann sich während des Spiels per Polling ändern. Würde `puzzle` direkt `dualLockRequired` lesen, könnte
sich mitten in der Runde das Rätsel ändern. Lösung: zu Rundenbeginn den Wert in ein eigenes Signal kopieren.
**Lehre:** Manchmal will man *bewusst nicht* reaktiv sein.

### 16.3 SVG im Template

```html
<svg class="scope" [attr.viewBox]="'0 0 ' + viewW + ' ' + viewH" preserveAspectRatio="none" role="img" aria-label="...">
  <path class="wave wave--target" [attr.d]="targetPath()" />
  <path class="wave wave--agent" [attr.d]="wavePathD()" />
</svg>
```

SVG-Attribute bindet man mit `[attr.xxx]`. Der Pfad (`M0,100 L4.3,95.2 …`) wird von einer reinen Funktion
(`wavePath`) erzeugt. `viewBox` + `preserveAspectRatio="none"` → das SVG skaliert auf jede Breite.

### 16.4 Canvas für viele Partikel (Sternenhimmel)

`EraTimelineComponent.initStarfield()` und die Loom zeichnen hunderte Sterne auf ein `<canvas>`:

- **Warum Canvas statt DOM/SVG?** 260 animierte Sterne als DOM-Elemente wären langsam. Canvas zeichnet Pixel direkt.
- **Läuft außerhalb von Angulars Rendering**: Die Schleife liest zwar `this.scrollX()` (für Parallax), schreibt aber
  in kein Signal → kein Angular-Rerender pro Frame.
- **Parallax**: Sterne in 3 Ebenen bewegen sich mit unterschiedlichem Faktor (`DEPTHS = [0.12, 0.32, 0.62]`) zum Scrollen.
- **Aufräumen**: `cancelAnimationFrame` und `removeEventListener('resize', …)` in `ngOnDestroy`.

### 16.5 Bezier-Kurven & Daten → Geometrie (Loom)

`loom.component.ts` berechnet die Position jedes Trips auf einer kubischen Bézier-Kurve (`cubicBezier(...)`) und
leitet aus dem Paradox-Feed "Branches" ab. Ein `effect` baut sie bei jeder Feed-Änderung neu; ein Vergleich mit
`previousStatuses` erkennt den Wechsel "offen → gelöst" und startet eine Heil-Animation. **Muster: Diffing zwischen
altem und neuem Zustand, um Übergänge zu animieren.**

### 16.6 CSS-Animationen

Globale `@keyframes` in `styles.css` (`fadeSlideIn`, `pulseGlow`, `led-blink`, `holo-scan` …) werden in vielen
Komponenten wiederverwendet. Und:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Benutzer, die im Betriebssystem "Bewegung reduzieren" aktiviert haben (z. B. wegen Schwindel), bekommen keine
Animationen. **Barrierefreiheit für Bewegung.**

---

## 17. Styling: Design Tokens, Utility-Klassen, CSS-Variablen

### 17.1 Design Tokens (`src/styles.css`)

```css
:root {
  --bg: #0B1120;
  --surface: #1E2A3A;
  --gold: #C9A84C;
  --text: #F0EDE6;
  --text-muted: #8A93A6;
  --red: #E05A4E;
  --font-display: 'Fraunces', Georgia, serif;
  --radius: 4px;
  --page-gutter: clamp(16px, 4vw, 56px);
}
```

**Alle** Farben, Schriften, Radien als **CSS Custom Properties** an einer Stelle. Komponenten schreiben
`color: var(--text-muted)` statt `#8A93A6`. Vorteile: konsistentes Design, Theme-Wechsel an einer Stelle,
lesbare Namen statt Hex-Codes.

`clamp(16px, 4vw, 56px)` = "4 % der Viewport-Breite, aber mindestens 16 px und höchstens 56 px" – **fluides,
responsives Spacing ohne Media Queries**.

### 17.2 Utility-Klassen

```css
.page  { max-width: 1360px; margin: 0 auto; padding: 40px var(--page-gutter) 96px; }
.stack { display: flex; flex-direction: column; gap: 16px; }
.row   { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.card  { background: var(--surface); border-radius: var(--radius); padding: 24px; }
.btn, .btn--primary, .btn--sm, .btn--block ...
.badge, .badge--red, .badge--gold ...
```

Ein kleines, selbstgebautes Design-System im **BEM-ähnlichen** Stil (`block--modifier`). Komponenten-CSS enthält nur
das, was wirklich komponentenspezifisch ist.

Projekt-Regel: **keine `style=""`-Attribute** im HTML. Alles über Klassen oder Bindings.

### 17.3 Daten → Farbe: CSS-Variablen per Binding + `color-mix()`

Wie färbt man eine Komponente mit einer Farbe, die aus den **Daten** kommt (z. B. Paradox-Typ-Farbe), ohne
Inline-Styles?

```html
<div class="game" [style.--accent]="accent()">     <!-- Template: Variable setzen -->
```

```css
/* CSS: Variable benutzen und abtönen */
--a33: color-mix(in srgb, var(--accent) 33%, transparent);
box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 13%, transparent);
```

- `[style.--accent]` setzt eine CSS-Variable auf dem Element; sie vererbt sich an alle Kinder.
- `color-mix(in srgb, X 33%, transparent)` = Farbe X mit 33 % Deckkraft – **ohne** dass man im JavaScript Farben
  umrechnen muss.
- Auch numerische Werte gehen: `[style.--instability]="instability()"` steuert im CSS z. B. die Stärke eines
  Glitch-Effekts.

Das ist eine sehr moderne, saubere Technik: **JS liefert Daten, CSS entscheidet die Darstellung.**

### 17.4 Layout-Techniken

```css
.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 24px; }
.split { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 48px; }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; } }
```

- `repeat(auto-fill, minmax(300px, 1fr))` – **responsives Karten-Grid ohne Media Query**: so viele Spalten wie
  passen, jede mindestens 300 px. `min(100%, 300px)` verhindert Überlauf auf sehr schmalen Bildschirmen.
- `minmax(0, 1.6fr)` statt `1.6fr` – verhindert, dass langer Inhalt die Spalte sprengt (häufiger Grid-Bug).
- `:host` in Komponenten-CSS stylt das Komponenten-Element selbst; `:host { display: block; }` ist wichtig, weil
  Custom Elements standardmäßig `inline` sind.

### 17.5 Schriften & Fokus

- Google Fonts per `@import` (Fraunces für Überschriften, IBM Plex Sans/Mono für Text/Zahlen).
- `:focus-visible { outline: 2px solid var(--gold); }` – sichtbarer Fokusring **nur bei Tastaturnavigation**,
  nicht bei Mausklicks.

---

## 18. Barrierefreiheit (a11y)

Beispiele aus dem Code, die du dir angewöhnen solltest:

| Technik | Wo | Zweck |
|---|---|---|
| `role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId"` | Modal | Screenreader erkennen Dialog + Titel |
| `titleId = \`modal-title-${nextId++}\`` (Modul-Zähler) | Modal | eindeutige IDs, auch bei mehreren Modals |
| `aria-haspopup="menu" [attr.aria-expanded]="menuOpen()"` | Header | Dropdown-Zustand vorlesbar |
| `role="menu"` / `role="menuitem"` / `role="none"` | Header | Menü-Semantik |
| `role="status"` | Toasts | wird vorgelesen, ohne den Fokus zu stehlen |
| `role="alert"` | Form-Fehler | Fehler werden sofort vorgelesen |
| `aria-live="polite"` | Buchungsbestätigung | dynamische Änderung ankündigen |
| `aria-label="Close"` auf "×"-Buttons | Modal, Toast | Icon-Buttons brauchen Text |
| `aria-hidden="true"` | Deko (▾, *, Zeitleiste) | Deko nicht vorlesen |
| `<label [attr.for]>` ↔ `<input [id]>` | FormField | Klick aufs Label fokussiert Input |
| `autocomplete="street-address"` | Adressformular | Browser-Autofill |
| `type="button"` auf allen Nicht-Submit-Buttons | überall | verhindert versehentliches Absenden von Formularen |
| Escape schließt Modal/Menü | `host`-Listener | Tastaturbedienung |
| `prefers-reduced-motion` | styles.css | Bewegungsempfindlichkeit |
| `role="img"` + `aria-label` auf SVG | Mini-Game | Grafik beschreiben |

---

## 19. Tests mit Vitest

Ausführen: `npm test` (im Frontend-Ordner). Tests liegen **neben** dem Code (`*.spec.ts`).

### 19.1 Reine Funktionen testen – am einfachsten

```ts
// paradox-stabilizer/phase-lock.spec.ts
it('is deterministic per paradox', () => {
  expect(createPuzzle('abc', 'BootstrapParadox')).toEqual(createPuzzle('abc', 'BootstrapParadox'));
});

it('a slightly detuned wave still locks, an opposed one does not', () => {
  const puzzle = createPuzzle('paradox-2', 'InformationParadox');
  const close   = { ...puzzle.target, phase: puzzle.target.phase + 4 };
  const opposed = { ...puzzle.target, phase: puzzle.target.phase + 180 };
  expect(resonance(puzzle.type, close, puzzle.target)).toBeGreaterThan(LOCK_THRESHOLD);
  expect(resonance(puzzle.type, opposed, puzzle.target)).toBe(0);
});
```

Kein Angular, kein DOM, kein Mocking. **Genau deshalb** wird Logik in reine Funktionen ausgelagert.

**Test-Fabriken** mit Overrides (`paradox-relevance.spec.ts`):

```ts
const paradox = (overrides: Partial<ParadoxFeedDto> = {}): ParadoxFeedDto => ({
  guid: 'p1', paradoxStatus: 'InQueue', ..., ...overrides,
});
expect(isParadoxRelevant(paradox(), ctx({ role: 'agent', agentId: 7 }))).toBe(true);
```

Jeder Test gibt nur an, was für ihn wichtig ist. Der Rest hat sinnvolle Defaults.

### 19.2 Guards testen – `TestBed.runInInjectionContext`

```ts
const run = (...roles: Parameters<typeof roleGuard>) =>
  TestBed.runInInjectionContext(() => roleGuard(...roles)({} as never, {} as never));

it('redirects other roles to their own home page', () => {
  TestBed.inject(AppStateService).enterTimeMode();
  const result = run('manager', 'director') as UrlTree;
  expect(TestBed.inject(Router).serializeUrl(result)).toBe('/loom');
});
```

Weil der Guard `inject()` benutzt, muss er in einem Injection Context laufen – `runInInjectionContext` stellt den
bereit. `Parameters<typeof roleGuard>` übernimmt die Parameter-Typen der Funktion.

### 19.3 Stores mit HTTP und Zeit testen

```ts
beforeEach(() => {
  vi.useFakeTimers();                                       // Zeit kontrollieren
  sessionStorage.clear();                                   // sauberer Zustand
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  store = TestBed.inject(ParadoxFeedStore);
  http = TestBed.inject(HttpTestingController);             // HTTP abfangen
});

it('notifies about paradoxes that appear at runtime, but not about the initial load', () => {
  store.start();
  vi.advanceTimersByTime(0);
  flushFeed([paradox('a')]);                                // 1. Poll beantworten
  expect(notifications.toasts().length).toBe(0);            // kein Toast beim ersten Laden

  vi.advanceTimersByTime(PARADOX_POLL_MS);                  // 5 s "vorspulen"
  flushFeed([paradox('new', { tripType: 'CriticalTrip' }), paradox('a')]);
  expect(notifications.toasts().length).toBe(1);            // jetzt genau ein Toast
});

it('marks the feed offline when the backend is unreachable', () => {
  store.start();
  vi.advanceTimersByTime(0);
  http.expectOne('/api/Paradox').error(new ProgressEvent('error'), { status: 0 });
  expect(store.online()).toBe(false);
});
```

- **`provideHttpClientTesting()` + `HttpTestingController`**: Es gehen keine echten Requests raus; der Test sagt
  `expectOne(url).flush(data)` bzw. `.error(...)`.
- **`vi.useFakeTimers()` + `advanceTimersByTime`**: 5 Sekunden Polling vergehen in 0 ms Testzeit.
- **Signals lassen sich im Test direkt lesen**: `store.online()`, `notifications.toasts()`.
- Der Export `PARADOX_POLL_MS` wird im Test benutzt → Test und Code bleiben synchron.

Getestete Dateien: `booking.utils`, `dual-lock.utils`, `paradox-queue.utils`, `status.utils`, `error-message`,
`role.guard`, `paradox-relevance`, `paradox-feed.store`, `phase-lock`, `app`.

> **Übung 19.1:** Schreibe einen Test für `bookingInfo`, der prüft, dass ein gebuchter Trip 30 Minuten vor Abflug
> `canCancel: false` liefert. Tipp: übergib `now` explizit.

---

## 20. TypeScript-Muster, die überall vorkommen

| Muster | Beispiel | Wozu |
|---|---|---|
| String-Literal-Union | `type Role = 'customer' \| 'agent' \| …` | erlaubte Werte, Autocomplete |
| `Record<K, V>` | `Record<Role, NavItem[]>` | Vollständigkeit erzwingen |
| Discriminated Union | `{ ok: true; data } \| { ok: false; error }` | typsicheres Ergebnis |
| `Exclude<T, U>` | `Exclude<Role, 'time'>` | Typ einschränken |
| `Omit<T, K>` | `Omit<Toast, 'id'>` | Feld weglassen |
| `Partial<T>` | `Partial<Session>` | Patch-Updates, Test-Overrides |
| `Pick<T, K>` | `Pick<ParadoxFeedDto, 'queuePosition' \| …>` | Funktion braucht nur Teilmenge → flexibler, besser testbar |
| `Parameters<typeof f>` | im Guard-Test | Typen ableiten statt duplizieren |
| `readonly T[]` | `allTrips: readonly TripDto[]` | Funktion verspricht, nicht zu mutieren |
| `as const` | `RANGES = {...} as const` | Literal-Typen, unveränderlich |
| Optional Chaining `?.` | `this.app.currentAgent()?.id` | null-sicherer Zugriff |
| Nullish Coalescing `??` | `t.tripName ?? 'Uncatalogued Destination'` | Default nur bei null/undefined (nicht bei `''`/`0`) |
| `!!x` | `!!customerGuid && …` | in Boolean umwandeln |
| `unknown` statt `any` | `toErrorMessage(err: unknown)` | zwingt zur Prüfung |
| Generics mit Constraint | `inQueueOrder<T extends QueueFields>(…): T[]` | funktioniert für alle Typen mit diesen Feldern und gibt den **gleichen** Typ zurück |
| Numerische Separatoren | `45_000`, `3_600_000` | Lesbarkeit |
| Rest-Parameter | `roleGuard(...roles: Role[])` | variable Anzahl Argumente |
| Default-Parameter | `now = Date.now()` | Testbarkeit |

**`Pick` statt ganzem DTO** – ein subtiles, aber starkes Muster (`dual-lock.utils.ts`):

```ts
type LockFields = Pick<ParadoxFeedDto, 'paradoxStatus' | 'licensedAgentId' | 'agentId' | 'dualLockRequired' | ...>
  & Partial<Pick<ParadoxFeedDto, 'queuePosition'>>;
export function stabiliseBlock(p: LockFields, agentId: number | null | undefined): StabiliseBlock { ... }
```

Die Funktion deklariert genau, welche Felder sie braucht. Im Test muss man nur diese angeben, und der Code
dokumentiert seine echten Abhängigkeiten.

---

## 21. Ein kompletter Datenfluss zum Nachverfolgen

**Szenario: Ein Kunde bucht einen Trip.** Verfolge das im Code mit – das verbindet alle Kapitel.

1. **URL** `/trip/abc-123` → Router findet `trip/:guid` → lädt `TripDetailComponent` **lazy** (Kapitel 13).
2. `withComponentInputBinding()` setzt `guid = 'abc-123'` (Kapitel 3).
3. `trip = computed(() => agency.tripsByGuid().get(this.guid()))` liefert den Trip aus dem Store (Kapitel 4, 9).
4. Template: `@else if (trip(); as t)` → rendert Seite; `<app-trip-actions [trip]="t">` (Kapitel 11, 12).
5. `TripActionsComponent.booking = computed(() => bookingInfo(trip, customerGuid, allTrips))` → `'bookable'` (Kapitel 15).
6. `@switch (booking().kind) @case ('bookable')` → Button "Book this trip" (Kapitel 12).
7. Klick → `book()`:
   - Kein Kunde angemeldet? → `state.requestRole('customer')` → `App` zeigt `IdentityPickerModal` (Kapitel 3).
   - Sonst `busy.set(true)` → Button zeigt "Booking…" und ist deaktiviert.
8. `tripApi.bookTrip(...)` → `POST /api/Trip/abc-123/book/xyz` → Dev-Proxy → Backend (Kapitel 2, 8).
9. **Erfolg:** `justBooked.set(true)` → Bestätigungsanimation; `setTimeout` blendet sie nach 1,8 s aus;
   `agency.refresh()` → `reload$.next()` → `switchMap` + `forkJoin` laden alles neu (Kapitel 9, 10).
10. `trips.set(neueTrips)` → `tripsByGuid` → `trip` → `booking` rechnet neu → jetzt `'booked'` → Button
    "You are booked" + "Cancel booking". **Und gleichzeitig** aktualisiert sich "My Journeys", die Landing-Page und
    der Traveller-Zähler – ohne eine einzige Zeile Extra-Code.
11. **Fehler (z. B. 409 Überschneidung):** `toErrorMessage(err)` macht daraus einen Satz → `error.set(...)` →
    Template zeigt ihn (Kapitel 8).

> **Übung 21.1:** Verfolge auf dieselbe Weise "Agent stabilisiert ein Paradox" von `AgentMissionsComponent` über
> `ParadoxStabilizerComponent.begin()` → `feed.engage()` → Spielschleife → `feed.stabilise()` → Toast. Schreibe die
> Schritte auf.

---

## 22. Umdenken: Was man anders macht als in React

In diesem Kapitel geht es nicht um Syntax (`{{ }}` statt `{}`, `@if` statt `&&`), sondern um **Denkweisen**. Wer aus
React kommt, schreibt sonst "React in Angular" und kämpft gegen das Framework. Jeder Punkt verweist auf eine Stelle
in diesem Projekt.

### 22.1 Framework statt Bibliothek: Nimm, was schon da ist

**React** ist eine UI-Bibliothek. Routing, Datenladen, Formulare, State und Tests sucht man sich selbst aus
(React Router, TanStack Query, Redux/Zustand, React Hook Form, Jest …). Jedes Projekt sieht anders aus.

**Angular** ist ein Framework mit festen Antworten: `@angular/router`, `HttpClient`, Reactive Forms,
Dependency Injection, Signals, RxJS, TestBed und CLI-Builder gehören dazu.

**In der Praxis heißt das:**

- **Bau nicht reflexartig deinen React-Stack nach.** Das Projekt kommt ohne axios, Redux, Formik oder React Query
  aus (siehe `package.json`, Kapitel 2). Eine zusätzliche Bibliothek brauchst du nur, wenn Angular etwas
  wirklich nicht kann.
- **Halte dich an die Konventionen.** Andere Angular-Entwickler finden sich sofort zurecht, weil Dateinamen
  (`*.component.ts`, `*.service.ts`), Ordner (`core/shared/features`) und Muster überall ähnlich sind. In React ist
  Kreativität bei der Struktur normal, in Angular ist Gleichförmigkeit ein Vorteil.

### 22.2 Komponenten werden nicht bei jedem Render neu ausgeführt

Das ist **der wichtigste Unterschied**, und aus ihm folgen viele andere.

**React:** Eine Funktionskomponente ist eine Funktion, die **bei jedem Render komplett neu läuft**. Jede Variable,
jede Arrow-Function, jedes Objekt entsteht neu. Darum gibt es `useMemo`, `useCallback`, `React.memo`,
Dependency-Arrays, die Hook-Regeln (keine Hooks in `if`s) und das Problem der **Stale Closures**.

**Angular:** Eine Komponente ist eine **Klasse, die einmal instanziiert wird**. Konstruktor und Feld-Initialisierer
laufen **genau einmal**. Danach aktualisiert Angular nur die Template-Bindungen, deren Signals sich geändert haben.

```ts
// TripDetailComponent – läuft einmal, nicht bei jedem Render
protected readonly trip = computed(() => this.agency.tripsByGuid().get(this.guid()) ?? null);
protected readonly agentName = (id: number) => this.agency.agentName(id);   // stabile Referenz, kein useCallback nötig
```

**Konsequenzen für deine Praxis:**

- **Kein Memoisieren aus Angst.** `computed` ist von sich aus memoisiert; eine Arrow-Function als Klassenfeld ist
  von sich aus stabil. Es gibt kein Gegenstück zu `useCallback`, weil man keins braucht.
- **Keine Dependency-Arrays pflegen.** `computed`/`effect` merken sich ihre Abhängigkeiten **automatisch** über die
  gelesenen Signals. "Vergessene Dependency" als Fehlerquelle gibt es nicht. Die neue Fehlerquelle ist eher die
  andere Richtung: ungewollte Abhängigkeiten, gegen die `untracked()` hilft (Kapitel 4.5).
- **Keine Hook-Regeln, aber Injection-Context-Regeln.** Statt "Hooks nur oben in der Komponente" gilt:
  `inject()`, `effect()` und `takeUntilDestroyed()` nur im Konstruktor oder in Feld-Initialisierern (Kapitel 6).
- **Normale Felder sind wirklich normal.** `private known: Set<string> | null` im `ParadoxFeedStore` oder
  `private frame: number | null` im Mini-Game sind einfache Instanzfelder, die über Renders hinweg erhalten bleiben.
  In React bräuchtest du dafür `useRef`. Wichtig: Sie lösen **kein** Rendern aus. Für alles Sichtbare gilt also:
  Signal (Kapitel 5).

### 22.3 Zustand gehört in Services, nicht in den Komponentenbaum

**React:** Zustand lebt in Komponenten (`useState`). Brauchen ihn mehrere Komponenten, wird er **nach oben gehoben**
(Lifting State Up) und per Props weitergereicht oder über **Context** verteilt. Für globalen Zustand nimmt man eine
externe Bibliothek.

**Angular:** Geteilter Zustand gehört in einen **injizierbaren Service**. `AgencyStore`, `AppStateService` und
`ParadoxFeedStore` sind `providedIn: 'root'`-Singletons, und jede Komponente holt sie sich direkt mit `inject()`.

**Praktisch heißt das:**

- **Keine Props über fünf Ebenen durchreichen** und keinen Context-Provider-Turm bauen. `TripActionsComponent`
  bekommt den Trip als Input, holt sich Rolle, Feed und Notifications aber selbst per `inject()`.
- **Kein Lifting State Up für App-Daten.** Wenn zwei Seiten dieselben Trips zeigen, gehört die Liste in einen Store,
  nicht in eine gemeinsame Eltern-Komponente.
- **Lokaler UI-Zustand bleibt lokal.** `busy`, `menuOpen`, `assignOpen` sind Signals in der Komponente, genau wie
  `useState`. Die Frage ist immer: Braucht das jemand außerhalb? Wenn ja, kommt es in einen Service.
- **DI ist mehr als Context:** Man kann Implementierungen austauschen
  (`{ provide: TitleStrategy, useClass: PageTitleStrategy }`, Kapitel 3) und im Test ersetzen, ohne Module zu mocken.

### 22.4 Wiederverwendbare Logik: Services und Funktionen statt Custom Hooks

**React:** Wiederverwendbare Logik mit Zustand steckt in **Custom Hooks** (`useBooking()`, `usePolling()`).

**Angular** teilt das auf:

| Was du in React mit einem Hook machst | Was du in Angular machst | Beispiel im Projekt |
|---|---|---|
| geteilter Zustand + Methoden (`useAuth`) | Service mit Signals | `AppStateService` |
| Daten laden + cachen (`useQuery`) | Store-Service mit RxJS | `AgencyStore` |
| reine Berechnung (`useBookingInfo`) | **reine Funktion** in `utils/` + `computed` | `bookingInfo()` |
| Polling / Intervall (`useInterval`) | RxJS `timer`/`interval` + `takeUntilDestroyed` | `ParadoxFeedStore.start()` |
| Konfigurierbare Logik mit DI | Factory-Funktion mit `inject()` | `roleGuard(...roles)` |

Reine Logik ist in Angular **bewusst framework-frei**. `booking.utils.ts`, `dual-lock.utils.ts` und `phase-lock.ts`
importieren nichts aus Angular und lassen sich deshalb ohne TestBed testen (Kapitel 15, 19). In React würde man so
etwas oft gleich in einen Hook packen. In Angular lohnt es sich, Logik zuerst als reine Funktion zu schreiben.

### 22.5 `effect()` ist nicht `useEffect()`

Das ist die häufigste Falle für React-Entwickler.

**React:** `useEffect` ist ein Allzweckwerkzeug. Man lädt damit Daten, synchronisiert abgeleiteten State
(`useEffect(() => setFiltered(...), [items])`) und registriert Listener.

**Angular:**

- **Abgeleiteter Zustand = `computed`, niemals `effect` + `set`.** Die Filter der Landing-Page sind ein einziges
  `computed` (`LandingComponent.trips`), kein Effekt, der eine zweite Liste befüllt.
- **Daten laden = Methode im Service, ausgelöst durch einen Aufruf** (`ensureLoaded()`, `refresh()`), nicht ein Effekt,
  der beim Mounten feuert.
- **`effect` nur für die Synchronisierung mit der Außenwelt**: Werte ins (nicht-signal-basierte) Formular schreiben
  (`AgentMissionsComponent`), Scrollen (`EraTimelineComponent`), ein Modal als Reaktion auf eine Zustandskombination
  öffnen (`App`). Das Projekt hat 38 Komponenten und nur in 4 Dateien Effekte, und so soll es sein.
- **Kein Cleanup-Return.** Aufgeräumt wird über `DestroyRef.onDestroy`, `takeUntilDestroyed` oder `ngOnDestroy`.
- **Kein doppeltes Ausführen wie im React Strict Mode.** Konstruktoren laufen einmal. Defensive "läuft das zweimal?"-
  Logik brauchst du nicht (außer bei echten Singletons wie `ParadoxFeedStore.start()` mit seinem `started`-Flag).

### 22.6 Asynchronität mit RxJS denken, nicht mit Flags

**React:** Bei Requests in `useEffect` muss man Race Conditions selbst behandeln (`let ignore = true` im Cleanup,
`AbortController`) oder überlässt das React Query.

**Angular:** Man **modelliert Ereignisse als Ströme** und lässt Operatoren die Probleme lösen:

- `switchMap` bricht veraltete Requests automatisch ab (`AgencyStore`, `ParadoxFeedStore`).
- `forkJoin` wartet auf mehrere parallele Requests.
- `catchError` an der richtigen Stelle hält einen Strom am Leben (Kapitel 9.2, Punkt 5).

Die Denkweise ist: **"Welche Ereignisse gibt es, und wie hängen sie zusammen?"** statt "Welche Flags muss ich
setzen?". Es ist auch kein Zufall, dass Observables "kalt" sind: Ohne `subscribe` passiert nichts. Wer aus der
Promise-Welt kommt, vergisst das schnell.

Faustregel noch einmal: **Signals für Zustand, RxJS für Ereignisse über Zeit.** Hol dir RxJS nicht für einfachen
Zustand ins Haus, und quäl dich nicht mit Signals für Polling, Abbrechen und Timer.

### 22.7 Templates sind kein JavaScript: Logik gehört in die Klasse

**React:** JSX ist JavaScript. Man schreibt `items.filter(...).map(...)`, Ternaries und Hilfsfunktionen direkt in die
Render-Funktion, und das ist normal.

**Angular:** Templates sind eine **eingeschränkte, typgeprüfte Sprache**. Keine Imports, keine beliebigen Ausdrücke,
und Funktionsaufrufe laufen bei jeder Prüfung der Komponente.

**Praktisch:**

- **Berechnungen in `computed`s in der Klasse**, das Template liest nur: `openParadoxes()`, `booking().kind`,
  `stats()`. Das Template beschreibt nur noch, *was* angezeigt wird, nicht *wie* es berechnet wird.
- **Utility-Funktionen explizit freigeben** (`protected readonly typeLabel = paradoxTypeLabel;`, Kapitel 11.3).
- **Zustände als Union modellieren** und im Template mit `@switch` darstellen (`BookingKind`, `Phase`), statt
  verschachtelter Ternaries.
- Im Gegenzug fängt `strictTemplates` Tippfehler im Template beim Kompilieren ab.

### 22.8 Kommunikation zwischen Komponenten: Outputs statt Callback-Props

**React:** Kinder melden sich beim Parent, indem sie eine **Funktion als Prop** aufrufen (`onClose`, `onSave`).

**Angular:** Der Standardweg ist ein **`output()`**, das der Parent mit `(closed)="…"` abonniert
(`ModalComponent`, alle Modals, `ParadoxListComponent`). Das Kind weiß nicht, wer zuhört. Das macht die
Komponenten-API expliziter, und in den Angular DevTools sieht man die Outputs.

Funktionen als Inputs gibt es im Projekt auch (`canAct`, `actionHint`, `agentName` in `ParadoxListComponent`), aber
für einen anderen Zweck: Sie **fragen etwas ab** ("darf diese Zeile einen Button haben?"), sie melden kein Ereignis.
Faustregel: **Ereignis → `output()`, Konfiguration/Berechnung → `input()`.**

### 22.9 Komposition: Content Projection und Services statt Render Props und HOCs

| React-Muster | Angular-Gegenstück | im Projekt |
|---|---|---|
| `props.children` | `<ng-content />` | `PageHeaderComponent`, `EmptyStateComponent` |
| mehrere "Slots" als Props (`footer={…}`) | `<ng-content select="[modal-actions]" />` | `ModalComponent` |
| Higher-Order Component / Wrapper | Direktiven, `host`-Bindings, Services | `TimelinePinComponent` (`host: {…}`) |
| Render Props | `ng-template` + `ngTemplateOutlet` (hier nicht nötig) | – |
| Portal für Modals | Modal-Signal im Root + bedingtes Rendern | `App` + `pendingRole` |

### 22.10 Formulare: Das Modell lebt in der Klasse

**React:** Meistens **kontrollierte Komponenten**: Jeder Tastendruck setzt State und rendert neu. Validierung baut man
selbst oder nutzt eine Bibliothek.

**Angular Reactive Forms:** Das Formular ist ein **Objektmodell** (`FormGroup`/`FormControl`) in der Klasse. Das
Template wird nur per `formControlName` angebunden. Wert, Validierung, `touched`/`dirty`, Fehler und CSS-Klassen
(`ng-invalid`) liefert das Framework.

**Umdenken:**

- Kein `value` + `onChange` pro Feld. Man liest am Ende `form.getRawValue()` (Kapitel 14).
- Validierung ist **deklarativ und wiederverwendbar** (`minAge(18)`, `futureDate()`), nicht im Submit-Handler verteilt.
- Fehler zeigt man **nach `touched`** an und ruft beim Submit `markAllAsTouched()` auf. Das ist eingebaut und muss
  nicht nachgebaut werden.
- Teilformulare sind **Factory + Komponente** (`createAddressForm()` + `AddressFieldsComponent`), keine
  verschachtelten State-Objekte.

### 22.11 Routing ist zentrale Konfiguration

**React Router** wird oft als JSX-Baum verteilt in den Komponenten definiert; Schutz baut man als Wrapper-Komponente
(`<RequireAuth>`), Parameter holt man mit `useParams()`.

**Angular:** **Eine zentrale Routen-Tabelle** (`app.routes.ts`) mit Lazy Loading, Titeln, Guards und Redirects.
Parameter kommen als **Inputs** in die Komponente (`withComponentInputBinding()`). Die Seite weiß also nicht einmal,
dass ihr Wert aus der URL stammt, und lässt sich deshalb leicht testen und wiederverwenden. Zugriffsschutz ist ein
**Guard** (`roleGuard`), keine Wrapper-Komponente.

### 22.12 Rendern wird nicht automatisch ausgelöst

**React:** `setState` löst **immer** ein Rendern aus. Mutationen ohne `setState` sind unsichtbar, aber das Werkzeug
dafür ist eindeutig.

**Angular (zoneless):** Genau dasselbe Prinzip gilt hier für **Signals**: Ein Rendern gibt es nur, wenn ein Signal
geändert wird (oder ein Template-Event feuert). Wer Angular-Tutorials von früher kennt (mit zone.js), hat gelernt,
dass "einfach ein Feld ändern" reicht. **In diesem Projekt reicht es nicht** (Kapitel 5). Für React-Entwickler ist
das sogar vertraut: Ein Signal ist dein `setState`, und immutable Updates (`[...list]`) sind genauso nötig wie in React.

Der Unterschied liegt in der **Granularität**: React rendert die Komponente und ihre Kinder neu und vergleicht den
Virtual DOM. Angular aktualisiert nur die Bindungen, die das geänderte Signal lesen. Darum brauchst du in Angular kein
`React.memo` und musst nicht über Rendering-Kaskaden nachdenken.

### 22.13 Styling ist standardmäßig gekapselt

**React:** Ohne Zusatz ist CSS global. Man wählt CSS Modules, styled-components, Tailwind …

**Angular:** Komponenten-CSS ist **automatisch auf die Komponente beschränkt** (View Encapsulation). Globale Regeln
gehören bewusst in `styles.css` (Tokens, Utility-Klassen). **Praktisch:** Schreib Klassennamen ruhig kurz und
generisch (`.head`, `.title`, `.close`, siehe `ModalComponent`), sie kollidieren nicht. Für Werte aus Daten nutzt man
CSS-Variablen per Binding (`[style.--accent]`), nicht Style-Objekte (Kapitel 17.3).

### 22.14 Testen über DI statt über Modul-Mocks

**React (Jest/Vitest + Testing Library):** Abhängigkeiten ersetzt man oft mit `jest.mock('./api')` auf Modulebene;
getestet wird gerendertes DOM.

**Angular:** Man ersetzt Abhängigkeiten über **Provider** im `TestBed`
(`provideHttpClientTesting()`, Kapitel 19). Weil die Logik in Services und reinen Funktionen steckt, kann man
**Stores ohne DOM** testen und Signals direkt prüfen (`store.online()`). Das funktioniert, weil DI die Abhängigkeiten
explizit macht, und es ist ein weiterer Grund, Zustand nicht in Komponenten zu verstecken.

### 22.15 Zusammenfassung: Die React-Reflexe und ihr Angular-Gegenstück

| React-Reflex | In Angular stattdessen |
|---|---|
| "Ich brauche eine Bibliothek für X" | erst prüfen, was Angular mitbringt |
| `useState` für geteilten Zustand + Lifting/Context | Service mit Signals + `inject()` |
| `useMemo` / `useCallback` / `React.memo` | `computed`, Klassenfelder (einmal erzeugt) |
| `useEffect` zum Ableiten von State | `computed` |
| `useEffect` zum Laden von Daten | Store-Methode + RxJS (`switchMap`) |
| Custom Hook | Service, reine Funktion oder Factory mit `inject()` |
| `useRef` für veränderliche Werte | normales Klassenfeld |
| Logik in JSX | `computed` in der Klasse, schlankes Template |
| Callback-Prop für Ereignisse | `output()` |
| `children` / Render Props | `<ng-content>` (mit `select`) |
| Kontrollierte Inputs | Reactive Forms (Modell in der Klasse) |
| Routen im JSX, `useParams` | zentrale Routen-Tabelle, Parameter als `input()` |
| `<RequireAuth>`-Wrapper | funktionaler Guard |
| `jest.mock` | Provider im `TestBed` |
| freie Projektstruktur | Angular-Konventionen (`core/shared/features`) |

> **Übung 22.1:** Nimm `LandingComponent` und skizziere, wie du sie in React schreiben würdest (mit `useState`,
> `useMemo`, `useContext`). Vergleiche: Welche Teile verschwinden in Angular ganz, und warum?

---

## 23. Kritische Anmerkungen & Verbesserungsideen

Guter Code ist nicht perfekt – zu lernen, wo man ihn verbessern könnte, ist genauso wertvoll:

1. **Inkonsistente Fehlerbehandlung in `ParadoxFeedStore`:** `engage()` gibt bei fehlendem Agent
   `throwError(() => …)` zurück (Observable-Fehler), `stabilise()` dagegen wirft **synchron** `throw new Error(…)`.
   Ein Aufrufer, der nur `subscribe({ error })` benutzt, fängt den zweiten Fall nicht. Besser: beide gleich
   (`throwError`).
2. **Polling vs. Push:** Alle 5 s den ganzen Feed zu laden skaliert schlecht. Mit **SignalR** (ASP.NET) oder
   Server-Sent Events könnte das Backend Änderungen pushen.
3. **`agency.refresh()` lädt immer alles** (5 Requests), auch wenn sich nur ein Trip geändert hat. Für eine Demo okay;
   bei größeren Datenmengen würde man gezielt einzelne Entitäten aktualisieren.
4. **`ngAfterViewInit` + `viewChild`:** Modernere Alternative ist `afterNextRender(() => this.initStarfield())` im
   Konstruktor – kein Interface nötig, und es läuft garantiert nach dem Rendern.
5. **Angulars `resource()` / `httpResource()`:** Neuere Angular-Versionen bieten signal-basiertes Datenladen mit
   eingebautem Lade-/Fehlerstatus. Das könnte Teile von `AgencyStore` ersetzen. Der jetzige RxJS-Ansatz ist aber
   bewährt, verständlich und funktioniert gut.
6. **Keine Runtime-Validierung der API-Antworten:** `http.get<TripDto[]>` vertraut dem Server. Bei externen APIs würde
   man mit einer Schema-Library prüfen.
7. **Signal Forms:** Angular arbeitet an signal-basierten Formularen. Dann bräuchte `FormFieldComponent` die
   `toSignal(toObservable(...))`-Brücke nicht mehr.
8. **Komponententests fehlen weitgehend:** Getestet sind v. a. reine Funktionen und Stores. Für Templates (z. B.
   "zeigt Kunden keine Paradoxe") könnte man Komponententests mit `TestBed.createComponent` ergänzen.

---

## 24. Glossar

| Begriff | Bedeutung |
|---|---|
| **SPA** | Single Page Application – eine HTML-Seite, Navigation per JavaScript |
| **Standalone Component** | Komponente ohne NgModule, deklariert ihre Abhängigkeiten in `imports` |
| **Signal** | reaktiver Wertebehälter (`signal`, `computed`, `effect`) |
| **Zoneless** | Change Detection ohne zone.js; reagiert auf Signals und Events |
| **OnPush** | Komponente wird nur bei relevanten Änderungen geprüft |
| **DI / Injection Context** | Angulars Mechanismus, Abhängigkeiten bereitzustellen; `inject()` funktioniert nur dort |
| **Observable** | Strom von Werten über Zeit (RxJS); "kalt" bis zum `subscribe` |
| **Subject** | Observable, in das man selbst Werte schieben kann |
| **switchMap** | wechselt zum neuesten inneren Observable, bricht das alte ab |
| **DTO / Cmd** | Datenform vom Server / zum Server |
| **Store** | Service, der App-Zustand hält und Änderungen kapselt |
| **Lazy Loading** | Code erst bei Bedarf laden |
| **Guard** | Funktion, die Navigation erlaubt/umleitet |
| **Content Projection** | Inhalt von außen in eine Komponente einsetzen (`<ng-content>`) |
| **Design Token** | benannter Design-Wert (Farbe, Abstand) als CSS-Variable |
| **Reine Funktion** | gleiche Eingabe → gleiche Ausgabe, keine Seiteneffekte |
| **Optimistic Update** | UI sofort ändern, bevor/während der Server bestätigt |
| **Polling** | regelmäßig beim Server nachfragen |
| **PRNG (seeded)** | Pseudo-Zufallsgenerator, reproduzierbar über einen Startwert |
| **Delta Time** | vergangene Zeit seit dem letzten Frame, für framerate-unabhängige Animation |

---

## 25. Lernpfad & Übungen

**Empfohlene Lese-Reihenfolge im Code:**

1. `main.ts` → `app.config.ts` → `app.ts` → `app.routes.ts`
2. `core/models/trip.model.ts` → `core/services/trip.service.ts` → `core/http/error-message.ts`
3. `state/notification.service.ts` (einfachster Store) → `state/app-state.service.ts` → `state/agency.store.ts`
   → `state/paradox-feed.store.ts`
4. `shared/components/status-badge` → `modal` → `form-field` → `trip-card` → `paradox-list`
5. `features/landing` (Filter mit Signals) → `features/trip-detail` + `trip-actions` (Rollen-Logik)
6. `features/modals/create-trip-modal` (Formulare) → `shared/forms/`
7. `shared/utils/booking.utils.ts` + `.spec.ts` (reine Logik + Tests)
8. Für Fortgeschrittene: `features/paradox-stabilizer` (Game Loop), `features/era-timeline`, `features/loom`

**Übungen mit steigender Schwierigkeit:**

1. ⭐ Ändere die Farbe `--gold` in `styles.css` und beobachte, wie sich die ganze App ändert.
2. ⭐ Füge einen neuen Toast-Typ `'warning'` hinzu (Typ, Service-Methode, CSS in `ToastStackComponent`).
3. ⭐⭐ Füge auf der Landing-Page einen Filter "nur Trips mit freien Plätzen < 5 Travellers" hinzu
   (neues Signal + Erweiterung des `trips`-`computed`).
4. ⭐⭐ Baue eine `ConfirmDialogComponent` auf Basis von `ModalComponent` (Inputs: `message`; Outputs: `confirmed`,
   `cancelled`) und benutze sie vor "Cancel booking".
5. ⭐⭐ Schreibe Tests für `formatDuration` und `tripsOverlap` in einer neuen `date.utils.spec.ts`.
6. ⭐⭐⭐ Füge eine neue Seite "Statistiken" für den Director hinzu: Route mit `roleGuard('director')`, Lazy Loading,
   Eintrag in `NAV`, `StatTilesComponent` mit Kennzahlen aus `AgencyStore` und `ParadoxFeedStore`.
7. ⭐⭐⭐ Ersetze in `EraTimelineComponent` `ngAfterViewInit`/`ngOnDestroy` durch `afterNextRender` und `DestroyRef`.
8. ⭐⭐⭐ Mache das Poll-Intervall des `ParadoxFeedStore` zur Laufzeit änderbar (Tipp: Intervall als Signal,
   `toObservable` + `switchMap` auf `timer`).

**Offizielle Doku zum Vertiefen:** angular.dev → Guides "Signals", "Components", "Routing", "Forms",
"Dependency Injection", "Testing"; rxjs.dev → Operatoren `switchMap`, `forkJoin`, `catchError`.

Viel Erfolg beim Lernen! 🚀

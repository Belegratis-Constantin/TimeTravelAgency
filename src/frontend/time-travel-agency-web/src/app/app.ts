import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Role = 'customer' | 'agent' | 'manager';
type Page = 'landing' | 'tripDetail' | 'dashboard' | 'paradoxLog' | 'reports';
type TripStatus = 'Active' | 'Critical' | 'Completed' | 'Cancelled';
type TripType = 'Normal' | 'Critical';

interface TripParadox { type: string; status: string; date: Date; }
interface TripReview { name: string; rating: number; text: string; }
interface Trip {
  id: string; name: string; era: string; year: number | null; eraLabel: string;
  context: string; departureDate: Date; status: TripStatus; type: TripType;
  licensedAgent: string; supportAgent: string | null; manager: string;
  customers: string[]; reviews: TripReview[]; paradoxes: TripParadox[];
}
interface Report { id: string; header: string; date: Date; agent: string; tripName: string; content: string; }

export interface TripCardView {
  id: string; name: string; era: string; eraLabel: string; departureLabel: string;
  licensedAgent: string; travelerCount: number;
  statusLabel: string; statusColor: string; statusBg: string;
  timeUntilLabel: string; timeUntilColor: string;
}
export interface DashTripView {
  id: string; name: string; eraLabel: string; departureLabel: string; licensedAgent: string;
  statusLabel: string; statusColor: string; statusBg: string; paradoxCount: number;
}
export interface ParadoxView { tripName: string; type: string; status: string; color: string; bg: string; dateLabel: string; }
export interface ReportView { id: string; header: string; dateLabel: string; agent: string; tripName: string; content: string; }
export interface AgentCardView { name: string; roleLabel: string; tripsLabel: string; }
export interface CustomerView { name: string; initials: string; }
export interface ReviewView { name: string; stars: string; text: string; }
export interface ParadoxDetailView { type: string; status: string; color: string; bg: string; dateLabel: string; }
export interface SelectedTripView {
  id: string; name: string; era: string; eraLabel: string; context: string;
  statusLabel: string; statusColor: string; statusBg: string; typeLabel: string;
  departureLabelFull: string; licensedAgent: string; supportAgent: string | null;
  hasSupportAgent: boolean; manager: string; hasYear: boolean; timelinePercent: number;
  travelerCount: number; customerViews: CustomerView[];
  hasReviews: boolean; noReviews: boolean; reviews: ReviewView[];
  hasParadoxes: boolean; noParadoxes: boolean; paradoxes: ParadoxDetailView[];
  rawStatus: TripStatus;
  ctaAlreadyBooked: boolean; ctaDeparted: boolean; ctaUnavailable: boolean;
  ctaBoardingClosed: boolean; ctaBookable: boolean; unavailableReason: string;
  showBookingBox: boolean; showAgentBox: boolean; showManagerBox: boolean;
}
export interface Stats { total: number; active: number; customers: number; paradoxes: number; }

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  readonly licensedAgents = ['M. Okonkwo-Reyes', 'T. Vasquez-Lindqvist', 'S. Abernathy', 'R. Chen-Petrov'];
  readonly managerName = 'Director E. Solano';
  readonly currentAgentName = 'M. Okonkwo-Reyes';

  trips: Trip[];
  reports: Report[];

  role: Role = 'customer';
  roleMenuOpen = false;
  page: Page = 'landing';
  selectedTripId: string | null = null;
  filterEra = 'all';
  filterType = 'all';
  sortOrder = 'soonest';
  createModalOpen = false;
  newTripName = '';
  newTripDate = '';
  newTripAgent = '';
  newTripType: TripType = 'Normal';
  assignModalTripId: string | null = null;
  assignAgentValue: string;
  bookedTripIds: string[] = [];

  private ticker: any;

  constructor(private cd: ChangeDetectorRef) {
    this.assignAgentValue = this.licensedAgents[0];
    const now = Date.now();

    this.trips = [
      {
        id: 't1', name: 'Pompeii', era: 'Pompeii, Roman Empire', year: 79, eraLabel: '79 AD',
        context: 'The bustling Roman resort city in its final days before Vesuvius. Agents operate under strict non-intervention protocol; this is a Critical-classified excursion.',
        departureDate: new Date(now + 42 * 60 * 1000), status: 'Critical', type: 'Critical',
        licensedAgent: 'M. Okonkwo-Reyes', supportAgent: 'J. Marsh', manager: this.managerName,
        customers: ['Priya Nair', 'Liam Osei', 'Bea Fontaine', 'Dario Kessler'],
        reviews: [],
        paradoxes: [{ type: 'Temporal Contamination', status: 'Critical', date: new Date(now - 2 * 3600 * 1000) }]
      },
      {
        id: 't2', name: 'Apollo 11 Moon Landing', era: 'Sea of Tranquility, Moon', year: 1969, eraLabel: '1969 AD',
        context: "Witness humankind's first lunar footsteps from a sealed observation module in low orbit. Zero surface contact permitted.",
        departureDate: new Date(now + 3 * 24 * 3600 * 1000), status: 'Active', type: 'Normal',
        licensedAgent: 'T. Vasquez-Lindqvist', supportAgent: null, manager: this.managerName,
        customers: ['Grace Whitfield', 'Noah Adebayo', 'Elena Cho', 'Marcus Reyné', 'Talia Brandt', 'Owen Sacks'],
        reviews: [], paradoxes: []
      },
      {
        id: 't3', name: 'Renaissance Florence', era: 'Florence, Republic of Florence', year: 1503, eraLabel: '1503 AD',
        context: "Walk the workshops of the early cinquecento as Leonardo and a young Michelangelo shape the century's imagination.",
        departureDate: new Date(now + 14 * 24 * 3600 * 1000), status: 'Active', type: 'Normal',
        licensedAgent: 'S. Abernathy', supportAgent: 'K. Delacroix', manager: this.managerName,
        customers: ['Imogen Vance', 'Peter Halloway'], reviews: [], paradoxes: []
      },
      {
        id: 't4', name: 'Giza Necropolis', era: 'Giza, Old Kingdom Egypt', year: -2560, eraLabel: '2560 BC',
        context: 'Stand before the Great Pyramid mid-construction. Classified Critical for crowd-density and observer-effect risk.',
        departureDate: new Date(now + 2 * 24 * 3600 * 1000), status: 'Critical', type: 'Critical',
        licensedAgent: 'R. Chen-Petrov', supportAgent: 'J. Marsh', manager: this.managerName,
        customers: ['Sofia Marchetti', 'Aiden Cole', 'Yusuf Karam', 'Ren Okafor', 'Beatrix Lund'],
        reviews: [],
        paradoxes: [{ type: 'Observer Effect', status: 'Pending', date: new Date(now - 5 * 3600 * 1000) }]
      },
      {
        id: 't5', name: 'Titanic Maiden Voyage', era: 'North Atlantic', year: 1912, eraLabel: '1912 AD',
        context: "A completed excursion aboard the RMS Titanic's maiden departure from Southampton, concluded before the fourth day.",
        departureDate: new Date(now - 36 * 24 * 3600 * 1000), status: 'Completed', type: 'Normal',
        licensedAgent: 'M. Okonkwo-Reyes', supportAgent: 'K. Delacroix', manager: this.managerName,
        customers: ['Harold Pemberton', 'Nadia Volkov', 'Clementine Ash'],
        reviews: [
          { name: 'Nadia Volkov', rating: 5, text: 'Impeccably managed. The agents kept us well clear of the incident timeline. Worth every credit.' },
          { name: 'Harold Pemberton', rating: 4, text: 'Extraordinary, though the return debrief ran long.' }
        ],
        paradoxes: []
      },
      {
        id: 't6', name: 'Ides of March', era: 'Rome, Roman Republic', year: -44, eraLabel: '44 BC',
        context: 'Observe the fall of Caesar from a shielded vantage in the Theatre of Pompey. Cancelled pending paradox review.',
        departureDate: new Date(now + 8 * 24 * 3600 * 1000), status: 'Cancelled', type: 'Critical',
        licensedAgent: 'T. Vasquez-Lindqvist', supportAgent: null, manager: this.managerName,
        customers: ['Edmund Straka'], reviews: [],
        paradoxes: [
          { type: 'Causality Loop', status: 'Resolved', date: new Date(now - 20 * 24 * 3600 * 1000) },
          { type: 'Grandfather Paradox Risk', status: 'Pending', date: new Date(now - 3 * 24 * 3600 * 1000) }
        ]
      }
    ];

    this.reports = [
      { id: 'r1', header: 'Pre-Departure Risk Assessment', date: new Date(now - 1 * 24 * 3600 * 1000), agent: 'R. Chen-Petrov', tripName: 'Giza Necropolis', content: 'Crowd density at the western causeway remains the primary observer-effect vector. Recommend limiting the party to five and holding position no less than 40 meters from active construction lines. Local dialect briefing completed with all travelers.' },
      { id: 'r2', header: 'Incident Debrief — Temporal Contamination Flag', date: new Date(now - 2 * 3600 * 1000), agent: 'M. Okonkwo-Reyes', tripName: 'Pompeii', content: "A contamination flag was raised after a traveler's satchel strap was recovered from ash sediment during a routine sweep. Item has been retrieved and logged. Recommend expedited departure window and a full contamination audit before next embarkation." },
      { id: 'r3', header: 'Voyage Closure Report', date: new Date(now - 34 * 24 * 3600 * 1000), agent: 'M. Okonkwo-Reyes', tripName: 'Titanic Maiden Voyage', content: 'Voyage concluded without incident. All travelers extracted six hours prior to the historical departure delay in Southampton, per protocol. No paradox exposure recorded. Recommend this itinerary for repeat scheduling.' },
      { id: 'r4', header: 'Cancellation Rationale', date: new Date(now - 3 * 24 * 3600 * 1000), agent: 'T. Vasquez-Lindqvist', tripName: 'Ides of March', content: 'Following the resolved Causality Loop incident on a prior run, a second Grandfather Paradox Risk was flagged during pre-departure simulation. Recommend indefinite hold on this itinerary pending Paradox Review Board findings.' }
    ];
  }

  ngOnInit() { this.ticker = setInterval(() => this.cd.markForCheck(), 30000); }
  ngOnDestroy() { clearInterval(this.ticker); }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private fmt(d: Date): string {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  private fmtDate(d: Date): string {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  private timeUntil(d: Date): { label: string; color: string } {
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return { label: 'Departed', color: '#6B7488' };
    const mins = Math.round(diff / 60000);
    if (mins < 60) return { label: `Departs in ${mins}m`, color: '#D9A24E' };
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return { label: `Departs in ${hours}h ${mins % 60}m`, color: '#D9A24E' };
    return { label: `Departs in ${Math.floor(diff / (24 * 3600000))}d`, color: '#8A93A6' };
  }
  private statusMeta(s: TripStatus) {
    const m: Record<TripStatus, { color: string; bg: string }> = {
      Active:    { color: '#5B8DC9', bg: 'rgba(91,141,201,0.15)' },
      Critical:  { color: '#D9A24E', bg: 'rgba(201,142,49,0.15)' },
      Completed: { color: '#8A93A6', bg: 'rgba(138,147,166,0.15)' },
      Cancelled: { color: '#B5574A', bg: 'rgba(181,87,74,0.15)' }
    };
    return { label: s, ...m[s] };
  }
  private paradoxMeta(s: string) {
    const m: Record<string, { color: string; bg: string }> = {
      Pending:  { color: '#D9A24E', bg: 'rgba(201,142,49,0.15)' },
      Resolved: { color: '#3FAE79', bg: 'rgba(63,174,121,0.15)' },
      Critical: { color: '#E05A4E', bg: 'rgba(224,90,78,0.18)' }
    };
    return { label: s, ...(m[s] ?? { color: '#8A93A6', bg: 'rgba(138,147,166,0.15)' }) };
  }
  private initials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
  private stars(r: number): string { return '★'.repeat(r) + '☆'.repeat(5 - r); }
  private timelinePct(year: number | null): number | null {
    if (year == null) return null;
    return Math.max(1.5, Math.min(98.5, ((year + 3000) / 5026) * 100));
  }
  private toCard(t: Trip): TripCardView {
    const sm = this.statusMeta(t.status);
    const tu = this.timeUntil(t.departureDate);
    return {
      id: t.id, name: t.name, era: t.era, eraLabel: t.eraLabel,
      departureLabel: this.fmt(t.departureDate),
      licensedAgent: t.licensedAgent, travelerCount: t.customers.length,
      statusLabel: sm.label, statusColor: sm.color, statusBg: sm.bg,
      timeUntilLabel: tu.label, timeUntilColor: tu.color
    };
  }

  // ── Computed getters ───────────────────────────────────────────────────────

  get isLanding()    { return this.page === 'landing'; }
  get isTripDetail() { return this.page === 'tripDetail'; }
  get isDashboard()  { return this.page === 'dashboard'; }
  get isParadoxLog() { return this.page === 'paradoxLog'; }
  get isReports()    { return this.page === 'reports'; }
  get isCustomerRole() { return this.role === 'customer'; }
  get isAgentRole()    { return this.role === 'agent'; }
  get isManagerRole()  { return this.role === 'manager'; }
  get showDashboardNav() { return this.role === 'manager'; }
  get showParadoxNav()   { return this.role === 'manager'; }
  get showReportsNav()   { return this.role === 'agent' || this.role === 'manager'; }
  get roleLabel() {
    return this.role === 'customer' ? 'Customer' : this.role === 'agent' ? 'Licensed Agent' : 'Manager';
  }
  get landingTitle() {
    return this.role === 'agent' ? 'Your Assigned Trips'
      : this.role === 'manager' ? 'All Trips — Overview'
      : 'Upcoming Departures';
  }
  get showLandingFilters() { return this.role !== 'agent'; }
  get eraOptions() { return this.trips.map(t => t.name); }

  get destinationsColor() { return this.page === 'landing'    ? '#C9A84C' : '#B7BFCC'; }
  get destinationsBorder(){ return this.page === 'landing'    ? '2px solid #C9A84C' : '2px solid transparent'; }
  get dashboardColor()    { return this.page === 'dashboard'  ? '#C9A84C' : '#B7BFCC'; }
  get dashboardBorder()   { return this.page === 'dashboard'  ? '2px solid #C9A84C' : '2px solid transparent'; }
  get paradoxNavColor()   { return this.page === 'paradoxLog' ? '#C9A84C' : '#B7BFCC'; }
  get paradoxNavBorder()  { return this.page === 'paradoxLog' ? '2px solid #C9A84C' : '2px solid transparent'; }
  get reportsColor()      { return this.page === 'reports'    ? '#C9A84C' : '#B7BFCC'; }
  get reportsBorder()     { return this.page === 'reports'    ? '2px solid #C9A84C' : '2px solid transparent'; }

  private get filtered(): Trip[] {
    return this.trips
      .filter(t => (this.filterEra === 'all' || t.name === this.filterEra) && (this.filterType === 'all' || t.type === this.filterType))
      .slice()
      .sort((a, b) => this.sortOrder === 'soonest'
        ? a.departureDate.getTime() - b.departureDate.getTime()
        : b.departureDate.getTime() - a.departureDate.getTime());
  }

  get landingTrips(): TripCardView[] {
    const cards = this.filtered.map(t => this.toCard(t));
    if (this.role === 'agent') {
      return cards.filter(c => {
        const t = this.trips.find(x => x.id === c.id)!;
        return t.licensedAgent === this.currentAgentName || t.supportAgent === this.currentAgentName;
      });
    }
    return cards;
  }
  get noTripsMatch() { return this.landingTrips.length === 0; }

  get dashboardTrips(): DashTripView[] {
    return this.trips.map(t => {
      const sm = this.statusMeta(t.status);
      return { id: t.id, name: t.name, eraLabel: t.eraLabel, departureLabel: this.fmt(t.departureDate), licensedAgent: t.licensedAgent, statusLabel: sm.label, statusColor: sm.color, statusBg: sm.bg, paradoxCount: t.paradoxes.length };
    });
  }

  get agentsPanel(): AgentCardView[] {
    const names = [...new Set(this.trips.flatMap(t => [t.licensedAgent, t.supportAgent].filter(Boolean) as string[]))];
    return names.map(name => ({
      name,
      roleLabel: this.licensedAgents.includes(name) ? 'Licensed Agent' : 'Support Agent',
      tripsLabel: this.trips.filter(t => t.licensedAgent === name || t.supportAgent === name).map(t => t.name).join(', ') || 'None currently assigned'
    }));
  }

  get allParadoxes(): ParadoxView[] {
    return this.trips.flatMap(t => t.paradoxes.map(p => {
      const pm = this.paradoxMeta(p.status);
      return { tripName: t.name, type: p.type, status: pm.label, color: pm.color, bg: pm.bg, dateLabel: this.fmtDate(p.date) };
    }));
  }

  get formattedReports(): ReportView[] {
    return this.reports.map(r => ({ ...r, dateLabel: this.fmt(r.date) }));
  }

  get stats(): Stats {
    return {
      total: this.trips.length,
      active: this.trips.filter(t => t.status === 'Active' || t.status === 'Critical').length,
      customers: this.trips.reduce((s, t) => s + t.customers.length, 0),
      paradoxes: this.trips.reduce((s, t) => s + t.paradoxes.filter(p => p.status !== 'Resolved').length, 0)
    };
  }

  get selectedTrip(): SelectedTripView | null {
    if (!this.selectedTripId) return null;
    const t = this.trips.find(x => x.id === this.selectedTripId);
    if (!t) return null;
    const sm = this.statusMeta(t.status);
    const booked = this.bookedTripIds.includes(t.id);
    const isPast = t.departureDate.getTime() <= Date.now();
    const withinHour = !isPast && (t.departureDate.getTime() - Date.now()) <= 3600000;
    const notActive = t.status !== 'Active';
    const cta = booked ? 'booked' : isPast ? 'departed' : notActive ? 'unavailable' : withinHour ? 'boarding' : 'bookable';
    const tpct = this.timelinePct(t.year);
    return {
      id: t.id, name: t.name, era: t.era, eraLabel: t.eraLabel, context: t.context,
      statusLabel: sm.label, statusColor: sm.color, statusBg: sm.bg, typeLabel: t.type,
      departureLabelFull: this.fmt(t.departureDate),
      licensedAgent: t.licensedAgent, supportAgent: t.supportAgent, hasSupportAgent: !!t.supportAgent,
      manager: t.manager, hasYear: tpct !== null, timelinePercent: tpct ?? 0,
      travelerCount: t.customers.length,
      customerViews: t.customers.map(n => ({ name: n, initials: this.initials(n) })),
      hasReviews: t.reviews.length > 0, noReviews: t.reviews.length === 0,
      reviews: t.reviews.map(r => ({ name: r.name, text: r.text, stars: this.stars(r.rating) })),
      hasParadoxes: t.paradoxes.length > 0, noParadoxes: t.paradoxes.length === 0,
      paradoxes: t.paradoxes.map(p => { const pm = this.paradoxMeta(p.status); return { type: p.type, status: pm.label, color: pm.color, bg: pm.bg, dateLabel: this.fmtDate(p.date) }; }),
      rawStatus: t.status,
      ctaAlreadyBooked: cta === 'booked', ctaDeparted: cta === 'departed',
      ctaUnavailable: cta === 'unavailable', ctaBoardingClosed: cta === 'boarding', ctaBookable: cta === 'bookable',
      unavailableReason: `This trip is currently ${t.status} and cannot be booked.`,
      showBookingBox: this.role === 'customer', showAgentBox: this.role === 'agent', showManagerBox: this.role === 'manager'
    };
  }

  get assignModalOpen() { return !!this.assignModalTripId; }
  get assignTripName()  { return this.trips.find(t => t.id === this.assignModalTripId)?.name ?? ''; }

  // ── Actions ────────────────────────────────────────────────────────────────

  toggleRoleMenu() { this.roleMenuOpen = !this.roleMenuOpen; }
  closeRoleMenu()  { this.roleMenuOpen = false; }

  selectRole(role: Role) {
    this.role = role;
    this.page = role === 'manager' ? 'dashboard' : role === 'agent' ? 'reports' : 'landing';
    this.roleMenuOpen = false;
  }

  goTo(page: Page) { this.page = page; }
  viewTrip(id: string) { this.selectedTripId = id; this.page = 'tripDetail'; }

  openCreateModal() { this.createModalOpen = true; this.newTripName = ''; this.newTripDate = ''; this.newTripAgent = ''; this.newTripType = 'Normal'; }
  closeCreateModal() { this.createModalOpen = false; }
  submitCreateTrip() {
    const dep = this.newTripDate ? new Date(this.newTripDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
    this.trips = [...this.trips, {
      id: 't' + Date.now(), name: this.newTripName || 'Uncatalogued Era',
      era: 'Classification Pending', year: null, eraLabel: 'TBD',
      context: 'Historical dossier pending compilation by the Archive Office.',
      departureDate: dep, status: 'Active', type: this.newTripType,
      licensedAgent: this.newTripAgent || 'Unassigned', supportAgent: null,
      manager: this.managerName, customers: [], reviews: [], paradoxes: []
    }];
    this.createModalOpen = false;
  }

  openAssignModal(id: string) { this.assignModalTripId = id; this.assignAgentValue = this.licensedAgents[0]; }
  closeAssignModal() { this.assignModalTripId = null; }
  submitAssign() {
    if (!this.assignModalTripId) return;
    this.trips = this.trips.map(t => t.id === this.assignModalTripId ? { ...t, licensedAgent: this.assignAgentValue } : t);
    this.assignModalTripId = null;
  }

  bookTrip(id: string) { this.bookedTripIds = [...this.bookedTripIds, id]; }

  handleTripStatusChange(id: string, event: Event) {
    const value = (event.target as HTMLSelectElement).value as TripStatus;
    this.trips = this.trips.map(t => t.id === id ? { ...t, status: value } : t);
  }
}

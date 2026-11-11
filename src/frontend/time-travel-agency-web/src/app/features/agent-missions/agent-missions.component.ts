import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TripService } from '../../core/services/trip.service';
import { toErrorMessage } from '../../core/http/error-message';
import { AppStateService } from '../../state/app-state.service';
import { AgencyStore } from '../../state/agency.store';
import { ParadoxFeedStore } from '../../state/paradox-feed.store';
import { NotificationService } from '../../state/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatTile, StatTilesComponent } from '../../shared/components/stat-tile/stat-tile.component';
import { TripCardComponent } from '../../shared/components/trip-card/trip-card.component';
import { ParadoxListComponent } from '../../shared/components/paradox-list/paradox-list.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { agentTypeLabel, epochLabel, fullName, isOpenParadox, tripDisplayName } from '../../shared/utils/status.utils';
import { TripDto } from '../../core/models/trip.model';
import { ParadoxFeedDto } from '../../core/models/paradox.model';
import { ParadoxStabilizerComponent } from '../paradox-stabilizer/paradox-stabilizer.component';

@Component({
  selector: 'app-agent-missions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    StatTilesComponent,
    TripCardComponent,
    ParadoxListComponent,
    EmptyStateComponent,
    FormFieldComponent,
    ParadoxStabilizerComponent,
  ],
  templateUrl: './agent-missions.component.html',
  styleUrl: './agent-missions.component.css',
})
export class AgentMissionsComponent {
  /** `?trip=<guid>` preselects the trip in the report form (bound via withComponentInputBinding). */
  readonly trip = input<string>();

  protected readonly state = inject(AppStateService);
  protected readonly agency = inject(AgencyStore);
  protected readonly feed = inject(ParadoxFeedStore);
  private readonly tripApi = inject(TripService);
  private readonly notifications = inject(NotificationService);

  protected readonly stabilising = signal<ParadoxFeedDto | null>(null);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    tripGuid: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    header: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    content: new FormControl('', { nonNullable: true }),
  });

  protected readonly agent = this.state.currentAgent;
  protected readonly title = computed(() => {
    const a = this.agent();
    return a ? fullName(a) : 'Agent';
  });
  protected readonly eyebrow = computed(() => agentTypeLabel(this.agent()?.agentType ?? 'Agent'));
  protected readonly subtitle = computed(() => {
    const epoch = epochLabel(this.agent()?.specialisationEpochId);
    return epoch ? `Specialised in ${epoch}` : undefined;
  });

  protected readonly missions = computed(() =>
    [...this.agency.scopedTrips()].sort((a, b) => Date.parse(a.dateInRealLife) - Date.parse(b.dateInRealLife)),
  );
  protected readonly openParadoxes = computed(() => this.feed.scoped().filter(isOpenParadox));
  protected readonly solvedByMe = computed(() => {
    const id = this.agent()?.id;
    return id === undefined ? [] : this.feed.paradoxes().filter(p => p.resolvedByAgentId === id);
  });

  protected readonly reports = computed(() =>
    this.missions()
      .flatMap(t => t.reports.map(r => ({ ...r, tripName: tripDisplayName(t) })))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  );

  protected readonly stats = computed((): StatTile[] => {
    const id = this.agent()?.id;
    const missions = this.missions();
    return [
      { label: 'Missions', value: missions.length },
      { label: 'Under way', value: missions.filter(t => t.tripStatus === 'Active').length, tone: 'gold' },
      { label: 'As licensed agent', value: missions.filter(t => t.licensedAgentId === id).length },
      { label: 'As support agent', value: missions.filter(t => t.agentId === id).length, tone: 'blue' },
      { label: 'Open paradoxes', value: this.openParadoxes().length, tone: this.openParadoxes().length ? 'red' : 'green' },
      { label: 'Stabilised by you', value: this.solvedByMe().length, tone: 'green' },
    ];
  });

  protected readonly tripName = tripDisplayName;

  constructor() {
    effect(() => {
      const preselect = this.trip();
      if (preselect) this.form.controls.tripGuid.setValue(preselect);
    });
  }

  protected roleOn(trip: TripDto): string {
    return trip.licensedAgentId === this.agent()?.id ? 'You lead this trip (licensed agent)' : 'You support this trip';
  }

  protected submit(): void {
    const agent = this.agent();
    if (this.form.invalid || !agent) {
      this.form.markAllAsTouched();
      return;
    }
    const { tripGuid, header, content } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.tripApi.fileReport(tripGuid, agent.guid, { header: header.trim(), content: content.trim() || null }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset({ tripGuid });
        this.notifications.success('Report filed', `Your report on “${tripDisplayName(this.agency.tripsByGuid().get(tripGuid) ?? { tripName: null })}” is on record.`);
        this.agency.refresh();
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Failed to file report.'));
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagerService } from '../../../core/services/manager.service';
import { toErrorMessage } from '../../../core/http/error-message';
import { TripDto } from '../../../core/models/trip.model';
import { AppStateService } from '../../../state/app-state.service';
import { AgencyStore } from '../../../state/agency.store';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { agentTypeLabel, fullName, tripDisplayName } from '../../../shared/utils/status.utils';

/** Assigns a support agent (one of the manager's own agents) to a trip. */
@Component({
  selector: 'app-assign-agent-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal title="Assign Support Agent" [subtitle]="tripName()" [width]="420" (closed)="closed.emit()">
      @if (candidates().length === 0) {
        <p class="empty-hint">None of your agents is available. Recruit an agent first.</p>
      } @else {
        <form id="assign-form" (ngSubmit)="submit()">
          <app-form-field label="Agent" [control]="agent" for="assign-agent"
                          hint="Only agents managed by you can be assigned. The licensed agent of the trip is excluded.">
            <select class="select" id="assign-agent" [formControl]="agent">
              <option value="">Select an agent…</option>
              @for (a of candidates(); track a.guid) {
                <option [value]="a.guid">{{ a.name }} ({{ a.type }})</option>
              }
            </select>
          </app-form-field>
        </form>
      }

      @if (error()) { <p class="form-error">{{ error() }}</p> }

      <div modal-actions>
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="assign-form" class="btn btn--primary" [disabled]="submitting() || candidates().length === 0">
          {{ submitting() ? 'Assigning…' : 'Assign' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class AssignAgentModalComponent {
  readonly trip = input.required<TripDto>();
  readonly assigned = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(ManagerService);
  private readonly state = inject(AppStateService);
  private readonly agency = inject(AgencyStore);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly agent = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  protected readonly tripName = computed(() => tripDisplayName(this.trip()));

  protected readonly candidates = computed(() => {
    const managerId = this.state.currentManager()?.id;
    return this.agency.agents()
      .filter(a => a.managerId === managerId && a.id !== this.trip().licensedAgentId)
      .map(a => ({ guid: a.guid, name: fullName(a), type: agentTypeLabel(a.agentType) }));
  });

  protected submit(): void {
    const manager = this.state.currentManager();
    if (this.agent.invalid || !manager) {
      this.agent.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.api.assignAgent(manager.guid, this.agent.value, this.trip().guid).subscribe({
      next: () => this.assigned.emit(),
      error: err => {
        this.submitting.set(false);
        this.error.set(toErrorMessage(err, 'Assignment failed.'));
      },
    });
  }
}

import { Component, EventEmitter, HostListener, Output, signal } from '@angular/core';

interface RoleChip {
  icon: string;
  name: string;
  mono: string;
  desc: string;
}

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  styles: [`
    @keyframes tutorial-enter {
      from { opacity:0; transform:scale(0.94) translateY(8px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes pulse-backdrop {
      0%,100% { opacity:1; }
      50%     { opacity:0.92; }
    }
    @keyframes step-transition {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes data-flow {
      from { background-position:0 0; }
      to   { background-position:-50px 0; }
    }
    @keyframes led-blink {
      0%,100% { opacity:1; }
      50%     { opacity:0.25; }
    }
    @keyframes spin-slow {
      from { transform:rotate(0deg); }
      to   { transform:rotate(360deg); }
    }
    @keyframes pulse-ring {
      0%   { transform:translate(-50%,-50%) scale(1);   opacity:0.7; }
      100% { transform:translate(-50%,-50%) scale(2.6); opacity:0; }
    }
    @keyframes dash-flow {
      to { stroke-dashoffset:-200; }
    }
    .chip-hover:hover { opacity:1 !important; border-color:rgba(201,168,76,0.4) !important; }
    .next-btn:hover { filter:brightness(1.1); }
    .skip-btn:hover { color:#B7BFCC !important; }
    .dot-btn:hover { background:#6B7488 !important; }
  `],
  template: `
<div (click)="onBackdropClick($event)"
     style="position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;
            padding:24px;animation:pulse-backdrop 6s ease-in-out infinite;"
     [style.background]="'radial-gradient(circle at 50% 38%, rgba(201,168,76,0.05), transparent 58%), rgba(3,5,10,0.88)'">

  <div (click)="$event.stopPropagation()"
       style="position:relative;width:600px;max-width:100%;max-height:92vh;overflow:hidden;
              background:#0D1525;border:1px solid rgba(201,168,76,0.25);border-radius:6px;
              box-shadow:0 30px 90px rgba(0,0,0,0.7);padding:0 0 28px;
              animation:tutorial-enter 0.4s cubic-bezier(0.2,0.8,0.2,1);">

    <!-- Gold top data-flow strip -->
    <div style="height:3px;width:100%;
                background-image:repeating-linear-gradient(90deg,#C9A84C 0 12px,transparent 12px 26px);
                background-size:50px 100%;opacity:0.8;
                animation:data-flow 2.2s linear infinite;">
    </div>

    <!-- Skip -->
    <button (click)="dismiss()" class="skip-btn"
            style="position:absolute;top:14px;right:16px;z-index:2;background:transparent;border:none;
                   color:#6B7488;cursor:pointer;font-family:'IBM Plex Mono',monospace;
                   font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">
      Skip tutorial ×
    </button>

    <!-- Step label -->
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:0.2em;
                color:#C9A84C;margin:24px 40px 0;">
      BRIEFING {{ ('0' + step()).slice(-2) }}/05
    </div>

    <!-- Step content — @switch destroys/recreates, triggering step-transition naturally -->
    <div style="animation:step-transition 0.28s ease;">
      @switch (step()) {

        <!-- ─── STEP 1: WELCOME ──────────────────────────────────────── -->
        @case (1) {
          <!-- Illustration: animated clock / time symbol -->
          <div style="height:200px;margin:16px 40px 0;border:1px solid #1A2438;border-radius:4px;
                      background:#08101C;display:flex;align-items:center;justify-content:center;
                      position:relative;overflow:hidden;">
            <!-- Hex grid bg -->
            <div style="position:absolute;inset:0;opacity:0.08;"
                 style="background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2246%22><polygon points=%2220,0 40,11.5 40,34.5 20,46 0,34.5 0,11.5%22 fill=%22none%22 stroke=%22%23C9A84C%22 stroke-width=%221%22/></svg>');background-size:40px 46px;">
            </div>
            <!-- Radial glow -->
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(201,168,76,0.12),transparent 65%);"></div>
            <!-- SVG clock -->
            <svg width="120" height="120" viewBox="0 0 120 120" style="position:relative;z-index:1;">
              <!-- Outer rings -->
              <circle cx="60" cy="60" r="54" fill="none" stroke="#C9A84C" stroke-opacity="0.15" stroke-width="1"/>
              <circle cx="60" cy="60" r="46" fill="none" stroke="#C9A84C" stroke-opacity="0.25" stroke-width="1"
                      style="animation:spin-slow 40s linear infinite;transform-origin:60px 60px;"/>
              <circle cx="60" cy="60" r="38" fill="none" stroke="#C9A84C" stroke-opacity="0.4" stroke-width="1.5"/>
              <!-- Tick marks -->
              @for (tick of clockTicks; track tick) {
                <line [attr.x1]="60 + 33 * Math.cos(tick)" [attr.y1]="60 + 33 * Math.sin(tick)"
                      [attr.x2]="60 + 38 * Math.cos(tick)" [attr.y2]="60 + 38 * Math.sin(tick)"
                      stroke="#C9A84C" stroke-opacity="0.5" stroke-width="1.5"/>
              }
              <!-- Hour hand -->
              <line x1="60" y1="60" x2="60" y2="36" stroke="#C9A84C" stroke-width="2.5"
                    stroke-linecap="round" style="animation:spin-slow 12s linear infinite;transform-origin:60px 60px;"/>
              <!-- Minute hand -->
              <line x1="60" y1="60" x2="60" y2="26" stroke="#F0EDE6" stroke-width="1.5"
                    stroke-linecap="round" style="animation:spin-slow 2s linear infinite;transform-origin:60px 60px;"/>
              <!-- Center dot -->
              <circle cx="60" cy="60" r="4" fill="#C9A84C"/>
              <circle cx="60" cy="60" r="2" fill="#F0EDE6"/>
              <!-- Pulse rings -->
              <circle cx="60" cy="60" r="8" fill="none" stroke="#C9A84C" stroke-opacity="0.6" stroke-width="1"
                      style="animation:pulse-ring 2.5s ease-out infinite;transform-origin:60px 60px;"/>
              <circle cx="60" cy="60" r="8" fill="none" stroke="#C9A84C" stroke-opacity="0.4" stroke-width="1"
                      style="animation:pulse-ring 2.5s ease-out 1.2s infinite;transform-origin:60px 60px;"/>
            </svg>
          </div>

          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:27px;color:#F0EDE6;margin:22px 40px 0;">
            Welcome to the Agency
          </div>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:12px 40px 0;">
            You have arrived at the only travel bureau licensed to sell passage across time itself —
            from the <strong style="color:#F0EDE6;">Deep Past</strong> to the
            <strong style="color:#F0EDE6;">Far Future</strong>. Every destination is real history;
            every journey risks a paradox.
          </p>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:10px 40px 0;">
            This is a role-play demonstration. You will explore a fully working booking system —
            trips, agents, managers, and the cosmic entity that watches over all of them.
          </p>
        }

        <!-- ─── STEP 2: ROLES ─────────────────────────────────────────── -->
        @case (2) {
          <!-- Illustration: 5 role chips -->
          <div style="height:200px;margin:16px 40px 0;border:1px solid #1A2438;border-radius:4px;
                      background:#08101C;display:flex;align-items:center;justify-content:center;
                      position:relative;overflow:hidden;padding:0 12px;">
            <div style="display:flex;gap:8px;width:100%;justify-content:center;">
              @for (chip of roleChips; track chip.name; let ci = $index) {
                <div class="chip-hover"
                     (click)="selectRoleChip(ci)"
                     [style.border]="activeRoleChip() === ci ? '1px solid #C9A84C' : '1px solid #2E3E54'"
                     [style.background]="activeRoleChip() === ci ? 'rgba(201,168,76,0.08)' : '#0D1828'"
                     [style.opacity]="activeRoleChip() === ci ? '1' : '0.65'"
                     style="flex:1;max-width:96px;border-radius:4px;padding:12px 8px;cursor:pointer;
                            text-align:center;position:relative;overflow:hidden;transition:opacity 0.2s,border-color 0.2s;">
                  <!-- active data-flow top strip -->
                  @if (activeRoleChip() === ci) {
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;
                                background-image:repeating-linear-gradient(90deg,#C9A84C 0 8px,transparent 8px 18px);
                                background-size:26px 100%;animation:data-flow 2s linear infinite;">
                    </div>
                  }
                  <div style="font-size:20px;margin-bottom:6px;">{{ chip.icon }}</div>
                  <div style="font-family:'Fraunces',serif;font-size:12px;color:#F0EDE6;margin-bottom:4px;line-height:1.2;">
                    {{ chip.name }}
                  </div>
                  <div [style.color]="activeRoleChip() === ci ? '#C9A84C' : '#4E5E74'"
                       style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.15em;">
                    {{ chip.mono }}
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Role pointer hint -->
          <div style="position:absolute;top:82px;right:32px;display:flex;align-items:center;gap:5px;pointer-events:none;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8.5px;color:#6B7488;letter-spacing:0.08em;">
              Role menu ↑
            </div>
            <div style="width:6px;height:6px;border-top:1.5px solid #6B7488;border-right:1.5px solid #6B7488;
                        transform:rotate(-45deg);margin-top:-2px;"></div>
          </div>

          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:27px;color:#F0EDE6;margin:22px 40px 0;">
            Choose a Perspective
          </div>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:12px 40px 0;">
            This is a role-play. Use the <strong style="color:#F0EDE6;">Role</strong> dropdown
            in the header to become any of five personas — each unlocks its own pages and powers.
            Tap a card above to see what each can do.
          </p>

          <!-- Active role description panel -->
          <div style="margin:14px 40px 0;padding:14px 16px;background:#08101C;
                      border-left:2px solid #C9A84C;border-radius:0 4px 4px 0;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.15em;
                        color:#C9A84C;margin-bottom:6px;">
              {{ roleChips[activeRoleChip()].mono }} — {{ roleChips[activeRoleChip()].name.toUpperCase() }}
            </div>
            <div style="font-size:13px;line-height:1.55;color:#B7BFCC;">
              {{ roleChips[activeRoleChip()].desc }}
            </div>
          </div>

          <div style="margin:12px 40px 0;font-family:'IBM Plex Mono',monospace;font-size:9.5px;
                      letter-spacing:0.05em;color:#4B5A70;line-height:1.6;">
            TIP — Customer, Agent, Manager &amp; Director need a real identity selected from the roster.
            Time Itself needs none — it enters directly.
          </div>
        }

        <!-- ─── STEP 3: DESTINATIONS ──────────────────────────────────── -->
        @case (3) {
          <!-- Illustration: mini trip card mockup -->
          <div style="height:200px;margin:16px 40px 0;border:1px solid #1A2438;border-radius:4px;
                      background:#08101C;display:flex;align-items:center;justify-content:center;
                      position:relative;overflow:hidden;">
            <div style="width:220px;border-radius:5px;overflow:hidden;
                        box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 0 40px rgba(201,168,76,0.13);
                        border:1px solid rgba(201,168,76,0.25);">
              <!-- Card image band -->
              <div style="height:72px;background:linear-gradient(135deg,#1A2432 0%,#0E1522 50%,#161D2C 100%);
                          display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                <div style="font-size:36px;opacity:0.18;position:absolute;">🏛</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;
                            color:#D4A017;position:absolute;top:10px;left:12px;">ANCIENT ROME · 79 AD</div>
                <div style="position:absolute;bottom:0;left:0;right:0;height:2px;
                            background:linear-gradient(to right,transparent,#D4A017 30%,#D4A017 70%,transparent);
                            opacity:0.6;"></div>
              </div>
              <!-- Card body -->
              <div style="background:#0D1525;padding:12px 14px;">
                <div style="font-family:'Fraunces',serif;font-size:14px;color:#F0EDE6;
                            margin-bottom:5px;line-height:1.3;">The Vesuvius Vantage</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#6B7488;
                            margin-bottom:10px;">Departs 15 Aug 2027</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="background:#D4A017;color:#0B1120;font-size:10px;font-weight:700;
                              padding:5px 12px;border-radius:2px;pointer-events:none;letter-spacing:0.04em;">
                    BOOK PASSAGE
                  </div>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <div style="width:6px;height:6px;border-radius:50%;background:#3FAE79;
                                box-shadow:0 0 6px #3FAE79;"></div>
                    <span style="font-size:10px;color:#6B7488;">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:27px;color:#F0EDE6;margin:22px 40px 0;">
            Every Era, Bookable
          </div>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:12px 40px 0;">
            The landing grid lists trips spanning all of recorded — and unrecorded — history.
            Filter by era, open any trip for its full itinerary, then
            <strong style="color:#F0EDE6;">book your seat</strong> before departure closes.
          </p>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:10px 40px 0;">
            Trips with 3 or more paradoxes are classified as
            <strong style="color:#E05A4E;">Critical</strong> — high-stakes journeys that demand
            a licensed support agent on board.
          </p>
        }

        <!-- ─── STEP 4: THE CONTINUUM ─────────────────────────────────── -->
        @case (4) {
          <!-- Illustration: mini continuum bezier with beacon dots -->
          <div style="height:200px;margin:16px 40px 0;border:1px solid #1A2438;border-radius:4px;
                      background:#08101C;display:flex;align-items:center;justify-content:center;
                      position:relative;overflow:hidden;">
            <!-- Starfield hint -->
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(201,168,76,0.04),transparent 70%);"></div>
            <svg viewBox="0 0 500 160" style="width:100%;max-width:480px;overflow:visible;">
              <!-- Glow path -->
              <path d="M30,120 C140,40 360,150 470,60"
                    fill="none" stroke="#C9A84C" stroke-opacity="0.12" stroke-width="10"/>
              <!-- Mid glow -->
              <path d="M30,120 C140,40 360,150 470,60"
                    fill="none" stroke="#C9A84C" stroke-opacity="0.3" stroke-width="3"/>
              <!-- Animated dashes -->
              <path d="M30,120 C140,40 360,150 470,60"
                    fill="none" stroke="#F0EDE6" stroke-opacity="0.6" stroke-width="1.5"
                    stroke-dasharray="20 480"
                    style="animation:dash-flow 6s linear infinite;"/>
              <!-- Era end labels -->
              <text x="18" y="138" font-family="IBM Plex Mono,monospace" font-size="9"
                    fill="#4B5A70" letter-spacing="1">DEEP PAST</text>
              <text x="390" y="50" font-family="IBM Plex Mono,monospace" font-size="9"
                    fill="#4B5A70" letter-spacing="1">FAR FUTURE</text>

              <!-- Beacon 1 (Ancient) -->
              <g>
                <circle cx="120" cy="82" r="14" fill="none" stroke="#D4A017" stroke-opacity="0.2"
                        style="animation:pulse-ring 2.4s ease-out infinite;transform-origin:120px 82px;"/>
                <circle cx="120" cy="82" r="7"
                        fill="#D4A017" opacity="0.9"
                        style="clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);animation:led-blink 3s ease-in-out infinite;"/>
                <text x="120" y="65" text-anchor="middle" font-family="IBM Plex Mono,monospace"
                      font-size="8" fill="#D4A017" opacity="0.7">ANCIENT</text>
              </g>

              <!-- Beacon 2 (Industrial) -->
              <g>
                <circle cx="270" cy="108" r="14" fill="none" stroke="#B08968" stroke-opacity="0.2"
                        style="animation:pulse-ring 2.4s ease-out 0.8s infinite;transform-origin:270px 108px;"/>
                <circle cx="270" cy="108" r="7"
                        fill="#B08968" opacity="0.9"
                        style="clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);animation:led-blink 3s ease-in-out 1s infinite;"/>
                <text x="270" y="91" text-anchor="middle" font-family="IBM Plex Mono,monospace"
                      font-size="8" fill="#B08968" opacity="0.7">INDUSTRIAL</text>
              </g>

              <!-- Beacon 3 (Future) -->
              <g>
                <circle cx="400" cy="82" r="14" fill="none" stroke="#B5179E" stroke-opacity="0.2"
                        style="animation:pulse-ring 2.4s ease-out 1.6s infinite;transform-origin:400px 82px;"/>
                <circle cx="400" cy="82" r="7"
                        fill="#B5179E" opacity="0.9"
                        style="clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);animation:led-blink 3s ease-in-out 2s infinite;"/>
                <text x="400" y="65" text-anchor="middle" font-family="IBM Plex Mono,monospace"
                      font-size="8" fill="#B5179E" opacity="0.7">FUTURE</text>
              </g>
            </svg>
          </div>

          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:27px;color:#F0EDE6;margin:22px 40px 0;">
            Walk the Continuum
          </div>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:12px 40px 0;">
            The <strong style="color:#F0EDE6;">Continuum</strong> is our timeline observatory —
            a horizontal river of history where every trip glows as a holographic beacon.
            Drift from the Deep Past to the Far Future and open any beacon's boarding card.
          </p>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:10px 40px 0;">
            Available as a <strong style="color:#F0EDE6;">Customer</strong> from the top navigation.
            Era-colored plasma conduits carry you through 7 distinct historical zones.
          </p>
        }

        <!-- ─── STEP 5: BEGIN ─────────────────────────────────────────── -->
        @case (5) {
          <!-- Illustration: large ⧗ with radial glow -->
          <div style="height:200px;margin:16px 40px 0;border:1px solid #1A2438;border-radius:4px;
                      background:#08101C;display:flex;align-items:center;justify-content:center;
                      position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(201,168,76,0.2) 0%,transparent 65%);animation:pulse-backdrop 3s ease-in-out infinite;"></div>
            <!-- Outer pulse rings -->
            <div style="position:absolute;top:50%;left:50%;width:80px;height:80px;border-radius:50%;
                        border:1px solid rgba(201,168,76,0.4);
                        animation:pulse-ring 2.4s ease-out infinite;"></div>
            <div style="position:absolute;top:50%;left:50%;width:80px;height:80px;border-radius:50%;
                        border:1px solid rgba(201,168,76,0.3);
                        animation:pulse-ring 2.4s ease-out 1.1s infinite;"></div>
            <!-- The glyph -->
            <div style="font-size:86px;color:#C9A84C;position:relative;z-index:1;line-height:1;
                        text-shadow:0 0 40px rgba(201,168,76,0.6),0 0 80px rgba(201,168,76,0.2);
                        font-family:'Fraunces',serif;">⧗</div>
          </div>

          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:27px;color:#F0EDE6;margin:22px 40px 0;">
            Set Your Departure
          </div>
          <p style="font-size:14px;line-height:1.65;color:#B7BFCC;margin:12px 40px 0;">
            History is waiting. Choose a role from the header dropdown to step fully into the
            Agency — or browse as a guest right now. No identity required to explore the destination catalogue.
          </p>

          <!-- Step 5 CTAs -->
          <div style="display:flex;gap:12px;margin:22px 40px 0;">
            <button (click)="dismiss()" class="next-btn"
                    style="flex:1;background:#C9A84C;border:none;color:#0B1120;font-weight:700;
                           font-size:13.5px;padding:13px 20px;border-radius:2px;cursor:pointer;
                           letter-spacing:0.03em;">
              Start Exploring →
            </button>
            <button (click)="dismiss()" class="next-btn"
                    style="flex:1;background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                           font-size:13px;padding:13px 20px;border-radius:3px;cursor:pointer;">
              Choose a role first
            </button>
          </div>
        }
      }
    </div>

    <!-- ─── Footer: Back / Dots / Next ────────────────────────────────── -->
    @if (step() < 5) {
      <div style="display:flex;align-items:center;justify-content:space-between;margin:26px 40px 0;">

        <!-- Back -->
        <button (click)="back()"
                [style.visibility]="step() === 1 ? 'hidden' : 'visible'"
                style="background:transparent;border:1px solid #2E3E54;color:#B7BFCC;
                       font-size:13px;padding:10px 20px;border-radius:3px;cursor:pointer;">
          ← Back
        </button>

        <!-- Progress dots -->
        <div style="display:flex;gap:8px;align-items:center;">
          @for (n of [1,2,3,4,5]; track n) {
            <div class="dot-btn"
                 (click)="goTo(n)"
                 [style.background]="step() === n ? '#C9A84C' : step() > n ? '#4B5A70' : '#2E3E54'"
                 [style.boxShadow]="step() === n ? '0 0 8px rgba(201,168,76,0.6)' : 'none'"
                 [style.width]="step() === n ? '10px' : '7px'"
                 [style.height]="step() === n ? '10px' : '7px'"
                 style="border-radius:50%;cursor:pointer;transition:all 0.2s;">
            </div>
          }
        </div>

        <!-- Next -->
        <button (click)="next()" class="next-btn"
                style="background:#C9A84C;border:none;color:#0B1120;font-weight:600;
                       font-size:13.5px;padding:11px 24px;border-radius:2px;cursor:pointer;">
          Next →
        </button>
      </div>
    } @else {
      <!-- Step 5: just the progress dots (CTAs are inside the step) -->
      <div style="display:flex;justify-content:center;gap:8px;align-items:center;margin:20px 40px 0;">
        @for (n of [1,2,3,4,5]; track n) {
          <div class="dot-btn"
               (click)="goTo(n)"
               [style.background]="n === 5 ? '#C9A84C' : '#4B5A70'"
               [style.boxShadow]="n === 5 ? '0 0 8px rgba(201,168,76,0.6)' : 'none'"
               [style.width]="n === 5 ? '10px' : '7px'"
               [style.height]="n === 5 ? '10px' : '7px'"
               style="border-radius:50%;cursor:pointer;transition:all 0.2s;">
          </div>
        }
      </div>
    }

  </div><!-- end card -->
</div><!-- end backdrop -->
  `,
})
export class TutorialOverlayComponent {
  @Output() dismissed = new EventEmitter<void>();

  readonly step = signal(1);
  readonly totalSteps = 5;
  readonly activeRoleChip = signal(0);

  readonly Math = Math;

  readonly clockTicks: number[] = Array.from({ length: 12 }, (_, i) =>
    (i / 12) * Math.PI * 2 - Math.PI / 2
  );

  readonly roleChips: RoleChip[] = [
    {
      icon: '◉',
      name: 'Customer',
      mono: 'TRAVELLER',
      desc: 'Browse all eras, book passage through history, and track your journeys on the My Journeys page. Pick or create a traveller identity first.',
    },
    {
      icon: '✒',
      name: 'Licensed Agent',
      mono: 'FIELD OPS',
      desc: 'File field reports from the trips you are assigned to. The eyes and ears across the timeline — your reports feed the Agency\'s intelligence.',
    },
    {
      icon: '⬡',
      name: 'Manager',
      mono: 'OVERSIGHT',
      desc: 'Open the Dashboard to create trips, recruit agents, promote them to licensed, and work the Paradox Log to keep history intact.',
    },
    {
      icon: '✦',
      name: 'Director',
      mono: 'COMMAND',
      desc: 'The Command Centre: system-wide stats, oversee all managers, and audit every agent in the field. The top of the hierarchy.',
    },
    {
      icon: '⧗',
      name: 'Time Itself',
      mono: 'OMNISCIENT',
      desc: 'Enter The Loom — a living cosmic map of every timeline. Observe temporal integrity, watch paradoxes fork the strand, and simulate new fractures at will.',
    },
  ];

  @HostListener('document:keydown.escape')
  onEscape(): void { this.dismiss(); }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.dismiss();
  }

  next(): void {
    if (this.step() < this.totalSteps) this.step.update(s => s + 1);
    else this.dismiss();
  }

  back(): void {
    if (this.step() > 1) this.step.update(s => s - 1);
  }

  goTo(n: number): void { this.step.set(n); }

  dismiss(): void { this.dismissed.emit(); }

  selectRoleChip(i: number): void { this.activeRoleChip.set(i); }
}

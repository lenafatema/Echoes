export type Metric = 'budget' | 'days' | 'morale' | 'readiness';
export type State = Record<Metric, number>;
export type DecisionId = 'scale' | 'sponsor' | 'charge' | 'deposit' | 'proceed' | 'subsidize' | 'retain-fee' | 'rehearse' | 'volunteers' | 'trim-production';
export type BranchId = 'A' | 'B';
export type SituationId = 'sponsor-withdrawal' | 'supplier-risk' | 'attendance-risk' | 'day-planning' | 'intermission' | 'ending';
export type GameStatus = 'active' | 'completed';
export type OutcomeId = 'ready' | 'compromises' | 'at-risk';

export interface Change { metric: Metric; before: number; after: number; delta: number; rule: string }
export interface SimEvent {
  id: string; parentId: string | null; branchId: BranchId; step: number;
  title: string; description: string; changes: Change[]; rule: string;
  kind?: 'decision' | 'consequence' | 'day' | 'ending';
}
export interface Snapshot {
  state: State; eventCount: number; label: string; step: number;
  situationId?: SituationId; awaitAdvance?: boolean; status?: GameStatus;
  outcome?: OutcomeId | null; currentDay?: number; handledSupplierRisk?: boolean; handledAttendanceRisk?: boolean;
}
export interface DecisionRecord { id: DecisionId; title: string; eventId: string; day: number }
export interface Branch {
  id: BranchId; decision: DecisionId; state: State; events: SimEvent[]; history: Snapshot[];
  situationId: SituationId; awaitAdvance: boolean; status: GameStatus; outcome: OutcomeId | null;
  currentDay: number; handledSupplierRisk: boolean; handledAttendanceRisk: boolean; decisions: DecisionRecord[];
}
export interface DecisionOption { id: DecisionId; title: string; summary: string; detail: string; key: string; cost?: number }
export interface Situation { id: SituationId; title: string; description: string; why: string; entry: number }

export const INITIAL: State = { budget: 50000, days: 7, morale: 75, readiness: 65 };
export const INITIAL_DAY = 2;
export const SUPPLIER_RISK_THRESHOLD = 48000;
export const ENDING_THRESHOLDS = { readinessToOpen: 78, moraleToOpen: 45, readinessAtRisk: 55 } as const;
export const DECISIONS: DecisionOption[] = [
  { id: 'scale', title: 'Reduce the event scale', summary: 'Cut two activities and protect the schedule.', detail: 'Cancel two smaller activities. This saves ₹7,000, with lower morale and readiness.', key: '1' },
  { id: 'sponsor', title: 'Secure a replacement sponsor', summary: 'Trade a day of outreach for a funding recovery.', detail: 'A ₹12,000 sponsor recovery minus ₹3,000 outreach cost adds ₹9,000 net and takes one day.', key: '2' },
  { id: 'charge', title: 'Charge participants', summary: 'Recover part of the gap through a modest entry fee.', detail: 'A participation fee brings in ₹6,000 in this illustrative scenario, with a small morale and readiness cost.', key: '3' },
];

const decisionOptions: Record<DecisionId, DecisionOption> = {
  ...Object.fromEntries(DECISIONS.map(option => [option.id, option])) as Record<'scale' | 'sponsor' | 'charge', DecisionOption>,
  deposit: { id: 'deposit', title: 'Pay the supplier deposit', summary: 'Secure the equipment and protect readiness.', detail: 'Pay ₹5,000 now. The supplier confirms equipment and readiness improves by 10 points.', key: '1', cost: 5000 },
  proceed: { id: 'proceed', title: 'Proceed without the deposit', summary: 'Keep the remaining cash and accept equipment risk.', detail: 'No cash is spent. Readiness falls by 8 points while equipment remains unconfirmed.', key: '2' },
  subsidize: { id: 'subsidize', title: 'Subsidise participant access', summary: 'Use part of the fee recovery to protect attendance.', detail: 'Spend ₹2,000 on fee waivers. Morale rises by 5 and readiness by 3 points.', key: '1', cost: 2000 },
  'retain-fee': { id: 'retain-fee', title: 'Keep the participation fee', summary: 'Retain the recovery and accept lower participation.', detail: 'Keep the recovered funding. Morale falls by 5 and readiness by 4 points.', key: '2' },
  rehearse: { id: 'rehearse', title: 'Run a technical rehearsal', summary: 'Spend on a full equipment and stage check.', detail: 'Spend ₹4,000. Readiness rises by 12 points and morale by 1.', key: '1', cost: 4000 },
  volunteers: { id: 'volunteers', title: 'Train the volunteer team', summary: 'Build operational confidence with a smaller spend.', detail: 'Spend ₹2,500. Readiness rises by 5 points and morale by 7.', key: '2', cost: 2500 },
  'trim-production': { id: 'trim-production', title: 'Trim production costs', summary: 'Return money to the budget and accept a simpler event.', detail: 'Save ₹5,000. Readiness falls by 8 points and morale by 2.', key: '3' },
};

const rules: Record<DecisionId, { description: string; deltas: Partial<Record<Metric, number>>; rule: string }> = {
  scale: { description: 'Two smaller activities are removed. The revised plan protects the remaining budget and gives the team a clearer run-up.', deltas: { budget: 7000, morale: -6, readiness: -5 }, rule: 'Canceling two activities saves ₹7,000. No day is spent; morale falls by 6 and readiness by 5 points.' },
  sponsor: { description: 'A local partner commits ₹12,000 after one day of outreach. After ₹3,000 in outreach costs, the net budget gain is ₹9,000. Setup time tightens as the team pivots to sponsor calls.', deltas: { budget: 9000, days: -1, morale: -3, readiness: -8 }, rule: 'A fixed ₹12,000 sponsor recovery minus ₹3,000 in outreach costs adds ₹9,000 net; one day is spent. Readiness falls by 8 points and morale by 3.' },
  charge: { description: 'The participation fee recovers ₹6,000. The smaller barrier to entry slightly reduces expected attendance and team confidence.', deltas: { budget: 6000, morale: -4, readiness: -3 }, rule: 'A fixed illustrative ₹6,000 is collected. The fee reduces morale by 4 and readiness by 3 points; no day is spent.' },
  deposit: { description: 'The equipment supplier accepts the deposit and confirms the order.', deltas: { budget: -5000, readiness: 10 }, rule: 'Paying ₹5,000 confirms equipment and raises readiness by 10 points.' },
  proceed: { description: 'The team keeps the cash available and proceeds without a supplier commitment.', deltas: { readiness: -8 }, rule: 'Proceeding without the deposit preserves budget but lowers readiness by 8 points.' },
  subsidize: { description: 'A portion of the fee recovery is returned through participant waivers.', deltas: { budget: -2000, morale: 5, readiness: 3 }, rule: 'Spending ₹2,000 on waivers raises morale by 5 and readiness by 3 points.' },
  'retain-fee': { description: 'The fee remains in place and the recovery stays in the budget.', deltas: { morale: -5, readiness: -4 }, rule: 'Retaining the fee avoids additional spending; morale falls by 5 and readiness by 4 points.' },
  rehearse: { description: 'The team checks the stage, equipment, and running order in a full rehearsal.', deltas: { budget: -4000, readiness: 12, morale: 1 }, rule: 'A ₹4,000 rehearsal raises readiness by 12 and morale by 1 point.' },
  volunteers: { description: 'Volunteer leads rehearse guest handling and event operations.', deltas: { budget: -2500, readiness: 5, morale: 7 }, rule: 'A ₹2,500 volunteer session raises readiness by 5 and morale by 7 points.' },
  'trim-production': { description: 'Production costs are reduced by simplifying the technical setup.', deltas: { budget: 5000, readiness: -8, morale: -2 }, rule: 'A simpler production saves ₹5,000, while readiness falls by 8 and morale by 2 points.' },
};

export function situationFor(id: SituationId, day = INITIAL_DAY, daysRemaining = INITIAL.days): Situation {
  const situations: Record<SituationId, Situation> = {
    'sponsor-withdrawal': { id, entry: 2, title: 'The sponsor withdraws.', description: 'With seven days remaining, the festival’s principal sponsor has withdrawn. The original ₹50,000 budget now has a ₹15,000 gap.', why: 'The team must choose how to respond before the remaining plan can be assessed.', },
    'supplier-risk': { id, entry: 4, title: 'Equipment needs a deposit.', description: `The available budget is below ₹${SUPPLIER_RISK_THRESHOLD.toLocaleString('en-IN')}. The supplier will not confirm equipment without a deposit.`, why: 'Readiness is exposed until the team secures equipment or accepts the risk.', },
    'attendance-risk': { id, entry: 5, title: 'The participation fee is affecting attendance.', description: 'The fee recovered part of the sponsor gap, but several student groups have asked whether they can still attend.', why: 'The team can spend some of the recovery to protect access or keep the funds and accept the attendance risk.', },
    'day-planning': { id, entry: 3, title: day <= 3 ? 'The opening plan needs a final check.' : 'Preparation continues.', description: `It is day ${day}. ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} ${daysRemaining === 1 ? 'remains' : 'remain'} before opening. Choose one preparation action, then advance the calendar.`, why: 'Each action changes the resources; the next day brings a new decision point.', },
    intermission: { id, entry: 3, title: 'Consequences recorded.', description: 'The selected action has been applied to the current run.', why: 'Review the resource changes, then advance exactly one day to receive the next situation.', },
    ending: { id, entry: 9, title: 'The festival reaches opening day.', description: 'The remaining budget, team morale, and readiness determine what can open.', why: 'This outcome is calculated from the recorded state, not from the final choice alone.', },
  };
  return situations[id];
}

export function optionsFor(branch?: Branch): DecisionOption[] {
  if (!branch) return DECISIONS;
  if (branch.status === 'completed' || branch.awaitAdvance) return [];
  if (branch.situationId === 'sponsor-withdrawal') return DECISIONS;
  let ids: DecisionId[];
  if (branch.situationId === 'supplier-risk') ids = ['deposit', 'proceed'];
  else if (branch.situationId === 'attendance-risk') ids = ['subsidize', 'retain-fee'];
  else ids = ['rehearse', 'volunteers', 'trim-production'];
  return ids.map(id => decisionOptions[id]).filter(option => option.cost === undefined || branch.state.budget >= option.cost);
}

function clampState(state: State, deltas: Partial<Record<Metric, number>>, ruleText: string) {
  const next = { ...state };
  const changes: Change[] = [];
  for (const [key, delta] of Object.entries(deltas) as [Metric, number][]) {
    const before = next[key];
    const max = key === 'morale' || key === 'readiness' ? 100 : key === 'days' ? 7 : Number.POSITIVE_INFINITY;
    const after = Math.max(0, Math.min(max, before + delta));
    next[key] = after;
    changes.push({ metric: key, before, after, delta: after - before, rule: ruleText });
  }
  return { state: next, changes };
}

function snapshot(branch: Branch, label: string, step: number) {
  branch.history.push({ state: { ...branch.state }, eventCount: branch.events.length, label, step, situationId: branch.situationId, awaitAdvance: branch.awaitAdvance, status: branch.status, outcome: branch.outcome, currentDay: branch.currentDay, handledSupplierRisk: branch.handledSupplierRisk, handledAttendanceRisk: branch.handledAttendanceRisk });
}

export function outcomeFor(state: State): OutcomeId {
  if (state.budget >= 0 && state.readiness >= ENDING_THRESHOLDS.readinessToOpen && state.morale >= ENDING_THRESHOLDS.moraleToOpen) return 'ready';
  if (state.budget >= 0 && state.readiness >= ENDING_THRESHOLDS.readinessAtRisk) return 'compromises';
  return 'at-risk';
}

export function makeBranch(id: BranchId, decision: DecisionId): Branch {
  const branch: Branch = { id, decision, state: { ...INITIAL }, events: [], history: [], situationId: 'sponsor-withdrawal', awaitAdvance: false, status: 'active', outcome: null, currentDay: INITIAL_DAY, handledSupplierRisk: false, handledAttendanceRisk: false, decisions: [] };
  const withdrawal: SimEvent = { id: `${id}-1-withdrawal`, parentId: null, branchId: id, step: 1, title: 'Main sponsor withdrew', description: 'On day two, the principal sponsor withdrew, leaving a ₹15,000 gap against the original ₹50,000 budget.', changes: [], rule: 'The scenario opens on day two with seven days remaining.', kind: 'consequence' };
  branch.events.push(withdrawal);
  branch.history.push({ state: { ...INITIAL }, eventCount: 1, label: 'Sponsor withdrawal · opening position', step: 1, situationId: 'sponsor-withdrawal', awaitAdvance: false, status: 'active', outcome: null, currentDay: INITIAL_DAY, handledSupplierRisk: false, handledAttendanceRisk: false });
  const result = applyAction(branch, decision);
  return result || branch;
}

export function applyAction(original: Branch, id: DecisionId): Branch | null {
  if (original.status !== 'active' || original.awaitAdvance || !optionsFor(original).some(option => option.id === id)) return null;
  const branch: Branch = { ...original, state: { ...original.state }, events: [...original.events], history: [...original.history], decisions: [...original.decisions] };
  if (branch.decisions.length === 0 && ['scale', 'sponsor', 'charge'].includes(id)) branch.decision = id;
  const spec = rules[id];
  const step = branch.events.length + 1;
  const { state, changes } = clampState(branch.state, spec.deltas, spec.rule);
  branch.state = state;
  const event: SimEvent = { id: `${branch.id}-${step}-${id}`, parentId: branch.events[branch.events.length - 1]?.id || null, branchId: branch.id, step, title: decisionOptions[id].title, description: spec.description, changes, rule: spec.rule, kind: 'decision' };
  branch.events.push(event);
  branch.decisions.push({ id, title: event.title, eventId: event.id, day: branch.currentDay });
  if (id === 'deposit' || id === 'proceed') branch.handledSupplierRisk = true;
  if (id === 'subsidize' || id === 'retain-fee') branch.handledAttendanceRisk = true;
  if (id === 'scale') branch.situationId = 'day-planning';
  else if (id === 'charge') branch.situationId = 'attendance-risk';
  else if (id === 'sponsor') branch.situationId = 'day-planning';
  else branch.situationId = 'intermission';
  branch.awaitAdvance = true;
  snapshot(branch, event.title, step);
  return branch;
}

export function advanceBranchDay(original: Branch): Branch | null {
  if (original.status !== 'active' || !original.awaitAdvance) return null;
  const branch: Branch = { ...original, state: { ...original.state }, events: [...original.events], history: [...original.history], decisions: [...original.decisions] };
  const before = branch.state.days;
  const after = Math.max(0, before - 1);
  branch.state = { ...branch.state, days: after };
  branch.currentDay += 1;
  branch.awaitAdvance = false;
  const rule = 'One explicit calendar advance consumes one day.';
  const step = branch.events.length + 1;
  const changes: Change[] = [{ metric: 'days', before, after, delta: after - before, rule }];
  let title = `Day ${branch.currentDay} begins`;
  let description = `The calendar advances once. ${after} day${after === 1 ? '' : 's'} remain before opening.`;
  let kind: SimEvent['kind'] = 'day';
  if (after === 0) {
    branch.status = 'completed';
    branch.outcome = outcomeFor(branch.state);
    branch.situationId = 'ending';
    title = 'Opening day';
    description = `The festival reaches opening day with ${branch.state.readiness} readiness, ${branch.state.morale} morale, and ₹${branch.state.budget.toLocaleString('en-IN')} available.`;
    kind = 'ending';
  } else if (!branch.handledSupplierRisk && branch.state.budget < SUPPLIER_RISK_THRESHOLD) {
    branch.situationId = 'supplier-risk';
    title = 'Supplier deposit risk';
    description = `The budget is below ₹${SUPPLIER_RISK_THRESHOLD.toLocaleString('en-IN')}. Equipment confirmation now requires a ₹5,000 deposit.`;
  } else if (!branch.handledAttendanceRisk && branch.decisions.some(item => item.id === 'charge')) {
    branch.situationId = 'attendance-risk';
    title = 'Participant access concern';
    description = 'Student groups have asked for fee waivers after the participation charge.';
  } else {
    branch.situationId = 'day-planning';
    title = `Day ${branch.currentDay} planning`;
    description = `The team has ${after} day${after === 1 ? '' : 's'} remaining. Select a preparation action before the next calendar advance.`;
  }
  const event: SimEvent = { id: `${branch.id}-${step}-day`, parentId: branch.events[branch.events.length - 1]?.id || null, branchId: branch.id, step, title, description, changes, rule, kind };
  branch.events.push(event);
  snapshot(branch, title, step);
  return branch;
}

export function completeAtOpening(original: Branch): Branch {
  const branch: Branch = { ...original, state: { ...original.state }, events: [...original.events], history: [...original.history], decisions: [...original.decisions] };
  while (branch.state.days > 0) {
    const before = branch.state.days;
    branch.state = { ...branch.state, days: before - 1 };
    branch.currentDay += 1;
    const step = branch.events.length + 1;
    const event: SimEvent = { id: `${branch.id}-${step}-calendar`, parentId: branch.events[branch.events.length - 1]?.id || null, branchId: branch.id, step, title: `Day ${branch.currentDay} passes`, description: `The remaining calendar moves toward opening day. ${branch.state.days} days remain.`, changes: [{ metric: 'days', before, after: branch.state.days, delta: -1, rule: 'One day passes after the third recorded decision.' }], rule: 'One day passes after the third recorded decision.', kind: 'day' };
    branch.events.push(event);
    snapshot(branch, event.title, step);
  }
  if (!branch.handledSupplierRisk && branch.state.budget < SUPPLIER_RISK_THRESHOLD) {
    const before = branch.state.readiness;
    branch.state.readiness = Math.max(0, before - 6);
    const rule = `Budget below ₹${SUPPLIER_RISK_THRESHOLD.toLocaleString('en-IN')} triggers a supplier deposit risk, reducing readiness by 6.`;
    const step = branch.events.length + 1;
    branch.events.push({ id: `${branch.id}-${step}-supplier-risk`, parentId: branch.events[branch.events.length - 1]?.id || null, branchId: branch.id, step, title: 'Supplier deposit risk at opening', description: `With less than ₹${SUPPLIER_RISK_THRESHOLD.toLocaleString('en-IN')} available, a supplier asks for a deposit before confirming equipment. No time remains to resolve the deposit.`, changes: [{ metric: 'readiness', before, after: branch.state.readiness, delta: branch.state.readiness - before, rule }], rule, kind: 'consequence' });
    branch.handledSupplierRisk = true;
    snapshot(branch, 'Supplier deposit risk at opening', step);
  }
  branch.status = 'completed';
  branch.situationId = 'ending';
  branch.awaitAdvance = false;
  branch.outcome = outcomeFor(branch.state);
  const step = branch.events.length + 1;
  const event: SimEvent = { id: `${branch.id}-${step}-opening`, parentId: branch.events[branch.events.length - 1]?.id || null, branchId: branch.id, step, title: 'Opening day', description: `The festival reaches opening day with ${branch.state.readiness} readiness, ${branch.state.morale} morale, and ₹${branch.state.budget.toLocaleString('en-IN')} available.`, changes: [], rule: 'The opening-day outcome follows the recorded readiness, morale, and budget thresholds.', kind: 'ending' };
  branch.events.push(event);
  snapshot(branch, 'Opening day', step);
  return branch;
}

export function restoreBranchAt(branch: Branch, historyIndex: number): Branch {
  const index = Math.max(0, Math.min(branch.history.length - 1, historyIndex));
  const point = branch.history[index];
  return { ...branch, state: { ...point.state }, events: branch.events.slice(0, point.eventCount), history: branch.history.slice(0, index + 1), situationId: point.situationId || 'day-planning', awaitAdvance: Boolean(point.awaitAdvance), status: point.status || 'active', outcome: point.outcome || null, currentDay: point.currentDay || INITIAL_DAY, handledSupplierRisk: Boolean(point.handledSupplierRisk), handledAttendanceRisk: Boolean(point.handledAttendanceRisk), decisions: branch.decisions.filter(decision => branch.events.slice(0, point.eventCount).some(event => event.id === decision.eventId)) };
}

export const format = (metric: Metric, value: number) => metric === 'budget' ? `₹${value.toLocaleString('en-IN')}` : metric === 'days' ? `${value} days` : `${value}`;

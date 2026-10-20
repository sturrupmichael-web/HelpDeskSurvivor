// Evolutions: a weapon at max level + the listed passive (any level) evolves into
// `into` when you open a Change Approved chest. Evolved weapons live in data/weapons.js
// (marked `evolved: true`) and are never offered on level-up cards.

export const EVOLUTIONS = {
  reboot: { passive: 'domainAdmin', into: 'fleetReboot' },
  powershell: { passive: 'runbook', into: 'scheduledTasks' },
  firewall: { passive: 'headphones', into: 'zeroTrust' },
  autoClose: { passive: 'itil', into: 'autoTriage' },
  patchCable: { passive: 'secondMonitor', into: 'fiberBackbone' },
  delegate: { passive: 'itil', into: 'outsourcedTeam' },
  coffeeRun: { passive: 'coldBrew', into: 'espresso' },
};

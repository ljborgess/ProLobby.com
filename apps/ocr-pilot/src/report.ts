import { FIRST_PASS_TARGET } from './constants'
import type { ImpostorCheck, PilotReport, PrintMeasurement, RejectionCause } from './types'
import { REJECTION_CAUSES } from './types'

export function aggregateReport(
  engine: string,
  prints: PrintMeasurement[],
  impostorCheck: ImpostorCheck = { checks: 0, falseAccepts: 0 },
): PilotReport {
  const accepted = prints.filter((print) => print.accepted).length
  const firstPassAcceptRate = prints.length === 0 ? 0 : accepted / prints.length
  const rejectionCauses = emptyCauses()
  for (const print of prints) {
    for (const cause of print.causes) {
      rejectionCauses[cause] += 1
    }
  }
  return {
    engine,
    impostorCheck,
    firstPassAcceptRate,
    firstPassTarget: FIRST_PASS_TARGET,
    meetsTarget: firstPassAcceptRate >= FIRST_PASS_TARGET,
    byLanguage: rateBy(prints, (print) => print.languageExpected),
    byOrigin: rateBy(prints, (print) => print.origin),
    byCapture: rateBy(prints, (print) => print.capture),
    byEdition: rateBy(prints, (print) => print.edition),
    rejectionCauses,
    prints,
  }
}

function rateBy(
  prints: PrintMeasurement[],
  key: (print: PrintMeasurement) => string,
): Record<string, number> {
  const groups = new Map<string, PrintMeasurement[]>()
  for (const print of prints) {
    const groupKey = key(print)
    const list = groups.get(groupKey) ?? []
    list.push(print)
    groups.set(groupKey, list)
  }
  const rates: Record<string, number> = {}
  for (const [groupKey, list] of groups) {
    const accepted = list.filter((print) => print.accepted).length
    rates[groupKey] = list.length === 0 ? 0 : accepted / list.length
  }
  return rates
}

function emptyCauses(): Record<RejectionCause, number> {
  const counts = {} as Record<RejectionCause, number>
  for (const cause of REJECTION_CAUSES) {
    counts[cause] = 0
  }
  return counts
}

// ═══════════════════════════════════════════════════════════════════
//  QABBAN OS — Enterprise ERP Modules v6.0
//  Human Capital · Asset Management · Unified Financial Intelligence
// ═══════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
//  MODULE 1: HUMAN CAPITAL & SAUDI PAYROLL
// ────────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION'
export type EmployeeNationality = 'SAUDI' | 'EXPAT'
export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR'
export type BaristaCertLevel = 'NONE' | 'SCA_INTRO' | 'SCA_FOUNDATION' | 'SCA_INTERMEDIATE' | 'SCA_PROFESSIONAL' | 'WBC_CERTIFIED'
export type ScaCertification = 'COFFEE_SKILLS' | 'BARISTA_SKILLS' | 'BREWING' | 'SENSORY' | 'ROASTING' | 'GREEN_COFFEE'

export interface Staff {
  id                  : string           // EMP-001
  fullName            : string
  nationalId          : string           // Saudi NID or Iqama
  nationality         : EmployeeNationality
  jobTitle            : string           // e.g. Head Barista, Roast Master
  branchId            : string           // assigned branch
  contractType        : ContractType
  status              : EmployeeStatus
  startDate           : string           // ISO date
  terminationDate     : string | null
  basicSalary         : number           // SAR/month
  housingAllowance    : number           // SAR/month (25% of basic is common)
  transportAllowance  : number           // SAR/month
  otherAllowances     : number           // SAR/month
  // SCA Certifications
  scaCertifications   : ScaCertification[]
  baristaLevel        : BaristaCertLevel
  scaExpiryDate       : string | null    // ISO date
  // GOSI
  gosiRegistered      : boolean
  gosiNumber          : string | null
  // EOSB tracking
  eosbAccruedSar      : number           // computed by calcEosb()
  eosbLastCalcDate    : string | null
  // Bank details for WPS
  bankName            : string
  iban                : string           // SA + 22 digits
  // Metadata
  phone               : string
  email               : string
  createdAt           : string
  updatedAt           : string
}

// ── GOSI Constants (Saudi Arabia 2026) ────────────────────────────
export const GOSI_OCCUPATIONAL_HAZARD_RATE = 0.02        // 2% employer only
export const GOSI_PENSION_SAUDI_EMPLOYEE   = 0.10        // 10% of basic (employee)
export const GOSI_PENSION_SAUDI_EMPLOYER   = 0.12        // 12% of basic (employer)
export const GOSI_EXPAT_HAZARD_ONLY        = true        // Expats: hazard only, no pension

// ── EOSB Constants (KSA Labor Law) ────────────────────────────────
export const EOSB_RATE_UNDER_5_YEARS  = 0.5  // 15 days / 30 days = 0.5 month salary per year
export const EOSB_RATE_OVER_5_YEARS   = 1.0  // 1 month salary per year after 5 years

export interface GosiBreakdown {
  employeeId          : string
  employeeName        : string
  basicSalary         : number
  nationality         : EmployeeNationality
  hazardFee           : number    // always 2% employer
  employeePension     : number    // Saudis only
  employerPension     : number    // Saudis only
  totalEmployerCost   : number    // hazardFee + employerPension
  totalEmployeeDeduction: number  // employeePension
  month               : string    // YYYY-MM
}

export interface EosbRecord {
  employeeId          : string
  employeeName        : string
  startDate           : string
  calcDate            : string
  yearsOfService      : number
  monthsPartial       : number
  basicSalary         : number
  accrualRate         : number    // 0.5 or 1.0 based on tenure
  totalEosbSar        : number
  eosbFirstFiveYears  : number
  eosbAfterFiveYears  : number
}

export interface WpsRecord {                             // WPS = Wage Protection System
  employeeId          : string
  employeeName        : string
  iban                : string
  basicSalary         : number
  housingAllowance    : number
  transportAllowance  : number
  otherAllowances     : number
  gosiDeduction       : number
  advanceDeduction    : number
  otherDeductions     : number
  netPay              : number
  payMonth            : string     // YYYY-MM
  payDate             : string     // ISO date
}

export interface SifFile {                              // Salary Information File for Mudad/WPS
  fileId              : string
  generatedAt         : string
  payMonth            : string
  companyIban         : string
  companyName         : string
  totalNetPay         : number
  employeeCount       : number
  records             : WpsRecord[]
  sifContent          : string     // RAW SIF text content
}

// ── GOSI Calculation ──────────────────────────────────────────────
export function calcGosi(staff: Staff, month: string): GosiBreakdown {
  const hazard    = staff.basicSalary * GOSI_OCCUPATIONAL_HAZARD_RATE
  const empPension  = staff.nationality === 'SAUDI' ? staff.basicSalary * GOSI_PENSION_SAUDI_EMPLOYEE : 0
  const erPension   = staff.nationality === 'SAUDI' ? staff.basicSalary * GOSI_PENSION_SAUDI_EMPLOYER : 0
  return {
    employeeId            : staff.id,
    employeeName          : staff.fullName,
    basicSalary           : staff.basicSalary,
    nationality           : staff.nationality,
    hazardFee             : hazard,
    employeePension       : empPension,
    employerPension       : erPension,
    totalEmployerCost     : hazard + erPension,
    totalEmployeeDeduction: empPension,
    month,
  }
}

// ── EOSB Calculation (KSA Labor Law Art. 84) ──────────────────────
export function calcEosb(staff: Staff): EosbRecord {
  const start   = new Date(staff.startDate)
  const calcDate = new Date()
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25
  const totalYears = (calcDate.getTime() - start.getTime()) / msPerYear
  const fullYears  = Math.floor(totalYears)
  const partialMonths = Math.floor((totalYears - fullYears) * 12)

  const firstFive = Math.min(fullYears, 5) * EOSB_RATE_UNDER_5_YEARS * staff.basicSalary
  const afterFive = fullYears > 5 ? (fullYears - 5) * EOSB_RATE_OVER_5_YEARS * staff.basicSalary : 0
  const totalEosb  = firstFive + afterFive

  return {
    employeeId       : staff.id,
    employeeName     : staff.fullName,
    startDate        : staff.startDate,
    calcDate         : calcDate.toISOString().split('T')[0],
    yearsOfService   : fullYears,
    monthsPartial    : partialMonths,
    basicSalary      : staff.basicSalary,
    accrualRate      : fullYears >= 5 ? EOSB_RATE_OVER_5_YEARS : EOSB_RATE_UNDER_5_YEARS,
    totalEosbSar     : Math.round(totalEosb * 100) / 100,
    eosbFirstFiveYears: Math.round(firstFive * 100) / 100,
    eosbAfterFiveYears: Math.round(afterFive * 100) / 100,
  }
}

// ── WPS / SIF Generator ───────────────────────────────────────────
export function generateWpsRecord(staff: Staff, payMonth: string, advanceDeduction = 0): WpsRecord {
  const gosi = calcGosi(staff, payMonth)
  const gross = staff.basicSalary + staff.housingAllowance + staff.transportAllowance + staff.otherAllowances
  const net   = gross - gosi.totalEmployeeDeduction - advanceDeduction
  return {
    employeeId       : staff.id,
    employeeName     : staff.fullName,
    iban             : staff.iban,
    basicSalary      : staff.basicSalary,
    housingAllowance : staff.housingAllowance,
    transportAllowance: staff.transportAllowance,
    otherAllowances  : staff.otherAllowances,
    gosiDeduction    : gosi.totalEmployeeDeduction,
    advanceDeduction,
    otherDeductions  : 0,
    netPay           : Math.round(net * 100) / 100,
    payMonth,
    payDate          : new Date().toISOString().split('T')[0],
  }
}

// ── SIF file builder (Mudad/WPS standard) ─────────────────────────
export function generateSifFile(
  staffList: Staff[],
  payMonth: string,
  companyIban: string,
  companyName: string
): SifFile {
  const records = staffList
    .filter(s => s.status === 'ACTIVE' || s.status === 'PROBATION')
    .map(s => generateWpsRecord(s, payMonth))

  const totalNetPay = records.reduce((s, r) => s + r.netPay, 0)

  // SIF format: pipe-delimited, one row per employee
  // Header: H|CompanyName|PayMonth|RecordCount|TotalAmount
  const headerLine  = `H|${companyName}|${payMonth}|${records.length}|${totalNetPay.toFixed(2)}`
  const detailLines = records.map(r =>
    `D|${r.employeeId}|${r.employeeName}|${r.iban}|${r.basicSalary.toFixed(2)}|${r.housingAllowance.toFixed(2)}|${r.transportAllowance.toFixed(2)}|${r.otherAllowances.toFixed(2)}|${r.gosiDeduction.toFixed(2)}|${r.advanceDeduction.toFixed(2)}|${r.netPay.toFixed(2)}|${r.payDate}`
  )
  const footerLine  = `F|${records.length}|${totalNetPay.toFixed(2)}`
  const sifContent  = [headerLine, ...detailLines, footerLine].join('\n')

  const ts36 = Date.now().toString(36).toUpperCase()
  return {
    fileId       : `SIF-${ts36}`,
    generatedAt  : new Date().toISOString(),
    payMonth,
    companyIban,
    companyName,
    totalNetPay  : Math.round(totalNetPay * 100) / 100,
    employeeCount: records.length,
    records,
    sifContent,
  }
}

// ── Demo staff seed data ──────────────────────────────────────────
export const staffDirectory: Staff[] = [
  {
    id: 'EMP-001', fullName: 'Ahmed Al-Qahtani', nationalId: '1098765432',
    nationality: 'SAUDI', jobTitle: 'Roast Master', branchId: 'BR-RUH',
    contractType: 'FULL_TIME', status: 'ACTIVE',
    startDate: '2022-03-01', terminationDate: null,
    basicSalary: 8500, housingAllowance: 2125, transportAllowance: 500, otherAllowances: 200,
    scaCertifications: ['ROASTING', 'SENSORY'], baristaLevel: 'SCA_PROFESSIONAL', scaExpiryDate: '2027-06-30',
    gosiRegistered: true, gosiNumber: 'GOSI-1098765432',
    eosbAccruedSar: 0, eosbLastCalcDate: null,
    bankName: 'Al Rajhi Bank', iban: 'SA4420000001234567891234',
    phone: '+966501110001', email: 'ahmed@camelstep.sa',
    createdAt: '2022-03-01T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'EMP-002', fullName: 'Layla Hassan', nationalId: '2098765432',
    nationality: 'SAUDI', jobTitle: 'Head Barista', branchId: 'BR-RUH',
    contractType: 'FULL_TIME', status: 'ACTIVE',
    startDate: '2023-06-01', terminationDate: null,
    basicSalary: 5500, housingAllowance: 1375, transportAllowance: 400, otherAllowances: 0,
    scaCertifications: ['BARISTA_SKILLS', 'BREWING'], baristaLevel: 'SCA_INTERMEDIATE', scaExpiryDate: '2026-09-30',
    gosiRegistered: true, gosiNumber: 'GOSI-2098765432',
    eosbAccruedSar: 0, eosbLastCalcDate: null,
    bankName: 'Saudi National Bank', iban: 'SA7610000002345678912345',
    phone: '+966502220002', email: 'layla@camelstep.sa',
    createdAt: '2023-06-01T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'EMP-003', fullName: 'Carlos Rivera', nationalId: 'A12345678',
    nationality: 'EXPAT', jobTitle: 'Senior Barista', branchId: 'BR-JED',
    contractType: 'FULL_TIME', status: 'ACTIVE',
    startDate: '2024-01-15', terminationDate: null,
    basicSalary: 4500, housingAllowance: 1200, transportAllowance: 300, otherAllowances: 0,
    scaCertifications: ['BARISTA_SKILLS', 'SENSORY'], baristaLevel: 'SCA_FOUNDATION', scaExpiryDate: '2026-12-31',
    gosiRegistered: true, gosiNumber: 'GOSI-A12345678',
    eosbAccruedSar: 0, eosbLastCalcDate: null,
    bankName: 'Riyad Bank', iban: 'SA8420000003456789123456',
    phone: '+966503330003', email: 'carlos@camelstep.sa',
    createdAt: '2024-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'EMP-004', fullName: 'Fatima Al-Dosari', nationalId: '1198765432',
    nationality: 'SAUDI', jobTitle: 'Green Coffee Buyer', branchId: 'BR-RUH',
    contractType: 'FULL_TIME', status: 'ACTIVE',
    startDate: '2021-09-01', terminationDate: null,
    basicSalary: 9200, housingAllowance: 2300, transportAllowance: 500, otherAllowances: 350,
    scaCertifications: ['GREEN_COFFEE', 'SENSORY', 'COFFEE_SKILLS'], baristaLevel: 'SCA_PROFESSIONAL', scaExpiryDate: '2027-03-31',
    gosiRegistered: true, gosiNumber: 'GOSI-1198765432',
    eosbAccruedSar: 0, eosbLastCalcDate: null,
    bankName: 'Al Rajhi Bank', iban: 'SA0220000004567891234567',
    phone: '+966504440004', email: 'fatima@camelstep.sa',
    createdAt: '2021-09-01T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'EMP-005', fullName: 'Omar Khalid', nationalId: '1298765432',
    nationality: 'SAUDI', jobTitle: 'Operations Manager', branchId: 'BR-DMM',
    contractType: 'FULL_TIME', status: 'ACTIVE',
    startDate: '2020-04-01', terminationDate: null,
    basicSalary: 12000, housingAllowance: 3000, transportAllowance: 600, otherAllowances: 500,
    scaCertifications: ['COFFEE_SKILLS'], baristaLevel: 'SCA_FOUNDATION', scaExpiryDate: '2026-07-31',
    gosiRegistered: true, gosiNumber: 'GOSI-1298765432',
    eosbAccruedSar: 0, eosbLastCalcDate: null,
    bankName: 'Saudi National Bank', iban: 'SA1610000005678912345678',
    phone: '+966505550005', email: 'omar@camelstep.sa',
    createdAt: '2020-04-01T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
]

// ────────────────────────────────────────────────────────────────────
//  MODULE 2: ASSET & PREDICTIVE MAINTENANCE
// ────────────────────────────────────────────────────────────────────

export type AssetCategory = 'ROASTER' | 'GRINDER' | 'ESPRESSO_MACHINE' | 'BREWER' | 'REFRIGERATION' | 'PACKAGING' | 'OTHER'
export type AssetStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'SERVICE_DUE' | 'RETIRED' | 'DECOMMISSIONED'
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION' | 'PARTS_REPLACEMENT'

export interface Asset {
  id                  : string        // AST-001
  name                : string        // e.g. Giesen W15 Roaster #1
  brand               : string        // Giesen, La Marzocco, Mahlkönig
  model               : string        // W15, KB90, E65S
  category            : AssetCategory
  branchId            : string
  serialNumber        : string
  purchaseDate        : string        // ISO date
  purchaseCostSar     : number
  currentValueSar     : number        // computed by depreciation engine
  usefulLifeYears     : number        // for straight-line depreciation
  salvageValueSar     : number
  status              : AssetStatus
  // Usage tracking
  totalKgProcessed    : number        // for grinders/roasters
  totalCyclesRun      : number        // for roasters (roast cycles)
  totalHoursOperated  : number
  // Maintenance thresholds
  burrReplacementKg   : number        // e.g. 500 kg for grinders (0 = N/A)
  serviceIntervalDays : number        // e.g. 90 days
  serviceIntervalKg   : number        // e.g. 1000 kg cumulative
  lastServiceDate     : string | null
  nextServiceDue      : string | null
  // Alerts
  serviceDueAlert     : boolean
  burrAlertTriggered  : boolean
  // Notes
  notes               : string
  createdAt           : string
  updatedAt           : string
}

export interface MaintenanceLog {
  id              : string        // MNT-001
  assetId         : string
  assetName       : string
  maintenanceType : MaintenanceType
  description     : string
  performedBy     : string        // technician name
  costSar         : number
  partsReplaced   : string[]
  beforeStatus    : AssetStatus
  afterStatus     : AssetStatus
  performedAt     : string        // ISO date
  nextScheduled   : string | null
  invoiceRef      : string | null
}

export interface DepreciationRecord {
  assetId         : string
  assetName       : string
  purchaseCost    : number
  salvageValue    : number
  usefulLifeYears : number
  monthsElapsed   : number
  monthlyDepreciation: number
  cumulativeDepreciation: number
  currentBookValue: number
  depreciationMethod: 'STRAIGHT_LINE'
  asOf            : string        // ISO date
}

// ── Depreciation Engine (Straight-Line) ──────────────────────────
export function calcDepreciation(asset: Asset): DepreciationRecord {
  const purchase = new Date(asset.purchaseDate)
  const now      = new Date()
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44
  const monthsElapsed = Math.floor((now.getTime() - purchase.getTime()) / msPerMonth)

  const depreciableAmount = asset.purchaseCostSar - asset.salvageValueSar
  const totalMonths       = asset.usefulLifeYears * 12
  const monthlyDep        = depreciableAmount / totalMonths
  const cumDep            = Math.min(monthlyDep * monthsElapsed, depreciableAmount)
  const bookValue         = Math.max(asset.purchaseCostSar - cumDep, asset.salvageValueSar)

  return {
    assetId              : asset.id,
    assetName            : asset.name,
    purchaseCost         : asset.purchaseCostSar,
    salvageValue         : asset.salvageValueSar,
    usefulLifeYears      : asset.usefulLifeYears,
    monthsElapsed,
    monthlyDepreciation  : Math.round(monthlyDep * 100) / 100,
    cumulativeDepreciation: Math.round(cumDep * 100) / 100,
    currentBookValue     : Math.round(bookValue * 100) / 100,
    depreciationMethod   : 'STRAIGHT_LINE',
    asOf                 : now.toISOString().split('T')[0],
  }
}

// ── Maintenance Watchdog ──────────────────────────────────────────
export interface MaintenanceAlert {
  assetId     : string
  assetName   : string
  branchId    : string
  alertType   : 'BURR_REPLACEMENT' | 'SERVICE_OVERDUE' | 'SERVICE_DUE_SOON' | 'USAGE_LIMIT'
  severity    : 'CRITICAL' | 'WARNING' | 'INFO'
  message     : string
  currentValue: number
  threshold   : number
  unit        : string
  detectedAt  : string
}

export function runMaintenanceWatchdog(assets: Asset[]): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = []
  const now = new Date()

  for (const asset of assets) {
    if (asset.status === 'RETIRED' || asset.status === 'DECOMMISSIONED') continue

    // Burr replacement threshold (grinders)
    if (asset.burrReplacementKg > 0 && asset.totalKgProcessed >= asset.burrReplacementKg * 0.9) {
      const severity = asset.totalKgProcessed >= asset.burrReplacementKg ? 'CRITICAL' : 'WARNING'
      alerts.push({
        assetId     : asset.id,
        assetName   : asset.name,
        branchId    : asset.branchId,
        alertType   : 'BURR_REPLACEMENT',
        severity,
        message     : severity === 'CRITICAL'
          ? `Burr replacement required — ${asset.totalKgProcessed.toFixed(0)} kg processed (limit ${asset.burrReplacementKg} kg)`
          : `Burr replacement due soon — ${asset.totalKgProcessed.toFixed(0)} / ${asset.burrReplacementKg} kg`,
        currentValue: asset.totalKgProcessed,
        threshold   : asset.burrReplacementKg,
        unit        : 'kg',
        detectedAt  : now.toISOString(),
      })
    }

    // Service interval (days)
    if (asset.serviceIntervalDays > 0 && asset.lastServiceDate) {
      const lastSvc = new Date(asset.lastServiceDate)
      const daysSince = (now.getTime() - lastSvc.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince >= asset.serviceIntervalDays) {
        alerts.push({
          assetId     : asset.id,
          assetName   : asset.name,
          branchId    : asset.branchId,
          alertType   : 'SERVICE_OVERDUE',
          severity    : 'CRITICAL',
          message     : `Service overdue — last service ${Math.floor(daysSince)} days ago (interval ${asset.serviceIntervalDays} days)`,
          currentValue: Math.floor(daysSince),
          threshold   : asset.serviceIntervalDays,
          unit        : 'days',
          detectedAt  : now.toISOString(),
        })
      } else if (daysSince >= asset.serviceIntervalDays * 0.85) {
        alerts.push({
          assetId     : asset.id,
          assetName   : asset.name,
          branchId    : asset.branchId,
          alertType   : 'SERVICE_DUE_SOON',
          severity    : 'WARNING',
          message     : `Service due soon — ${Math.floor(daysSince)} / ${asset.serviceIntervalDays} days`,
          currentValue: Math.floor(daysSince),
          threshold   : asset.serviceIntervalDays,
          unit        : 'days',
          detectedAt  : now.toISOString(),
        })
      }
    }

    // Kg usage limit
    if (asset.serviceIntervalKg > 0 && asset.totalKgProcessed >= asset.serviceIntervalKg * 0.9) {
      const severity = asset.totalKgProcessed >= asset.serviceIntervalKg ? 'CRITICAL' : 'WARNING'
      alerts.push({
        assetId     : asset.id,
        assetName   : asset.name,
        branchId    : asset.branchId,
        alertType   : 'USAGE_LIMIT',
        severity,
        message     : `Usage limit ${severity === 'CRITICAL' ? 'reached' : 'approaching'} — ${asset.totalKgProcessed.toFixed(0)} / ${asset.serviceIntervalKg} kg`,
        currentValue: asset.totalKgProcessed,
        threshold   : asset.serviceIntervalKg,
        unit        : 'kg',
        detectedAt  : now.toISOString(),
      })
    }
  }

  return alerts
}

// ── Demo asset seed data ──────────────────────────────────────────
export const assetRegistry: Asset[] = [
  {
    id: 'AST-001', name: 'Giesen W15 Roaster #1', brand: 'Giesen', model: 'W15',
    category: 'ROASTER', branchId: 'BR-RUH', serialNumber: 'GSN-W15-20220315',
    purchaseDate: '2022-03-15', purchaseCostSar: 185000, currentValueSar: 0,
    usefulLifeYears: 15, salvageValueSar: 18500,
    status: 'OPERATIONAL',
    totalKgProcessed: 12450, totalCyclesRun: 892, totalHoursOperated: 2670,
    burrReplacementKg: 0, serviceIntervalDays: 90, serviceIntervalKg: 5000,
    lastServiceDate: '2026-01-10', nextServiceDue: '2026-04-10',
    serviceDueAlert: false, burrAlertTriggered: false,
    notes: 'Primary production roaster — Riyadh HQ',
    createdAt: '2022-03-15T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'AST-002', name: 'Mahlkönig E65S Grinder #1', brand: 'Mahlkönig', model: 'E65S',
    category: 'GRINDER', branchId: 'BR-RUH', serialNumber: 'MK-E65S-20230801',
    purchaseDate: '2023-08-01', purchaseCostSar: 12500, currentValueSar: 0,
    usefulLifeYears: 8, salvageValueSar: 800,
    status: 'SERVICE_DUE',
    totalKgProcessed: 482, totalCyclesRun: 0, totalHoursOperated: 1240,
    burrReplacementKg: 500, serviceIntervalDays: 60, serviceIntervalKg: 300,
    lastServiceDate: '2025-11-15', nextServiceDue: '2026-01-14',
    serviceDueAlert: true, burrAlertTriggered: true,
    notes: 'Main espresso bar grinder — approaching burr replacement threshold',
    createdAt: '2023-08-01T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'AST-003', name: 'La Marzocco KB90 Espresso Machine', brand: 'La Marzocco', model: 'KB90',
    category: 'ESPRESSO_MACHINE', branchId: 'BR-RUH', serialNumber: 'LM-KB90-20231201',
    purchaseDate: '2023-12-01', purchaseCostSar: 95000, currentValueSar: 0,
    usefulLifeYears: 10, salvageValueSar: 9500,
    status: 'OPERATIONAL',
    totalKgProcessed: 0, totalCyclesRun: 14280, totalHoursOperated: 1950,
    burrReplacementKg: 0, serviceIntervalDays: 180, serviceIntervalKg: 0,
    lastServiceDate: '2025-12-01', nextServiceDue: '2026-06-01',
    serviceDueAlert: false, burrAlertTriggered: false,
    notes: 'Primary espresso machine — Riyadh café bar',
    createdAt: '2023-12-01T00:00:00Z', updatedAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'AST-004', name: 'Giesen W6 Roaster — Jeddah', brand: 'Giesen', model: 'W6',
    category: 'ROASTER', branchId: 'BR-JED', serialNumber: 'GSN-W6-20231015',
    purchaseDate: '2023-10-15', purchaseCostSar: 120000, currentValueSar: 0,
    usefulLifeYears: 15, salvageValueSar: 12000,
    status: 'OPERATIONAL',
    totalKgProcessed: 6800, totalCyclesRun: 510, totalHoursOperated: 1530,
    burrReplacementKg: 0, serviceIntervalDays: 90, serviceIntervalKg: 5000,
    lastServiceDate: '2026-01-20', nextServiceDue: '2026-04-20',
    serviceDueAlert: false, burrAlertTriggered: false,
    notes: 'Jeddah branch production roaster',
    createdAt: '2023-10-15T00:00:00Z', updatedAt: '2026-01-20T00:00:00Z',
  },
  {
    id: 'AST-005', name: 'Mahlkönig EK43 Grinder — Jeddah', brand: 'Mahlkönig', model: 'EK43',
    category: 'GRINDER', branchId: 'BR-JED', serialNumber: 'MK-EK43-20240201',
    purchaseDate: '2024-02-01', purchaseCostSar: 18000, currentValueSar: 0,
    usefulLifeYears: 8, salvageValueSar: 1200,
    status: 'OPERATIONAL',
    totalKgProcessed: 298, totalCyclesRun: 0, totalHoursOperated: 890,
    burrReplacementKg: 500, serviceIntervalDays: 60, serviceIntervalKg: 300,
    lastServiceDate: '2026-02-01', nextServiceDue: '2026-04-02',
    serviceDueAlert: false, burrAlertTriggered: false,
    notes: 'Batch brewer / filter grinder at Jeddah',
    createdAt: '2024-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z',
  },
]

export const maintenanceLogs: MaintenanceLog[] = [
  {
    id: 'MNT-001', assetId: 'AST-001', assetName: 'Giesen W15 Roaster #1',
    maintenanceType: 'PREVENTIVE', description: 'Q1 2026 preventive service — drum clean, bearing inspection, thermocouple calibration',
    performedBy: 'Giesen Certified Technician', costSar: 3500,
    partsReplaced: ['Drum seal gasket', 'Air inlet filter'],
    beforeStatus: 'OPERATIONAL', afterStatus: 'OPERATIONAL',
    performedAt: '2026-01-10', nextScheduled: '2026-04-10', invoiceRef: 'INV-SVC-001',
  },
  {
    id: 'MNT-002', assetId: 'AST-002', assetName: 'Mahlkönig E65S Grinder #1',
    maintenanceType: 'CALIBRATION', description: 'Burr alignment check + calibration — burrs at 96% wear, replacement recommended',
    performedBy: 'Omar Khalid', costSar: 350,
    partsReplaced: [],
    beforeStatus: 'OPERATIONAL', afterStatus: 'SERVICE_DUE',
    performedAt: '2025-11-15', nextScheduled: '2026-01-15', invoiceRef: null,
  },
]

// ────────────────────────────────────────────────────────────────────
//  MODULE 3: UNIFIED FINANCIAL INTELLIGENCE
// ────────────────────────────────────────────────────────────────────

export interface OperationalExpenses {
  month             : string           // YYYY-MM
  branchId          : string
  // Labor
  totalPayrollSar   : number           // gross wages
  gosiEmployerSar   : number           // employer GOSI contributions
  totalLaborCostSar : number           // payroll + GOSI
  headCount         : number
  // Maintenance
  totalMaintenanceSar: number
  assetDepreciationMonthlySar: number
  // Utilities & Other
  utilitiesSar      : number
  rentSar           : number
  otherOpexSar      : number
  // Total
  totalOpexSar      : number
}

export interface ConsolidatedPnL {
  period              : string          // YYYY-MM or YYYY-QQ
  branchId            : string | 'ALL'
  // Revenue
  grossSalesSar       : number          // from B2B + retail + marketplace
  b2bRevenueSar       : number
  marketplaceRevenueSar: number
  retailRevenueSar    : number
  // COGS (Sponge-adjusted)
  cogsSar             : number          // trueRoastedCost × kg sold
  spongeAdjustmentSar : number          // environmental P&L delta
  adjustedCogsSar     : number          // cogsSar + spongeAdjustmentSar
  grossProfitSar      : number          // grossSales - adjustedCogs
  grossMarginPct      : number          // grossProfit / grossSales
  // Operating Expenses
  totalLaborCostSar   : number
  maintenanceSar      : number
  depreciationSar     : number
  utilitiesSar        : number
  rentSar             : number
  otherOpexSar        : number
  totalOpexSar        : number
  // EBITDA & Net Profit
  ebitdaSar           : number          // grossProfit - opex (before dep)
  ebitSar             : number          // ebitda - depreciation
  netProfitSar        : number          // ebit (simplified, no interest/tax yet)
  netMarginPct        : number          // netProfit / grossSales
  // Per-unit metrics
  avgRevenuePerKg     : number
  avgCostPerKg        : number
  totalKgSold         : number
  // ZATCA
  totalVatCollectedSar: number          // 15% on commercial sales
  vatLiabilitySar     : number          // payable to GAZT
}

export interface TrueOperatingMarginCalc {
  grossSalesSar       : number
  laborCostSar        : number
  cogsSar             : number          // Sponge-adjusted COGS
  maintenanceSar      : number
  depreciationSar     : number
  utilitiesRentSar    : number
  netProfitSar        : number
  netMarginPct        : number
  breakdown           : string          // formula string for UI display
}

// ── True Operating Margin Calculator ─────────────────────────────
export function calcTrueOperatingMargin(
  grossSales: number,
  laborCost: number,
  spongeAdjustedCogs: number,
  maintenance: number,
  depreciation: number,
  utilitiesRent: number
): TrueOperatingMarginCalc {
  const netProfit = grossSales - laborCost - spongeAdjustedCogs - maintenance - depreciation - utilitiesRent
  const margin    = grossSales > 0 ? (netProfit / grossSales) * 100 : 0
  return {
    grossSalesSar    : grossSales,
    laborCostSar     : laborCost,
    cogsSar          : spongeAdjustedCogs,
    maintenanceSar   : maintenance,
    depreciationSar  : depreciation,
    utilitiesRentSar : utilitiesRent,
    netProfitSar     : Math.round(netProfit * 100) / 100,
    netMarginPct     : Math.round(margin * 100) / 100,
    breakdown        : `Net Profit = Gross Sales (${grossSales.toLocaleString()}) − Labor (${laborCost.toLocaleString()}) − COGS (${spongeAdjustedCogs.toLocaleString()}) − Maintenance (${maintenance.toLocaleString()}) − Depreciation (${depreciation.toLocaleString()}) − Utilities/Rent (${utilitiesRent.toLocaleString()}) = SAR ${netProfit.toLocaleString()}`,
  }
}

// ── Demo OpEx seed data ───────────────────────────────────────────
export const operationalExpenses: OperationalExpenses[] = [
  {
    month: '2026-03', branchId: 'BR-RUH',
    totalPayrollSar: 35700, gosiEmployerSar: 5100, totalLaborCostSar: 40800, headCount: 4,
    totalMaintenanceSar: 3850, assetDepreciationMonthlySar: 2916,
    utilitiesSar: 4200, rentSar: 18000, otherOpexSar: 1500,
    totalOpexSar: 71266,
  },
  {
    month: '2026-03', branchId: 'BR-JED',
    totalPayrollSar: 14700, gosiEmployerSar: 1960, totalLaborCostSar: 16660, headCount: 2,
    totalMaintenanceSar: 350, assetDepreciationMonthlySar: 1042,
    utilitiesSar: 3100, rentSar: 14500, otherOpexSar: 800,
    totalOpexSar: 36452,
  },
]

// ────────────────────────────────────────────────────────────────────
//  MODULE 4: WHATSAPP-FIRST ORDERING ENGINE
//  Accepts B2B orders via WhatsApp webhook, auto-generates ZATCA invoice
// ────────────────────────────────────────────────────────────────────

export type WaOrderStatus =
  | 'RECEIVED'       // webhook parsed, pending confirmation
  | 'CONFIRMED'      // admin confirmed, ZATCA invoice issued
  | 'PREPARING'      // roastery processing
  | 'DISPATCHED'     // shipped / handed to courier
  | 'DELIVERED'      // confirmed receipt
  | 'CANCELLED'      // cancelled by either party

export interface WaOrderItem {
  origin         : string    // e.g. "Ethiopia Yirgacheffe"
  kgOrdered      : number
  sarPerKg       : number
  lineTotal      : number
}

export interface WaInboundOrder {
  orderId        : string    // WA-ORD-XXXX
  clientId       : string    // B2BClient.id
  clientName     : string
  clientPhone    : string    // WhatsApp sender number
  waMessageId    : string    // WhatsApp message ID from webhook
  receivedAt     : string    // ISO timestamp
  rawMessage     : string    // original WhatsApp text
  items          : WaOrderItem[]
  subtotalSar    : number    // pre-VAT
  vatSar         : number    // 15% ZATCA
  totalSar       : number    // inc. VAT
  status         : WaOrderStatus
  zatcaInvoiceRef: string | null
  zatcaQrCode    : string | null   // base64 TLV for Phase-2
  confirmationSentAt: string | null
  invoiceSentAt  : string | null
  notes          : string
}

// ── XE Rate snapshot (fetched at order receipt) ───────────────────
export interface XeRateSnapshot {
  baseCurrency   : 'SAR'
  timestamp      : string
  rates          : {
    USD: number
    EUR: number
    GBP: number
    JPY: number
    AED: number
    EGP: number
    ETB: number     // Ethiopian Birr (origin currency for Ethiopian lots)
    COL: number     // Colombian Peso proxy
  }
}

// ── ZATCA Phase-2 e-Invoice for B2B orders ───────────────────────
export interface ZatcaB2bInvoice {
  invoiceNumber  : string    // sequential, e.g. INV-2026-0042
  uuid           : string
  issueDate      : string    // ISO date
  issueTime      : string    // HH:MM:SS
  sellerName     : string
  sellerVatNumber: string
  buyerName      : string
  buyerVatNumber : string | null
  lineItems      : { description: string; qty: number; unitPrice: number; lineVat: number; lineTotal: number }[]
  subtotalSar    : number
  vatAmountSar   : number    // 15%
  totalWithVatSar: number
  qrCodeTlv      : string    // TLV base64 (ZATCA Phase-2 spec)
  xmlContent     : string    // simplified XML for display
  waOrderId      : string    // linked WA order
}

// ── WhatsApp Order Parser ─────────────────────────────────────────
// Parses natural-language orders from WhatsApp messages
// Supports both EN and AR pattern matching
const ORDER_PATTERNS = [
  // "30kg Ethiopia Yirgacheffe" / "٣٠ كجم إثيوبيا"
  /(\d+(?:\.\d+)?)\s*(?:kg|كجم|كيلو)\s+(.+?)(?:\s+at\s+SAR\s*(\d+(?:\.\d+)?))?(?:,|$|\n)/gi,
  // "Ethiopia Yirgacheffe - 30 kg"
  /(.+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:kg|كجم|كيلو)/gi,
]

export function parseWhatsAppOrder(
  rawMessage: string,
  defaultPricePerKg = 120
): WaOrderItem[] {
  const items: WaOrderItem[] = []
  const text = rawMessage.trim()

  // Primary pattern: "Xkg Origin" or "X kg Origin at SAR Y"
  const re = /(\d+(?:\.\d+)?)\s*(?:kg|كجم|كيلو)\s+([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]+?)(?:\s+at\s+sar\s*(\d+(?:\.\d+)?))?(?:,|\n|$)/gi
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(text)) !== null) {
    const kg    = parseFloat(match[1])
    const origin = match[2].trim()
    const price  = match[3] ? parseFloat(match[3]) : defaultPricePerKg
    if (kg > 0 && origin.length > 2) {
      items.push({ origin, kgOrdered: kg, sarPerKg: price, lineTotal: Math.round(kg * price * 100) / 100 })
    }
  }

  // Fallback: "Origin - Xkg" pattern
  if (items.length === 0) {
    const re2 = /([A-Za-z][A-Za-z\s]+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:kg|كجم)/gi
    // eslint-disable-next-line no-cond-assign
    while ((match = re2.exec(text)) !== null) {
      const origin = match[1].trim()
      const kg     = parseFloat(match[2])
      items.push({ origin, kgOrdered: kg, sarPerKg: defaultPricePerKg, lineTotal: Math.round(kg * defaultPricePerKg * 100) / 100 })
    }
  }

  return items
}

// ── ZATCA Phase-2 TLV QR Code Generator ──────────────────────────
// Encodes per ZATCA Phase-2 Appendix A (TLV base64)
function tlvEncode(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value)
  const result = new Uint8Array(2 + valueBytes.length)
  result[0] = tag
  result[1] = valueBytes.length
  result.set(valueBytes, 2)
  return result
}

export function generateZatcaQrTlv(
  sellerName: string,
  vatNumber: string,
  invoiceDate: string,
  totalWithVat: number,
  vatAmount: number
): string {
  const concat = (arrays: Uint8Array[]) => {
    const total = arrays.reduce((s, a) => s + a.length, 0)
    const out   = new Uint8Array(total)
    let off = 0
    for (const a of arrays) { out.set(a, off); off += a.length }
    return out
  }
  const tlv = concat([
    tlvEncode(1, sellerName),
    tlvEncode(2, vatNumber),
    tlvEncode(3, invoiceDate),
    tlvEncode(4, totalWithVat.toFixed(2)),
    tlvEncode(5, vatAmount.toFixed(2)),
  ])
  return btoa(String.fromCharCode(...tlv))
}

// ── ZATCA B2B Invoice Generator ───────────────────────────────────
let _invoiceSeq = 42  // start at INV-2026-0042

export function generateZatcaB2bInvoice(order: WaInboundOrder): ZatcaB2bInvoice {
  _invoiceSeq++
  const invoiceNumber = `INV-2026-${String(_invoiceSeq).padStart(4, '0')}`
  const now           = new Date()
  const issueDate     = now.toISOString().split('T')[0]
  const issueTime     = now.toTimeString().slice(0, 8)
  const uuid          = `${issueDate}-${order.orderId}-${_invoiceSeq}`
  const sellerVat     = '300123456789003'   // demo Camel Step VAT number
  const sellerName    = 'Camel Step Roasters Co.'

  const lineItems = order.items.map(i => ({
    description : `${i.origin} — Specialty Coffee (${i.kgOrdered} kg)`,
    qty         : i.kgOrdered,
    unitPrice   : i.sarPerKg,
    lineVat     : Math.round(i.lineTotal * 0.15 * 100) / 100,
    lineTotal   : Math.round(i.lineTotal * 1.15 * 100) / 100,
  }))

  const qrCodeTlv = generateZatcaQrTlv(
    sellerName, sellerVat,
    `${issueDate}T${issueTime}`,
    order.totalSar, order.vatSar
  )

  const xmlContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">`,
    `  <ID>${invoiceNumber}</ID>`,
    `  <UUID>${uuid}</UUID>`,
    `  <IssueDate>${issueDate}</IssueDate>`,
    `  <IssueTime>${issueTime}</IssueTime>`,
    `  <!-- SellerParty -->`,
    `  <AccountingSupplierParty>`,
    `    <Party><PartyName><Name>${sellerName}</Name></PartyName>`,
    `    <PartyTaxScheme><CompanyID>${sellerVat}</CompanyID></PartyTaxScheme>`,
    `    </Party>`,
    `  </AccountingSupplierParty>`,
    `  <!-- BuyerParty -->`,
    `  <AccountingCustomerParty>`,
    `    <Party><PartyName><Name>${order.clientName}</Name></PartyName></Party>`,
    `  </AccountingCustomerParty>`,
    `  <!-- LineItems -->`,
    ...lineItems.map((li, idx) => [
      `  <InvoiceLine>`,
      `    <ID>${idx + 1}</ID>`,
      `    <InvoicedQuantity unitCode="KGM">${li.qty}</InvoicedQuantity>`,
      `    <LineExtensionAmount currencyID="SAR">${li.lineTotal.toFixed(2)}</LineExtensionAmount>`,
      `    <Item><Description>${li.description}</Description></Item>`,
      `    <Price><PriceAmount currencyID="SAR">${li.unitPrice.toFixed(2)}</PriceAmount></Price>`,
      `  </InvoiceLine>`,
    ].join('\n')),
    `  <!-- Totals -->`,
    `  <LegalMonetaryTotal>`,
    `    <LineExtensionAmount currencyID="SAR">${order.subtotalSar.toFixed(2)}</LineExtensionAmount>`,
    `    <TaxExclusiveAmount currencyID="SAR">${order.subtotalSar.toFixed(2)}</TaxExclusiveAmount>`,
    `    <TaxInclusiveAmount currencyID="SAR">${order.totalSar.toFixed(2)}</TaxInclusiveAmount>`,
    `    <PayableAmount currencyID="SAR">${order.totalSar.toFixed(2)}</PayableAmount>`,
    `  </LegalMonetaryTotal>`,
    `  <!-- VAT 15% ZATCA Phase-2 -->`,
    `  <TaxTotal><TaxAmount currencyID="SAR">${order.vatSar.toFixed(2)}</TaxAmount></TaxTotal>`,
    `  <!-- QR TLV: ${qrCodeTlv.slice(0, 40)}... -->`,
    `</Invoice>`,
  ].join('\n')

  return {
    invoiceNumber,
    uuid,
    issueDate,
    issueTime,
    sellerName,
    sellerVatNumber: sellerVat,
    buyerName       : order.clientName,
    buyerVatNumber  : null,
    lineItems,
    subtotalSar     : order.subtotalSar,
    vatAmountSar    : order.vatSar,
    totalWithVatSar : order.totalSar,
    qrCodeTlv,
    xmlContent,
    waOrderId       : order.orderId,
  }
}

// ── WhatsApp Confirmation Message Builder ─────────────────────────
export function buildWaOrderConfirmation(
  order: WaInboundOrder,
  invoice: ZatcaB2bInvoice
): { en: string; ar: string } {
  const itemList = order.items.map(i =>
    `  • ${i.origin}: ${i.kgOrdered} kg × SAR ${i.sarPerKg}/kg = SAR ${i.lineTotal.toLocaleString()}`
  ).join('\n')
  const itemListAr = order.items.map(i =>
    `  • ${i.origin}: ${i.kgOrdered} كجم × ${i.sarPerKg} ريال/كجم = ${i.lineTotal.toLocaleString()} ريال`
  ).join('\n')

  return {
    en: [
      `✅ *Order Confirmed — ${invoice.invoiceNumber}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Items:*`,
      itemList,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 Subtotal: SAR ${order.subtotalSar.toLocaleString()}`,
      `🧾 VAT (15%): SAR ${order.vatSar.toFixed(2)}`,
      `*Total: SAR ${order.totalSar.toLocaleString()}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🔐 ZATCA Ref: ${invoice.invoiceNumber}`,
      `📅 Invoice Date: ${invoice.issueDate}`,
      `_Camel Step Roasters — VAT: ${invoice.sellerVatNumber}_`,
    ].join('\n'),
    ar: [
      `✅ *تأكيد الطلب — ${invoice.invoiceNumber}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *الأصناف:*`,
      itemListAr,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 المجموع قبل الضريبة: ${order.subtotalSar.toLocaleString()} ريال`,
      `🧾 ضريبة القيمة المضافة (15٪): ${order.vatSar.toFixed(2)} ريال`,
      `*الإجمالي: ${order.totalSar.toLocaleString()} ريال*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🔐 رقم فاتورة زاتكا: ${invoice.invoiceNumber}`,
      `📅 تاريخ الفاتورة: ${invoice.issueDate}`,
      `_كامل ستيب للتحميص — ضريبة: ${invoice.sellerVatNumber}_`,
    ].join('\n'),
  }
}

// ── WhatsApp Maintenance Alert Builder ───────────────────────────
export function buildWaMaintenanceAlert(alert: MaintenanceAlert): { en: string; ar: string } {
  const emoji = alert.severity === 'CRITICAL' ? '🚨' : '⚠️'
  const iconEn = alert.alertType === 'BURR_REPLACEMENT' ? '⚙️ Burr Replacement' :
                 alert.alertType === 'SERVICE_OVERDUE'   ? '🔧 Service Overdue'   :
                 alert.alertType === 'SERVICE_DUE_SOON'  ? '🔩 Service Due Soon'  :
                                                           '📊 Usage Limit'
  const iconAr = alert.alertType === 'BURR_REPLACEMENT' ? '⚙️ استبدال البُر' :
                 alert.alertType === 'SERVICE_OVERDUE'   ? '🔧 صيانة متأخرة'    :
                 alert.alertType === 'SERVICE_DUE_SOON'  ? '🔩 صيانة قريباً'     :
                                                           '📊 حد الاستخدام'
  return {
    en: [
      `${emoji} *QABBAN OS — Hardware Sentinel*`,
      `${iconEn} | ${alert.severity}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏭 Asset: ${alert.assetName}`,
      `📍 Branch: ${alert.branchId}`,
      `📋 ${alert.message}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Current: ${alert.currentValue} ${alert.unit} | Threshold: ${alert.threshold} ${alert.unit}`,
      `_Detected: ${new Date(alert.detectedAt).toLocaleString('en-SA')}_`,
      `_Reply ACKNOWLEDGE to dismiss_`,
    ].join('\n'),
    ar: [
      `${emoji} *نظام قبان OS — حارس الأجهزة*`,
      `${iconAr} | ${alert.severity === 'CRITICAL' ? 'حرج' : 'تحذير'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏭 الجهاز: ${alert.assetName}`,
      `📍 الفرع: ${alert.branchId}`,
      `📋 ${alert.message}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `الحالي: ${alert.currentValue} ${alert.unit} | الحد: ${alert.threshold} ${alert.unit}`,
      `_اكتُشف: ${new Date(alert.detectedAt).toLocaleString('ar-SA')}_`,
      `_رُد بـ ACKNOWLEDGE للإقرار_`,
    ].join('\n'),
  }
}

// ── In-memory WA order store ──────────────────────────────────────
export const waInboundOrders: WaInboundOrder[] = [
  // Seed: a completed WhatsApp order from Al Nokhba Specialty
  {
    orderId        : 'WA-ORD-0001',
    clientId       : 'B2B-001',
    clientName     : 'Al Nokhba Specialty',
    clientPhone    : '+966501110001',
    waMessageId    : 'wamid.demo_001',
    receivedAt     : '2026-04-05T09:14:00Z',
    rawMessage     : '60kg Ethiopia Yirgacheffe at SAR 120, 40kg Colombia Huila at SAR 115',
    items          : [
      { origin: 'Ethiopia Yirgacheffe', kgOrdered: 60, sarPerKg: 120, lineTotal: 7200 },
      { origin: 'Colombia Huila',       kgOrdered: 40, sarPerKg: 115, lineTotal: 4600 },
    ],
    subtotalSar    : 11800,
    vatSar         : 1770,
    totalSar       : 13570,
    status         : 'CONFIRMED',
    zatcaInvoiceRef: 'INV-2026-0042',
    zatcaQrCode    : null,
    confirmationSentAt: '2026-04-05T09:15:00Z',
    invoiceSentAt  : '2026-04-05T09:15:05Z',
    notes          : 'Demo seed — WhatsApp order from Al Nokhba Specialty',
  },
  // Seed: a pending order from Qahwa Al Bahr
  {
    orderId        : 'WA-ORD-0002',
    clientId       : 'B2B-002',
    clientName     : 'Qahwa Al Bahr',
    clientPhone    : '+966502220002',
    waMessageId    : 'wamid.demo_002',
    receivedAt     : '2026-04-06T07:30:00Z',
    rawMessage     : '50kg Yemen Haraaz',
    items          : [
      { origin: 'Yemen Haraaz', kgOrdered: 50, sarPerKg: 120, lineTotal: 6000 },
    ],
    subtotalSar    : 6000,
    vatSar         : 900,
    totalSar       : 6900,
    status         : 'RECEIVED',
    zatcaInvoiceRef: null,
    zatcaQrCode    : null,
    confirmationSentAt: null,
    invoiceSentAt  : null,
    notes          : '',
  },
]

// ── In-memory ZatcaB2bInvoice store ──────────────────────────────
export const zatcaB2bInvoices: ZatcaB2bInvoice[] = []

// ────────────────────────────────────────────────────────────────────
//  MODULE 5: SCA CERTIFICATION VAULT
//  Full barista skill-level tracking with renewal reminders
// ────────────────────────────────────────────────────────────────────

export interface ScaCertRecord {
  certId         : string    // CERT-001
  employeeId     : string
  employeeName   : string
  certType       : ScaCertification
  level          : BaristaCertLevel
  issuingBody    : string    // 'SCA' | 'WBC' | 'SCAA'
  issueDate      : string    // ISO date
  expiryDate     : string    // ISO date
  registrationId : string    // SCA registration number
  courseName     : string
  trainingCenter : string
  score          : number | null    // 0-100 where applicable
  status         : 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED'
  renewalReminder: boolean
  attachmentUrl  : string | null    // link to cert PDF
  notes          : string
}

export type CertVaultFilter = {
  employeeId?: string
  certType?  : ScaCertification
  status?    : ScaCertRecord['status']
  branchId?  : string
}

// ── SCA Cert Vault — check expiry ────────────────────────────────
export function evaluateCertStatus(cert: ScaCertRecord): ScaCertRecord['status'] {
  const now    = new Date()
  const expiry = new Date(cert.expiryDate)
  const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0)   return 'EXPIRED'
  if (daysLeft < 90)  return 'EXPIRING_SOON'
  return 'ACTIVE'
}

// ── SCA Cert WhatsApp Renewal Reminder ───────────────────────────
export function buildCertRenewalReminder(
  cert: ScaCertRecord,
  staffPhone: string
): { en: string; ar: string } {
  const expiry   = new Date(cert.expiryDate)
  const daysLeft = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const emoji    = daysLeft < 0 ? '🔴' : daysLeft < 30 ? '🟠' : '🟡'
  return {
    en: [
      `${emoji} *QABBAN OS — SCA Certification Reminder*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 Staff: ${cert.employeeName}`,
      `🏅 Cert: ${cert.certType.replace('_', ' ')} — ${cert.level.replace(/_/g, ' ')}`,
      `📋 Reg No: ${cert.registrationId}`,
      `📅 Expiry: ${cert.expiryDate}`,
      `⏳ Days Left: ${daysLeft < 0 ? 'EXPIRED' : daysLeft + ' days'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Please contact your training center to schedule renewal.`,
      `_QABBAN OS · SCA Certification Vault_`,
    ].join('\n'),
    ar: [
      `${emoji} *نظام قبان OS — تذكير شهادة SCA*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 الموظف: ${cert.employeeName}`,
      `🏅 الشهادة: ${cert.certType.replace('_', ' ')} — ${cert.level.replace(/_/g, ' ')}`,
      `📋 رقم التسجيل: ${cert.registrationId}`,
      `📅 تاريخ الانتهاء: ${cert.expiryDate}`,
      `⏳ الأيام المتبقية: ${daysLeft < 0 ? 'منتهية' : daysLeft + ' يوم'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `يرجى التواصل مع مركز التدريب لتجديد الشهادة.`,
      `_نظام قبان OS · خزنة شهادات SCA_`,
    ].join('\n'),
  }
}

// ── SCA Cert Vault — demo seed ────────────────────────────────────
export const scaCertVault: ScaCertRecord[] = [
  {
    certId: 'CERT-001', employeeId: 'EMP-001', employeeName: 'Ahmed Al-Qahtani',
    certType: 'ROASTING', level: 'SCA_PROFESSIONAL', issuingBody: 'SCA',
    issueDate: '2024-06-15', expiryDate: '2027-06-30', registrationId: 'SCA-R-2024-44821',
    courseName: 'Coffee Roasting — Professional Level', trainingCenter: 'SCA Dubai Campus',
    score: 88, status: 'ACTIVE', renewalReminder: false, attachmentUrl: null,
    notes: 'Scored 88/100 — distinction',
  },
  {
    certId: 'CERT-002', employeeId: 'EMP-001', employeeName: 'Ahmed Al-Qahtani',
    certType: 'SENSORY', level: 'SCA_INTERMEDIATE', issuingBody: 'SCA',
    issueDate: '2023-09-10', expiryDate: '2026-09-10', registrationId: 'SCA-S-2023-38201',
    courseName: 'Sensory Skills — Intermediate', trainingCenter: 'QAHWA Training Riyadh',
    score: 79, status: 'EXPIRING_SOON', renewalReminder: true, attachmentUrl: null,
    notes: 'Renewal reminder sent',
  },
  {
    certId: 'CERT-003', employeeId: 'EMP-002', employeeName: 'Layla Hassan',
    certType: 'BARISTA_SKILLS', level: 'SCA_INTERMEDIATE', issuingBody: 'SCA',
    issueDate: '2023-06-01', expiryDate: '2026-06-01', registrationId: 'SCA-B-2023-31100',
    courseName: 'Barista Skills — Intermediate', trainingCenter: 'SCA Riyadh Pop-up',
    score: 82, status: 'EXPIRING_SOON', renewalReminder: true, attachmentUrl: null,
    notes: 'Due for renewal Q2 2026',
  },
  {
    certId: 'CERT-004', employeeId: 'EMP-002', employeeName: 'Layla Hassan',
    certType: 'BREWING', level: 'SCA_FOUNDATION', issuingBody: 'SCA',
    issueDate: '2024-01-20', expiryDate: '2027-01-20', registrationId: 'SCA-BR-2024-51200',
    courseName: 'Brewing — Foundation', trainingCenter: 'QAHWA Training Riyadh',
    score: 91, status: 'ACTIVE', renewalReminder: false, attachmentUrl: null,
    notes: 'Top scorer in cohort',
  },
  {
    certId: 'CERT-005', employeeId: 'EMP-003', employeeName: 'Carlos Rivera',
    certType: 'BARISTA_SKILLS', level: 'SCA_FOUNDATION', issuingBody: 'SCA',
    issueDate: '2024-01-15', expiryDate: '2026-12-31', registrationId: 'SCA-B-2024-55001',
    courseName: 'Barista Skills — Foundation', trainingCenter: 'SCA Jeddah Campus',
    score: 76, status: 'ACTIVE', renewalReminder: false, attachmentUrl: null,
    notes: '',
  },
  {
    certId: 'CERT-006', employeeId: 'EMP-004', employeeName: 'Fatima Al-Dosari',
    certType: 'GREEN_COFFEE', level: 'SCA_PROFESSIONAL', issuingBody: 'SCA',
    issueDate: '2023-03-05', expiryDate: '2026-03-05', registrationId: 'SCA-G-2023-21005',
    courseName: 'Green Coffee — Professional', trainingCenter: 'SCA Amsterdam (Online)',
    score: 94, status: 'EXPIRED', renewalReminder: true, attachmentUrl: null,
    notes: '⚠ Expired — renewal overdue',
  },
  {
    certId: 'CERT-007', employeeId: 'EMP-004', employeeName: 'Fatima Al-Dosari',
    certType: 'SENSORY', level: 'SCA_PROFESSIONAL', issuingBody: 'SCA',
    issueDate: '2024-03-01', expiryDate: '2027-03-31', registrationId: 'SCA-S-2024-60110',
    courseName: 'Sensory Skills — Professional', trainingCenter: 'Cup of Excellence Panel',
    score: 96, status: 'ACTIVE', renewalReminder: false, attachmentUrl: null,
    notes: 'Q-Grader eligible',
  },
  {
    certId: 'CERT-008', employeeId: 'EMP-005', employeeName: 'Omar Khalid',
    certType: 'COFFEE_SKILLS', level: 'SCA_FOUNDATION', issuingBody: 'SCA',
    issueDate: '2022-07-10', expiryDate: '2025-07-10', registrationId: 'SCA-C-2022-18300',
    courseName: 'Coffee Skills — Foundation', trainingCenter: 'QAHWA Training Riyadh',
    score: 72, status: 'EXPIRED', renewalReminder: true, attachmentUrl: null,
    notes: '⚠ Expired July 2025 — schedule renewal',
  },
]

// ── SCA Vault — helper: get certs for a branch's staff ────────────
export function getCertsByBranch(branchId: string, staff: Staff[]): ScaCertRecord[] {
  const branchStaff = new Set(staff.filter(s => s.branchId === branchId).map(s => s.id))
  return scaCertVault.filter(c => branchStaff.has(c.employeeId))
}

// ── SCA Vault — compliance score (% active certs vs total) ────────
export function calcCertCompliance(certs: ScaCertRecord[]): {
  total: number; active: number; expiringSoon: number; expired: number; compliancePct: number
} {
  const active       = certs.filter(c => evaluateCertStatus(c) === 'ACTIVE').length
  const expiringSoon = certs.filter(c => evaluateCertStatus(c) === 'EXPIRING_SOON').length
  const expired      = certs.filter(c => evaluateCertStatus(c) === 'EXPIRED').length
  const total        = certs.length
  const compliancePct = total > 0 ? Math.round((active / total) * 100) : 100
  return { total, active, expiringSoon, expired, compliancePct }
}

// ────────────────────────────────────────────────────────────────────
//  MODULE 6: EXECUTIVE OVERVIEW — Enterprise Health Dashboard
//  Aggregates all ERP signals into a single CEO/CFO command panel
// ────────────────────────────────────────────────────────────────────

export interface EnterpriseHealthSnapshot {
  asOf                  : string    // ISO timestamp

  // ── People ──────────────────────────────────────────────────────
  headCount             : number
  activeCount           : number
  saudizationPct        : number
  monthlyPayrollSar     : number
  totalLaborCostSar     : number    // payroll + GOSI
  totalEosbLiabilitySar : number
  totalGosiEmployerSar  : number
  certCompliancePct     : number   // % active SCA certs
  expiringCerts         : number
  expiredCerts          : number

  // ── Assets ──────────────────────────────────────────────────────
  totalAssets           : number
  totalBookValueSar     : number
  monthlyDepreciationSar: number
  criticalAssetAlerts   : number
  warningAssetAlerts    : number
  maintenanceCostMtd    : number   // month-to-date

  // ── WhatsApp Orders ─────────────────────────────────────────────
  waOrdersTotal         : number
  waOrdersPending       : number
  waOrdersConfirmed     : number
  waOrdersRevenueSar    : number   // confirmed orders
  zatcaInvoicesGenerated: number

  // ── Finance ─────────────────────────────────────────────────────
  grossSalesSar         : number
  adjustedCogsSar       : number
  grossProfitSar        : number
  grossMarginPct        : number
  totalOpexSar          : number
  ebitdaSar             : number
  netProfitSar          : number
  netMarginPct          : number
  vatCollectedSar       : number

  // ── ERP Health Signals ───────────────────────────────────────────
  erpHealthScore        : number    // 0–100 composite
  erpSignals            : { label: string; labelAr: string; status: 'OK' | 'WARN' | 'CRIT'; detail: string }[]
}

export function buildEnterpriseHealthSnapshot(
  staff         : Staff[],
  assets        : Asset[],
  mntLogs       : MaintenanceLog[],
  waOrders      : WaInboundOrder[],
  certs         : ScaCertRecord[],
  grossSales    : number,
  cogsSar       : number,
  spongeAdj     : number,
  utilitiesRent : number
): EnterpriseHealthSnapshot {
  const now    = new Date()
  const month  = now.toISOString().slice(0, 7)

  // People
  const active  = staff.filter(s => s.status === 'ACTIVE' || s.status === 'PROBATION')
  const saudis  = staff.filter(s => s.nationality === 'SAUDI').length
  const saudiPct = staff.length > 0 ? Math.round((saudis / staff.length) * 100) : 0
  const gosiList = active.map(s => calcGosi(s, month))
  const payroll  = active.reduce((t, s) => t + s.basicSalary + s.housingAllowance + s.transportAllowance + s.otherAllowances, 0)
  const gosiEr   = gosiList.reduce((t, g) => t + g.totalEmployerCost, 0)
  const laborCost = payroll + gosiEr
  const eosbTotal = active.reduce((t, s) => t + calcEosb(s).totalEosbSar, 0)
  const certStats = calcCertCompliance(certs)

  // Assets
  const alerts     = runMaintenanceWatchdog(assets)
  const critAlerts = alerts.filter(a => a.severity === 'CRITICAL').length
  const warnAlerts = alerts.filter(a => a.severity === 'WARNING').length
  const depRecs    = assets.map(a => calcDepreciation(a))
  const bookValue  = depRecs.reduce((t, d) => t + d.currentBookValue, 0)
  const monthlyDep = depRecs.reduce((t, d) => t + d.monthlyDepreciation, 0)
  const thirtyAgo  = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
  const mntCostMtd = mntLogs
    .filter(m => new Date(m.performedAt) >= thirtyAgo)
    .reduce((t, m) => t + m.costSar, 0)

  // WhatsApp Orders
  const confirmedOrders = waOrders.filter(o => o.status !== 'RECEIVED' && o.status !== 'CANCELLED')
  const waRevenue       = confirmedOrders.reduce((t, o) => t + o.subtotalSar, 0)
  const zatcaCount      = waOrders.filter(o => o.zatcaInvoiceRef !== null).length

  // Finance
  const adjCogs      = cogsSar + spongeAdj
  const grossProfit  = grossSales - adjCogs
  const gpPct        = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0
  const totalOpex    = laborCost + mntCostMtd + monthlyDep + utilitiesRent
  const ebitda       = grossProfit - laborCost - mntCostMtd - utilitiesRent
  const netProfit    = ebitda - monthlyDep
  const netMargin    = grossSales > 0 ? (netProfit / grossSales) * 100 : 0
  const vatCollected = grossSales * 0.15

  // ERP health signals
  type Sig = EnterpriseHealthSnapshot['erpSignals'][number]
  const signals: Sig[] = [
    {
      label: 'Saudization Rate', labelAr: 'نسبة السعودة',
      status: saudiPct >= 30 ? 'OK' : saudiPct >= 20 ? 'WARN' : 'CRIT',
      detail: `${saudiPct}% (${saudis} SA / ${staff.length - saudis} Expat)`,
    },
    {
      label: 'SCA Cert Compliance', labelAr: 'امتثال شهادات SCA',
      status: certStats.compliancePct >= 80 ? 'OK' : certStats.compliancePct >= 60 ? 'WARN' : 'CRIT',
      detail: `${certStats.compliancePct}% active — ${certStats.expired} expired`,
    },
    {
      label: 'Asset Maintenance', labelAr: 'صيانة الأصول',
      status: critAlerts === 0 ? (warnAlerts === 0 ? 'OK' : 'WARN') : 'CRIT',
      detail: `${critAlerts} critical · ${warnAlerts} warnings`,
    },
    {
      label: 'WhatsApp Orders', labelAr: 'طلبات واتساب',
      status: waOrders.filter(o => o.status === 'RECEIVED').length === 0 ? 'OK' : 'WARN',
      detail: `${waOrders.filter(o=>o.status==='RECEIVED').length} pending confirmation`,
    },
    {
      label: 'Net Profit Margin', labelAr: 'هامش الربح الصافي',
      status: netMargin >= 10 ? 'OK' : netMargin >= 0 ? 'WARN' : 'CRIT',
      detail: `${netMargin.toFixed(1)}% — SAR ${netProfit.toLocaleString()}`,
    },
    {
      label: 'EOSB Liability', labelAr: 'مخصص نهاية الخدمة',
      status: eosbTotal < 100000 ? 'OK' : eosbTotal < 250000 ? 'WARN' : 'CRIT',
      detail: `SAR ${eosbTotal.toLocaleString()} accrued`,
    },
    {
      label: 'GOSI Contributions', labelAr: 'اشتراكات التأمينات',
      status: 'OK',
      detail: `SAR ${gosiEr.toLocaleString()} / month employer share`,
    },
    {
      label: 'VAT Compliance', labelAr: 'الامتثال الضريبي',
      status: 'OK',
      detail: `SAR ${vatCollected.toLocaleString()} collected — ZATCA Phase-2`,
    },
  ]

  const okCount   = signals.filter(s => s.status === 'OK').length
  const healthScore = Math.round((okCount / signals.length) * 100)

  return {
    asOf                   : now.toISOString(),
    headCount              : staff.length,
    activeCount            : active.length,
    saudizationPct         : saudiPct,
    monthlyPayrollSar      : payroll,
    totalLaborCostSar      : laborCost,
    totalEosbLiabilitySar  : Math.round(eosbTotal * 100) / 100,
    totalGosiEmployerSar   : Math.round(gosiEr * 100) / 100,
    certCompliancePct      : certStats.compliancePct,
    expiringCerts          : certStats.expiringSoon,
    expiredCerts           : certStats.expired,
    totalAssets            : assets.length,
    totalBookValueSar      : Math.round(bookValue * 100) / 100,
    monthlyDepreciationSar : Math.round(monthlyDep * 100) / 100,
    criticalAssetAlerts    : critAlerts,
    warningAssetAlerts     : warnAlerts,
    maintenanceCostMtd     : mntCostMtd,
    waOrdersTotal          : waOrders.length,
    waOrdersPending        : waOrders.filter(o => o.status === 'RECEIVED').length,
    waOrdersConfirmed      : confirmedOrders.length,
    waOrdersRevenueSar     : Math.round(waRevenue * 100) / 100,
    zatcaInvoicesGenerated : zatcaCount,
    grossSalesSar          : grossSales,
    adjustedCogsSar        : Math.round(adjCogs * 100) / 100,
    grossProfitSar         : Math.round(grossProfit * 100) / 100,
    grossMarginPct         : Math.round(gpPct * 100) / 100,
    totalOpexSar           : Math.round(totalOpex * 100) / 100,
    ebitdaSar              : Math.round(ebitda * 100) / 100,
    netProfitSar           : Math.round(netProfit * 100) / 100,
    netMarginPct           : Math.round(netMargin * 100) / 100,
    vatCollectedSar        : Math.round(vatCollected * 100) / 100,
    erpHealthScore         : healthScore,
    erpSignals             : signals,
  }
}

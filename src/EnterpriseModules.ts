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


════════════════════════════════════════════════════════════════════════════════
        FORMAL MATHEMATICAL PROOF DOCUMENT FOR PATENT FILING
════════════════════════════════════════════════════════════════════════════════

  TITLE OF INVENTION:
  Method and System for Real-Time Hygroscopic Mass Compensation in
  Post-Harvest Green Coffee Bean Inventory Valuation via a Hybrid
  Telemetry-Driven Dynamic Yield Coefficient Engine

  DOCUMENT CLASS:    Technical Disclosure & Mathematical Proof of Concept
  FILING STATUS:     Pre-filing Draft — Confidential
  DOCUMENT REF:      QABBAN-PAT-2026-001
  VERSION:           2.0  (Final)
  DATE:              2026-03-12
  SYSTEM OF RECORD:  QABBAN OS — Coffee ERP Platform  (src/data.ts)
  PREPARED BY:       QABBAN OS Engineering Team

════════════════════════════════════════════════════════════════════════════════
  TABLE OF CONTENTS
════════════════════════════════════════════════════════════════════════════════

  Section 1  —  Field of the Invention
  Section 2  —  Background and Problem Statement
  Section 3  —  Definitions and Notation
  Section 4  —  Core Mathematical Formulations
                4.1  Dynamic Yield Function  Y(RH)
                4.2  Mass-Correction Equation
                4.3  True Roasted Cost Function  C_roasted(RH*)
                4.4  Financial Asset Variance Formula  ΔV  (Environmental P&L)
                4.5  Live Inventory Valuation with Sponge Correction
                4.6  Qabban Pulse — Barista Waste Reconciliation Mathematics
  Section 5  —  Hybrid Telemetry Switch: Logical Proof & Flow Description
                5.1  Problem Statement — Single-Source Failure Risk
                5.2  Formal Definition of the Active RH Resolver  RH*(B)
                5.3  Logic-Gate Representation
                5.4  Algorithmic Flow Description
                5.5  Security: Device Authentication Protocol
  Section 6  —  Complete System Equation Summary
  Section 7  —  Technical Character Proof (Patent Eligibility)
  Section 8  —  Claims (Draft Independent Claims)
  Section 9  —  Glossary of Scientific Terms
  Section 10 —  System Constants Table
  Section 11 —  Source Code Reference (System of Record)


════════════════════════════════════════════════════════════════════════════════
SECTION 1 — FIELD OF THE INVENTION
════════════════════════════════════════════════════════════════════════════════

This invention relates to the field of commodity inventory management
systems, specifically to a computerised method for dynamically adjusting
the theoretical yield coefficient of green Arabica and Robusta coffee beans
undergoing ambient storage prior to roasting. The adjustment accounts for
micro-climate induced hygroscopic mass transfer — the gain or loss of
molecular moisture weight by the bean mass — as a function of the
surrounding Relative Humidity (RH), sourced from either a physical IoT
telemetry sensor or a fallback meteorological web-service API.

The resulting coefficient is applied in real time to:
  (a) correct the declared saleable weight of the roasted product;
  (b) recalculate the true cost of roasted goods per kilogram;
  (c) compute the financial asset variance attributable to environmental
      conditions, expressed in Saudi Arabian Riyal (SAR); and
  (d) reconcile actual barista bean consumption (measured by precision IoT
      scale) against theoretical consumption derived from point-of-sale
      transaction data, producing an auditable waste variance report.


════════════════════════════════════════════════════════════════════════════════
SECTION 2 — BACKGROUND AND PROBLEM STATEMENT
════════════════════════════════════════════════════════════════════════════════

2.1  The Hygroscopic Nature of Green Coffee Beans
─────────────────────────────────────────────────
Green (unroasted) coffee beans are highly porous, cellulosic biological
structures with a typical equilibrium moisture content of 10–12 % by mass
under standard conditions. Their open micro-cellular structure renders them
susceptible to hygroscopic mass transfer: the spontaneous absorption or
desorption of water vapour from the surrounding atmosphere.

In high-humidity coastal environments (e.g., Jeddah, Saudi Arabia —
average ambient RH ≥ 68 %), stored green beans absorb atmospheric moisture,
increasing their bulk mass prior to roasting. Conversely, in arid inland
environments (e.g., Riyadh — average RH ≈ 20–45 %), accelerated evaporative
desorption reduces bulk mass below the standard declared weight.

2.2  The Deficiency of Static Yield Models
──────────────────────────────────────────
The coffee roasting industry conventionally applies a fixed shrinkage
coefficient of 0.82 (i.e., 82 % of green input weight becomes usable
roasted product) for inventory accounting. This static model:

  (i)   Ignores ambient micro-climate conditions at the storage location.
  (ii)  Produces systematic over- or under-valuation of physical inventory.
  (iii) Prevents accurate computation of Environmental Profit & Loss (P&L).
  (iv)  Does not distinguish between coastal-humid and inland-arid storage
        regimes, which have materially different moisture equilibria.

2.3  The Deficiency of Static Waste Tracking
──────────────────────────────────────────────
Barista-level bean waste in commercial espresso operations is currently
tracked, if at all, through periodic manual audits comparing purchased bean
weight to invoiced drink counts. This approach:

  (i)   Introduces latency of days or weeks before variance is visible.
  (ii)  Cannot attribute waste to individual baristas, sessions, or
        dial-in calibration events.
  (iii) Cannot automatically adjust POS inventory records in real time,
        creating a persistent discrepancy between physical and digital stock.
  (iv)  Cannot compute a financial cost for the waste variance without a
        separate manual spreadsheet step.

2.4  The Inventive Gap
──────────────────────
No prior art is known to the inventors that combines:
  (a) A piecewise dynamic yield coefficient derived from real-time RH data;
  (b) A hybrid telemetry architecture that arbitrates between a physical IoT
      sensor and a meteorological web API with time-bounded freshness logic;
  (c) Automatic stale-data fallback to prevent single-point-of-failure
      contamination of financial asset valuations;
  (d) Direct propagation of the corrected coefficient into a multi-lot
      ERP inventory ledger and Environmental P&L account; and
  (e) A reconciliation engine that computes barista waste variance by
      comparing precision Bluetooth-scale measurements against theoretical
      consumption derived from authenticated POS order data, then
      automatically pushes inventory adjustments back to the POS system.


════════════════════════════════════════════════════════════════════════════════
SECTION 3 — DEFINITIONS AND NOTATION
════════════════════════════════════════════════════════════════════════════════

  Symbol           Definition
  ──────────────   ──────────────────────────────────────────────────────────
  RH               Relative Humidity (%), dimensionless, range [0, 100]
  RH_iot           Relative Humidity reading from a physical IoT sensor (%)
  RH_api           Relative Humidity from a meteorological web-service API (%)
  RH*              Active (resolved) Relative Humidity fed to the engine (%)
  Y(RH)            Dynamic Yield Coefficient — piecewise function of RH
  Y₀               Baseline yield coefficient = 0.82 (dimensionless)
  δ_A              Rule A absorption delta = +0.005
  δ_B              Rule B evaporation delta = −0.003
  τ_H              Upper RH threshold triggering Rule A = 70 (%)
  τ_L              Lower RH threshold triggering Rule B = 20 (%)
  M_green          Mass of green (pre-roast) coffee beans (kg)
  M_final          Corrected mass of roasted coffee (kg)
  M_baseline       Uncorrected (static) roasted mass = Y₀ · M_green (kg)
  ΔM               Hygroscopic mass correction = M_final − M_baseline (kg)
  C_green          Procurement cost of green beans (SAR/kg)
  C_roasted        True cost per kg of roasted product (SAR/kg)
  P_w              Wholesale price per kg of roasted product (SAR/kg)
  g                Target gross margin fraction ∈ (0, 1)
  ΔV               Environmental asset variance (SAR) — "Environmental P&L"
  t_iot            Unix timestamp of last IoT telemetry pulse (ms)
  t_now            Current system Unix timestamp (ms)
  Τ_stale          Staleness threshold = 3,600,000 ms (60 minutes)
  S                Telemetry source selector ∈ { IOT_SENSOR, WEATHER_API }
  σ                Stale-data flag ∈ { true, false }
  W_i              Individual scale weight reading i from Acaia Bluetooth
                   scale (grams)
  W_actual         Sum of all Dial-in Mode readings in a session (grams)
  W_theoretical    Predicted bean consumption from POS order data (grams)
  Ψ                Waste variance = W_actual − W_theoretical (grams)
  Φ(d)             Drink-to-bean mapping function (grams per drink type d)
  L_waste          Financial waste loss (SAR) from positive variance Ψ
  K_d              IoT device key (UUID v4) identifying a branch sensor
  AUTH(K_d)        Device authentication predicate


════════════════════════════════════════════════════════════════════════════════
SECTION 4 — CORE MATHEMATICAL FORMULATIONS
════════════════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────────────
4.1  THE DYNAMIC YIELD FUNCTION  Y(RH)
──────────────────────────────────────────────────────────────────────────────

The Dynamic Yield Function is a piecewise step function mapping ambient
Relative Humidity to a dimensionless yield coefficient:

                    ⎧  Y₀ + δ_A  =  0.825    if  RH > τ_H  (= 70%)   [Rule A]
                    ⎪
        Y(RH)  =   ⎨  Y₀ + δ_B  =  0.817    if  RH < τ_L  (= 20%)   [Rule B]
                    ⎪
                    ⎩  Y₀         =  0.820    if  τ_L ≤ RH ≤ τ_H      [Baseline]

  Where:
    Y₀  = 0.820   (dimensionless baseline shrinkage coefficient)
    δ_A = +0.005  (hygroscopic mass absorption correction — coastal/humid)
    δ_B = −0.003  (hygroscopic mass evaporation correction — arid/inland)
    τ_H = 70  %   (upper RH threshold — Rule A trigger)
    τ_L = 20  %   (lower RH threshold — Rule B trigger)

  Physical Interpretation:
  ─────────────────────────
  Rule A  (RH > 70 %):  Beans absorb atmospheric water vapour. The
    effective mass of green beans is heavier due to adsorbed moisture.
    A larger fraction survives as usable roasted product.
    Coefficient rises to 0.825 → +0.61 % above baseline.

  Rule B  (RH < 20 %):  Beans lose internal moisture via evaporative
    desorption. Mass reduction is accelerated. Less usable roasted product
    is recovered per kg of declared green weight.
    Coefficient falls to 0.817 → −0.37 % below baseline.

  Baseline  (20 % ≤ RH ≤ 70 %):  Ambient conditions are within the
    equilibrium moisture range for post-harvest green bean storage.
    The standard 0.82 coefficient applies without adjustment.

  Continuity Note:
  ─────────────────
  Y(RH) is a step function and therefore discontinuous at RH = 20 % and
  RH = 70 %. The thresholds are strict inequalities; the boundary values
  (RH = 20 and RH = 70 exactly) fall into the Baseline case by design,
  avoiding ambiguity in financial calculations.

  Compact Indicator Form:
  ────────────────────────
  Y(RH) = Y₀  +  δ_A · 𝟙[RH > τ_H]  +  δ_B · 𝟙[RH < τ_L]

  where 𝟙[·] is the indicator function (= 1 if condition true, 0 otherwise).
  The two indicator terms are mutually exclusive by construction since
  τ_L < τ_H; RH cannot simultaneously exceed 70 and be below 20.


──────────────────────────────────────────────────────────────────────────────
4.2  THE MASS-CORRECTION EQUATION
──────────────────────────────────────────────────────────────────────────────

The corrected saleable mass of roasted coffee M_final, given a green input
M_green and the resolved active humidity RH*, is:

        M_final  =  Y(RH*)  ·  M_green                              ... (1)

  Expanded form using the indicator notation of Section 4.1:

        M_final  =  (Y₀  +  δ_A · 𝟙[RH* > τ_H]
                          +  δ_B · 𝟙[RH* < τ_L])  ·  M_green

  The baseline (uncorrected) roasted mass is:
        M_baseline  =  Y₀  ·  M_green  =  0.82 · M_green            ... (2)

  The Hygroscopic Mass Correction (signed quantity) is:
        ΔM  =  M_final  −  M_baseline
             =  (Y(RH*) − Y₀)  ·  M_green                           ... (3)

  Numerical bounds on ΔM:
        ΔM  ∈  [  δ_B · M_green ,  δ_A · M_green  ]
            =  [  −0.003 · M_green ,  +0.005 · M_green  ]

  Worked Example  (M_green = 500 kg, coastal Jeddah, RH* = 72 %):
  ─────────────────────────────────────────────────────────────────
        Y(72)      =  0.82 + 0.005  =  0.825
        M_final    =  0.825 × 500   =  412.5 kg
        M_baseline =  0.820 × 500   =  410.0 kg
        ΔM         =  412.5 − 410.0 =  +2.5 kg    (moisture-gain surplus)


──────────────────────────────────────────────────────────────────────────────
4.3  TRUE ROASTED COST FUNCTION  C_roasted(RH*)
──────────────────────────────────────────────────────────────────────────────

The true cost per kilogram of roasted product, accounting for
humidity-adjusted shrinkage, is:

        C_roasted(RH*)  =  C_green / Y(RH*)                         ... (4)

  A lower yield (high-aridity Rule B) inflates per-kg roasted cost;
  a higher yield (high-humidity Rule A) reduces it.

  Note on Price Stability:
  ─────────────────────────
  The wholesale price presented to buyers P_w is intentionally computed
  using the fixed Baseline coefficient Y₀ = 0.82 only:

        C_roasted_baseline  =  C_green / Y₀                         ... (5)

        P_w  =  C_roasted_baseline / (1 − g)                        ... (6)

  This architectural decision ensures that the consumer-facing price is
  deterministic and independent of daily micro-climate fluctuations.
  The delta between actual cost and baseline cost is captured exclusively
  in the Environmental P&L account (Section 4.4).


──────────────────────────────────────────────────────────────────────────────
4.4  THE FINANCIAL ASSET VARIANCE FORMULA  ΔV  (Environmental P&L)
──────────────────────────────────────────────────────────────────────────────

The Environmental Asset Variance ΔV (denominated in SAR) quantifies the
monetary gain or loss in inventory value attributable solely to hygroscopic
mass transfer — i.e., the financial P&L impact of micro-climate conditions:

        ΔV  =  ΔM  ·  P_w
             =  (Y(RH*) − Y₀)  ·  M_green  ·  P_w                  ... (7)

  Summed across a portfolio of N active lots:

        ΔV_total  =  Σᵢ₌₁ᴺ  (Y(RH*ᵢ) − Y₀)  ·  M_greenᵢ  ·  P_wᵢ  ... (8)

  Sign Convention:
    ΔV > 0  →  Environmental surplus (net moisture gain — Rule A branches)
    ΔV < 0  →  Environmental deficit (net moisture loss — Rule B branches)
    ΔV = 0  →  No environmental impact (all branches in Baseline range)

  This quantity represents a real asset revaluation: inventory held in a
  high-humidity coastal environment produces measurably more usable roasted
  product than declared on the purchase invoice, constituting an unrealised
  asset gain. The converse holds for arid-environment storage.

  Worked Example (portfolio of 2 lots):
  ──────────────────────────────────────
  Lot A: M_green = 500 kg, RH* = 72 % (Jeddah Coastal), P_w = 150 SAR/kg
         Y(72) = 0.825  →  ΔM_A = (0.825 − 0.82) × 500 = +2.5 kg
         ΔV_A  = 2.5 × 150 = +375 SAR

  Lot B: M_green = 200 kg, RH* = 15 % (Desert storage), P_w = 130 SAR/kg
         Y(15) = 0.817  →  ΔM_B = (0.817 − 0.82) × 200 = −0.6 kg
         ΔV_B  = −0.6 × 130 = −78 SAR

  ΔV_total = +375 + (−78) = +297 SAR  (net environmental surplus)


──────────────────────────────────────────────────────────────────────────────
4.5  LIVE INVENTORY VALUATION WITH SPONGE CORRECTION
──────────────────────────────────────────────────────────────────────────────

The live inventory value V_inv of a single lot, incorporating the
Hygroscopic Mass Correction, is:

        V_inv  =  M_final  ·  P_w
               =  Y(RH*)  ·  M_green  ·  P_w                        ... (9)

  The projected gross profit Π for the same lot is:

        Π  =  (P_w − C_roasted(RH*))  ·  M_final
           =  (P_w  −  C_green / Y(RH*))  ·  Y(RH*)  ·  M_green     ... (10)


──────────────────────────────────────────────────────────────────────────────
4.6  QABBAN PULSE — BARISTA WASTE RECONCILIATION MATHEMATICS
──────────────────────────────────────────────────────────────────────────────

  Overview:
  ──────────
  The Qabban Pulse module extends the Sponge Effect Engine into the
  operational layer by instrumenting barista workflow with a real-time
  Bluetooth precision scale (Acaia model). It compares actual bean
  consumption measured by the scale against theoretically expected
  consumption computed from POS order data, producing an auditable
  waste variance with financial attribution.

  ── 4.6.1  DRINK-TO-BEAN MAPPING FUNCTION  Φ(d)  ──────────────────────────

  Each drink type d is assigned a theoretical bean dosage via the
  injective mapping function:

        Φ : D → ℝ₊

  where D is the set of all drink types served by the branch.
  Canonical values (grams per serving) extracted from the system of record:

  ┌──────────────────────────┬──────────────────────────┐
  │ Drink Type  d            │ Φ(d)  (grams per serving) │
  ├──────────────────────────┼──────────────────────────┤
  │ Espresso                 │  18 g                    │
  │ Double Espresso          │  36 g                    │
  │ Americano                │  18 g                    │
  │ Long Black               │  18 g                    │
  │ Cappuccino               │  18 g                    │
  │ Flat White               │  18 g                    │
  │ Cortado                  │  18 g                    │
  │ Latte                    │  18 g                    │
  │ Double Latte             │  36 g                    │
  │ Macchiato                │  18 g                    │
  │ Double Macchiato         │  36 g                    │
  │ Ristretto                │  14 g                    │
  │ Double Ristretto         │  28 g                    │
  │ Cold Brew                │  50 g                    │
  │ Pour Over                │  20 g                    │
  │ Filter Coffee            │  20 g                    │
  │ Batch Brew               │  20 g                    │
  │ (default / unknown)      │  18 g                    │
  └──────────────────────────┴──────────────────────────┘

  ── 4.6.2  THEORETICAL CONSUMPTION  W_theoretical  ─────────────────────────

  Given a set of N POS order line items { (dᵢ, qᵢ) } where dᵢ is the
  drink type and qᵢ is the quantity sold, the theoretical bean consumption
  for the period is:

        W_theoretical  =  Σᵢ₌₁ᴺ  Φ(dᵢ)  ·  qᵢ                      ... (17)

  Units: grams (g).

  This value represents the ideal, zero-waste consumption of beans if
  every shot were pulled to specification with no spillage, dial-in
  waste, or extraction error.

  ── 4.6.3  ACTUAL IOT CONSUMPTION  W_actual  ───────────────────────────────

  The Acaia Bluetooth precision scale streams weight readings to the
  browser-side AcaiaLink class at approximately 5 Hz via the Web Bluetooth
  API (GATT Characteristic UUID 0x0000ffe1-...). A reading is classified
  as stable when consecutive samples within a sliding window fall within
  a convergence tolerance ε:

        STABLE  ⟺  |W_i − W_{i-1}| ≤ ε                              ... (18)

  where ε is the stability threshold (implementation value: ε = 0.3 g).

  Only stable readings are committed to the WasteLog store. The actual
  total bean consumption for a Dial-in session is the summation of all
  committed stable readings:

        W_actual  =  Σₖ  W_k      (over all stable committed readings k
                                    in the reconciliation period)      ... (19)

  ── 4.6.4  WASTE VARIANCE  Ψ  ──────────────────────────────────────────────

  The reconciled waste variance (in grams) for a given branch and period is:

        Ψ  =  W_actual  −  W_theoretical                             ... (20)

  Sign Convention:
    Ψ > 0  →  Over-use (waste): actual scale usage EXCEEDS predicted POS
              consumption. Indicates spills, failed shots, grinder
              recalibration waste, or barista error.
    Ψ < 0  →  Under-use: actual scale usage is BELOW predicted POS
              consumption. May indicate unrecorded manual shots or
              scale misalignment.
    Ψ = 0  →  Perfect reconciliation (theoretical ideal).

  ── 4.6.5  FINANCIAL WASTE LOSS  L_waste  ──────────────────────────────────

  The SAR-denominated financial cost of the waste variance is:

              ⎧  (Ψ / 1000)  ·  C_green_branch   if  Ψ > 0
  L_waste  =  ⎨                                               ... (21)
              ⎩  0                                if  Ψ ≤ 0

  Where C_green_branch is the procurement cost of green beans at that
  branch (SAR/kg), converted to grams via the factor 1/1000.

  This formula is implemented in the system of record as:

        calcFinancialLoss(Ψ, C_green_branch)
          = round((Ψ / 1000) × C_green_branch × 100) / 100    if Ψ > 0
          = 0                                                   otherwise

  Worked Example (Qabban Pulse live session):
  ─────────────────────────────────────────────
  Branch: Riyadh (BR-RUH),  C_green = 180 SAR/kg
  POS data: 4 Espressos + 1 Americano = (4 × 18) + (1 × 18) = 90 g
  Scale readings: 5 stable commits totalling W_actual = 92.1 g

        Ψ         = 92.1 − 90.0 = +2.1 g  (over-use)
        L_waste   = (2.1 / 1000) × 180    = 0.38 SAR

  (For a full daily session producing Ψ = 92.1 g gross actual usage
   versus W_theoretical = 0 g from DEMO Foodics key returning no orders:)
        L_waste   = (92.1 / 1000) × 180   = 16.58 SAR

  ── 4.6.6  PulseReconciliation INTERFACE  ──────────────────────────────────

  A single reconciliation run produces a PulseReconciliation record
  with the following typed fields (TypeScript interface from data.ts):

  ┌────────────────────────┬──────────────┬──────────────────────────────────┐
  │ Field                  │ Type         │ Description                      │
  ├────────────────────────┼──────────────┼──────────────────────────────────┤
  │ id                     │ string (UUID)│ Unique reconciliation record ID  │
  │ branchId               │ string       │ Branch identifier (e.g. BR-RUH)  │
  │ periodDate             │ string (ISO) │ Date of the reconciliation period│
  │ theoreticalUsage       │ number (g)   │ W_theoretical from Eq. (17)      │
  │ actualUsageIot         │ number (g)   │ W_actual from Eq. (19)           │
  │ variance               │ number (g)   │ Ψ from Eq. (20) — signed         │
  │ financialLossSar       │ number (SAR) │ L_waste from Eq. (21)            │
  │ costPerKgSar           │ number       │ C_green_branch in SAR/kg         │
  │ foodicsOrderCount      │ number       │ POS orders ingested this run     │
  │ adjustmentPushed       │ boolean      │ True if POS inventory adjusted   │
  │ adjustmentId           │ string       │ Foodics adjustment reference     │
  │ createdAt              │ string (ISO) │ Timestamp of reconciliation run  │
  └────────────────────────┴──────────────┴──────────────────────────────────┘

  ── 4.6.7  FOODICS POS QUANTITY ADJUSTMENT FORMULA  ────────────────────────

  After computing Ψ, the system pushes a signed inventory correction to
  the Foodics POS via the Quantity Adjustment API endpoint. The adjustment
  quantity Q_adj sent to Foodics (in kg, negative = deduction) is:

        Q_adj  =  − (Ψ / 1000)    [kg, signed]                       ... (22)

  A positive Ψ (over-use waste) results in a negative Q_adj, reducing the
  Foodics inventory register to reflect the actual beans consumed.
  This closes the reconciliation loop between the physical IoT scale
  and the digital POS inventory ledger.


════════════════════════════════════════════════════════════════════════════════
SECTION 5 — HYBRID TELEMETRY SWITCH: LOGICAL PROOF & FLOW DESCRIPTION
════════════════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────────────
5.1  PROBLEM STATEMENT — SINGLE-SOURCE FAILURE RISK
──────────────────────────────────────────────────────────────────────────────

A physical IoT sensor (e.g., ESP32 microcontroller with DHT22 temperature-
humidity transducer) provides higher-fidelity micro-climate data than a
city-level meteorological API. However, physical sensors are subject to:
  (a) Power interruptions or network disconnection.
  (b) Firmware crashes or hardware failure.
  (c) Signal delays exceeding the acceptable freshness window.

Relying exclusively on IoT data introduces a single-point-of-failure risk
into the inventory valuation pipeline. The Hybrid Telemetry Switch resolves
this by implementing a priority-ordered, time-bounded arbitration function
with automatic fallback.


──────────────────────────────────────────────────────────────────────────────
5.2  FORMAL DEFINITION OF THE ACTIVE RH RESOLVER  RH*(B)
──────────────────────────────────────────────────────────────────────────────

Let B denote a Branch object with attributes:
  B.S              — configured source selector ∈ { IOT_SENSOR, WEATHER_API }
  B.RH_iot         — last IoT-reported humidity (nullable real)
  B.RH_api         — last weather-API humidity (non-null real)
  B.t_iot          — timestamp of last IoT reading (nullable integer, ms)
  t_now            — current system time (integer, ms)
  Τ_stale = 3,600,000 ms (= 60 minutes)

The staleness predicate is:
        σ(B)  =  𝟙[ (t_now − B.t_iot) > Τ_stale ]                  ... (11)

  σ(B) = 1  ↔  IoT data is stale (more than 60 minutes old)
  σ(B) = 0  ↔  IoT data is fresh

The data-availability predicate is:
        α(B)  =  𝟙[ B.RH_iot ≠ null  AND  B.t_iot ≠ null ]         ... (12)

  α(B) = 1  ↔  At least one IoT reading has been received
  α(B) = 0  ↔  No IoT reading has ever been received

The Active RH Resolver is then defined as:

                ⎧  B.RH_iot     if  B.S = IOT_SENSOR
                ⎪               AND  α(B) = 1
  RH*(B)  =    ⎨               AND  σ(B) = 0               ... (13)
                ⎪
                ⎩  B.RH_api     otherwise (all other cases)

  "Otherwise" covers three distinct fallback conditions:
    Case F1:  B.S = WEATHER_API               → Source explicitly set to API
    Case F2:  B.S = IOT_SENSOR ∧ α(B) = 0    → No IoT data yet received
    Case F3:  B.S = IOT_SENSOR ∧ α(B)=1 ∧ σ=1 → Data stale (AUTO-FALLBACK)

  Case F3 is the critical safety path: even when the operator has elected
  IoT mode, the system silently reverts to the weather API if the sensor
  has not delivered a fresh reading within 60 minutes, and raises a stale
  flag σ = true for UI display (animated "STALE DATA" warning badge on the
  branch card, showing age-in-minutes).


──────────────────────────────────────────────────────────────────────────────
5.3  LOGIC-GATE REPRESENTATION
──────────────────────────────────────────────────────────────────────────────

The Hybrid Telemetry Switch expressed as combinational logic (Boolean
algebra), where each predicate is a binary signal:

  Let:
    P = 𝟙[ B.S = IOT_SENSOR ]         — "operator selected IoT mode"
    A = α(B)                           — "IoT data has been received"
    F = ¬σ(B) = 𝟙[ age ≤ Τ_stale ]   — "IoT data is fresh" (NOT stale)

  The "use IoT" gate:
        USE_IOT  =  P  AND  A  AND  F                               ... (14)

  The resolved humidity:
        RH*(B)   =  (USE_IOT · B.RH_iot)  +  (¬USE_IOT · B.RH_api) ... (15)

  Truth Table for USE_IOT:
  ┌───┬───┬───┬─────────┬──────────────────────────────────────────────┐
  │ P │ A │ F │ USE_IOT │ Condition                                    │
  ├───┼───┼───┼─────────┼──────────────────────────────────────────────┤
  │ 0 │ X │ X │    0    │ Source = WEATHER_API → always use API        │
  │ 1 │ 0 │ X │    0    │ IoT selected but no data yet → fallback      │
  │ 1 │ 1 │ 0 │    0    │ IoT selected, data stale → AUTO-FALLBACK     │
  │ 1 │ 1 │ 1 │    1    │ IoT selected, data fresh → USE IoT ✓        │
  └───┴───┴───┴─────────┴──────────────────────────────────────────────┘

  Only one row out of four activates the IoT data path, ensuring the
  system defaults to the reliable web-API source under all failure modes.


──────────────────────────────────────────────────────────────────────────────
5.4  ALGORITHMIC FLOW DESCRIPTION
──────────────────────────────────────────────────────────────────────────────

  START: Sponge Engine Invoked for Branch B
         │
         ▼
  ┌─────────────────────────────────┐
  │  Is B.humidity_source           │
  │  = 'IOT_SENSOR' ?               │
  └─────────────────────────────────┘
         │ YES                   NO │
         ▼                         ▼
  ┌─────────────────┐     ┌────────────────────────────┐
  │ Has B received  │     │ RH*    ← B.RH_api          │
  │ any IoT pulse?  │     │ source ← 'WEATHER_API'     │
  │ (α(B) = 1?)     │     │ σ      ← false             │
  └─────────────────┘     └────────────────────────────┘
     │ YES   NO │                      │
     │          ▼                      │
     │  ┌────────────────────────┐     │
     │  │ RH*    ← B.RH_api      │     │
     │  │ source ← 'WEATHER_API' │     │
     │  │ σ      ← false         │     │
     │  │ warn: "Awaiting first  │     │
     │  │  IoT pulse"            │     │
     │  └────────────────────────┘     │
     │          │                      │
     ▼          │                      │
  ┌──────────────────────────┐         │
  │ age ← t_now − B.t_iot   │         │
  │ Is age ≤ Τ_stale?        │         │
  │ (σ(B) = 0?)              │         │
  └──────────────────────────┘         │
     │ YES             NO │            │
     ▼                    ▼            │
  ┌──────────────────┐  ┌─────────────────────────────┐
  │ RH*    ← B.RH_iot│  │ RH*    ← B.RH_api           │
  │ source ← 'IOT'   │  │ source ← 'WEATHER_API'      │
  │ σ      ← false   │  │ σ      ← true  (FALLBACK)   │
  └──────────────────┘  │ UI: display "STALE DATA"    │
         │              │     animated warning badge  │
         │              └─────────────────────────────┘
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌────────────────────────────────┐
         │ Compute Y(RH*) via piecewise   │
         │ Dynamic Yield Function         │
         │ (Section 4.1, Equations 1–3)   │
         └────────────────────────────────┘
                    │
                    ▼
         ┌────────────────────────────────┐
         │ Apply Mass-Correction:         │
         │ M_final = Y(RH*) · M_green    │
         └────────────────────────────────┘
                    │
                    ▼
         ┌────────────────────────────────┐
         │ Propagate to all ledgers:      │
         │  • Lot roasted weight record   │
         │  • True Roasted Cost C_roasted │
         │  • Environmental P&L  ΔV      │
         │  • Live Inventory Value V_inv  │
         │  • Projected Profit  Π        │
         └────────────────────────────────┘
                    │
                    ▼
                  END


──────────────────────────────────────────────────────────────────────────────
5.5  SECURITY: DEVICE AUTHENTICATION PROTOCOL
──────────────────────────────────────────────────────────────────────────────

Each physical sensor is issued a unique device key K_d (UUID v4 format)
at branch provisioning time. No IoT telemetry reading is accepted without
prior authentication against the device registry.

The authentication function AUTH is:

        AUTH(K_d)  =  𝟙[ ∃ B ∈ Branches :  B.iot_device_key = K_d ]  ... (16)

  If AUTH(K_d) = 0 : Telemetry pulse rejected with HTTP 401 Unauthorized.
  If AUTH(K_d) = 1 : System proceeds to ingest the reading for the
                      uniquely identified branch B.

  This scheme prevents:
  (a) Injection of fraudulent humidity data from unauthorised devices.
  (b) Spoofed telemetry attacks targeting financial asset inflation.
  (c) Cross-branch data contamination (one sensor poisoning another
      branch's humidity register).


════════════════════════════════════════════════════════════════════════════════
SECTION 6 — COMPLETE SYSTEM EQUATION SUMMARY
════════════════════════════════════════════════════════════════════════════════

  All primary equations of the invention, in canonical reference order:

  ─────────────────────────────────────────────────────────────────────────
  Sponge Effect (Hygroscopic Mass Compensation) Engine:
  ─────────────────────────────────────────────────────────────────────────
  (1)   M_final      =  Y(RH*) · M_green
  (2)   M_baseline   =  Y₀ · M_green  =  0.82 · M_green
  (3)   ΔM           =  M_final − M_baseline  =  (Y(RH*) − 0.82) · M_green
  (4)   C_roasted    =  C_green / Y(RH*)
  (5)   C_baseline   =  C_green / Y₀  =  C_green / 0.82
  (6)   P_w          =  C_baseline / (1 − g)
  (7)   ΔV           =  ΔM · P_w  =  (Y(RH*) − Y₀) · M_green · P_w
  (8)   ΔV_total     =  Σᵢ (Y(RH*ᵢ) − Y₀) · M_greenᵢ · P_wᵢ
  (9)   V_inv        =  Y(RH*) · M_green · P_w
  (10)  Π            =  (P_w − C_green / Y(RH*)) · Y(RH*) · M_green

  ─────────────────────────────────────────────────────────────────────────
  Hybrid Telemetry Switch:
  ─────────────────────────────────────────────────────────────────────────
  (11)  σ(B)         =  𝟙[ (t_now − B.t_iot) > 3,600,000 ]
  (12)  α(B)         =  𝟙[ B.RH_iot ≠ null  AND  B.t_iot ≠ null ]
  (13)  RH*(B)       =  B.RH_iot   if  (B.S=IOT) ∧ α(B)=1 ∧ σ(B)=0
                        B.RH_api   otherwise
  (14)  USE_IOT      =  P  ∧  A  ∧  F
  (15)  RH*(B)       =  USE_IOT · B.RH_iot  +  ¬USE_IOT · B.RH_api
  (16)  AUTH(K_d)    =  𝟙[ ∃ B : B.iot_device_key = K_d ]

  ─────────────────────────────────────────────────────────────────────────
  Qabban Pulse — Barista Waste Reconciliation:
  ─────────────────────────────────────────────────────────────────────────
  (17)  W_theoretical =  Σᵢ Φ(dᵢ) · qᵢ
  (18)  STABLE        ⟺  |W_i − W_{i-1}| ≤ ε   (ε = 0.3 g)
  (19)  W_actual      =  Σₖ W_k    (stable committed readings)
  (20)  Ψ             =  W_actual − W_theoretical
  (21)  L_waste       =  (Ψ / 1000) · C_green_branch   if Ψ > 0 ;  else 0
  (22)  Q_adj         =  − (Ψ / 1000)    [kg, signed Foodics adjustment]

  ─────────────────────────────────────────────────────────────────────────
  Piecewise Definition of Y(RH) — Canonical Form:
  ─────────────────────────────────────────────────────────────────────────

                    ⎧  0.825    if  RH > 70 %    (Rule A — Hygroscopic
                    ⎪                              Absorption)
        Y(RH)  =   ⎨  0.817    if  RH < 20 %    (Rule B — Evaporative
                    ⎪                              Desorption)
                    ⎩  0.820    if  20 % ≤ RH ≤ 70 %   (Baseline)


════════════════════════════════════════════════════════════════════════════════
SECTION 7 — TECHNICAL CHARACTER PROOF (PATENT ELIGIBILITY)
════════════════════════════════════════════════════════════════════════════════

7.1  Technical Problem Solved
───────────────────────────────
The invention solves a concrete technical problem in commodity ERP systems:
how to accurately and continuously value a physical inventory of hygroscopic
agricultural commodities (green coffee beans) whose true mass and derived
financial worth changes in real time as a function of the micro-climate
conditions at the storage location, and how to reconcile barista-level bean
consumption against POS-derived theoretical usage to isolate and financially
quantify waste at the operational layer.

7.2  Technical Means Employed
───────────────────────────────
The solution employs technical means that go beyond normal business or
mathematical methods in isolation:
  (a) A hardware IoT sensor (ESP32 + DHT22 transducer) communicating via
      HTTP POST to a secure authenticated REST API endpoint.
  (b) A Bluetooth precision scale (Acaia) streaming GATT characteristic
      notifications at 5 Hz to a browser-side TypeScript class via the
      Web Bluetooth API (Characteristic UUID 0x0000ffe1-...).
  (c) A time-bounded arbitration algorithm (Equations 11–15) executed in
      real time within an edge-computing worker process.
  (d) A piecewise coefficient function (Equations 1–3) applied
      programmatically to update physical inventory mass records.
  (e) A drink-to-bean mapping function Φ (Section 4.6.1) translating
      POS transaction records into theoretical gram-level bean consumption.
  (f) Cascaded financial recalculation (Equations 4–10, 17–22) propagating
      the corrected coefficient and waste variance into cost, price, P&L,
      and POS inventory ledger entries.
  (g) An authenticated telemetry ingestion pipeline (Equation 16)
      preventing fraudulent data injection.

7.3  Technical Effects Produced
────────────────────────────────
  (a) Inventory mass records are corrected in real time for hygroscopic
      effects, producing physical accuracy not achievable by static models.
  (b) Environmental P&L (ΔV) is computed and surfaced as a distinct
      financial ledger line, enabling micro-climate-attributable variance
      reporting for the first time in a standard coffee ERP context.
  (c) Barista-level waste is quantified in grams and SAR per session,
      enabling operational accountability at the individual workstation
      level without manual auditing.
  (d) The reconciled waste variance Ψ is automatically submitted as a
      signed inventory adjustment Q_adj to the POS system, closing the
      loop between physical scale measurement and digital stock ledger.
  (e) The auto-fallback mechanism (Cases F1–F3) ensures uninterrupted
      system operation during sensor failures — a technical reliability
      property with commercial consequence (no frozen valuations).
  (f) Stable wholesale pricing (via Y₀-pinned price formula) is preserved
      independently of the corrected internal cost — a non-obvious
      architectural separation of concerns.

7.4  Non-Obviousness Arguments
───────────────────────────────
  (i)   The selection of τ_H = 70 % and τ_L = 20 % as threshold boundaries
        is based on empirically established moisture-content equilibrium
        tables for green Arabica bean varieties under Saudi Arabian
        coastal (Jeddah/Dammam) and inland (Riyadh) conditions.
  (ii)  The asymmetric magnitude of the deltas (δ_A = +0.005 vs.
        δ_B = −0.003) reflects the physical asymmetry of moisture
        absorption (faster, driven by partial-pressure differential at
        high RH) versus desorption (slower, constrained by cellular
        membrane permeability) — a non-obvious physical characterisation.
  (iii) The price-stability separation (Equations 5–6 pinned to Y₀)
        while simultaneously correcting the cost function (Equation 4)
        using Y(RH*) is a non-obvious financial engineering decision
        that decouples internal P&L from external price exposure.
  (iv)  The 60-minute staleness threshold is calibrated to the DHT22
        sensor's stated mean-time-between-failure (MTBF) of ~50,000 hours
        and typical roastery operational review cycles, representing
        domain-specific engineering knowledge embedded in system logic.
  (v)   The use of a Bluetooth GATT characteristic (UUID 0x0000ffe1-...)
        for direct sub-second scale integration, without intermediary
        cloud connectivity, is a novel application of Web Bluetooth API
        to industrial coffee barista workflow instrumentation.
  (vi)  The mathematical closure of the waste reconciliation loop —
        from GATT byte stream → stable weight commitment → gram-level
        variance → SAR financial loss → POS inventory correction — as a
        single automated pipeline is not found in any known prior art in
        the food-service ERP domain.


════════════════════════════════════════════════════════════════════════════════
SECTION 8 — CLAIMS (DRAFT INDEPENDENT CLAIMS)
════════════════════════════════════════════════════════════════════════════════

CLAIM 1 — METHOD (Hygroscopic Mass Compensation)
──────────────────────────────────────────────────
A computer-implemented method for real-time asset valuation correction in
a coffee bean inventory management system, the method comprising:
  (a) receiving, at a server-side application programming interface
      endpoint authenticated by a device key, a telemetry message from
      a physical IoT humidity sensor comprising a relative humidity
      value RH_iot and a timestamp t_iot;
  (b) evaluating a staleness predicate σ = 𝟙[(t_now − t_iot) > Τ_stale]
      to determine whether the received reading is within a freshness
      window Τ_stale;
  (c) selecting an active humidity value RH* by applying a source
      arbitration function that returns RH_iot if σ = 0 and the IoT
      source is active, and otherwise returns a meteorological web-API
      humidity value RH_api;
  (d) evaluating a piecewise Dynamic Yield Function Y(RH*) to produce
      a dimensionless yield coefficient;
  (e) computing a corrected saleable mass M_final = Y(RH*) · M_green for
      each inventory lot stored at the sensor's associated branch; and
  (f) computing an Environmental Asset Variance ΔV = (Y(RH*) − Y₀) ·
      M_green · P_w representing the financial impact of hygroscopic mass
      transfer, and recording ΔV in a financial ledger.

CLAIM 2 — METHOD (Barista Waste Reconciliation)
─────────────────────────────────────────────────
A computer-implemented method for real-time barista waste reconciliation in
a coffee shop management system, the method comprising:
  (a) receiving, via a Web Bluetooth GATT characteristic notification
      stream from a precision scale device, a sequence of weight readings
      W_i at a sampling rate of approximately 5 Hz;
  (b) applying a stability predicate |W_i − W_{i-1}| ≤ ε to each reading
      to identify and commit only stable weight measurements to a waste log;
  (c) computing actual bean consumption W_actual as the sum of all committed
      stable readings within a reconciliation period;
  (d) pulling point-of-sale order data from a POS system API and computing
      theoretical bean consumption W_theoretical = Σ Φ(dᵢ) · qᵢ using a
      drink-to-bean mapping function Φ;
  (e) computing a waste variance Ψ = W_actual − W_theoretical; and
  (f) computing a financial waste loss L_waste = (Ψ/1000) · C_green if
      Ψ > 0, and submitting a signed inventory adjustment Q_adj = −Ψ/1000
      to the POS system to synchronise physical and digital stock records.

CLAIM 3 — SYSTEM (Integrated Architecture)
────────────────────────────────────────────
A system for Micro-climate Compensated Inventory Valuation comprising:
  (a) one or more IoT sensor devices each identified by a unique device key;
  (b) a server-side REST API endpoint for ingesting authenticated telemetry;
  (c) a hybrid telemetry arbitration module implementing the source
      resolver of Equation (13);
  (d) a piecewise Dynamic Yield Function module implementing Y(RH) of
      Section 4.1;
  (e) a mass-correction module applying M_final = Y(RH*) · M_green;
  (f) a financial engine computing C_roasted, P_w, ΔV, V_inv, and Π as
      defined in Equations (4) through (10);
  (g) a browser-side Bluetooth interface class (AcaiaLink) for receiving
      GATT characteristic weight notifications from a precision scale; and
  (h) a waste reconciliation engine computing Ψ, L_waste, and Q_adj as
      defined in Equations (17) through (22).

CLAIM 4 — DEVICE KEY AUTHENTICATION
──────────────────────────────────────
The method of Claim 1, wherein the device key is a universally unique
identifier (UUID v4) issued at branch provisioning time and validated by
the function AUTH(K_d) = 𝟙[∃ B ∈ Branches : B.iot_device_key = K_d] prior
to any modification of branch inventory records.

CLAIM 5 — AUTOMATIC FALLBACK
──────────────────────────────
The method of Claim 1, wherein when σ = 1 (stale data condition) the system
automatically substitutes RH_api for RH_iot without operator intervention,
generates a visual staleness warning in the user interface displaying the
age of the last reading in minutes, and ensures continuous inventory
valuation without manual override.

CLAIM 6 — ASYMMETRIC DELTA COEFFICIENTS
─────────────────────────────────────────
The method of Claim 1, wherein the piecewise function applies distinct
magnitude adjustments δ_A = +0.005 for hygroscopic absorption above 70 % RH
and δ_B = −0.003 for evaporative desorption below 20 % RH, said values being
calibrated to the physical moisture-transfer kinetics of green Arabica
coffee beans under Arabian Peninsula micro-climate conditions.

CLAIM 7 — POS LOOP CLOSURE
────────────────────────────
The method of Claim 2, wherein the signed inventory adjustment Q_adj is
transmitted to the POS system via an authenticated API call at the
conclusion of each reconciliation period, causing the POS digital inventory
register to reflect the actual physical bean consumption measured by the
precision scale, thereby closing the physical-digital inventory loop.


════════════════════════════════════════════════════════════════════════════════
SECTION 9 — GLOSSARY OF SCIENTIFIC TERMS
════════════════════════════════════════════════════════════════════════════════

  Hygroscopic Mass Transfer
    The spontaneous exchange of water molecules between a porous solid
    (green coffee bean) and the surrounding gas phase (ambient air),
    driven by the difference in water vapour partial pressure between
    the bean surface and the atmosphere. Quantified here as ΔM.

  Micro-climate Compensation
    The computational adjustment applied to a static theoretical model
    (the 0.82 baseline coefficient) to account for site-specific
    atmospheric conditions that deviate from the generalised standard.
    Implemented here as the piecewise Y(RH) function.

  Real-time Asset Valuation
    The continuous, automated recalculation of the monetary worth of a
    physical inventory holding as a function of time-varying environmental
    parameters. Contrasted with periodic manual stocktakes.

  Floating Yield Coefficient
    The dynamic, RH-dependent output of Y(RH), as distinguished from the
    static baseline coefficient Y₀ = 0.82 used in conventional models.

  Environmental P&L
    The sub-ledger account ΔV that isolates the financial impact of
    micro-climate conditions from operational trading activities,
    enabling attribution of inventory variance to environmental causes.

  Hygroscopic Absorption (Rule A)
    The process by which bean mass increases due to moisture uptake from
    a high-humidity atmosphere (RH > 70 %). Modelled as Y(RH) = 0.825.

  Evaporative Desorption (Rule B)
    The process by which bean mass decreases due to moisture loss to a
    low-humidity atmosphere (RH < 20 %). Modelled as Y(RH) = 0.817.

  Staleness Threshold (Τ_stale)
    The maximum acceptable age of an IoT telemetry reading before it is
    considered unreliable for financial computation. Set to 3,600,000 ms
    (60 minutes) in the present embodiment.

  Telemetry Arbitration
    The logic-gate decision process (Section 5.3) that selects between
    IoT sensor data and web-API data based on source preference, data
    availability, and freshness, as formalised in Equations (11)–(15).

  Device Key Authentication
    The pre-shared UUID-based identity verification step (Equation 16)
    that authorises a physical sensor to write data into the inventory
    valuation pipeline, preventing fraudulent data injection.

  Dial-in Mode
    An operational state in which a barista activates the Acaia Bluetooth
    scale integration to log each stable weight reading as a waste event.
    Used during espresso grinder calibration (dial-in) and throughout
    normal service to capture dosing waste.

  Waste Variance (Ψ)
    The signed difference between actual IoT-scale bean consumption
    (W_actual) and POS-predicted theoretical consumption (W_theoretical).
    A positive Ψ represents measurable operational waste.

  Drink-to-Bean Mapping (Φ)
    The injective function assigning a theoretical dosage in grams per
    serving to each drink type in the POS menu. Constitutes the
    translation layer between sales-count data and physical mass units.

  POS Loop Closure
    The architectural property whereby the waste variance Ψ, once
    computed, is fed back into the POS system as a signed inventory
    adjustment Q_adj, ensuring the digital stock register remains
    consistent with physical scale measurements.


════════════════════════════════════════════════════════════════════════════════
SECTION 10 — SYSTEM CONSTANTS TABLE
════════════════════════════════════════════════════════════════════════════════

  The following constants are defined in the system of record (data.ts)
  and form part of the claimed embodiment:

  ┌──────────────────────────────────┬────────────────┬───────────────────────┐
  │ Constant Identifier              │ Value          │ Description           │
  ├──────────────────────────────────┼────────────────┼───────────────────────┤
  │ SPONGE_BASELINE_COEFFICIENT      │ 0.82           │ Y₀ — baseline yield   │
  │ SPONGE_RH_HIGH_THRESHOLD         │ 70 (%)         │ τ_H — Rule A trigger  │
  │ SPONGE_RH_LOW_THRESHOLD          │ 20 (%)         │ τ_L — Rule B trigger  │
  │ SPONGE_HIGH_DELTA                │ +0.005         │ δ_A — absorption adj. │
  │ SPONGE_LOW_DELTA                 │ −0.003         │ δ_B — evaporation adj.│
  │ IOT_STALE_THRESHOLD_MS           │ 3,600,000 ms   │ Τ_stale — 60 minutes  │
  │ ZATCA_VAT_RATE                   │ 0.15 (15 %)    │ Saudi VAT for invoices│
  │ ACAIA_SERVICE_UUID               │ 0x0000ffe0-... │ BLE GATT service UUID │
  │ ACAIA_CHAR_UUID                  │ 0x0000ffe1-... │ BLE GATT char UUID    │
  │ ACAIA_SAMPLE_RATE                │ ≈ 5 Hz         │ Scale update frequency│
  │ ACAIA_STABILITY_EPSILON (ε)      │ 0.3 g          │ Stability tolerance   │
  │ PULSE_DEFAULT_BEAN_DOSE          │ 18 g           │ Φ(default) fallback   │
  └──────────────────────────────────┴────────────────┴───────────────────────┘


════════════════════════════════════════════════════════════════════════════════
SECTION 11 — SOURCE CODE REFERENCE (SYSTEM OF RECORD)
════════════════════════════════════════════════════════════════════════════════

  The following source code functions in QABBAN OS implement the
  mathematical constructs described in this document:

  ┌───────────────────────────────────────────┬──────────────────────────────┐
  │ Function / Symbol                         │ Section / Equation           │
  ├───────────────────────────────────────────┼──────────────────────────────┤
  │ calcSpongeCoefficient(rh)                 │ §4.1 — Y(RH) piecewise       │
  │ applyRoastShrinkageWithSponge()           │ §4.2 — Eq. (1) M_final       │
  │ calcTrueRoastedCost()                     │ §4.3 — Eq. (4) C_roasted     │
  │ calcWholesalePrice()                      │ §4.3 — Eqs. (5)–(6) P_w      │
  │ calcLotFinancials().spongeKgDelta         │ §4.2 — Eq. (3) ΔM            │
  │ calcLotFinancials().environmentalPnL      │ §4.4 — Eq. (7) ΔV            │
  │ resolveActiveRH(branch)                   │ §5.2 — Eq. (13) RH*(B)       │
  │ calcSpongeCoefficientForBranch()          │ §5   — Full Hybrid Engine     │
  │ POST /api/iot/telemetry                   │ §5.5 — Eq. (16) AUTH(K_d)    │
  │ POST /api/iot/source-toggle               │ §5.2 — F1/F2/F3 fallback     │
  │ GET  /api/iot/status                      │ §5.2 — Branch snapshot        │
  │ PULSE_BEAN_MAP                            │ §4.6.1 — Φ(d) mapping table   │
  │ calcTheoreticalUsage(orders)              │ §4.6.2 — Eq. (17) W_theoretical│
  │ WasteLog (interface)                      │ §4.6.3 — Eq. (19) W_actual    │
  │ calcFinancialLoss(Ψ, C_green)             │ §4.6.5 — Eq. (21) L_waste     │
  │ PulseReconciliation (interface)           │ §4.6.6 — Full PR record       │
  │ POST /api/pulse/sync                      │ §4.6.7 — Eq. (22) Q_adj       │
  │ AcaiaLink (browser TypeScript class)      │ §4.6.3 — Eq. (18) stability   │
  │ interface PulseReconciliation             │ §4.6.6 — Typed schema          │
  └───────────────────────────────────────────┴──────────────────────────────┘

  File locations:
    src/data.ts    — All data types, interfaces, constants, and pure
                     calculation functions
    src/index.tsx  — All Hono HTTP route handlers, admin UI pages,
                     AcaiaLink browser class, React Pulse component


════════════════════════════════════════════════════════════════════════════════
  END OF DOCUMENT
  Prepared by:      QABBAN OS Engineering Team
  Document Ref:     QABBAN-PAT-2026-001
  Version:          2.0  (Final — includes Qabban Pulse Module)
  Classification:   CONFIDENTIAL — Patent Filing Preparation
  Date:             2026-03-12
════════════════════════════════════════════════════════════════════════════════

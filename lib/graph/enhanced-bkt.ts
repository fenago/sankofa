/**
 * Enhanced Bayesian Knowledge Tracing (BKT) Implementation
 *
 * Extends the basic BKT with:
 * - EM (Expectation-Maximization) algorithm for parameter fitting
 * - Validation metrics (AUC-ROC, Brier Score, Calibration)
 * - Confidence intervals for mastery estimates
 * - Skill-specific parameter storage
 *
 * Based on:
 * - Corbett & Anderson (1995): Knowledge Tracing
 * - Baker et al. (2008): Contextual Slip and Guess
 * - Beck & Chang (2007): Identifiability Issues
 */

import { DEFAULT_BKT_PARAMS, updateBKT, predictCorrectProbability } from './learner-state'
import { runQuery, runWriteTransaction } from './neo4j'

// ============================================================================
// Types
// ============================================================================

export interface BKTParams {
  pL0: number  // Initial probability of knowing
  pT: number   // Probability of learning (transition)
  pS: number   // Probability of slip
  pG: number   // Probability of guess
}

export interface PracticeAttempt {
  isCorrect: boolean
  timestamp?: number
  skillId?: string
}

export interface FittingResult {
  params: BKTParams
  logLikelihood: number
  iterations: number
  converged: boolean
  fitQuality: 'poor' | 'acceptable' | 'good' | 'excellent'
}

export interface ValidationMetrics {
  auc: number              // Area Under ROC Curve (0.5 = random, 1.0 = perfect)
  brierScore: number       // Brier Score (0 = perfect, 1 = worst)
  calibrationError: number // Expected Calibration Error
  accuracy: number         // Simple accuracy
  logLoss: number          // Log loss (cross-entropy)
  sampleSize: number       // Number of predictions evaluated
}

export interface MasteryEstimate {
  pMastery: number
  confidenceInterval: {
    lower: number
    upper: number
    level: number // e.g., 0.95 for 95% CI
  }
  nEffective: number // Effective sample size
}

// ============================================================================
// Enhanced BKT Class
// ============================================================================

export class EnhancedBKT {
  private params: BKTParams
  private skillId?: string
  private notebookId?: string

  constructor(
    params: Partial<BKTParams> = {},
    options: { skillId?: string; notebookId?: string } = {}
  ) {
    this.params = {
      ...DEFAULT_BKT_PARAMS,
      ...params,
    }
    this.skillId = options.skillId
    this.notebookId = options.notebookId
  }

  // ==========================================================================
  // Core BKT Operations
  // ==========================================================================

  /**
   * Update mastery estimate given an observation
   */
  update(currentPMastery: number, isCorrect: boolean): number {
    return updateBKT(currentPMastery, isCorrect, this.params)
  }

  /**
   * Predict probability of correct response
   */
  predict(pMastery: number): number {
    return predictCorrectProbability(pMastery, this.params)
  }

  /**
   * Get current parameters
   */
  getParams(): BKTParams {
    return { ...this.params }
  }

  // ==========================================================================
  // EM Parameter Fitting
  // ==========================================================================

  /**
   * Fit BKT parameters using Expectation-Maximization algorithm
   *
   * @param attempts Array of practice attempts (in chronological order)
   * @param maxIterations Maximum EM iterations
   * @param tolerance Convergence tolerance
   * @returns Fitting result with optimized parameters
   */
  fitParameters(
    attempts: PracticeAttempt[],
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): FittingResult {
    if (attempts.length < 5) {
      // Not enough data - return defaults with poor fit quality
      return {
        params: this.params,
        logLikelihood: -Infinity,
        iterations: 0,
        converged: false,
        fitQuality: 'poor',
      }
    }

    // Initialize parameters
    let pL0 = this.params.pL0
    let pT = this.params.pT
    let pS = this.params.pS
    let pG = this.params.pG

    let prevLogLikelihood = -Infinity
    let iterations = 0
    let converged = false

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1

      // E-step: Compute expected sufficient statistics
      const { alpha, beta, logLikelihood } = this.forwardBackward(
        attempts,
        { pL0, pT, pS, pG }
      )

      // Check for convergence
      if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
        converged = true
        break
      }
      prevLogLikelihood = logLikelihood

      // M-step: Update parameters
      const newParams = this.mStep(attempts, alpha, beta, { pL0, pT, pS, pG })

      // Apply constraints to keep parameters valid
      pL0 = Math.max(0.001, Math.min(0.999, newParams.pL0))
      pT = Math.max(0.001, Math.min(0.999, newParams.pT))
      pS = Math.max(0.001, Math.min(0.5, newParams.pS)) // Slip should be < 0.5
      pG = Math.max(0.001, Math.min(0.5, newParams.pG)) // Guess should be < 0.5

      // Check identifiability constraint: pS + pG < 1
      if (pS + pG >= 1) {
        const scale = 0.9 / (pS + pG)
        pS *= scale
        pG *= scale
      }
    }

    // Update instance parameters
    this.params = { pL0, pT, pS, pG }

    // Calculate fit quality
    const fitQuality = this.assessFitQuality(attempts, this.params)

    return {
      params: this.params,
      logLikelihood: prevLogLikelihood,
      iterations,
      converged,
      fitQuality,
    }
  }

  /**
   * Forward-backward algorithm for computing alpha and beta values
   * Used in EM for computing expected sufficient statistics
   */
  private forwardBackward(
    attempts: PracticeAttempt[],
    params: BKTParams
  ): {
    alpha: number[][]  // alpha[t][state] = P(observation 1..t, state at t)
    beta: number[][]   // beta[t][state] = P(observation t+1..T | state at t)
    logLikelihood: number
  } {
    const T = attempts.length
    const { pL0, pT, pS, pG } = params

    // State 0 = not mastered, State 1 = mastered
    // Observation probabilities
    const emissionProb = (isCorrect: boolean, state: number): number => {
      if (state === 1) {
        // Mastered
        return isCorrect ? (1 - pS) : pS
      } else {
        // Not mastered
        return isCorrect ? pG : (1 - pG)
      }
    }

    // Forward pass (alpha)
    const alpha: number[][] = []
    const scale: number[] = []

    // Initial alpha
    const alpha0 = [
      (1 - pL0) * emissionProb(attempts[0].isCorrect, 0),
      pL0 * emissionProb(attempts[0].isCorrect, 1),
    ]
    const c0 = alpha0[0] + alpha0[1]
    scale.push(c0)
    alpha.push([alpha0[0] / c0, alpha0[1] / c0])

    // Forward recursion
    for (let t = 1; t < T; t++) {
      const prevAlpha = alpha[t - 1]
      const obs = attempts[t].isCorrect

      // Transition: state 0 can go to 0 or 1, state 1 always stays 1
      const alphaT = [
        (prevAlpha[0] * (1 - pT)) * emissionProb(obs, 0),
        (prevAlpha[0] * pT + prevAlpha[1]) * emissionProb(obs, 1),
      ]

      const ct = alphaT[0] + alphaT[1]
      scale.push(ct)
      alpha.push([alphaT[0] / ct, alphaT[1] / ct])
    }

    // Backward pass (beta)
    const beta: number[][] = new Array(T).fill(null).map(() => [0, 0])
    beta[T - 1] = [1, 1]

    for (let t = T - 2; t >= 0; t--) {
      const nextBeta = beta[t + 1]
      const obs = attempts[t + 1].isCorrect

      beta[t][0] =
        (1 - pT) * emissionProb(obs, 0) * nextBeta[0] +
        pT * emissionProb(obs, 1) * nextBeta[1]
      beta[t][1] = emissionProb(obs, 1) * nextBeta[1]

      // Scale
      beta[t][0] /= scale[t + 1]
      beta[t][1] /= scale[t + 1]
    }

    // Log likelihood
    const logLikelihood = scale.reduce((sum, c) => sum + Math.log(c + 1e-300), 0)

    return { alpha, beta, logLikelihood }
  }

  /**
   * M-step: Update parameters based on expected sufficient statistics
   */
  private mStep(
    attempts: PracticeAttempt[],
    alpha: number[][],
    beta: number[][],
    params: BKTParams
  ): BKTParams {
    const T = attempts.length
    const { pT, pS, pG } = params

    // Compute gamma (posterior probability of being in each state)
    const gamma: number[][] = []
    for (let t = 0; t < T; t++) {
      const g = [
        alpha[t][0] * beta[t][0],
        alpha[t][1] * beta[t][1],
      ]
      const norm = g[0] + g[1]
      gamma.push([g[0] / norm, g[1] / norm])
    }

    // Compute xi (posterior probability of transitions)
    // xi[t][i][j] = P(state_t = i, state_{t+1} = j | observations)
    let xi00 = 0, xi01 = 0, xi11 = 0

    for (let t = 0; t < T - 1; t++) {
      const obs = attempts[t + 1].isCorrect
      const emit0 = obs ? pG : (1 - pG)
      const emit1 = obs ? (1 - pS) : pS

      const denom = alpha[t][0] * beta[t][0] + alpha[t][1] * beta[t][1]

      xi00 += (alpha[t][0] * (1 - pT) * emit0 * beta[t + 1][0]) / denom
      xi01 += (alpha[t][0] * pT * emit1 * beta[t + 1][1]) / denom
      xi11 += (alpha[t][1] * emit1 * beta[t + 1][1]) / denom
    }

    // Update pL0 (initial knowledge)
    const newPL0 = gamma[0][1]

    // Update pT (learning rate)
    const newPT = xi01 / (xi00 + xi01 + 1e-10)

    // Update pS (slip rate)
    let masteredCorrect = 0, masteredTotal = 0
    for (let t = 0; t < T; t++) {
      masteredTotal += gamma[t][1]
      if (attempts[t].isCorrect) {
        masteredCorrect += gamma[t][1]
      }
    }
    const newPS = 1 - masteredCorrect / (masteredTotal + 1e-10)

    // Update pG (guess rate)
    let unmasteredCorrect = 0, unmasteredTotal = 0
    for (let t = 0; t < T; t++) {
      unmasteredTotal += gamma[t][0]
      if (attempts[t].isCorrect) {
        unmasteredCorrect += gamma[t][0]
      }
    }
    const newPG = unmasteredCorrect / (unmasteredTotal + 1e-10)

    return {
      pL0: newPL0,
      pT: newPT,
      pS: newPS,
      pG: newPG,
    }
  }

  /**
   * Assess the quality of parameter fit
   */
  private assessFitQuality(
    attempts: PracticeAttempt[],
    params: BKTParams
  ): 'poor' | 'acceptable' | 'good' | 'excellent' {
    // Compute predictions and validate
    const predictions: number[] = []
    let pMastery = params.pL0

    for (const attempt of attempts) {
      predictions.push(this.predict(pMastery))
      pMastery = updateBKT(pMastery, attempt.isCorrect, params)
    }

    // Calculate Brier score
    const brierScore = attempts.reduce((sum, attempt, i) => {
      const pred = predictions[i]
      const actual = attempt.isCorrect ? 1 : 0
      return sum + Math.pow(pred - actual, 2)
    }, 0) / attempts.length

    // Quality based on Brier score
    if (brierScore < 0.15) return 'excellent'
    if (brierScore < 0.25) return 'good'
    if (brierScore < 0.35) return 'acceptable'
    return 'poor'
  }

  // ==========================================================================
  // Validation Metrics
  // ==========================================================================

  /**
   * Calculate validation metrics for BKT predictions
   */
  calculateValidationMetrics(
    attempts: PracticeAttempt[],
    params: BKTParams = this.params
  ): ValidationMetrics {
    if (attempts.length < 2) {
      return {
        auc: 0.5,
        brierScore: 0.25,
        calibrationError: 0,
        accuracy: 0.5,
        logLoss: Math.log(2),
        sampleSize: 0,
      }
    }

    // Generate predictions
    const predictions: number[] = []
    const actuals: boolean[] = []
    let pMastery = params.pL0

    for (const attempt of attempts) {
      predictions.push(predictCorrectProbability(pMastery, params))
      actuals.push(attempt.isCorrect)
      pMastery = updateBKT(pMastery, attempt.isCorrect, params)
    }

    return {
      auc: this.calculateAUC(predictions, actuals),
      brierScore: this.calculateBrierScore(predictions, actuals),
      calibrationError: this.calculateCalibrationError(predictions, actuals),
      accuracy: this.calculateAccuracy(predictions, actuals),
      logLoss: this.calculateLogLoss(predictions, actuals),
      sampleSize: attempts.length,
    }
  }

  /**
   * Calculate Area Under ROC Curve using Wilcoxon-Mann-Whitney statistic
   */
  private calculateAUC(predictions: number[], actuals: boolean[]): number {
    const positiveScores: number[] = []
    const negativeScores: number[] = []

    for (let i = 0; i < predictions.length; i++) {
      if (actuals[i]) {
        positiveScores.push(predictions[i])
      } else {
        negativeScores.push(predictions[i])
      }
    }

    if (positiveScores.length === 0 || negativeScores.length === 0) {
      return 0.5 // Undefined case
    }

    // Count pairs where positive has higher score
    let concordant = 0
    let discordant = 0
    let ties = 0

    for (const pos of positiveScores) {
      for (const neg of negativeScores) {
        if (pos > neg) concordant++
        else if (pos < neg) discordant++
        else ties++
      }
    }

    // AUC = (concordant + 0.5 * ties) / total pairs
    const totalPairs = positiveScores.length * negativeScores.length
    return (concordant + 0.5 * ties) / totalPairs
  }

  /**
   * Calculate Brier Score
   * Lower is better (0 = perfect, 1 = worst)
   */
  private calculateBrierScore(predictions: number[], actuals: boolean[]): number {
    return predictions.reduce((sum, pred, i) => {
      const actual = actuals[i] ? 1 : 0
      return sum + Math.pow(pred - actual, 2)
    }, 0) / predictions.length
  }

  /**
   * Calculate Expected Calibration Error
   * Groups predictions into bins and measures calibration
   */
  private calculateCalibrationError(
    predictions: number[],
    actuals: boolean[],
    nBins: number = 10
  ): number {
    // Create bins
    const bins: { count: number; predSum: number; actualSum: number }[] =
      Array(nBins).fill(null).map(() => ({ count: 0, predSum: 0, actualSum: 0 }))

    for (let i = 0; i < predictions.length; i++) {
      const binIdx = Math.min(Math.floor(predictions[i] * nBins), nBins - 1)
      bins[binIdx].count++
      bins[binIdx].predSum += predictions[i]
      bins[binIdx].actualSum += actuals[i] ? 1 : 0
    }

    // Calculate ECE
    let ece = 0
    for (const bin of bins) {
      if (bin.count > 0) {
        const avgPred = bin.predSum / bin.count
        const avgActual = bin.actualSum / bin.count
        ece += (bin.count / predictions.length) * Math.abs(avgPred - avgActual)
      }
    }

    return ece
  }

  /**
   * Calculate simple accuracy (threshold at 0.5)
   */
  private calculateAccuracy(predictions: number[], actuals: boolean[]): number {
    const correct = predictions.filter((pred, i) =>
      (pred >= 0.5) === actuals[i]
    ).length
    return correct / predictions.length
  }

  /**
   * Calculate log loss (cross-entropy)
   */
  private calculateLogLoss(predictions: number[], actuals: boolean[]): number {
    const epsilon = 1e-15
    return -predictions.reduce((sum, pred, i) => {
      const p = Math.max(epsilon, Math.min(1 - epsilon, pred))
      const actual = actuals[i] ? 1 : 0
      return sum + (actual * Math.log(p) + (1 - actual) * Math.log(1 - p))
    }, 0) / predictions.length
  }

  // ==========================================================================
  // Confidence Intervals
  // ==========================================================================

  /**
   * Calculate mastery estimate with confidence interval
   *
   * Uses asymptotic normality of the posterior and beta-binomial approximation
   */
  getMasteryWithConfidence(
    attempts: PracticeAttempt[],
    confidenceLevel: number = 0.95
  ): MasteryEstimate {
    // Calculate posterior using BKT
    let pMastery = this.params.pL0

    for (const attempt of attempts) {
      pMastery = this.update(pMastery, attempt.isCorrect)
    }

    // Effective sample size (accounts for correlation from learning)
    // Uses heuristic: n_eff = n / (1 + correlation factor)
    const nAttempts = attempts.length
    const learningRate = this.params.pT
    const correlationFactor = 1 + 2 * learningRate * (nAttempts - 1) / nAttempts
    const nEffective = Math.max(1, nAttempts / correlationFactor)

    // Use beta distribution approximation for CI
    // Mean = pMastery, pseudo-counts based on n_eff
    const pseudoN = nEffective
    const alpha = pMastery * pseudoN + 1
    const beta = (1 - pMastery) * pseudoN + 1

    // Calculate quantiles using beta distribution approximation
    const z = this.normalQuantile((1 + confidenceLevel) / 2)
    const se = Math.sqrt((pMastery * (1 - pMastery)) / (nEffective + 1))

    // Wilson score interval (better for extreme probabilities)
    const { lower, upper } = this.wilsonScoreInterval(
      pMastery,
      nEffective,
      confidenceLevel
    )

    return {
      pMastery,
      confidenceInterval: {
        lower: Math.max(0, lower),
        upper: Math.min(1, upper),
        level: confidenceLevel,
      },
      nEffective,
    }
  }

  /**
   * Wilson score interval for proportions
   * More accurate than normal approximation, especially near 0 or 1
   */
  private wilsonScoreInterval(
    p: number,
    n: number,
    confidenceLevel: number
  ): { lower: number; upper: number } {
    const z = this.normalQuantile((1 + confidenceLevel) / 2)
    const z2 = z * z

    const center = (p + z2 / (2 * n)) / (1 + z2 / n)
    const margin = (z / (1 + z2 / n)) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))

    return {
      lower: center - margin,
      upper: center + margin,
    }
  }

  /**
   * Approximate normal quantile using rational approximation
   */
  private normalQuantile(p: number): number {
    if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1')

    const a1 = -39.6968302866538, a2 = 220.946098424521
    const a3 = -275.928510446969, a4 = 138.357751867269
    const a5 = -30.6647980661472, a6 = 2.50662823884

    const b1 = -54.4760987982241, b2 = 161.585836858041
    const b3 = -155.698979859887, b4 = 66.8013118877197
    const b5 = -13.2806815528857

    const c1 = -7.78489400243029e-03, c2 = -0.322396458041136
    const c3 = -2.40075827716184, c4 = -2.54973253934373
    const c5 = 4.37466414146497, c6 = 2.93816398269878

    const d1 = 7.78469570904146e-03, d2 = 0.32246712907004
    const d3 = 2.445134137143, d4 = 3.75440866190742

    const pLow = 0.02425, pHigh = 1 - pLow

    let q: number, r: number

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p))
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
             ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    } else if (p <= pHigh) {
      q = p - 0.5
      r = q * q
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
             (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p))
      return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
              ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    }
  }
}

// ============================================================================
// Skill-Specific Parameter Storage (Neo4J)
// ============================================================================

interface Neo4JNode<T> {
  identity: { low: number; high: number }
  labels: string[]
  properties: T
}

function extractProperties<T>(node: Neo4JNode<T> | T): T {
  if (node && typeof node === 'object' && 'properties' in node) {
    return (node as Neo4JNode<T>).properties
  }
  return node as T
}

/**
 * Store skill-specific BKT parameters
 */
export async function storeSkillBKTParams(
  skillId: string,
  params: BKTParams,
  fittingResult: Partial<FittingResult> = {}
): Promise<void> {
  await runWriteTransaction(async (tx) => {
    await tx.run(
      `
      MERGE (bp:BKTParams {skillId: $skillId})
      SET bp.pL0 = $pL0,
          bp.pT = $pT,
          bp.pS = $pS,
          bp.pG = $pG,
          bp.logLikelihood = $logLikelihood,
          bp.fitQuality = $fitQuality,
          bp.fittedAt = $fittedAt
      `,
      {
        skillId,
        pL0: params.pL0,
        pT: params.pT,
        pS: params.pS,
        pG: params.pG,
        logLikelihood: fittingResult.logLikelihood ?? null,
        fitQuality: fittingResult.fitQuality ?? 'acceptable',
        fittedAt: Date.now(),
      }
    )

    // Link to skill node
    await tx.run(
      `
      MATCH (bp:BKTParams {skillId: $skillId})
      MATCH (s:Skill {id: $skillId})
      MERGE (bp)-[:PARAMS_FOR]->(s)
      `,
      { skillId }
    )
  })
}

/**
 * Get skill-specific BKT parameters
 */
export async function getSkillBKTParams(skillId: string): Promise<BKTParams | null> {
  const result = await runQuery<{
    bp: Neo4JNode<{
      pL0: number
      pT: number
      pS: number
      pG: number
    }>
  }>(
    `
    MATCH (bp:BKTParams {skillId: $skillId})
    RETURN bp
    `,
    { skillId }
  )

  if (result.length === 0) return null

  const props = extractProperties(result[0].bp)
  return {
    pL0: props.pL0,
    pT: props.pT,
    pS: props.pS,
    pG: props.pG,
  }
}

/**
 * Get all skill BKT parameters for a notebook
 */
export async function getNotebookBKTParams(
  notebookId: string
): Promise<Map<string, BKTParams>> {
  const result = await runQuery<{
    skillId: string
    bp: Neo4JNode<{
      pL0: number
      pT: number
      pS: number
      pG: number
    }>
  }>(
    `
    MATCH (bp:BKTParams)-[:PARAMS_FOR]->(s:Skill {notebookId: $notebookId})
    RETURN s.id as skillId, bp
    `,
    { notebookId }
  )

  const paramsMap = new Map<string, BKTParams>()
  for (const r of result) {
    const props = extractProperties(r.bp)
    paramsMap.set(r.skillId, {
      pL0: props.pL0,
      pT: props.pT,
      pS: props.pS,
      pG: props.pG,
    })
  }

  return paramsMap
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create EnhancedBKT instance with skill-specific parameters if available
 */
export async function createSkillBKT(
  skillId: string,
  defaultParams?: Partial<BKTParams>
): Promise<EnhancedBKT> {
  const storedParams = await getSkillBKTParams(skillId)

  if (storedParams) {
    return new EnhancedBKT(storedParams, { skillId })
  }

  return new EnhancedBKT(defaultParams, { skillId })
}

/**
 * Fit BKT parameters for a skill using historical data
 */
export async function fitSkillBKT(
  skillId: string,
  attempts: PracticeAttempt[],
  saveToNeo4J: boolean = true
): Promise<FittingResult> {
  const bkt = new EnhancedBKT({}, { skillId })
  const result = bkt.fitParameters(attempts)

  if (saveToNeo4J && result.fitQuality !== 'poor') {
    await storeSkillBKTParams(skillId, result.params, result)
  }

  return result
}

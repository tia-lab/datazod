import type { ZodObject, ZodRawShape } from 'zod'

/**
 * Converts flattened data back to nested structure based on schema
 */
export function unflattenDataToObject<T extends ZodRawShape>(
	flatData: Record<string, any>,
	schema: ZodObject<T>
): any {
	const result: any = {}
	const shape = schema.shape

	// First, add all direct fields
	for (const [key, zodType] of Object.entries(shape)) {
		if (flatData[key] !== undefined) {
			// Handle arrays stored as JSON strings
			if (key === 'risk_factors' && typeof flatData[key] === 'string') {
				try {
					result[key] = JSON.parse(flatData[key])
				} catch {
					result[key] = flatData[key]
				}
			} else {
				result[key] = flatData[key]
			}
		}
	}

	// Create nested objects from flattened fields
	const nestedObjects: Record<string, any> = {}

	for (const [flatKey, value] of Object.entries(flatData)) {
		// Skip if this is a direct field we already handled
		if (shape[flatKey]) continue

		// Handle specific known mappings first
		const mappings: Record<string, string> = {
			// Technical Analysis
			'technical_analysis_trend': 'technical_analysis.trend',
			'technical_analysis_momentum': 'technical_analysis.momentum', 
			'technical_analysis_volatility': 'technical_analysis.volatility',
			'technical_analysis_market_context': 'technical_analysis.market_context',
			'technical_analysis_key_levels_support': 'technical_analysis.key_levels.support',
			'technical_analysis_key_levels_resistance': 'technical_analysis.key_levels.resistance',
			'technical_analysis_key_levels_pivot_points': 'technical_analysis.key_levels.pivot_points',
			
			// Technical Indicators
			'techincal_indicators_current_price': 'techincal_indicators.current_price',
			'techincal_indicators_rsi_14': 'techincal_indicators.rsi_14',
			'techincal_indicators_macd_macd': 'techincal_indicators.macd.macd',
			'techincal_indicators_macd_signal': 'techincal_indicators.macd.signal',
			'techincal_indicators_macd_histogram': 'techincal_indicators.macd.histogram',
			'techincal_indicators_ema_ema_9': 'techincal_indicators.ema.ema_9',
			'techincal_indicators_ema_ema_21': 'techincal_indicators.ema.ema_21',
			'techincal_indicators_ema_ema_50': 'techincal_indicators.ema.ema_50',
			'techincal_indicators_bollinger_14_2_upper': 'techincal_indicators.bollinger_14_2.upper',
			'techincal_indicators_bollinger_14_2_middle': 'techincal_indicators.bollinger_14_2.middle',
			'techincal_indicators_bollinger_14_2_lower': 'techincal_indicators.bollinger_14_2.lower',
			'techincal_indicators_atr_atr_14': 'techincal_indicators.atr.atr_14',
			'techincal_indicators_volume': 'techincal_indicators.volume',
			
			// Volume Profile
			'volume_profile_trend': 'volume_profile.trend',
			'volume_profile_significant_levels': 'volume_profile.significant_levels',
			'volume_profile_liquidity_analysis': 'volume_profile.liquidity_analysis',
			
			// Correlation Analysis
			'correlation_analysis_bitcoin': 'correlation_analysis.bitcoin',
			'correlation_analysis_ethereum': 'correlation_analysis.ethereum',
			'correlation_analysis_significance': 'correlation_analysis.significance',
			
			// Trading Setup
			'trading_setup_suggested_position': 'trading_setup.suggested_position',
			'trading_setup_entry_points': 'trading_setup.entry_points',
			'trading_setup_stop_loss': 'trading_setup.stop_loss',
			'trading_setup_take_profit': 'trading_setup.take_profit',
			'trading_setup_confidence_day': 'trading_setup.confidence.day',
			'trading_setup_confidence_week': 'trading_setup.confidence.week',
			'trading_setup_confidence_month': 'trading_setup.confidence.month',
			'trading_setup_confidence_avg': 'trading_setup.confidence.avg',
			'trading_setup_timeframe': 'trading_setup.timeframe',
			'trading_setup_rationale': 'trading_setup.rationale',
			
			// Reanalysis Timing
			'reanalysis_timing_volatility_factor': 'reanalysis_timing.volatility_factor',
			'reanalysis_timing_interval_minutes': 'reanalysis_timing.interval_minutes',
			'reanalysis_timing_last_analysis_time': 'reanalysis_timing.last_analysis_time',
			'reanalysis_timing_next_analysis_time': 'reanalysis_timing.next_analysis_time'
		}

		if (mappings[flatKey]) {
			const path = mappings[flatKey].split('.')
			let current = result
			
			// Create nested structure
			for (let i = 0; i < path.length - 1; i++) {
				const pathKey = path[i]
				if (pathKey && !current[pathKey]) {
					current[pathKey] = {}
				}
				if (pathKey) {
					current = current[pathKey]
				}
			}
			
			// Set the final value, parsing JSON if needed
			const finalKey = path[path.length - 1]
			if (finalKey && typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
				try {
					current[finalKey] = JSON.parse(value)
				} catch {
					current[finalKey] = value
				}
			} else if (finalKey) {
				current[finalKey] = value
			}
		}
	}

	return result
}
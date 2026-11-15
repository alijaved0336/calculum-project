/**
 * Feature Role Utilities
 * Helper functions for working with feature roles (access to specific features within modules)
 */

import { FEATURE_ROLES, type FeatureRoleValue } from '@/constants';

/**
 * Check if a user has a specific feature role
 * @param userRoles - Array of user roles
 * @param featureRole - The feature role to check for
 * @returns boolean indicating if the user has the feature role
 */
export function hasFeatureRole(
  userRoles: string[],
  featureRole: FeatureRoleValue
): boolean {
  return userRoles.includes(featureRole);
}

/**
 * Check if a user has the download excel match feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the download excel match feature role
 */
export function hasDownloadExcelMatchFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.DOWNLOAD_EXCEL_MATCH);
}

/**
 * Check if a user has the download excel feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the download excel feature role
 */
export function hasDownloadExcelFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.DOWNLOAD_EXCEL);
}

export function hasDownloadPdfEntityFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.DOWNLOAD_PDF_ENTITY);
}

/**
 * Check if a user has the email negotiations feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the email negotiations feature role
 */
export function hasEmailNegotiationsFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.EMAIL_NEGOTIATIONS);
}

export function hasAiBotNegotiation(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.AI_BOT_NEGOTIATION);
}

export function hasSupportBotFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SUPPORT_BOT);
}



/**
 * Check if a user has the SCF strategy feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the SCF strategy feature role
 */
export function hasScfStrategyFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SCF_STRATEGY);
}

/**
 * Check if a user has the nine boxes financing feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the nine boxes financing feature role
 */
export function hasNineBoxesFinancingFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.NINE_BOXES_FINANCING);
}

/**
 * Check if a user has the pilot feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the pilot feature role
 */
export function hasPilotFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.PILOT);
}

/**
 * Check if a user has the virtual card feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the virtual card feature role
 */
export function hasVirtualCardFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.VIRTUAL_CARD);
}

/**
 * Check if a user has the payment terms vs price feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the payment terms vs price feature role
 */
export function hasPaymentTermsVsPriceFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.PAYMENT_TERMS_VS_PRICE);
}

/**
 * Check if a user has the SME feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the SME feature role
 */
export function hasSMEFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SME);
}

/**
 * Check if a user has the credit rating feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the credit rating feature role
 */
export function hasCreditRatingFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.CREDIT_RATING);
}

/**
 * Check if a user has the value proposition feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the value proposition feature role
 */
export function hasValuePropositionFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.VALUE_PROPOSITION);
}

/**
 * Check if a user has the leverage distribution feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the leverage distribution feature role
 */
export function hasLeverageDistributionFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.LEVERAGE_DISTRIBUTION);
}

/**
 * Check if a user has the entity card newsletter feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the entity card newsletter feature role
 */
export function hasEntityCardNewsletterFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.ENTITY_CARD_NEWSLETTER);
}

/**
 * Check if a user has the supplier standard feature role
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has the supplier standard feature role
 */
export function hasSupplierStandardFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SUPPLIER_STANDARD);
}

export function hasPeerGroupStandardFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.PEER_GROUP_STANDARD);
}

export function hasKeepHistoricalDataFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.KEEP_HISTORICAL_DATA);
}

export function hasSupplierInsightsFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.SUPPLIER_INSIGHTS);
}

export function hasForecastVolumeFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.FORECAST_VOLUME);
}

export function hasPotentialSupplierFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.POTENTIAL_SUPPLIERS);
}

export function hasPotentialSuppliersFeature(userRoles: string[]): boolean {
  return hasFeatureRole(userRoles, FEATURE_ROLES.POTENTIAL_SUPPLIERS);
}

/**
 * Get all feature roles from user roles
 * @param userRoles - Array of user roles
 * @returns Array of feature roles the user has
 */
export function getUserFeatureRoles(userRoles: string[]): FeatureRoleValue[] {
  return userRoles.filter(role => 
    Object.values(FEATURE_ROLES).includes(role as FeatureRoleValue)
  ) as FeatureRoleValue[];
}

/**
 * Check if user has any feature roles
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has any feature roles
 */
export function hasAnyFeatureRoles(userRoles: string[]): boolean {
  return getUserFeatureRoles(userRoles).length > 0;
}

/**
 * Check if user has export features (download excel)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has export features
 */
export function hasExportFeatures(userRoles: string[]): boolean {
  return hasDownloadExcelFeature(userRoles) || hasDownloadExcelMatchFeature(userRoles);
}

/**
 * Check if user has financial features (SCF, financing, credit rating)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has financial features
 */
export function hasFinancialFeatures(userRoles: string[]): boolean {
  return hasScfStrategyFeature(userRoles) || 
         hasNineBoxesFinancingFeature(userRoles) || 
         hasCreditRatingFeature(userRoles);
}

/**
 * Check if user has advanced features (pilot, virtual card, value proposition)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has advanced features
 */
export function hasAdvancedFeatures(userRoles: string[]): boolean {
  return hasPilotFeature(userRoles) || 
         hasVirtualCardFeature(userRoles) || 
         hasValuePropositionFeature(userRoles);
}

/**
 * Check if user has negotiation features (email negotiations, payment terms)
 * @param userRoles - Array of user roles
 * @returns boolean indicating if the user has negotiation features
 */
export function hasNegotiationFeatures(userRoles: string[]): boolean {
  return hasEmailNegotiationsFeature(userRoles) || 
         hasPaymentTermsVsPriceFeature(userRoles);
}

/**
 * Get feature categories and their associated roles
 * @returns Object mapping feature categories to their roles
 */
export function getFeatureCategories(): Record<string, FeatureRoleValue[]> {
  return {
    'export': [FEATURE_ROLES.DOWNLOAD_EXCEL, FEATURE_ROLES.DOWNLOAD_EXCEL_MATCH],
    'financial': [FEATURE_ROLES.SCF_STRATEGY, FEATURE_ROLES.NINE_BOXES_FINANCING, FEATURE_ROLES.CREDIT_RATING],
    'advanced': [FEATURE_ROLES.PILOT, FEATURE_ROLES.VIRTUAL_CARD, FEATURE_ROLES.VALUE_PROPOSITION],
    'negotiation': [FEATURE_ROLES.EMAIL_NEGOTIATIONS, FEATURE_ROLES.PAYMENT_TERMS_VS_PRICE],
    'business': [FEATURE_ROLES.SME],
    'entity_card_newsletter': [FEATURE_ROLES.ENTITY_CARD_NEWSLETTER],
    'supplier_standard': [FEATURE_ROLES.SUPPLIER_STANDARD],
    'peer_group_standard': [FEATURE_ROLES.PEER_GROUP_STANDARD],
  };
}

/**
 * Check if user has features from a specific category
 * @param userRoles - Array of user roles
 * @param category - The feature category to check
 * @returns boolean indicating if the user has features from the category
 */
export function hasFeaturesFromCategory(userRoles: string[], category: string): boolean {
  const categories = getFeatureCategories();
  const categoryFeatures = categories[category] || [];
  return categoryFeatures.some(feature => hasFeatureRole(userRoles, feature));
}

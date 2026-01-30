import validator from 'validator';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';

/**
 * Validation et normalisation d'email
 */
export function validateEmail(email: string): { valid: boolean; normalized?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email requis' };
  }

  // Normaliser l'email
  const normalized = email.trim().toLowerCase();

  // Vérifier la longueur (RFC 5321: 320 caractères max)
  if (normalized.length > 320) {
    return { valid: false, error: 'Email trop long (max 320 caractères)' };
  }

  // Validation stricte avec validator
  if (!validator.isEmail(normalized, { allow_utf8_local_part: false })) {
    return { valid: false, error: 'Format email invalide' };
  }

  return { valid: true, normalized };
}

/**
 * Validation de la force du mot de passe
 */
export function validatePassword(password: string): { valid: boolean; score?: number; error?: string; suggestions?: string[] } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Mot de passe requis' };
  }

  // Longueur minimale
  if (password.length < 12) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 12 caractères' };
  }

  // Vérifier la complexité
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      valid: false,
      error: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
    };
  }

  // Évaluer la force avec zxcvbn
  const result = zxcvbn(password);

  if (result.score < 2) {
    return {
      valid: false,
      score: result.score,
      error: 'Mot de passe trop faible',
      suggestions: result.feedback.suggestions,
    };
  }

  return { valid: true, score: result.score };
}

/**
 * Schéma Zod pour validation d'email
 */
export const emailSchema = z
  .string()
  .min(1, 'Email requis')
  .max(320, 'Email trop long')
  .email('Format email invalide')
  .transform((val) => val.trim().toLowerCase());

/**
 * Schéma Zod pour validation de mot de passe
 */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .refine(
    (pwd) => /[A-Z]/.test(pwd),
    'Le mot de passe doit contenir au moins une majuscule'
  )
  .refine(
    (pwd) => /[a-z]/.test(pwd),
    'Le mot de passe doit contenir au moins une minuscule'
  )
  .refine(
    (pwd) => /\d/.test(pwd),
    'Le mot de passe doit contenir au moins un chiffre'
  );

/**
 * Validation et sanitization de texte HTML
 */
export function sanitizeHtml(html: string, maxLength?: number): string {
  const sanitizeHtmlLib = require('sanitize-html');
  
  let sanitized = sanitizeHtmlLib(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: {
      a: ['href'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Validation de téléphone (format international)
 */
export function validatePhone(phone: string | null | undefined): { valid: boolean; normalized?: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: true }; // Optionnel
  }

  // Normaliser : supprimer les espaces, tirets, points, parenthèses
  let normalized = phone.trim().replace(/[\s\-\.\(\)]/g, '');

  // Si commence par 0 (format français), remplacer par +33
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '+33' + normalized.substring(1);
  }

  // Accepter les formats :
  // - Format international: +33 6 12 34 56 78
  // - Format français: 06 12 34 56 78 ou 0612345678
  // - Format avec indicatif: 0033 6 12 34 56 78
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  }

  // Validation finale : doit commencer par + suivi de 1-15 chiffres
  // OU être un numéro français de 10 chiffres commençant par 0
  const internationalFormat = /^\+[1-9]\d{8,14}$/; // + suivi de 9-15 chiffres
  const frenchFormat = /^0[1-9]\d{8}$/; // 0 suivi de 9 chiffres (format français)
  
  if (!internationalFormat.test(normalized) && !frenchFormat.test(phone.trim().replace(/[\s\-\.\(\)]/g, ''))) {
    return { valid: false, error: 'Format de téléphone invalide. Utilisez le format international (+33...) ou français (06...)' };
  }

  // Si c'est un format français, le normaliser en format international
  if (frenchFormat.test(phone.trim().replace(/[\s\-\.\(\)]/g, ''))) {
    const cleaned = phone.trim().replace(/[\s\-\.\(\)]/g, '');
    normalized = '+33' + cleaned.substring(1);
  }

  return { valid: true, normalized };
}

/**
 * Validation de nom (pas de caractères dangereux)
 */
export function validateName(name: string, maxLength: number = 200): { valid: boolean; sanitized?: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nom requis' };
  }

  let sanitized = name.trim();

  if (sanitized.length === 0) {
    return { valid: false, error: 'Nom ne peut pas être vide' };
  }

  if (sanitized.length > maxLength) {
    return { valid: false, error: `Nom trop long (max ${maxLength} caractères)` };
  }

  // Rejeter les caractères potentiellement dangereux
  if (/[<>\"'&]/.test(sanitized)) {
    return { valid: false, error: 'Nom contient des caractères non autorisés' };
  }

  return { valid: true, sanitized };
}

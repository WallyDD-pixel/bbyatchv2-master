/**
 * Utilitaire pour gérer les erreurs API de manière cohérente
 * Évite les problèmes de redirections vers localhost et les erreurs non gérées
 */

export interface ApiError {
  error: string;
  message?: string;
  details?: string;
}

/**
 * Parse une réponse API en gérant les redirections et les erreurs
 */
export async function handleApiResponse<T = any>(
  response: Response,
  options: {
    allowRedirect?: boolean;
    defaultError?: string;
  } = {}
): Promise<{ ok: boolean; data?: T; error?: ApiError; redirected?: boolean }> {
  // Vérifier si c'est une redirection
  if (response.redirected || response.status >= 300 && response.status < 400) {
    if (options.allowRedirect) {
      return { ok: true, redirected: true };
    }
    // En production, les redirections ne devraient pas arriver pour les requêtes fetch
    console.warn('⚠️ Redirection inattendue dans une requête fetch:', response.url);
    return {
      ok: false,
      error: {
        error: 'unexpected_redirect',
        message: 'La réponse du serveur était une redirection. Veuillez réessayer.',
      },
    };
  }

  // Vérifier le Content-Type
  const contentType = response.headers.get('content-type') || '';
  
  // Si ce n'est pas du JSON, c'est probablement une erreur
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => 'Erreur inconnue');
    console.error('❌ Réponse non-JSON reçue:', { status: response.status, contentType, text: text.substring(0, 100) });
    
    return {
      ok: false,
      error: {
        error: 'invalid_response',
        message: options.defaultError || 'Le serveur a retourné une réponse invalide. Veuillez réessayer.',
        details: text.substring(0, 200),
      },
    };
  }

  // Parser le JSON
  try {
    const data = await response.json();
    
    if (!response.ok) {
      return {
        ok: false,
        error: {
          error: data.error || 'unknown_error',
          message: data.message || data.error || options.defaultError || 'Une erreur est survenue',
          details: data.details,
        },
      };
    }
    
    return { ok: true, data };
  } catch (parseError) {
    console.error('❌ Erreur lors du parsing JSON:', parseError);
    return {
      ok: false,
      error: {
        error: 'parse_error',
        message: options.defaultError || 'Erreur lors de la lecture de la réponse du serveur',
      },
    };
  }
}

/**
 * Wrapper pour les appels fetch avec gestion d'erreur améliorée
 */
export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {},
  errorMessages?: { [key: string]: string }
): Promise<{ ok: boolean; data?: T; error?: ApiError }> {
  try {
    const response = await fetch(url, {
      ...options,
      // S'assurer que les redirections sont suivies mais détectées
      redirect: 'follow',
    });

    const result = await handleApiResponse<T>(response, {
      allowRedirect: false,
      defaultError: 'Erreur lors de la communication avec le serveur',
    });

    // Traduire les messages d'erreur si fournis
    if (!result.ok && result.error && errorMessages) {
      const translated = errorMessages[result.error.error];
      if (translated) {
        result.error.message = translated;
      }
    }

    return result;
  } catch (networkError) {
    console.error('❌ Erreur réseau:', networkError);
    return {
      ok: false,
      error: {
        error: 'network_error',
        message: 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.',
        details: networkError instanceof Error ? networkError.message : String(networkError),
      },
    };
  }
}

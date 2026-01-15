/**
 * Utilitaires pour gérer les formulaires avec feedback et redirections propres
 */

export interface FormSubmitOptions {
  method?: string;
  headers?: Record<string, string>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
  redirectUrl?: string;
}

export interface FormSubmitResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Soumet un formulaire avec gestion améliorée des erreurs et redirections
 */
export async function submitForm(
  url: string,
  formData: FormData | string,
  options: FormSubmitOptions = {}
): Promise<FormSubmitResult> {
  const {
    method = 'POST',
    headers = {},
    successMessage,
    errorMessage,
  } = options;

  try {
    const defaultHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers,
    };

    // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
    if (!(formData instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: formData,
    });

    // Gérer les redirections HTTP (303, 302, 301)
    if (response.status === 303 || response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get('location') || options.redirectUrl;
      if (redirectUrl) {
        // Retourner une indication de redirection
        return {
          success: true,
          data: { redirect: true, url: redirectUrl },
        };
      }
    }

      if (!response.ok) {
        let error: any;
        try {
          const contentType = response.headers.get('content-type');
          
          // Gestion spéciale pour l'erreur 413 (Payload Too Large)
          if (response.status === 413) {
            return {
              success: false,
              error: 'Les fichiers sont trop volumineux. Veuillez réduire la taille des images ou les uploader une par une.',
            };
          }
          
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            const text = await response.text();
            error = { error: 'server_error', message: text || `HTTP ${response.status}` };
          }
        } catch (e) {
          error = { error: 'unknown_error', message: `HTTP ${response.status}` };
        }

        // Message d'erreur personnalisé selon le type
        let errorMsg = errorMessage || 'Une erreur est survenue';
        if (response.status === 413) {
          errorMsg = 'Les fichiers sont trop volumineux. Veuillez réduire la taille des images.';
        } else if (error.message) {
          errorMsg = error.message;
        } else if (error.error) {
          errorMsg = error.error === 'upload_failed' 
            ? 'Erreur lors de l\'upload des images. Vérifiez que les fichiers sont des images valides et pas trop volumineux.'
            : error.error;
        } else if (error.details) {
          errorMsg = error.details;
        }
        
        return {
          success: false,
          error: errorMsg,
        };
      }

    // Tenter de lire la réponse comme JSON
    let data: any = null;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }
    } catch {
      // Ignorer si ce n'est pas du JSON
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur réseau';
    return {
      success: false,
      error: errorMessage || errorMsg,
    };
  }
}

/**
 * Hook pour gérer l'état de soumission d'un formulaire
 */
export function useFormSubmission() {
  return {
    submitForm,
  };
}

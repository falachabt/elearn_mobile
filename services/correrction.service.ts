import run from '@/config/gemini';
import { logger } from '@/utils/logger';
import {QuizQuestion, QuizOption} from '@/types/quiz.type';

export class CorrectionService {
    /**
     * Génère la réponse « officielle » d'une question de quiz via l'API Gemini
     * seulement si le champ justificatif est vide.
     *
     * @param question l'objet QuizQuestion contenant le contenu et les options
     * @returns le texte de la réponse générée ou le justificatif existant
     */
    static async generateAnswer(
        question: QuizQuestion
    ): Promise<string> {
        // Si un justificatif existe déjà, on le retourne directement
        if (question.justificatif && question.justificatif.trim() !== '') {
            return question.justificatif;
        }

        // TEMPORAIREMENT DÉSACTIVÉ : Génération via Gemini (problème de clé API)
        // Retourne un message par défaut pour les questions sans justificatif
        return "Explication non disponible pour cette question. Consultez votre cours pour plus de détails.";

        /* CODE DÉSACTIVÉ - Génération Gemini
        const prompt = `
Tu es un expert pédagogique chargé de fournir des explications claires et précises pour un quiz éducatif.

Question de quiz (ID: ${question.id}) :
${typeof question.title === 'string' ? question.title : JSON.stringify(question.title)}

Options :
${question.options
            .map((opt: QuizOption, idx: number) => `${idx + 1}. ${opt.value} ${opt.isCorrect ? '(Réponse correcte)' : ''}`)
            .join('\n')}

Type de question : ${question.isMultiple ? 'Choix multiple (plusieurs réponses possibles)' : 'Choix unique (une seule réponse correcte)'}.

INSTRUCTIONS:
1. Fournis une explication concise (3-5 phrases) qui justifie la ou les réponses correctes
2. Explique pourquoi les autres options sont incorrectes si pertinent
3. Format de la réponse:
   - N'utilise PAS de mise en gras avec des astérisques (**)
   - N'utilise PAS de formules KaTeX ou LaTeX
   - Utilise un langage clair et accessible
   - Structure ta réponse en paragraphes courts
   - Inclus des faits précis et sources si nécessaire

Ta réponse doit être pédagogique et permettre à l'apprenant de comprendre le raisonnement derrière la bonne réponse.
`.trim();

        try {
            const responseText = await run(prompt);
            let cleanedResponse = responseText.trim();
            cleanedResponse = cleanedResponse.replace(/^(Voici|Voilà).*?:/i, '').trim();
            cleanedResponse = cleanedResponse.replace(/^(\$).*?:/i, '$$').trim();
            return cleanedResponse;
        } catch (error: unknown) {
            logger.error('Erreur dans CorrectionService.generateAnswer :', error);
            throw new Error(`Impossible de générer une explication pour la question ID ${question.id}: ${(error as Error).message}`);
        }
        */
    }
}